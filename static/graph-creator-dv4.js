document.onload = (function(d3, undefined){
  "use strict";

  // define graphcreator object
  var GraphCreator = function(svg, nodes, edges){
    var thisGraph = this;

    thisGraph.initDom();
    thisGraph.nodes = nodes || [];
    thisGraph.edges = edges || [];

    thisGraph.state = {
      selectedNode: null,
      selectedEdge: null,
      stagingNode: null,
      stagingNodeData: null,
      awaitingStagingNodeData: false,
      mouseDownNode: null,
      mouseDownLink: null,
      justDragged: false,
      justScaleTransGraph: false,
      lastKeyDown: -1,
      shiftNodeDrag: false,
      selectedText: null,
      // when mouseover set the current targetNode
      currentTargetNode: null
    };

    // define arrow markers for graph links
    var defs = svg.append('svg:defs');
    defs.append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', "32")
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

    // define arrow markers for leading arrow
    defs.append('svg:marker')
      .attr('id', 'mark-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 7)
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

      //create clip-path to hide corners of image
      svg.append("clipPath")
      	.attr("id", "circle-clip")
        .append("circle")
      	.attr("cx", 0)
      	.attr("cy", 0)
      	.attr("r", 49)

    thisGraph.svg = svg;
    thisGraph.svgG = svg.append("g")
          .classed(thisGraph.consts.graphClass, true);
    var svgG = thisGraph.svgG;

    // displayed when dragging between nodes
    // this will used in circle mouse down and circle mouse up
    thisGraph.dragLine = svgG.append('svg:path')
          .attr('class', 'link dragline hidden')
          .attr('d', 'M0,0L0,0')
          .style('marker-end', 'url(#mark-end-arrow)');

    // svg nodes and edges
    // thisGraph.paths = svgG.append("g").selectAll("g");

    // thisGraph.paths = svgG.append("g").attr('class', 'paths');
    // thisGraph.circles = svgG.append("g").attr('class', 'circles');

    svgG.append("g").attr('class', 'paths');
    svgG.append("g").attr('class', 'circles');

    // thisGraph.paths = svgG.select(".paths");
    // thisGraph.paths = svgG.select(".paths");
    // thisGraph.circles = svgG.select(".circles");

    /*NODE DRAGGING*/
    thisGraph.drag = d3.drag()
          .subject(function(d){

             return {x: d.x, y: d.y};
          })
          .on("start", function(d){
              // console.log('Drag started :', d);
              //thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
          })
          .on("drag", function(args){
            // console.log('Draged beginn :', args);
            thisGraph.state.justDragged = true;
            thisGraph.dragmove.call(thisGraph, args);
          })
          .on("end", function(d) {
            // todo check if edge-mode is selected
            // console.log('drag end');
            // use drag end event to instead mouseup of circle
            // console.log('Drag ended :', d);
            thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
          });

    // listen for key events
    d3.select(window).on("keydown", function(){
      thisGraph.svgKeyDown.call(thisGraph);
    })
    .on("keyup", function(){
      thisGraph.svgKeyUp.call(thisGraph);
    });
    svg.on("mousedown", function(d){
      console.log('mouse down');
      thisGraph.svgMouseDown.call(thisGraph, d);
    });
    svg.on("click", function(d){
      // console.log("svg mouse up");
      thisGraph.svgMouseUp.call(thisGraph, d);
    });
    svg.on("dblclick", function(d){
      // console.log("svg mouse up");
      thisGraph.svgDoubleClick.call(thisGraph, d);
    });


    // listen for dragging
    var dragSvg = d3.zoom().scaleExtent([1 / 2, 4])
          .on("zoom", function(){
            console.log('zoom');
            if (d3.event.sourceEvent.shiftKey){
              // TODO  the internal d3 state is still changing
              return false;
            } else{
              thisGraph.zoomed.call(thisGraph);
            }
            return true;
          })
          .on("start", function(){
            $("body").toggleClass("dragging", true);
          })
          .on("end", function(){
            //console.log('zomme end');
            $("body").toggleClass("dragging", false);
            thisGraph.state.justScaleTransGraph = false;
          });
          //.on("zoom", thisGraph.zoomed.call(thisGraph));

    svg.call(dragSvg).on("dblclick.zoom", null);

    // listen for resize
    window.onresize = function(){thisGraph.updateWindow(svg);};


  };

  GraphCreator.prototype.ajaxError = function() {
    if (!navigator.onLine) {
      Swal.fire({
        type: 'warning',
        title: 'You are offline',
        text: 'Please connect to the internet & try again.'
      });
    } else {
      Swal.fire({
        type: 'warning',
        title: 'LittleSis Error',
        text: 'Something went wrong on the LittleSis server, please try again soon.'
      });
    }
  }

  GraphCreator.prototype.initDom = function() {
    var thisGraph = this;

    (function() { /*Add Node Autocompleter*/
      var self = {
        waiting: false,
        init: function() {
          var searchbox = $( "#node_search_text" );
          searchbox
            .on("keydown", function(e) {
              if (e.key.length == 1) { //indicates a printable character was pressed
                searchbox.autocomplete("close");
                if (searchbox.val().length>=1) {
                  searchbox.toggleClass("ui-autocomplete-loading", true); //simulate searching immediately for feedback, but actually have a delay, as it's an expensive call
                }
              }
              if (e.keyCode == thisGraph.consts.ENTER_KEY){
                self.waiting = true;
              }
            })
            .autocomplete({
            autoFocus: true,
            delay: 750,
            source: function( request, response ) {
              LsDataSource.findNodes( request.term, function(data) {
                if (!data) {
                  response([]);
                  return thisGraph.ajaxError();
                }
                function similarity(s1, s2) {
                  var longer = s1;
                  var shorter = s2;
                  if (s1.length < s2.length) {
                    longer = s2;
                    shorter = s1;
                  }
                  var longerLength = longer.length;
                  if (longerLength == 0) {
                    return 1.0;
                  }
                  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
                }
                function editDistance(s1, s2) {
                  s1 = s1.toLowerCase();
                  s2 = s2.toLowerCase();

                  var costs = new Array();
                  for (var i = 0; i <= s1.length; i++) {
                    var lastValue = i;
                    for (var j = 0; j <= s2.length; j++) {
                      if (i == 0)
                        costs[j] = j;
                      else {
                        if (j > 0) {
                          var newValue = costs[j - 1];
                          if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue),
                              costs[j]) + 1;
                          costs[j - 1] = lastValue;
                          lastValue = newValue;
                        }
                      }
                    }
                    if (i > 0)
                      costs[s2.length] = lastValue;
                  }
                  return costs[s2.length];
                }
                function compare(a,b) {
                  var sa = similarity(a.display.name, request.term);
                  var sb = similarity(b.display.name, request.term);
                  if (sa>sb) {
                    return -1;
                  } else if (sa<sb) {
                    return 1;
                  } else {
                    if (a.display.image && !b.display.image) {
                      return -1;
                    } else if (!a.display.image && b.display.image) {
                      return 1;
                    }
                    return 0;
                  }
                }
                data.sort(compare);

                var out = [];
                for (var i in data) {
                  out.push({
                    value: data[i].display.name,
                    data: data[i]
                  });
                }

                if (!self.waiting) {
                  response( out );
                } else {
                  response([]);
                  if (request.term==searchbox.val()) {
                    self.selected(data[0]);
                  }
                }
              });
            },
            minLength: 2,
            search: function() {
            //  $( "#node_search_text" ).autocomplete("close");
            },
            select: function( event, ui ) {
              var data = ui.item.data;
              self.selected(data);
            }
          });
        },
        selected: function(data) {
          self.waiting = false;
          if (!data) return;
          thisGraph.prepareStagingNode(data);
          $("#adder .card .name").text( data.display.name );
          if (data.display.image) {
            $("#adder .card img").replaceWith($("<img src='"+data.display.image+"'>"));
            $("#adder .card").removeClass("noimg");
          } else {
            $("#adder .card").addClass("noimg");
          }
          $("#adder .card").show();
          $("#adder .card input").focus();
          setTimeout(function() { $("#node_search_text").val(""); }, 1);
        }
      }
      self.init();
    })();

    $( "#nodeChosenButton" ).on("click", function(){
      thisGraph.nodeChosen();
    });

    $( "#overlay .cover" ).on("click", function() {
      $("#overlay").hide();
      thisGraph.deleteNode(thisGraph.getStagingNode());
      thisGraph.updateGraph();
    });

  }

  GraphCreator.prototype.consts =  {
    selectedClass: "selected",
    connectClass: "connect-node",
    circleGClass: "conceptG",
    graphClass: "graph",
    activeEditId: "active-editing",
    BACKSPACE_KEY: 8,
    DELETE_KEY: 46,
    ENTER_KEY: 13,
    nodeRadius: 50
  };

  /* PROTOTYPE FUNCTIONS */

  // call to propagate changes to graph
  GraphCreator.prototype.updateGraph = function(){

    var thisGraph = this,
        consts = thisGraph.consts,
        state = thisGraph.state;


    // thisGraph.paths = svgG.append("g").attr('class', 'paths');
    // thisGraph.circles = svgG.append("g").attr('class', 'circles');

    var d3Path = d3.select("svg").select(".paths").selectAll("path");

    thisGraph.paths = d3Path.data(thisGraph.edges, function(d){
      return String(d.source.id) + "+" + String(d.target.id);
    });


    // thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function(d){
    //   return String(d.source.id) + "+" + String(d.target.id);
    // });
    var paths = thisGraph.paths;


    // add new paths
    var enter = paths.enter()
      .append("path")
      .style('marker-end','url(#end-arrow)')
      .classed("link", true)
      .attr("d", this.edge_svg)
      .on("mousedown", function(d){
        thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
      })
      .on("mouseup", function(d){
        console.log("path mouse up : ",  d3.select(this).node());
        state.mouseDownLink = null;
      });

    // update existing paths
    paths.style('marker-end', 'url(#end-arrow)')
      .classed(consts.selectedClass, function(d){
        return d === state.selectedEdge;
      })
      .attr("d", this.edge_svg);

    // remove old links
    paths.exit().remove();


    // update existing nodes
    var d3Circles = d3.select("svg").select(".circles").selectAll("g");
    // update existing nodes
    thisGraph.circles = d3Circles.data(thisGraph.nodes, function(d){ return "Node"+d.id;});
    thisGraph.circles.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";});
    var circles = thisGraph.circles;

    // add new nodes
    var newGs= circles.enter().append("g");

    newGs.classed(consts.circleGClass, true)
      .attr("id", function(d){return "Node"+d.id})
      .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
      .on("mouseover", function(d){
        console.log('Circle mouseover ', state.shiftNodeDrag);
        state.currentTargetNode = d;
        if (state.shiftNodeDrag){
          d3.select(this).classed(consts.connectClass, true);

          console.log('circle Keyset :', d, state.currentTargetNode);
        }
      })
      .on("mouseout", function(d){
        d3.select(this).classed(consts.connectClass, false);
      })
      .on("mousedown", function(d){
        console.log('circle mouseup :', this, d);
        d3.select(this).moveToFront();
        thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
      })
      .on("mouseup", function(d){
        console.log('circle mouseup :', this, d);
        // thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
      })
      .call(thisGraph.drag);

    //Circles have a black background, so that the opacity effect works on the coloured circle above it. No darkness/filters possible on svg
    newGs.append("circle")
      .attr("r", String(consts.nodeRadius))
      .attr("fill", "black");

    //Add images to the new Image nodes
    newGs.filter(function(d) {
      return !!d.image;
    }).classed("img", true)
      .append("svg:image")
      .attr("xlink:href",  function(d) {
        return d.image;
      })
      .attr("clip-path","url(#circle-clip)")
      .attr("x", function(d) {
        var i = d.dimensions, r = thisGraph.consts.nodeRadius;
        if (i.width > i.height) {
          return - (i.width * r)/i.height;
        } else {
          return -r;
        }
      })
      .attr("y", function(d) {
        var i = d.dimensions, r = thisGraph.consts.nodeRadius;
        if (i.width < i.height) {
          return - (i.height * r)/i.width;
        } else {
          return -r;
        }
      })
      .attr("height", function(d) {
        var i = d.dimensions, r = thisGraph.consts.nodeRadius;
        if (i.width < i.height) {
          return (i.height * r * 2)/i.width;
        } else {
          return 2*r;
        }
      })
      .attr("width", function(d) {
        var i = d.dimensions, r = thisGraph.consts.nodeRadius;
        if (i.width > i.height) {
          return (i.width * r * 2)/i.height;
        } else {
          return 2*r;
        }
      });

    newGs.append("circle").classed("over", true).attr("fill", function(d) {
      return d.bg_color ? d.bg_color : (d.image ? "transparent" : "#f6fbff");
    }).attr("r", String(consts.nodeRadius));

    newGs.filter(function(d) {
      return !!d.bg_color;
    }).classed("clr", true);

    newGs.each(function(d){
      thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });

    // remove old nodes
    thisGraph.circles.exit().remove();
  };


  GraphCreator.prototype.edge_svg = function(d){
    return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
  }


  /**** Function for the path mouse evnet  ****/

  GraphCreator.prototype.pathMouseDown = function(d3path, d){
    var thisGraph = this,
        state = thisGraph.state;
    d3.event.stopPropagation();
    state.mouseDownLink = d;

    if (state.selectedNode){
      thisGraph.removeSelectFromNode();
    }

    var prevEdge = state.selectedEdge;
    if (!prevEdge || prevEdge !== d){
      thisGraph.replaceSelectEdge(d3path, d);
    } else{
      thisGraph.removeSelectFromEdge();
    }
  };


  /**** Function for the circle mouse evnet  ****/

  // mousedown on node
  GraphCreator.prototype.circleMouseDown = function(d3node, d){

    console.log('Circle mousedown : ', d );

    var thisGraph = this,
        state = thisGraph.state;
    d3.event.stopPropagation();
    state.mouseDownNode = d;
    if (d3.event.shiftKey){
      state.shiftNodeDrag = d3.event.shiftKey;
      // reposition dragged directed edge
      thisGraph.dragLine.classed('hidden', false)
        .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
      return;
    }
  };

  // mouseup on nodes
  GraphCreator.prototype.circleMouseUp = function(d3node, d){


    var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;
    // reset the states
    state.shiftNodeDrag = false;
    d3node.classed(consts.connectClass, false);

    // 记录了起始点node 的位置信息 d
    var mouseDownNode = state.mouseDownNode;
    var targetNode = state.currentTargetNode;

    console.log('Circle mouseup : ', targetNode, mouseDownNode );

    if (!mouseDownNode) return;

    thisGraph.dragLine.classed("hidden", true);

    if (mouseDownNode !== targetNode){
      // we're in a different node: create new edge for mousedown edge and add to graph
      var newEdge = {source: mouseDownNode, target: targetNode};
      // check ob the new edge already exist

      var d3Path = d3.select("svg").select(".paths").selectAll("path");

      thisGraph.paths = d3Path.data(thisGraph.edges, function(d){
        return String(d.source.id) + "+" + String(d.target.id);
      });

      var filtRes = thisGraph.paths.filter(function(d){
        console.log('Filter the path :', d.source, d.target, newEdge.target, newEdge.source);
        if ( d.source === newEdge.target && d.target === newEdge.source ){
          // array.splice(index, howmany, item1, ....., itemX), remove d in edges array
          thisGraph.edges.splice(thisGraph.edges.indexOf(d), 1);
          console.log('Remove the same path:', thisGraph.edges);
        }
        // 设置Filter是否返回结果的条件，满足这个条件则返回值，然后filtRes.size()的结果增加一个
        return d.source === newEdge.source && d.target === newEdge.target;
      });

      // update the graph after filter the edges
      thisGraph.updateGraph();

      // filtRes.size() record the result set of filter
      console.log('Filter result size :', filtRes.size());
      if (!filtRes.size()){
        //draw a new path
        console.log('Draw a new Path');
        thisGraph.edges.push(newEdge);
        thisGraph.updateGraph();
      }
    } else{
      // we're in the same node
      if (state.justDragged) {
        // dragged, not clicked
        state.justDragged = false;
      } else{
        // clicked, not dragged
        if (d3.event.shiftKey){
          // shift-clicked node: edit text content
          // to-do
        } else{

          if (state.selectedEdge){
            // 让被选中的 edge 转换成未被选择状态
            thisGraph.removeSelectFromEdge();
          }
          var prevNode = state.selectedNode;

          if (!prevNode || prevNode.id !== d.id){
            // 如果之前选中的点和当前这个点不是一个点，则更新这个点的选中状态
            thisGraph.replaceSelectNode(d3node, d);
          } else{
            // 如果两者是一个点，则取消选中状态
            thisGraph.removeSelectFromNode();
          }
        }
      }
    }
    state.mouseDownNode = null;
    return;

  }; // end of circles mouseup


/**************************************************************************

    Function management of the selected status of each circles and edges

**************************************************************************/

  GraphCreator.prototype.replaceSelectEdge = function(d3Path, edgeData){
    console.log(" replace selected edge ");
    var thisGraph = this;
    d3Path.classed(thisGraph.consts.selectedClass, true);
    if (thisGraph.state.selectedEdge){
      thisGraph.removeSelectFromEdge();
    }
    thisGraph.state.selectedEdge = edgeData;
  };

  GraphCreator.prototype.replaceSelectNode = function(d3Node, nodeData){
    console.log(" replace selected node ");
    var thisGraph = this;
    d3Node.classed(this.consts.selectedClass, true);
    if (thisGraph.state.selectedNode){
      thisGraph.removeSelectFromNode();
    }
    thisGraph.state.selectedNode = nodeData;
  };

  GraphCreator.prototype.removeSelectFromNode = function(){
    console.log(" remove select state from node ");
    var d3Circles = d3.select("svg").select(".circles").selectAll("g");
    var thisGraph = this;

    d3Circles.filter(function(cd){
      return cd.id === thisGraph.state.selectedNode.id;
    }).classed(thisGraph.consts.selectedClass, false);
    thisGraph.state.selectedNode = null;
  };

  GraphCreator.prototype.removeSelectFromEdge = function(){
    console.log(" remove select state from edge ");
    var d3Path = d3.select("svg").select(".paths").selectAll("path");
    var thisGraph = this;
    d3Path.filter(function(cd){
      return cd === thisGraph.state.selectedEdge;
    }).classed(thisGraph.consts.selectedClass, false);
    thisGraph.state.selectedEdge = null;
  };



/**************************************************************************

             Function for remove selected Node and Edges

**************************************************************************/
   // remove edges associated with a node
  GraphCreator.prototype.spliceLinksForNode = function(node) {
    var thisGraph = this,
        toSplice = thisGraph.edges.filter(function(l) {
      return (l.source === node || l.target === node);
    });
    toSplice.map(function(l) {
      thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
    });
  };




/**************************************************************************

                Function for the circle Text

**************************************************************************/

  /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
  GraphCreator.prototype.insertTitleLinebreaks = function (gEl, title) {
    var words = title.split(/\s+/g),
        nwords = words.length;
        db(gEl);
        gEl.selectAll("text").remove();
    var el = gEl.append("text")
          .attr("text-anchor","middle")
          .attr("dy", "-" + (nwords-1)*2.5);

    for (var i = 0; i < words.length; i++) {
      var tspan = el.append('tspan').text(words[i]);
      if (i > 0)
        tspan.attr('x', 0).attr('dy', '15');
    }
  };

   /**** Function for the circle drag ****/
  GraphCreator.prototype.dragmove = function(d) {
    var thisGraph = this;
    if (thisGraph.state.shiftNodeDrag){
      thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);

    } else{
      d.x += d3.event.dx;
      d.y +=  d3.event.dy;
      thisGraph.updateGraph();
    }
  };


  /* place editable text on node in place of svg text */
  GraphCreator.prototype.changeTextOfNode = function(d3node, d){
    var thisGraph= this,
        consts = thisGraph.consts,
        htmlEl = d3node.node();
    d3node.selectAll("text").remove();
    var nodeBCR = htmlEl.getBoundingClientRect(),
        curScale = nodeBCR.width/consts.nodeRadius,
        placePad  =  5*curScale,
        useHW = curScale > 1 ? nodeBCR.width*0.71 : consts.nodeRadius*1.42;
    // replace with editableconent text
    var d3txt = thisGraph.svg.selectAll("foreignObject")
          .data([d])
          .enter()
          .append("foreignObject")
          .attr("x", nodeBCR.left + placePad )
          .attr("y", nodeBCR.top + placePad)
          .attr("height", 2*useHW)
          .attr("width", useHW)
          .append("xhtml:p")
          .attr("id", consts.activeEditId)
          .attr("contentEditable", "true")
          .text(d.title)
          .on("mousedown", function(d){
            d3.event.stopPropagation();
          })
          .on("keydown", function(d){
            d3.event.stopPropagation();
            if (d3.event.keyCode == consts.ENTER_KEY && !d3.event.shiftKey){
              this.blur();
            }
          })
          .on("blur", function(d){
            d.title = this.textContent;
            thisGraph.insertTitleLinebreaks(d3node, d.title);
            d3.select(this.parentElement).remove();
          });
    return d3txt;
  };

  /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
  GraphCreator.prototype.selectElementContents = function(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };


