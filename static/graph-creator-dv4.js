document.onload = (function(d3, undefined){
  "use strict";

  // define graphcreator object
  var GraphCreator = function(){
    var thisGraph = this;

    thisGraph.preview = getvar("preview")==1;
    if (thisGraph.preview) {
      $("body").addClass("preview");
    }

    thisGraph.toolbarWidth = thisGraph.preview ? 0 : 300;

    thisGraph.initDom();
    thisGraph.nodes = [];
    thisGraph.edges = [];

    thisGraph.state = {
      selectedEdge: null,
      mouseDownNode: null,
      mouseDownPos: null,
      transform: null,
      mouseDownLink: null,
      justDragged: false,
      justScaleTransGraph: false,
      lastKeyDown: -1,
      shiftNodeDrag: false,
      selectedText: null,
      currentTargetNode: null // when mouseover set the current targetNode
    };

    thisGraph.overlay = thisGraph.Overlay();

    // define arrow markers for graph links
    var defs = thisGraph.svg.append('svg:defs');
    defs.append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', "32")
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

    defs.append('svg:marker')
      .attr('id', 'end-arrow-selected')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', "32")
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style("fill", "#1284e4");

    defs.append('svg:marker')
      .attr('id', 'end-arrow-hover')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', "32")
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style("fill", "#aaa");

    // define arrow markers for leading arrow
    defs.append('svg:marker')
      .attr('id', 'mark-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 7)
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style("fill", "#ddd");;

    //create clip-path to hide corners of image
    thisGraph.svg.append("clipPath")
    	.attr("id", "circle-clip")
      .append("circle")
    	.attr("cx", 0)
    	.attr("cy", 0)
    	.attr("r", 49)

    thisGraph.svgG = thisGraph.svg.append("g").classed(thisGraph.consts.graphClass, true);

    thisGraph.dragLine = thisGraph.svgG.append('svg:path') // displayed when dragging between nodes
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0')
        .style('marker-end', 'url(#mark-end-arrow)');

    if (!thisGraph.preview) {
      thisGraph.brush = thisGraph.buildBrush();
    }
    thisGraph.svgG.append("g").attr('class', 'paths');
    thisGraph.svgG.append("g").attr('class', 'pathsShadow');
    thisGraph.svgG.append("g").attr('class', 'circles');


    /*Node dragging*/

      thisGraph.drag = d3.drag()
          .subject(function(d){
             return {x: d.x, y: d.y};
          })
          .on("start", function(d){
              // console.log('Drag started :', d);
              //thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
          })
          .on("drag", function(d){
            // console.log('Draged beginn :', args);
            if (thisGraph.preview) return;
            thisGraph.state.justDragged = true;
            thisGraph.dragmove.call(thisGraph, d, d3.select(this));
          })
          .on("end", function(d) {
            thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
          });


    // listen for key events
    d3.select(window).on("keydown", function(e){
      thisGraph.svgKeyDown.call(thisGraph);
    })
    .on("keyup", function(){
      thisGraph.svgKeyUp.call(thisGraph);
    });
    thisGraph.svg.on("mousedown", function(d){
      console.log('svg mouse down');
      closeAllColourPickers();
      thisGraph.removeSelectFromEdge();
      thisGraph.svgMouseDown.call(thisGraph, d);
    });
    thisGraph.svg.on("click", function(d){
      // console.log("svg mouse up");
      thisGraph.svgMouseUp.call(thisGraph, d);
    });
    thisGraph.svg.on("dblclick", function(d){
      // console.log("svg mouse up");
      if (thisGraph.preview) return;
      thisGraph.svgDoubleClick.call(thisGraph, d);
    });


    //Zoom setup
    var dragSvg = d3.zoom().scaleExtent([1/4, 4])
          .on("zoom", function(){
            console.log('zoom');
            if (false && d3.event.sourceEvent.shiftKey){
              // TODO  the internal d3 state is still changing
              return false;
            } else {
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
    thisGraph.zoom = dragSvg;
    thisGraph.svg.call(dragSvg).on("dblclick.zoom", null);

    // listen for resize
    window.onresize = function() {
      thisGraph.updateWindow();
      thisGraph.recenter()
    }

    thisGraph.load();
    thisGraph.recenter()

  };

  /**** Static Functions ****/

  GraphCreator.prototype.recenter = function() {
    if (!this.preview) return;
    try {
      var padding = 25;
      var svg_width = $("svg").width();
      var svg_height = $("svg").height();
      const box = d3.select("svg").select(".circles").node().getBBox();
        box.x -= padding;
        box.y -= padding;
        box.width += padding*2; //strange bug, extra right-padding added, need to compensate for this
        box.height += padding*2;
      const scale = Math.min( svg_width / box.width, svg_height / box.height);
      let transform = d3.zoomIdentity;
      transform = transform.translate(svg_width / 2, svg_height / 2);
      transform = transform.scale(scale);
      transform = transform.translate(-box.x - box.width / 2, -box.y - box.height / 2);
      this.zoom.transform(this.svg, transform);
    } catch(err){}
  }

  GraphCreator.prototype.buildBrush = function() {
    var thisGraph = this;
    var self = {
      brush: thisGraph.svgG.append("g").attr("class", "brush"),
      init: function() {
        self.brusher = d3.brush()
           .extent([[0, 0], [0, 0]])
           .on("start", self.start)
           .on("brush", self.go)
           .on("end", self.end)
           .filter(function(e) {
             return event.ctrlKey || thisGraph.state.ctrlDown;
           });
        self.brush.call(self.brusher);
      },
      start: function() {
        $("body").toggleClass("brushing", true);
        thisGraph.removeSelectFromEdge();
      },
      show: function(b) {
        var in_brush_mode = b!==false;
        $("body").toggleClass("brush", in_brush_mode);
        thisGraph.state.ctrlDown = in_brush_mode;
        self.brush.call(self.brusher.extent(function() {
          return b===false ? [[0,0], [0,0]] : [[-10000,-10000], [10000,10000]];
        }));
      },
      go: function() {
        if (d3.event.sourceEvent.type !== "end") {
          var selection = d3.event.selection;
          thisGraph.setSelected(thisGraph.circles, function(d) {
            var s = d3.select(this).classed("selected") ||
                (selection != null
                && selection[0][0] <= d.x && d.x < selection[1][0]
                && selection[0][1] <= d.y && d.y < selection[1][1]);
                return s;
          });
        }
      },
      end: function() {
        $("body").toggleClass("brushing", false);
        if (d3.event.selection != null) {
          d3.select(this).call(d3.event.target.move, null);
        }
      }
    }
    self.init();
    return self;
  }

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

    thisGraph.svg = d3.select("#svgHolder").append("svg");
    thisGraph.updateWindow();

    $(document).on("contextmenu", function (e) {
      if (thisGraph.state.ctrlDown) {
        e.preventDefault();
        return false;
      }
    });

    $(window).focus(function(e) {
      if (!thisGraph.preview) {
        thisGraph.brush.show(false);
      }
    });

    $("#fsbutton").on("click", toggleFullScreen);

    /*window.onbeforeunload = function(){
      return "Make sure to save your graph locally before leaving :-)";
    };*/

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
    A_KEY: 65,
    nodeRadius: 50
  };


  // call to propagate changes to graph
  GraphCreator.prototype.updateGraph = function(){

    var thisGraph = this,
        consts = thisGraph.consts,
        state = thisGraph.state;

    var d3Path = d3.select("svg").select(".paths").selectAll("path");
    thisGraph.paths = d3Path.data(thisGraph.edges, function(d){
      return String(d.source.id) + "+" + String(d.target.id);
    });

    var d3PathShadow = d3.select("svg").select(".pathsShadow").selectAll("path");
    thisGraph.pathsShadow = d3PathShadow.data(thisGraph.edges, function(d){
      return String(d.source.id) + "+" + String(d.target.id);
    });


    // thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function(d){
    //   return String(d.source.id) + "+" + String(d.target.id);
    // });
    var paths = thisGraph.paths;
    var pathsShadow = thisGraph.pathsShadow;

    // add new paths
    var enter = paths.enter()
      .append("path")
      .classed("link", true)
      .attr("d", this.edge_svg)
      .attr("id", function(d) {
        return "Path_"+d.source.id + "_" + d.target.id;
      });

    function getSisterPath(d) {
      return d3.select("#Path_"+d.source.id + "_" + d.target.id);
    }

    var enter = pathsShadow.enter()
      .append("path")
      .classed("link", true)
      .attr("d", this.edge_svg)
      .on("mouseover", function(d) {
        getSisterPath(d).classed("hovered", true);
      })
      .on("mouseout", function(d) {
        getSisterPath(d).classed("hovered", false);
      })
      .on("mousedown", function(d){
        thisGraph.pathMouseDown.call(thisGraph, getSisterPath(d), d);
      })
      .on("mouseup", function(d){
        console.log("path mouse up : ",  getSisterPath(d).node());
        state.mouseDownLink = null;
      });

    // update existing paths
    paths
      .classed(consts.selectedClass, function(d){
        return d === state.selectedEdge;
      })
      .attr("d", this.edge_svg);

    pathsShadow
      .attr("d", this.edge_svg);

    // remove old links
    paths.exit().remove();
    pathsShadow.exit().remove();


    // update existing nodes
    var d3Circles = d3.select("svg").select(".circles").selectAll("g");
    // update existing nodes
    thisGraph.circles = d3Circles.data(thisGraph.nodes, function(d){ return "Node"+d.id;});
    thisGraph.circles.attr("transform", thisGraph.nodeTransform);
    var circles = thisGraph.circles;

    // add new nodes
    var newGs= circles.enter().append("g");

    newGs.classed(consts.circleGClass, true)
      .attr("id", function(d){return "Node"+d.id})
      .attr("transform", thisGraph.nodeTransform)
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
        console.log('circle mousedown :', this, d);
        closeAllColourPickers();
        thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
        thisGraph.moveToFront(d);
      })
      .on("mouseup", function(d){
        console.log('circle mouseup :', this, d);
        thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
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
    thisGraph.save();

    this.info.update(); //often called after deleteNode

  };


  GraphCreator.prototype.edge_svg = function(d){
    return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
  }


  /**** Function for the path mouse evnet  ****/

  GraphCreator.prototype.pathMouseDown = function(d3path, d){
    var thisGraph = this,
        state = thisGraph.state;

    if (thisGraph.preview) return;

    closeAllColourPickers();
    d3.event.stopPropagation();
    state.mouseDownLink = d;

    thisGraph.clearSelection();

    //d3Path.classed(thisGraph.consts.selectedClass, true);

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

    var thisGraph = this,
        state = thisGraph.state;
    d3.event.stopPropagation();
    state.mouseDownNode = d;
    state.mouseDownPos = {x:d.x, y:d.y};
    if (d3.event.shiftKey){
      state.shiftNodeDrag = d3.event.shiftKey;
      // reposition dragged directed edge
      thisGraph.dragLine.classed('hidden', false)
        .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
      return;
    }
  };

  GraphCreator.prototype.infoPopup = function(d){
    var text = "";
    if (d.blurb) text = "<div class='infopopup'><span>"+d.blurb.title+"</span><span>"+d.blurb.summary+"</span></div>";
    myalert("<div style='color:#0164b3'>"+d.title+"</div>", text);
  }

  // mouseup on nodes
  GraphCreator.prototype.circleMouseUp = function(d3node, d){
    var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;

    if (thisGraph.preview) return thisGraph.infoPopup(d);

    // reset the states
    state.shiftNodeDrag = false;
    d3node.classed(consts.connectClass, false);

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
      if (thisGraph.definitelyDragged(d)) {
        state.justDragged = false;
        thisGraph.save(); //node was moved, trigger saving
      } else {

        thisGraph.removeSelectFromEdge();
        if (d3.event.sourceEvent.ctrlKey || thisGraph.state.ctrlDown) {
          thisGraph.setSelected(d3node, "toggle");
        } else {
          if (thisGraph.getSelected().size()==1 && d3node.classed(consts.selectedClass)) {
            thisGraph.setSelected(d3node, false);
          } else {
            thisGraph.clearSelection(true);
            setTimeout(function() {
              thisGraph.setSelected(d3node, true);
            }); //Timeout here works with moveToFront to avoid the hover-flicker
          }
        }
      }
    }
    state.mouseDownNode = null;
    return;

  }

  GraphCreator.prototype.setSelected = function(nodes, b, skip) {
    if (this.preview) return;
    var selectClass = this.consts.selectedClass;
    if (b=="toggle") {
      nodes.each(function() {
        var node = d3.select(this);
        node.classed(selectClass, !node.classed(selectClass));
      });
    } else { /* function or boolean*/
      nodes.classed(selectClass, b);
    }
    if (!skip) this.info.update();
    this.removeSelectFromEdge();
  }

  GraphCreator.prototype.clearSelection = function(skip){
    this.setSelected(d3.select("svg").select(".circles").selectAll(".conceptG"), false, skip); //e.g. skip if it's known another node about to be selected, so no flicker introduced
  }

  GraphCreator.prototype.deleteNode = function(node, aboutToAdd) {
    this.nodes.splice(this.nodes.indexOf(node), 1);
    if (this.nodes.length==0 && !aboutToAdd) $("#dclick_prompt").show();
    this.spliceLinksForNode(node);
  };

/**************************************************************************

    Function management of the selected status of each circles and edges

**************************************************************************/

  GraphCreator.prototype.definitelyDragged = function(d) {
    if (this.state.justDragged) {
      var a = this.state.mouseDownPos.x - d.x;
      var b = this.state.mouseDownPos.y - d.y;
      var c = Math.sqrt( a*a + b*b );
      return c>2; //moved more than `c`px
    }
    return false;
  }

  GraphCreator.prototype.replaceSelectEdge = function(d3Path, edgeData){
    console.log(" replace selected edge ");
    var thisGraph = this;
    d3Path.classed(thisGraph.consts.selectedClass, true);
    thisGraph.removeSelectFromEdge();
    thisGraph.state.selectedEdge = edgeData;
  };

  GraphCreator.prototype.removeSelectFromEdge = function(){
    var thisGraph = this;
    if (!thisGraph.state.selectedEdge) return;
    console.log(" remove select state from edge ");
    var d3Path = d3.select("svg").select(".paths").selectAll("path");
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

  GraphCreator.prototype.getSelected = function() {
    return d3.select("svg").select(".circles").selectAll("."+this.consts.selectedClass);
  }

  GraphCreator.prototype.dragmove = function(d, d3node) {
    var thisGraph = this;
    if (thisGraph.state.shiftNodeDrag){
      thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);
    } else {

      d.x += d3.event.dx;
      d.y +=  d3.event.dy;

      thisGraph.getSelected().each(function(dd) {
        if (d!=dd && d3node.classed("selected")) {
          dd.x += d3.event.dx;
          dd.y +=  d3.event.dy;
        }
      });

      thisGraph.info.dragged();

      if (!d3node.classed("selected") && thisGraph.definitelyDragged(d)) {
        thisGraph.clearSelection();
      }
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
    if (d3.event.target.nodeName!="svg") return;
    $("#dclick_prompt").hide();
    this.adder.newNode();
  }
  // mouseup on main svg
  GraphCreator.prototype.svgMouseUp = function(){
    if (d3.event.target.nodeName!="svg") return;
    var thisGraph = this, state = thisGraph.state;
    if (!state.ctrlDown) {
      this.clearSelection();
    }
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
    if ($("input").is(":focus") || $("textarea").is(":focus")) return;

    console.log('SVG keydown');

    var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;

    if(state.lastKeyDown !== -1) return; // make sure repeated key presses don't register for each keydown

    db(d3.event.keyCode);
    var is_ctrl_key =  (d3.event.keyCode==17 || d3.event.keyCode==91 || d3.event.keyCode==93); //Command key for Mac, Ctrl elsewhere

    if (is_ctrl_key) {
      state.ctrlDown = true;
      thisGraph.brush.show();
    } else {
      state.lastKeyDown = d3.event.keyCode;
    }

    switch(d3.event.keyCode) {
      case consts.A_KEY:
        if (state.ctrlDown) {
          thisGraph.setSelected(d3.select("svg").select(".circles").selectAll(".conceptG"), true);
        }
      break;
      case consts.ENTER_KEY:
        closeAllColourPickers();
      break;
      case consts.BACKSPACE_KEY:
      case consts.DELETE_KEY:

        d3.event.preventDefault();
        var selected = thisGraph.getSelected();
        if (selected.size()>0){
          selected.each(function(d) {
            thisGraph.deleteNode(d);
          });
          this.updateGraph();
        } else if (state.selectedEdge){
          thisGraph.edges.splice(thisGraph.edges.indexOf(state.selectedEdge), 1);
          state.selectedEdge = null;
          thisGraph.updateGraph();
        }
      break;
    }
  };

  GraphCreator.prototype.svgKeyUp = function() {
    this.state.lastKeyDown = -1;
    this.brush.show(false);
    if (!d3.event.ctrlKey) this.state.ctrlDown = false;
  };




/**************************************************************************

              Function for Window and Zoom Pan

**************************************************************************/


  GraphCreator.prototype.zoomed = function(){
    this.state.transform = d3.event.transform;
    this.state.justScaleTransGraph = true;
    d3.select("." + this.consts.graphClass)
      .attr("transform", d3.event.transform);
    this.save();
  };

  GraphCreator.prototype.updateWindow = function(){
    var docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];
    var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    var y = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;
    this.svg.attr("width", x-this.toolbarWidth).attr("height", y);
  };


  /**** CUSTOM ****/

  GraphCreator.prototype.save = function() {
    if (this.preview) return;
    var saveEdges = [];
    this.edges.forEach(function(val, i){
      saveEdges.push({source: val.source.id, target: val.target.id, });
    });
    var out = window.JSON.stringify({
      "nodes": this.nodes,
      "edges": saveEdges,
      viewport: this.state.transform,
      shapes: this.info._shaper.config.history,
      meta: this.project.meta()
    });
    localStorage.setItem("saved_graph2", out );
  }

  GraphCreator.prototype.load = function() {
    var thisGraph = this;
    var data = localStorage.getItem("saved_graph2");
    db("Loaded", data);
    if (!data || JSON.parse(data).nodes.length==0) data = thisGraph.defaultData();
    var jsonObj = JSON.parse(data);
    if (!jsonObj) return;
    thisGraph.nodes = jsonObj.nodes.filter(function(n) {
      return !n.staging;
    });
    thisGraph.info._shaper.config.history = jsonObj.shapes;
    var newEdges = jsonObj.edges;

    newEdges.forEach(function(e, i){
      newEdges[i] = {
        source: thisGraph.nodes.filter(function(n){return n.id == e.source;})[0],
        target: thisGraph.nodes.filter(function(n){return n.id == e.target;})[0]
      };
    });
    thisGraph.edges = newEdges;
    thisGraph.project.meta( jsonObj.meta );

    if (!thisGraph.nodes) $("#dclick_prompt").show();

    thisGraph.setViewport(jsonObj.viewport);

    thisGraph.updateGraph();
    thisGraph.updateGraph(); //requires twice to make brush work?

  }

  GraphCreator.prototype.nodeTransform = function(d) {
    if (!d.scale) d.scale = 1;
    return "translate(" + d.x + "," + d.y + ") scale("+d.scale+" "+d.scale+")";
  }

  GraphCreator.prototype.setViewport = function(v) {
    this.state.transform = v;
    var zoomExtent = d3.zoom().scaleExtent([v.x, v.y]);
    this.svg.call(zoomExtent.transform, d3.zoomIdentity.translate(v.x, v.y).scale(v.k));
    d3.select("." + this.consts.graphClass).attr("transform", "translate("+v.x+","+v.y+")scale(" +v.k+ ")");
  }

  GraphCreator.prototype.defaultData = function() {
    return window.JSON.stringify({"nodes":[{"id":53756,"title":"David Cameron","x":352.6651956068024,"y":342.590498119622,"image":"https://littlesis.org/images/profile/34/345b8bff6502dace207b886236f9d8521728e340_1273040317.png","dimensions":{"width":185,"height":250},"scale":0.8},{"id":67986,"title":"Boris Johnson","x":433.33350409878494,"y":454.6848950838606,"image":"https://littlesis.org/images/profile/4f/4f2ef90eafc8618280e50d564c3efe92.jpg","dimensions":{"width":200,"height":134},"scale":0.8},{"id":55778,"title":"Michael Gove","x":354.7014660418663,"y":204.50218062516754,"image":"https://littlesis.org/images/profile/ac/ac60d997b9dc853e6b0929023cea30cb.jpg","dimensions":{"width":150,"height":200},"scale":0.8},{"id":163547,"title":"Theresa May","x":438.6399015898029,"y":94.83509867484443,"image":"https://littlesis.org/images/profile/fe/fe61bc575dd06ce517d164f157aac13b.jpg","dimensions":{"width":189,"height":200},"scale":0.8},{"id":232409,"title":"Alexander Temerko","x":577.9181948296973,"y":499.61339363775727,"bg_color":"#D8CDFF","scale":0.8},{"id":276425,"title":"OGN Group","x":579.4036775499206,"y":58.80472109920541,"bg_color":"#D8CDFF","scale":0.8},{"id":91459,"title":"Random House, Inc.","x":577,"y":266,"bg_color":"#FFB8B8","scale":1.2},{"id":15108,"title":"Donald Trump","x":837,"y":266,"image":"https://littlesis.org/images/profile/76/76717d147aec6b8ed1a2e429e6d08a4af8335589_1226284399.png","dimensions":{"width":400,"height":280},"scale":1.2},{"id":326933,"title":"James Go","x":1019.5,"y":165,"bg_color":"#FFFFFF","scale":0.6},{"id":13377,"title":"John Kerry","x":1019.5,"y":245,"image":"https://littlesis.org/images/profile/18/188be541973eef0a5e97ab8b6ba85feb7de486d3_1226040039.png","dimensions":{"width":180,"height":225},"scale":0.6},{"id":234046,"title":"Hello Living","x":1019.5,"y":325,"bg_color":"#FFFFFF","scale":0.6},{"id":257423,"title":"Cambridge Analytica","x":1019.5,"y":405,"bg_color":"#FFFFFF","scale":0.6},{"id":228488,"title":"Test","x":1019.5,"y":85,"image":"https://littlesis.org/images/profile/a8/a82a358599d1836c47bacc277920136a.jpg","dimensions":{"width":200,"height":97},"scale":0.6},{"id":13443,"title":"John S. McCain III","x":1019.5,"y":485,"image":"https://littlesis.org/images/profile/40/409335aedacc7b30575f1012645976284ce7ff5b_1365622416.png","dimensions":{"width":380,"height":251},"scale":0.6}],"edges":[{"source":53756,"target":67986},{"source":67986,"target":163547},{"source":55778,"target":163547},{"source":163547,"target":232409},{"source":232409,"target":67986},{"source":276425,"target":163547},{"source":91459,"target":276425},{"source":91459,"target":232409},{"source":15108,"target":91459},{"source":15108,"target":13377},{"source":15108,"target":13443},{"source":257423,"target":15108},{"source":234046,"target":15108},{"source":326933,"target":15108},{"source":228488,"target":15108}],"viewport":{"k":1,"x":-152,"y":63},"shapes":{"circle_53756_55778_67986_163547_232409_276425":{"center":{"x":660.5430490768784,"y":276.6262151871647},"sliders":[220,1.56,0.82]},"horizontal_53756_55778_67986_163547_232409_276425":{"center":{"x":797.2088062456069,"y":217.77096629290963},"sliders":[100]},"vertical_53756_55778_67986_163547_232409_276425":{"center":{"x":774.2088062456069,"y":290.77096629290963},"sliders":[30]},"vertical_13377_234046_257423_326933":{"center":{"x":1076,"y":295},"sliders":[50]},"vertical_13377_13443_228488_234046_257423_326933":{"center":{"x":1019.5,"y":285},"sliders":[20]}},"meta":{"projectTitle":"Test Map","projectBackgroundURL":"http://s3.amazonaws.com/bw-2e2c4bf7ceaa4712a72dd5ee136dc9a8-bwcore/American-flag-photo.jpg","projectBackgroundOpacity":0.14,"projectArrowColour":"#656565","projectArrowWidth":2}});
  }

  GraphCreator.prototype.Overlay = function() {
    var thisGraph = this;
    thisGraph.adder = thisGraph.AdderPanel();
    thisGraph.info = thisGraph.InfoPanel();
    thisGraph.project = thisGraph.ProjectPanel();
    var self = {
      panel: {
        ADDER: "adder",
        INFO: "info",
        PROJECT: "project"
      },
      current: false,
      init: function() {
        $("#cover").on("click", self.forceClose);
        self.show(self.panel.PROJECT);
      },
      show: function(panel, cover_nodes) {
        $("#overlay > div").hide();
        $("#overlay").show();
        if (cover_nodes) $("#cover").show();
        self.currentObject(panel).show();
        closeAllColourPickers();
      },
      hide: function() {
        $("#cover").hide();
        self.show(self.panel.PROJECT);
        //$("#overlay").hide();
      },
      forceClose: function() {
        var panel = self.currentObject();
        if (panel.forceClose) panel.forceClose();
        self.hide();
      },
      currentObject: function( t ) { /*getter and setter*/
        if (t) self.current = t;
        switch(self.current) {
          case self.panel.ADDER:
            return thisGraph.adder;
          break;
          case self.panel.INFO:
            return thisGraph.info;
          break;
          case self.panel.PROJECT:
            return thisGraph.project;
          break;
        }
      }
    }
    self.init();
    return self;
  }

  GraphCreator.prototype.AdderPanel = function() {
    var thisGraph = this;
    var self = {
      newNode: function() {
        self._staging.build();
        thisGraph.overlay.show(thisGraph.overlay.panel.ADDER, true);
      },
      convertToChosen: function(data) {
        self._staging.convertToChosen(data);
      },
      show: function() { /*required*/
        if (!self._inited) self._init();
        $("#adder .card").hide();
        $("#adder").show();
        $("#node_search_text").val("").focus();
      },
      forceClose: function() { /*required*/
        self._staging.destroy();
      },
      _init: function() {
        $( "#nodeChosenButton" ).on("click", self._nodeChosen);
        self._colourpicker = new ColourPicker(false, false, "#colouriser", "#f6fbff");
        thisGraph.AutoSuggest(self);
        self._inited = true;
      },
      _nodeChosen: function() {
        thisGraph.overlay.hide();
        var nodeData = self._staging.data.node;
        if (thisGraph.nodeExists(nodeData.id)) {
          Swal.fire({
            type: 'warning',
            title: 'Oops...',
            text: "You've already added this Node."
          });
          thisGraph.deleteNode(self._staging.node());
          thisGraph.updateGraph();
        } else if (self._staging.isReady()) {
          var node_pos = self._staging.node().data()[0];
          var node_det = self._staging.data.node;
          thisGraph.deleteNode(self._staging.node(), true);
          var new_node = {
            id: node_det.id,
            title: node_det.display.name,
            x: node_pos.x,
            y: node_pos.y,
            //url: node_det.display.url, //littlesis url
            blurb: self._staging.data.blurb
          }
          if (node_det.display.image) {
            new_node.image = node_det.display.image;
            new_node.dimensions = self._staging.data.img;
          } else {
            new_node.bg_color = self._colourpicker.val();
          }
          thisGraph.nodes.push(new_node);

          db("New Edges", self._staging.data.edges);
          for (var i in self._staging.data.edges) {
            var edge_det = self._staging.data.edges[i];
            var other_id = edge_det.node1_id==new_node.id ? edge_det.node2_id : edge_det.node1_id;
            var target_node = d3.select("#Node"+other_id).data()[0];

            var new_edge = {};
            new_edge.source = edge_det.node1_id==new_node.id ? new_node : target_node ;
            new_edge.target = edge_det.node2_id==new_node.id ? new_node : target_node ;
            thisGraph.edges.push(new_edge);
          }

          /*** Temporary hack to remove multiple relationships between 2 nodes ***/
          thisGraph.edges = thisGraph.edges.filter((thing,index) => {
            return index === thisGraph.edges.findIndex(obj => {
              return JSON.stringify(obj) === JSON.stringify(thing);
            });
          });
          /********/

          thisGraph.updateGraph();

        }
      },
      _staging: {
        data: null,
        awaitingData: false,
        build: function() {
          self._staging.data = null;
          self._staging.awaitingData = false;
          var xycoords = d3.mouse(thisGraph.svgG.node()),
              d = {id: "New", title: "...", x: xycoords[0], y: xycoords[1], staging:true};
          thisGraph.nodes.push(d);
          thisGraph.updateGraph();
        },
        destroy: function() {
          if (self._staging.node().size()>0) {
            thisGraph.deleteNode(self._staging.node());
            thisGraph.updateGraph();
          }
        },
        node: function() {
          return d3.select("#NodeNew");
        },
        readyState: function() {
          return !(!self._staging.data || self._staging.data.edges===false || self._staging.data.img===false || self._staging.data.blurb===false);
        },
        isReady: function() {
          var ready = self._staging.readyState();
          thisGraph.bodyloader(!ready);
          self._staging.awaitingData = !ready;
          return ready;
        },
        proceedIfWaiting: function() {
          if (self._staging.awaitingData && self._staging.readyState()) {
            self._nodeChosen();
          }
        },
        getEdgeInfo: function(data, attempts) {
          LsDataSource.getNodeWithEdges( data.id, thisGraph.getAllNodeIds(), function(response) {
            if (!response) {
              if (attempts==3) thisGraph.ajaxError();
              return setTimeout(function(){ self._staging.getEdgeInfo(data, (++attempts || 2)) }, 1000);
            }
            self._staging.data.edges = response.edges;
            self._staging.proceedIfWaiting();
          });
        },
        getNodeInfo: function(data, attempts) {
          LsDataSource.api( "entities/"+data.id , function(response) {
            db("NODE RESPONSE", response);
            if (!response) {
              if (attempts==3) thisGraph.ajaxError();
              return setTimeout(function(){ self._staging.getNodeInfo(data, (++attempts || 2)) }, 1000);
            }
            self._staging.data.blurb = {
              title: response.data.attributes.blurb,
              summary: response.data.attributes.summary
            }
            self._staging.proceedIfWaiting();
          });
        },
        convertToChosen: function(data, attempts) {
          self._staging.data = { node:data, edges:false, img: !data.display.image, blurb:false };
          setTimeout(function() { //simulate delay
            self._staging.getEdgeInfo(data);
            self._staging.getNodeInfo(data);
            if (data.display.image) {
              getImageDimensions(data.display.image, function(dimensions) {
                self._staging.data.img = dimensions;
                self._staging.proceedIfWaiting();
              });
            }
          });
        }
      }
    }
    return self;
  }

  GraphCreator.prototype.AutoSuggest = function(owner) {
    var thisGraph = this;
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

                self.textEngine.searchTerm = request.term;
                data.sort(self.textEngine.compare);

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
              //$( "#node_search_text" ).autocomplete("close");
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
        owner.convertToChosen(data);
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
      },
      textEngine: {
        compare: function(a,b) {
          var sa = self.textEngine.similarity(a.display.name, self.textEngine.searchTerm);
          var sb = self.textEngine.similarity(b.display.name, self.textEngine.searchTerm);
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
        },
        similarity: function(s1, s2) {
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
          return (longerLength - self.textEngine.editDistance(longer, shorter)) / parseFloat(longerLength);
        },
        editDistance: function(s1, s2) {
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
      }
    }
    self.init();
    return self;
  }


  GraphCreator.prototype.ProjectPanel = function() {
    var thisGraph = this;
    var self = {
      init: function() {
        $("#projectTitle").on("keyup", function() {
          thisGraph.save();
        });
        $("#projectBackgroundURL").on("blur", function() {
          self.background.image_update();
          thisGraph.save();
        });
        $("#projectBackgroundOpacity").slider({
          value: 0.2,
          min: 0,
          max: 1,
          step: 0.01,
          slide: function() {
            setTimeout(function() {
              self.background.opacity_update();
              thisGraph.save();
            });
          }
        });

        self.projectArrowColour = new ColourPicker(function() {
          self.background.arrow_colour_update();
        }, function() {
          thisGraph.save();
        }, "#projectArrowColour");

        $("#projectArrowWidth").slider({
          value: 5,
          min: 1,
          max: 15,
          step: 1,
          slide: function() {
            setTimeout(function() {
              self.background.arrow_width_update();
              thisGraph.save();
            });
          }
        });
        $("#project input[type=text]").on("keypress", function(e) {
          if (e.keyCode==13) $(this).blur(); //enter
        });
        self.preview.init();
        $("#graphSave").on("click", function() {
          myalert("Coming soon", false, "info");
        });
        self._inited = true;
      },
      preview: {
        default: {width:840, height:600},
        start: function() {
          $("#piframe").html( $("<div>").append($("<iframe>").attr("src","index.html?preview=1")) );
          $("#piframe > div").resizable({
            start: function() {
              $("#previewer").addClass("dragging");
            },
            stop: function() {
              $("#previewer").removeClass("dragging");
            },
            resize: function(e, f) {
              self.preview.text_update(f.size);
            }
          });
          self.preview.reset();
          $("body").toggleClass("previewHolder", true);
        },
        text_update: function(dim) {
          $("#pdimensions").text( dim.width +" x "+dim.height );
        },
        stop: function() {
          $("body").toggleClass("previewHolder", false);
        },
        reset: function() {
          $("#piframe > div").css(self.preview.default);
          self.preview.text_update(self.preview.default);
        },
        init: function() {
          $("#graphPreview").on("click", self.preview.start);
          $("#exitPreviewMode").on("click", self.preview.stop);
          $("#pdimensions").on("click", self.preview.reset);
        }
      },
      refresh: function() {/*Perform tasks related to current values*/
        self.background.image_update();
        self.background.opacity_update();
        self.background.arrow_colour_update();
        self.background.arrow_width_update();
      },
      show: function() { /*required*/
        if (!self._inited) self.init();
        $("#project").show();
      },
      background: {
        image_update: function() {
          var url = $("#projectBackgroundURL").val();
          if (url) {
            getImageDimensions(url, function(d, success) {
              if (success===false) {
                if (!thisGraph.preview && navigator.onLine) {
                  myalert('Invalid Image', "Please try again with a different URL", 'warning');
                }
                $("#svgBackground").css("background-image", "none");
                self.background.hide_image();
              }
            });
            $("#svgBackground").css("background-image", "url("+url+")");
          } else {
            self.background.hide_image();
          }
        },
        hide_image: function() {
          $("#svgBackground").css("background-image", "none");
        },
        opacity_update: function() {
          $("#svgBackground").css("opacity", $("#projectBackgroundOpacity").slider("value"));
        },
        arrow_colour_update: function() {
          var c = self.projectArrowColour.val();
          var hover_c = self.background.colourTooDark(c) ? "#777" : d3.rgb(c).darker(2);
          $("body").append("<style>path.link { stroke: "+c+"} path.link.hovered:not(.selected) { stroke: "+hover_c+"}</style>");
        },
        arrow_width_update: function() {
          var width = $("#projectArrowWidth").slider("value");
          $("body").append("<style>path.link { stroke-width: "+width+"px}</style>");
        },
        colourTooDark: function(hexcolor){
          try { //colour input may return non-hex in other browsers
            var r = parseInt(hexcolor.substr(1,2),16);
            var g = parseInt(hexcolor.substr(3,2),16);
            var b = parseInt(hexcolor.substr(4,2),16);
            var yiq = ((r*299)+(g*587)+(b*114))/1000;
            return (yiq < 35);
          } catch(err) {
            return false;
          }
        }
      },
      meta: function( v ) {
        var sg = {
          input: function(i, v) {
            if (v) {
              $("#"+i).val(v);
            } else {
              return $("#"+i).val();
            }
          },
          slider: function(i, v) {
            if (v) {
              $("#"+i).slider("value", v);
            } else {
              return $("#"+i).slider("value");
            }
          },
          colour: function(i, v) {
            if (v) {
              self[i].val(v);
            } else {
              return self[i].val();
            }
          }
        }
        var fields = { //ID :: is_slider
          projectTitle: sg.input,
          projectBackgroundURL: sg.input,
          projectBackgroundOpacity: sg.slider,
          projectArrowColour: sg.colour,
          projectArrowWidth: sg.slider
        }
        if (v) { //setter
          for (var i in fields) {
            fields[i](i, v[i]);
          }
          self.refresh();
        } else { //getter
          var out = {};
          for (var i in fields) {
            out[i] = fields[i](i);
          }
          db(out);
          return out;
        }
      }
    }
    return self;
  }

  GraphCreator.prototype.InfoPanel = function() {
    var thisGraph = this;
    var self = {
      num: 0,
      update: function() {
        var new_count = thisGraph.getSelected().size();
        if (new_count==self.num && self.num!=1) return; //do exception for single node, as introduced case where it skips the close-panel check, when clicking from one node to another
        self.num = new_count;
        if (self.num==0) {
          thisGraph.overlay.hide();
        } else {
          self._build();
          thisGraph.overlay.show(thisGraph.overlay.panel.INFO);
        }
      },
      show: function() { /*required*/
        $("#info").show();
      },
      dragged: function() {
        if (thisGraph.getSelected().size()>1) {
          self._shaper.moveCenter();
        }
      },
      _build: function() {
        if (!self._inited) self._init();
        $("#info #selection_title").text( self._groupValue("title") );
        db("BUILDLING INFO");
        self._blurb.refresh();
        self._scaler.refresh();
        self._colour.refresh();
        self._shaper.refresh();
      },
      _blurb: {
        refresh: function() {
          var blurb = self._groupValue("blurb");
          if (blurb) {
            $("#blurbShort").val(blurb.title);
            $("#blurbLong").val(blurb.summary);
          }
          $("#info #blurb").toggle(!!blurb);
        },
        init: function() {
          $("#blurbShort").on("keyup", self._blurb.save);
          $("#blurbLong").on("keyup", self._blurb.save);
        },
        save: function() {
          if (self.num==1) {
            thisGraph.getSelected().each(function(d) {
              d.blurb = {
                title: $("#blurbShort").val(),
                summary: $("#blurbLong").val()
              }
            });
            thisGraph.save();
          }
        }
      },
      _groupValue: function(field) {
        var single = thisGraph.getSelected().size()==1;
        var firstData = thisGraph.getSelected().data()[0];
        switch(field) {
          case "title":
            return single ? firstData.title : "Multiple Nodes" ;
          case "blurb":
            return single ? firstData.blurb : false ;
          case "scale":
            if (single) {
              return firstData.scale || 1;
            } else {
              var total = 0;
              thisGraph.getSelected().each(function(d) {
                total += d.scale*1 || 1 ;
              });
              var average = total / thisGraph.getSelected().size();
              return Math.round(average*4)/4;
            }
          case "y":
          case "x":
            var min = 0, max = 0;
            var search = field;
            thisGraph.getSelected().each(function(d) {
              if (!min || d[field] < min) min = d[field];
              if (!max || d[field] > max) max = d[field];
            });
            return min+(max-min)/2 ;
          case "width":
          case "height":
            var min, max;
            var search = field=="width" ? "x" : "y";
            thisGraph.getSelected().each(function(d) {
              if (typeof min =="undefined" || d[search] < min) min = d[search];
              if (typeof max =="undefined" || d[search] > max) max = d[search];
            });
            return max-min;
        }
      },
      _init: function() {
        self._scaler.init();
        self._colour.init();
        self._shaper.init();
        self._blurb.init();
        self._inited = true;
      },
      _colour: {
        init: function() {
          self._colour.picker = new ColourPicker(function() {
            self._colour.update();
          }, function() {
            thisGraph.save();
          }, "#colouriserEdit", "#f6fbff");
        },
        refresh: function() {
          var n = self._colour.count();
          $("#colourEditHolder").toggle(n>0);
          if (n>0) {
            self._colour.picker.val( self._colour.list().data()[0].bg_color );
          }
        },
        update: function() {
          var c = self._colour.picker.val();
          self._colour.list().selectAll("circle")
          .attr("fill", function(d) {
            d.bg_color = c;
            return d.bg_color;
          });
        },
        count: function() {
          return self._colour.list().size();
        },
        list: function() {
          return d3.select("svg").select(".circles").selectAll(".selected.clr");
        }
      },
      _shaper: {
        shapes: {
          "circle": {
            sliders: [
              {
                default: function() {
                  return self._groupValue("width") / 2;
                },
                start: 0,
                end: 1200,
                step: 10,
                prompt: "Radius"
              },
              {
                default: 0,
                start: 0,
                end: 6.3,
                step: 0.01,
                prompt: "Rotation",
                label: function(d) {
                  return Math.floor(d * 180/Math.PI) + "&deg;";
                }
              },
              {
                default: 1/2,
                start: 1/2,
                end: 3,
                step: 0.01,
                prompt: "Curve",
                label: function(d) {
                  d += 0.5; //let's make circle = 1, instead of the actual equation variable 0.5
                  d = Math.round(d*100)/100;
                  if (d===1) return d+" (circle)";
                  return d;
                }
              }
            ],
            text: "Circle / Curve",
            updateCenterOnDrag: true,
            position: function() {
              var ds = thisGraph.getSelected();

              var center_x = self._shaper.avg_x;
              var center_y = self._shaper.avg_y;

              var radius = self._shaper.sliders.get("circle", 0).val();
              var angle_start = self._shaper.sliders.get("circle", 1).val();
              if (angle_start>Math.PI*2) angle_start = Math.PI*2;

              var curve = self._shaper.sliders.get("circle", 2).val();

              var numNodes = ds.size();
              var width = (radius * 2) + 50,
                  height = (radius * 2) + 50,
                  angle, i = 0;
              var positions = [];

              for (var i=0; i<numNodes; i++) {
                angle = angle_start + (i / (numNodes*curve)) * Math.PI;

                var pos = {
                  x: center_x + (radius * Math.cos(angle)),
                  y: center_y + (radius * Math.sin(angle))
                }
                //Find closest node to position
                var result = self._shaper.closestNode(ds, pos);
                ds = result.list;
                result.data.x = pos.x;
                result.data.y = pos.y;
              }
            }
          },
          "horizontal": {
            sliders: [{
              default: 50,
              start: 0,
              end: 300,
              step: 10,
              prompt: "Padding"
            }],
            text: "Horizontal Line",
            position: function() {
              self._shaper.straightLinePositioner("x");
            }
          },
          "vertical": {
            sliders: [{
              default: 50,
              start: 0,
              end: 300,
              step: 10,
              prompt: "Padding"
            }],
            text: "Vertical Line",
            position: function() {
              self._shaper.straightLinePositioner("y");
            }
          }
        },
        init: function() {
          var out = [];
          out.push( self._shaper.options.build() );
          out.push( self._shaper.sliders.build() );
          $("#shaperOptions").append(out);
        },
        update: function() {
          if (!self._shaper.isActive()) return;
          var data = self._shaper.shapes[ self._shaper.options.val() ];
          data.position();
          self._shaper.config.save();
          thisGraph.updateGraph();
        },
        config: {
          history: {},
          save: function() {
            var c = self._shaper.config;
            if (self._shaper.isActive()) {
              var sliders = self._shaper.sliders.getAll( self._shaper.options.val() );
              var out = {
                center: {
                  x: self._shaper.avg_x,
                  y: self._shaper.avg_y
                },
                sliders: []
              }
              for (var i in sliders) out.sliders.push(sliders[i].val());
              c.history[c.currentId()] = out;
              thisGraph.save();
            } else {
              //Not actively shaping, so just update the average position of the nodes in question, so that they can have the same relative position after dragging (e.g. circle needs to keep it's proper center-point)
              for (var i in self._shaper.shapes) {
                if (self._shaper.shapes[i].updateCenterOnDrag) {
                  var history = c.history[c.currentId(i)];
                  if (history) {
                    history.center = {
                      x: self._shaper.avg_x,
                      y: self._shaper.avg_y
                    }
                    db(c.currentId(i), c.history[c.currentId(i)]);
                    thisGraph.save();
                  }
                }
              }
            }
          },
          load: function() {
            var c = self._shaper.config;
            var history = c.history[c.currentId()];
            var sliders = self._shaper.sliders.getAll( self._shaper.options.val() );
            if (history) {
              self._shaper.avg_x = history.center.x;
              self._shaper.avg_y = history.center.y;
              for (var i in sliders) {
                sliders[i].val( history.sliders[i] );
              }
            } else {
              for (var i in sliders) {
                sliders[i].showDefault();
              }
            }
          },
          currentId: function( i ) {
            var s = thisGraph.getSelected().sort(function(a, b) {
               return d3.ascending(a.id, b.id);
            });
            var n = i ? i : self._shaper.options.val();
            s.each(function(d) {
              n += "_" + d.id;
            });
            return n;
          }
        },
        refresh: function() {
          var show = thisGraph.getSelected().size()>1;
          if (show) {
            self._shaper.options.reset();
            self._shaper.resetCenter();
          }
          $("#shaper").toggle(show);
        },
        isActive: function() {
          return thisGraph.getSelected().size()>1 && $("#shaper").is(":visible") && self._shaper.options.val() != self._shaper.options.default.name;
        },
        resetCenter: function() { /*mainly for circle - since rotating gives a new average center depending on positions of nodes, so isn't steady*/
          self._shaper.avg_x = self._groupValue("x");
          self._shaper.avg_y = self._groupValue("y");
        },
        moveCenter: function() {
          if (!d3.event) return;
          self._shaper.avg_x += d3.event.dx;
          self._shaper.avg_y += d3.event.dy;
          self._shaper.config.save();
        },
        closestNode: function(nodes, pos) {
          var shortest, node, data;
          nodes.each(function(d) {
            var distance = Math.pow(d.x-pos.x, 2) + Math.pow(d.y-pos.y, 2); //square rooting unecessary
            if (typeof shortest=="undefined" || distance<shortest) {
              shortest = distance;
              node = this;
              data = d;
            }
          });
          return {
            list: nodes.filter(function() {
              return (this!=node);
            }),
            data: data
          }
        },
        straightLinePositioner: function( dir ) { /* x or y*/
          var ds = thisGraph.getSelected();
          var size_dimension = dir=="x" ? "width" : "height";
          var opposite_point = dir=="x" ? "y" : "x";
          var slider_name = dir=="x" ? "horizontal" : "vertical";

          var num = ds.size();
          var padding = self._shaper.sliders.get(slider_name).val();
          var end_width = 0, j = 0;

          ds = ds.sort(function(a, b) { //keep in closest x order
             return d3.ascending(a[dir], b[dir]);
          });

          ds.each(function(d) { //pre-calculate new width to devise initial x-position
            var scale = d.scale || 1 ;
            var node_width = d3.select(this).select("circle").node().getBBox()[size_dimension] * scale;
            if (j==0 || j==num-1) node_width /= 2;
            end_width += node_width;
            j++;
          });
          end_width += padding*(num-1);

          var xpos = self._groupValue(dir) - end_width/2; //make it increase in size from the center
          var y = self._groupValue(opposite_point);
          j = 0;
          ds.each(function(d) {
            var scale = d.scale || 1 ;
            var node_width = d3.select(this).select("circle").node().getBBox()[size_dimension] * scale;
            if (j!=0) xpos += node_width/2;
            d[opposite_point] = y;
            d[dir] = xpos;
            xpos += node_width / 2 + padding;
            j++;
          });
        },
        options: {
          default: {
            name: "none",
            text: "None"
          },
          build: function() {
            var options = self._shaper.options;
            options.holder = $("<select>");
            options.holder.on("change", options.change)
            options.holder.append( options.node(options.default.name, options.default.text) );
            for (var i in self._shaper.shapes) {
              options.holder.append( options.node(i, self._shaper.shapes[i].text) );
            }
            return options.holder;
          },
          reset: function() {
            var options = self._shaper.options;
            options.val( options.default.name );
          },
          val: function( v ) {
            var options = self._shaper.options;
            if (v) { //setter
              options.holder.val( v );
              options.change();
            } else { //getter
              return options.holder.val();
            }
          },
          node: function(name, text) {
            return $("<option>").text(text).val(name);
          },
          change: function() {
            self._shaper.options.animate();
            self._shaper.sliders.select( self._shaper.options.val() );
            self._shaper.config.load();
            self._shaper.update();
          },
          animate: function() {
            $("body").addClass("animate");
            if (self._shaper.animateWait) clearTimeout(self._shaper.animateWait);
            self._shaper.animateWait = setTimeout(function() {
              $("body").removeClass("animate");
            }, 250);
          }
        },
        sliders: {
          build: function() {
            var sliders = self._shaper.sliders;
            var shapes = self._shaper.shapes;
            sliders.holder = $("<div>");
            sliders.link = {};
            for (var i in shapes) {
              sliders.link[i] = [];
              for (var j in shapes[i].sliders) {
                sliders.link[i][j] = new sliders.Node(i, shapes[i].sliders[j]);
                sliders.holder.append( sliders.link[i][j].container );
              }
            }
            sliders.select( self._shaper.options.default.name );
            return sliders.holder;
          },
          get: function(name, which) {
            which = which || 0;
            return self._shaper.sliders.link[name][which];
          },
          getAll: function(name) {
            return self._shaper.sliders.link[name];
          },
          select: function( name ) {
            self._shaper.sliders.holder.find("> div").hide();
            if (name != self._shaper.options.default.name) {
              self._shaper.sliders.holder.find("."+name).show();
            }
          },
          Node: function(name, data) {
            var sc = this;
            this.init = function() {
              sc.slider = $("<div>");
              sc.slider.slider({
                value: !isNaN(data.default) ? data.default : data.default(),
                min: data.start,
                max: data.end,
                step: data.step,
                slide: function() {
                  setTimeout(function() {
                    sc.refreshText();
                    self._shaper.update();
                    setTimeout(function() {
                      if (data.animate==false) $("body").addClass("noanimate");
                    })
                  });
                }
              });
              sc.container = $("<div>").addClass(name);
              sc.container.append("<div class='prompt'></div>")
              sc.container.append(sc.slider);
              sc.refreshText();
            }
            this.refreshText = function() {
              var out = data.prompt+": ";
              out += data.label ? data.label(sc.val()) : sc.val();
              sc.container.find(".prompt").html(out);
            }
            this.showDefault = function() {
              var num = !isNaN(data.default) ? data.default : data.default();
              this.val( num );
            }
            this.val = function( v ) {
              if (!isNaN(v)) { //setter
                sc.slider.slider("value", v);
                sc.refreshText();
              } else { //getter
                return sc.slider.slider("value");
              }
            }
            this.init();
            return this;
          }
        }
      },
      _scaler: {
        init: function() {
          $("#scaleSlider").slider({
            value: 1,
            min: 0.2,
            max: 3,
            step: 0.1,
            slide: function() {
              setTimeout(function() {
                self._scaler.update();
                self._scaler.doScale();
              });
            }
          });
          self._scaler.update();
        },
        refresh: function() {
          self._scaler.val( self._groupValue("scale") );
        },
        doScale: function() {
          var v = self._scaler.val();
          thisGraph.getSelected().each(function(d) {
            d.scale = v;
          });
          self._shaper.update();
          thisGraph.updateGraph();
        },
        update: function() {
          self._scaler.text( self._scaler.val() );
        },
        val: function( v ) {
          if (!isNaN(v)) { //setter
            $("#scaleSlider").slider("value", v);
            self._scaler.text(v);
          } else { //getter
            return $("#scaleSlider").slider("value");
          }
        },
        text: function(val) {
          $("#scaleAmount").text( "Scale: "+val );
        }
      }
    }
    return self;
  }

  GraphCreator.prototype.data = function(selector) {
    return d3.select(selector).data()[0];
  }

  GraphCreator.prototype.nodeExists = function( id ) {
    return $.inArray(id, this.getAllNodeIds()) != -1;
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

  GraphCreator.prototype.moveToFront = function(d) {
    this.circles.each(function(e) { //Rather than append the node to the front, push everything else behind, to avoid the hover flicker
      if (e.id!=d.id) {
        this.parentNode.prepend(this);
      }
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
      }, false)
    }
    img.src = url;
  }

  function myalert(title, text, icon) {
    Swal.fire({
      title: title,
      html: text,
      type: icon
    });
  }

  var CPS = [];
  function closeAllColourPickers() {
    for (var i in CPS) {
      CPS[i].picker.hide();
    }
  }

  function ColourPicker( onsmallchange, onbigchange, replaceNode, value ) {
    this.init = function() {
      CPS.push(this);
      this.button = $("<button>").addClass("colourpicker");
      this.picker = new jscolor( this.button.get(0), {
        onFineChange: onsmallchange,
        change: onbigchange,
        value: this.removeHash(value) || "dddddd",
        valueElement: null
      });
      if (replaceNode) $(replaceNode).replaceWith(this.button.get(0));
    }
    this.val = function( v ) {
      if (v) {
        this.picker.fromString( this.removeHash(v) );
      } else {
        return this.picker.toHEXString();
      }
    }
    this.removeHash = function(c) {
      if (!c) return false;
      return c.split("#").pop();
    }
    this.getNode = function() {
      return this.button.get(0);
    }
    this.init();
  }

  function getvar(variable) {
     var query = window.location.search.substring(1);
     var vars = query.split("&");
     for (var i=0;i<vars.length;i++) {
             var pair = vars[i].split("=");
             if(pair[0] == variable){return pair[1];}
     }
     return(false);
  }

  function toggleFullScreen(event) {
    var element = document.body;

  	if (event instanceof HTMLElement) {
  		element = event;
  	}

  	var isFullscreen = document.webkitIsFullScreen || document.mozFullScreen || false;

  	element.requestFullScreen = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || function () { return false; };
  	document.cancelFullScreen = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || function () { return false; };

  	isFullscreen ? document.cancelFullScreen() : element.requestFullScreen();
  }

  /**** MAIN ****/

  var graph = new GraphCreator();

})(window.d3);