/**************************************************************************

              Function for the SVG mouse and key action

**************************************************************************/


  // mousedown on main svg
  GraphCreator.prototype.svgMouseDown = function(){
    this.state.graphMouseDown = true;
  };
  // dblclick on main svg
  GraphCreator.prototype.svgDoubleClick = function(){
    console.log('svg double click');
    $("#dclick_prompt").hide();
    var xycoords = d3.mouse(this.svgG.node()),
        d = {id: "New", title: "...", x: xycoords[0], y: xycoords[1], staging:true};
    this.nodes.push(d);
    this.updateGraph();
    this.startAdder();
  }
  // mouseup on main svg
  GraphCreator.prototype.svgMouseUp = function(){
    var thisGraph = this,
        state = thisGraph.state;

        console.log('svg mouse up');
    if (state.justScaleTransGraph) {
      // dragged not clicked
      state.justScaleTransGraph = false;
    } else if (state.shiftNodeDrag){
      // dragged from node
      state.shiftNodeDrag = false;
      thisGraph.dragLine.classed("hidden", true);
    }
    state.graphMouseDown = false;
  };

  // keydown on main svg
  GraphCreator.prototype.svgKeyDown = function() {
    if ($("input").is(":focus")) return;
    console.log('SVG keydown');
    var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;
    // make sure repeated key presses don't register for each keydown
    if(state.lastKeyDown !== -1) return;

    state.lastKeyDown = d3.event.keyCode;
    var selectedNode = state.selectedNode,
        selectedEdge = state.selectedEdge;

    switch(d3.event.keyCode) {
    case consts.BACKSPACE_KEY:
    case consts.DELETE_KEY:
      d3.event.preventDefault();
      if (selectedNode){
        thisGraph.deleteNode(selectedNode);
        this.updateGraph();
        state.selectedNode = null;
      } else if (selectedEdge){
        thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
        state.selectedEdge = null;
        thisGraph.updateGraph();
      }
      break;
    }
  };

  GraphCreator.prototype.svgKeyUp = function() {
    this.state.lastKeyDown = -1;
  };




/**************************************************************************

              Function for Window and Zoom Pan

**************************************************************************/


  GraphCreator.prototype.zoomed = function(){
    var transform = d3.event.transform;
    this.state.justScaleTransGraph = true;
    d3.select("." + this.consts.graphClass)
      .attr("transform", transform);
  };

  GraphCreator.prototype.updateWindow = function(svg){
    var docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];
    var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    var y = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;
    svg.attr("width", x).attr("height", y);
  };


  /**** CUSTOM ****/

  GraphCreator.prototype.startAdder = function() {
    this.stagingNodeData = null;
    this.state.awaitingStagingNodeData = false;
    $("#overlay .card").hide();
    $("#overlay").show();
    $("#node_search_text").val("").focus();
  }

  GraphCreator.prototype.data = function(selector) {
    return d3.select(selector).data()[0];
  }

  GraphCreator.prototype.nodeChosen = function() {
    $("#overlay").hide();
    var nodeData = this.state.stagingNodeData.node;
    if (this.nodeExists(nodeData.id)) {
      Swal.fire({
        type: 'warning',
        title: 'Oops...',
        text: "You've already added this Node."
      });
      this.deleteNode(this.getStagingNode());
      this.updateGraph();
    } else if (this.stagingNodeReady()) {
      var node_pos = this.getStagingNode().data()[0];
      var node_det = this.state.stagingNodeData.node;
      this.deleteNode(this.getStagingNode());
      var new_node = {
        id: node_det.id,
        title: node_det.display.name,
        x: node_pos.x,
        y: node_pos.y
      }
      if (node_det.display.image) {
        new_node.image = node_det.display.image;
        new_node.dimensions = this.state.stagingNodeData.img;
      } else {
        new_node.bg_color = $("#colouriser").val();
      }
      this.nodes.push(new_node);

      for (var i in this.state.stagingNodeData.edges) {
        var edge_det = this.state.stagingNodeData.edges[i];
        var other_id = edge_det.node1_id==new_node.id ? edge_det.node2_id : edge_det.node1_id;
        var target_node = d3.select("#Node"+other_id).data()[0];

        var new_edge = {};
        new_edge.source = edge_det.node1_id==new_node.id ? new_node : target_node ;
        new_edge.target = edge_det.node2_id==new_node.id ? new_node : target_node ;
        this.edges.push(new_edge);
      }

      this.updateGraph();

    }
  }

  GraphCreator.prototype.getStagingNode = function() {
    return d3.select("#NodeNew");
  }

  GraphCreator.prototype.nodeExists = function( id ) {
    return $.inArray(id, this.getAllNodeIds()) != -1;
  }

  GraphCreator.prototype.stagingNodeReadyState = function() {
    return !(!this.state.stagingNodeData || this.state.stagingNodeData.edges===false || this.state.stagingNodeData.img===false);
  }

  GraphCreator.prototype.stagingNodeReady = function() {
    var ready = this.stagingNodeReadyState();
    this.bodyloader(!ready);
    this.state.awaitingStagingNodeData = !ready;
    return ready;
  }

  GraphCreator.prototype.checkStagingWaiting = function() {
    if (this.state.awaitingStagingNodeData && this.stagingNodeReadyState()) {
      this.nodeChosen();
    }
  }



  GraphCreator.prototype.deleteNode = function(node) {
    if (this.state.selectedNode==node) this.state.selectedNode = null;
    this.nodes.splice(this.nodes.indexOf(node), 1);
    this.spliceLinksForNode(node);
  };

  GraphCreator.prototype.prepareStagingNode = function(data, attempts) {
    var thisGraph = this;
    thisGraph.state.stagingNodeData = { node:data, edges:false, img: !data.display.image };
    setTimeout(function() { //simulate delay
      LsDataSource.getNodeWithEdges( data.id, thisGraph.getAllNodeIds(), function(response) {
        if (!response) {
          if (attempts==3) thisGraph.ajaxError();
          return setTimeout(function(){ thisGraph.prepareStagingNode(data, (++attempts || 2)) }, 1000);
        }
        thisGraph.state.stagingNodeData.edges = response.edges;
        thisGraph.checkStagingWaiting();
      });
      if (data.display.image) {
        getImageDimensions(data.display.image, function(dimensions) {
          thisGraph.state.stagingNodeData.img = dimensions;
          thisGraph.checkStagingWaiting();
        });
      }
    });
    /*
    //FULL LIST OF RELATIONSHIPS, COULD BE HELPFUL LATER
    LsDataSource.api( "entities/"+data.id+"/relationships", function(data) {
      db("normal", data);
    });*/
  }

  GraphCreator.prototype.getAllNodeIds = function() {
    var out = [];
    this.circles.each(function(d) {
      out.push(d3.select(this).data()[0].id);
    });
    return out;
  }

  GraphCreator.prototype.bodyloader = function(b) {
    $("body").toggleClass("loading", b!==false);
  }

  d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  };

  function getImageDimensions(url, foo) {
    var img = new Image();
    img.onload = function() {
      foo({
        width: img.width,
        height: img.height
      })
    }
    img.onerror = function() {
      foo({
        width: 100,
        height: 100
      })
    }
    img.src = url;
  }

  /**** MAIN ****/

  // warn the user when leaving
  /*window.onbeforeunload = function(){
    return "Make sure to save your graph locally before leaving :-)";
  };*/

  var docEl = document.documentElement,
      bodyEl = document.getElementsByTagName('body')[0];

  var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
      height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

  var xLoc = width/2 - 25,
      yLoc = 100;

  // initial node data
  /*var nodes = [{title: "new concept", id: 0, x: xLoc, y: yLoc},
               {title: "new concept", id: 1, x: xLoc, y: yLoc + 200}];
  var edges = [{source: nodes[1], target: nodes[0]}];*/
  var nodes = [], edges = [];


  /** MAIN SVG **/
  var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);
  var graph = new GraphCreator(svg, nodes, edges);

  graph.updateGraph();


})(window.d3);
