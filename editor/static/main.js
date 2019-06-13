document.onload = (function(d3, undefined){
  "use strict";

  var GraphCreator = function(){}

  GraphCreator.prototype.init = function(id, preview) {

    var thisGraph = this;

    if (thisGraph.inited) return;
    thisGraph.inited = true;

    thisGraph.userView = (id || preview);
    thisGraph.storeId = "saved_graph4"; //token for localstorage
    thisGraph.edge_master = thisGraph.EdgeMaster();

    if (thisGraph.userView) {
      $("body").addClass("preview");
    }

    thisGraph.toolbarWidth = thisGraph.userView ? 0 : 300;

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
      currentTargetNode: null
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

    defs.append("filter").attr("id", "blur")
        .append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "1,1");

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
    	.attr("r", 50);

    thisGraph.svg.append("clipPath")
    	.attr("id", "square-clip")
      .append("rect")
    	.attr("x", -50)
    	.attr("y", -50)
    	.attr("width", 100)
      .attr("height", 100);

    thisGraph.svgG = thisGraph.svg.append("g").classed(thisGraph.consts.graphClass, true);

    thisGraph.dragLine = thisGraph.svgG.append('svg:path') // displayed when dragging between nodes
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0')
        .style('marker-end', 'url(#mark-end-arrow)');

    if (!thisGraph.userView) {
      thisGraph.brush = thisGraph.buildBrush();
    }

    thisGraph.svgG.append("g").attr('class', 'paths');
    thisGraph.svgG.append("g").attr('class', 'pathsShadow');
    thisGraph.svgG.append("g").attr('class', 'circles');

    thisGraph.drag = d3.drag()
      .subject(function(d){
         return {x: d.x, y: d.y};
      })
      .on("drag", function(d){
        if (thisGraph.userView) return;
        thisGraph.state.justDragged = true;
        thisGraph.dragmove.call(thisGraph, d, d3.select(this));
      })
      .on("end", function(d) {
        thisGraph.state.mouseDownLink = null;
        if (!d.source) {
          thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
        }
      });

    d3.select(window).on("keydown", function(e){
      thisGraph.svgKeyDown.call(thisGraph);
    }).on("keyup", function(){
      thisGraph.svgKeyUp.call(thisGraph);
    });

    thisGraph.svg.on("mousedown", function(d){
      closeAllColourPickers();
      thisGraph.removeSelectFromEdge();
      thisGraph.svgMouseDown.call(thisGraph, d);
    });

    thisGraph.svg.on("click", function(d){
      thisGraph.svgMouseUp.call(thisGraph, d);
    });

    thisGraph.svg.on("dblclick", function(d){
      if (!thisGraph.userView) {
        thisGraph.svgDoubleClick.call(thisGraph, d);
      }
    });

    //Zoom setup
    var dragSvg = d3.zoom().scaleExtent([1/2, 3])
      .on("zoom", function(){
        thisGraph.zoomed.call(thisGraph);
        return true;
      })
      .on("start", function(){
        $("body").toggleClass("dragging", true);
      })
      .on("end", function(){
        $("body").toggleClass("dragging", false);
        thisGraph.state.justScaleTransGraph = false;
      });

    thisGraph.zoom = dragSvg;
    thisGraph.svg.call(dragSvg);
    if (!thisGraph.userView) {
      thisGraph.svg.on("dblclick.zoom", null);
    }

    window.onresize = function() {
      thisGraph.updateWindow();
      thisGraph.recenter()
    }

  }


  GraphCreator.prototype.recenter = function() {
    //if (!this.userView) return;
    try {
      var padding = 25;
      var svg_width = $("svg").width();
      var svg_height = $("svg").height();

      const box = d3.select("svg").select(".circles").node().getBBox();
        box.x -= padding;
        box.y -= padding;
        box.width += padding*2;
        box.height += padding*2;
      const scale = Math.min( svg_width / box.width, svg_height / box.height);
      let transform = d3.zoomIdentity;
      transform = transform.translate(svg_width / 2, svg_height / 2);
      transform = transform.scale(scale);
      transform = transform.translate(-box.x - box.width / 2, -box.y - box.height / 2);
      this.zoom.transform(this.svg, transform);
      this.zoom.scaleExtent([Math.min(1/2, scale), 3])
    } catch(err){}
  }

  GraphCreator.prototype.zoomIn = function() {
    this.animation();
    this.zoom.scaleBy(this.svg, 1.3);
  }

  GraphCreator.prototype.zoomOut = function() {
    this.animation();
    this.zoom.scaleBy(this.svg, 0.77);
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
        thisGraph.circles.each(function(d) {
          d.previouslySelected = d3.select(this).classed("selected");
        });
      },
      show: function(b) {
        var in_brush_mode = b!==false;
        $("body").toggleClass("brush", in_brush_mode);
        thisGraph.state.ctrlDown = in_brush_mode;
        self.brush.call(self.brusher.extent(function() {
          return b===false ? [[0,0], [0,0]] : [[-15000,-15000], [15000,15000]];
        }));
      },
      go: function() {
        if (d3.event.sourceEvent.type !== "end") {
          var selection = d3.event.selection;
          thisGraph.setSelected(thisGraph.circles, function(d) {
            var s = d.previouslySelected ^
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
      this.offlineMessage();
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
      if (!thisGraph.userView) {
        thisGraph.brush.show(false);
      }
    });

    $("#fsButton").on("click", toggleFullScreen);
    $("#shareButton").on("click", function() {
      thisGraph.sharePopup();
    });
    $("#zoomInButton").on("click", function() {
      thisGraph.zoomIn();
    });
    $("#zoomOutButton").on("click", function() {
      thisGraph.zoomOut();
    });

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

  GraphCreator.prototype.isLocal = function() {
    return window.location.origin=="http://www.desmog.local" || window.location.origin=="http://desmog.local";
  }

  GraphCreator.prototype.facebookLink = function(){
    var url = this.get_project_url(true) ;
    var share_url = encodeURIComponent(url);
    return "https://www.facebook.com/sharer/sharer.php?u="+share_url;
  }

  GraphCreator.prototype.sharePopup = function(){
    var popup;
    if (this.mapId) {
      var thisGraph = this;
      var url = thisGraph.get_project_url(true) ;
      popup = $("#sharePopupContent").clone(true);
      var copy_link_button = popup.find("#copy_link");

      popup.find("#share_link_text").val(url);
      copy_link_button.on("click", function() {
        thisGraph.copyToClipboard(url);
        copy_link_button.text("COPIED!");
        setTimeout(function() {
          copy_link_button.text("COPY")
        }, 500);
      });

      var share_url = encodeURIComponent(url);
      var title = encodeURIComponent("Check this out: \""+thisGraph.project.meta().projectTitle+"\"");

      popup.find("#facebookLink").attr("href", "https://www.facebook.com/sharer/sharer.php?u="+share_url);
      popup.find("#twitterLink").attr("href", "https://twitter.com/intent/tweet?text="+title+"&url="+share_url);

      popup.find("#embedLink").on("click", function() {
        var embed = $("#embedPopupContent").clone(true);
        var code = '<iframe src="'+thisGraph.get_project_url()+'" width="840" height="600" frameborder="0" allowfullscreen></iframe>';
        embed.find("textarea").val(code);
        Swal.fire({
          title: 'Embed',
          html: embed.get(0),
          showCloseButton: true,
          confirmButtonText: "Copy Code"
        }).then((result) => {
          if (result.value) {
            thisGraph.copyToClipboard( code );
          }
        });
      });

    } else {
      popup = $("<div>").append("Sharing is only for live maps (because social media sites need access to the final URL). Save this map first, and you can then view sharing on the direct link to the map.");
    }
    Swal.fire({
      title: 'Share',
      html: popup.get(0),
      showCloseButton: true,
      showConfirmButton: false
    });
  }


  GraphCreator.prototype.updateGraph = function(){

    var thisGraph = this,
        consts = thisGraph.consts,
        state = thisGraph.state;

    var d3Path = d3.select("svg").select(".paths").selectAll("path");
    thisGraph.paths = d3Path.data(thisGraph.edges, function(d){
      return String(d.source.id) + "+" + String(d.target.id);
    })

    var d3PathShadow = d3.select("svg").select(".pathsShadow").selectAll("path");
    thisGraph.pathsShadow = d3PathShadow.data(thisGraph.edges, function(d){
      return String(d.source.id) + "+" + String(d.target.id);
    });

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

    var enter = pathsShadow.enter()
      .append("path")
      .classed("link", true)
      .attr("d", this.edge_svg)
      .attr("id", function(d) {
        return "PathShadow_"+d.source.id + "_" + d.target.id;
      })
      .on("mouseover", function(d) {
        thisGraph.getSisterPath(d).classed("hovered", true);
      })
      .on("mouseout", function(d) {
        thisGraph.getSisterPath(d).classed("hovered", false);
      })
      .on("mousedown", function(d){
        thisGraph.pathMouseDown.call(thisGraph, thisGraph.getSisterPath(d), d);
      })
      .on("dblclick", function(d){ //remove curve from dblclicked line
        d.curve = null;
        d.info.setWidth(null);
        thisGraph.updateGraph();
      })
      .on("mouseup", function(d){
        state.mouseDownLink = null;
      }).call(thisGraph.drag);

    // update existing paths
    paths
      .classed(consts.selectedClass, function(d){
        return d === state.selectedEdge;
      })
      .attr("d", this.edge_svg);

    pathsShadow
      .attr("d", this.edge_svg);

    paths.each(function(d) {
      if (d.width) {
        d.info.setWidth(d.width);
      }
    });

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
        state.currentTargetNode = d;
        if (state.shiftNodeDrag){
          d3.select(this).classed(consts.connectClass, true);
        }
      })
      .on("mouseout", function(d){
        d3.select(this).classed(consts.connectClass, false);
      })
      .on("mousedown", function(d){
        closeAllColourPickers();
        thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
        thisGraph.moveToFront(d);
      })
      .on("mouseup", function(d){
        thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
      })
      .call(thisGraph.drag);

    //Circles have a black background, so that the opacity effect works on the coloured circle above it. No darkness/filters possible on svg
    newGs.append("circle")
      .attr("r", String(consts.nodeRadius))
      .attr("fill", "black");

    newGs.append("rect")
      .attr("x", -50).attr("y", -50).attr("width", 100).attr("height", 100)
      .attr("fill", "black");

    newGs.append("svg:image")
      .attr("xlink:href",  function(d) {
        return d.image;
      }).attr("clip-path","url(#circle-clip)")
      .on("error", function() {
        $(this).attr("href", (thisGraph.userView ? "editor/" : "") + ("images/black.gif"));
      });

    //Add images to the new Image nodes
    var images = newGs.filter(function(d) {
      var is_image = typeof d.image_mode === "undefined" ? !!d.image : d.image_mode;
      d.image_mode = is_image;
      return is_image;
    }).classed("img", true);

    thisGraph.positionNodeImages(images.select("image"));

    newGs.append("circle").classed("over", true).attr("fill", function(d) {
      return d.bg_color ? d.bg_color : (d.image ? "transparent" : "#f6fbff");
    }).attr("r", String(consts.nodeRadius));

    newGs.append("rect").classed("over", true).attr("fill", function(d) {
      return d.bg_color ? d.bg_color : (d.image ? "transparent" : "#f6fbff");
    }).attr("x", -50).attr("y", -50).attr("width", 100).attr("height", 100);


    newGs.filter(function(d) {
      return !d.image_mode; //!!d.bg_color;
    })
    .classed("clr", true)
    .classed("white_text", function(d) {
      return thisGraph.tooDark(d.bg_color);
    });

    newGs.filter(function(d) { //text permanence
      return typeof d.tp === "undefined" ? false : !!d.tp;
    }).classed("always_text", true);

    newGs.filter(function(d) { //hide border
      return typeof d.hb === "undefined" ? false : !!d.hb;
    }).classed("hide_border", true).select("circle");

    newGs.each(function(d) { //other shape nodes
      if (typeof d.ns !== "undefined" && d.ns!="circle") {
        var node = d3.select(this)
        node.classed(d.ns, true);
        node.select("image").attr("clip-path", "url(#"+d.ns+"-clip)" );
      }
    });

    newGs.each(function(d){
      thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });

    // remove old nodes
    thisGraph.circles.exit().remove();
    //thisGraph.save();

    this.info.update(); //often called after deleteNode

  };

  GraphCreator.prototype.getSisterPath = function(d) {
    return d3.select("#Path_"+d.source.id + "_" + d.target.id);
  }

  GraphCreator.prototype.updateEdgeCurve = function(d, node, bezier) {
    d.curve = bezier;
    node.attr("d", this.edge_svg);
    this.getSisterPath(d).attr("d", this.edge_svg);
  }

  GraphCreator.prototype.edge_svg = function(d){
    var lineGenerator = d3.line().curve(d3.curveNatural);

    var points = [];
    points.push([d.source.x, d.source.y]);
    if (d.curve) points.push([d.curve[0], d.curve[1]]);
    points.push([d.target.x, d.target.y]);
    var pathData = lineGenerator(points);
    return pathData;//"M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
  }


  /**** Function for the path mouse evnet  ****/

  GraphCreator.prototype.pathPopup = function(d) {
    var thisGraph = this;
    var html = $("#hidden #PathFeedback").clone(true);
    html.find(".round:first-child").text(d.source.title);
    html.find(".round:last-child").text(d.target.title);
    var list = html.find(".roles");
    d.info.list.forEach(function(p) {
      if (!$.trim(p.label)) return;
      var out = $("<div>").append( thisGraph.linkify(p.label) );
      if (p.arrow==1) out.append('<img src="editor/images/right.svg" class="left">');
      if (p.arrow==2) out.append('<img src="editor/images/left.svg" class="right">');
      list.append(out);
    })
    //html.click(Swal.close);
    Swal.fire({
      title: 'Relationship',
      html: html.get(0),
      showCloseButton: true,
      showConfirmButton: true,
      customClass: "nopadding"
    });
  }

  GraphCreator.prototype.positionNodeImages = function(images) {
    var thisGraph = this;
    var default_dim = {width:100, height:100};
    images.attr("x", function(d) {
      var i = d.dimensions || default_dim, r = thisGraph.consts.nodeRadius;
      if (i.width > i.height) {
        return - (i.width * r)/i.height;
      } else {
        return -r;
      }
    })
    .attr("y", function(d) {
      var i = d.dimensions || default_dim, r = thisGraph.consts.nodeRadius;
      if (i.width < i.height) {
        return - (i.height * r)/i.width;
      } else {
        return -r;
      }
    })
    .attr("height", function(d) {
      var i = d.dimensions || default_dim, r = thisGraph.consts.nodeRadius;
      if (i.width < i.height) {
        return (i.height * r * 2)/i.width;
      } else {
        return 2*r;
      }
    })
    .attr("width", function(d) {
      var i = d.dimensions || default_dim, r = thisGraph.consts.nodeRadius;
      if (i.width > i.height) {
        return (i.width * r * 2)/i.height;
      } else {
        return 2*r;
      }
    });
  }

  GraphCreator.prototype.pathMouseDown = function(d3path, d, noMouseUp){
    var thisGraph = this,
        state = thisGraph.state;

    if (thisGraph.userView) {

      thisGraph.pathPopup(d);

    } else {

      closeAllColourPickers();

      if (d3.event.stopPropagation) d3.event.stopPropagation();

      if (!noMouseUp) state.mouseDownLink = d;

      thisGraph.clearSelection();

      var prevEdge = state.selectedEdge;
      if (!prevEdge || prevEdge !== d){
        thisGraph.replaceSelectEdge(d3path, d);
      } else{
        thisGraph.removeSelectFromEdge(true);
      }

      this.edgeInfo.set(d);

    }

  }


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
    var text = "<div class='infopopup'>";
    if (d.blurb) {
      text += "<em>";
      if (d.blurb.title) {
        text += d.blurb.title;
      }
      text += "</em>";
      if (d.blurb.summary) {
        text += "<span>"+this.linkify(d.blurb.summary)+"</span>";
      }
    }
    text += "</div>";
    this.myalert("<div style='color:#0164b3'>"+d.title+"</div>", text, false, false, true);
  }

  // mouseup on nodes
  GraphCreator.prototype.circleMouseUp = function(d3node, d){
    var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;

    if (thisGraph.userView) return thisGraph.infoPopup(d);

    // reset the states
    state.shiftNodeDrag = false;
    d3node.classed(consts.connectClass, false);

    var mouseDownNode = state.mouseDownNode;
    var targetNode = state.currentTargetNode;

    if (!mouseDownNode) return;

    thisGraph.dragLine.classed("hidden", true);

    if (mouseDownNode !== targetNode){

      var edge = thisGraph.edge_master.addSingle({
        source: mouseDownNode.id,
        target: targetNode.id,
        label: "Acquaintances",
        arrow: 0
      });
      thisGraph.updateGraph();
      thisGraph.pathMouseDown( edge.node(), edge.directEdge, true );

    } else {
      // we're in the same node
      if (thisGraph.definitelyDragged(d)) {
        state.justDragged = false;
        //thisGraph.save(); //node was moved, trigger saving
      } else {

        thisGraph.removeSelectFromEdge(true);
        if ((d3.event.sourceEvent && d3.event.sourceEvent.ctrlKey) || thisGraph.state.ctrlDown) {
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

  GraphCreator.prototype.clickNodeById = function(id) {
    var thisGraph = this;
    d3.select("svg").select(".circles").selectAll("g").filter(function(d){
      return d.id == id;
    }).classed("selected", true).each(function(d) {
      thisGraph.circleMouseUp(d3.select(this), d);
    });
    thisGraph.updateGraph();
  }

  GraphCreator.prototype.setSelected = function(nodes, b, skip) {
    if (this.userView) return;
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
    this.removeSelectFromEdge(true);
  }

  GraphCreator.prototype.clearSelection = function(skip){
    this.setSelected(d3.select("svg").select(".circles").selectAll(".conceptG"), false, skip); //e.g. skip if it's known another node about to be selected, so no flicker introduced
  }

  GraphCreator.prototype.deleteNode = function(node, aboutToAdd) {
    this.nodes.splice(this.nodes.indexOf(node), 1);
    if (this.nodes.length==0 && !aboutToAdd) $("#dclick_prompt").show();
    this.spliceLinksForNode(node);
  };


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
    var thisGraph = this;
    d3Path.classed(thisGraph.consts.selectedClass, true);
    thisGraph.removeSelectFromEdge(true);
    thisGraph.state.selectedEdge = edgeData;
  }


  GraphCreator.prototype.removeSelectFromEdge = function( anotherPanelOpening ){
    var thisGraph = this;
    if (!thisGraph.state.selectedEdge) return;
    if (!anotherPanelOpening) thisGraph.overlay.hide();
    var d3Path = d3.select("svg").select(".paths").selectAll("path");
    d3Path.filter(function(cd){
      return cd === thisGraph.state.selectedEdge;
    }).classed(thisGraph.consts.selectedClass, false);
    thisGraph.state.selectedEdge = null;
  }


  GraphCreator.prototype.spliceLinksForNode = function(node) {
    var thisGraph = this,
        toSplice = thisGraph.edges.filter(function(l) {
          return (l.source === node || l.target === node);
        });
    toSplice.map(function(l) {
      thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
      thisGraph.edge_master.kill(l);
    });
  }


  GraphCreator.prototype.insertTitleLinebreaks = function (gEl, title) {
    var words = title.trim().split(/\s+/g),
        nwords = words.length;
        gEl.selectAll("text").remove();

    for (var x =0; x<2; x++) { //Twice over, first is the blur
      var el = gEl.append("text")
            .attr("text-anchor","middle")
            .attr("dy", ((nwords-1)*-7)+5 );
      if (x==0) el.classed("blurred", true);
      for (var i = 0; i < words.length; i++) {
        var tspan = el.append('tspan').text(words[i]);
        if (words[i].length>=11) tspan.classed("small_text", true);
        if (i > 0)
          tspan.attr('x', 0).attr('dy', '15');
      }
    }

  }


  GraphCreator.prototype.getSelected = function() {
    return d3.select("svg").select(".circles").selectAll("."+this.consts.selectedClass);
  }


  GraphCreator.prototype.dragmove = function(d, d3node) {
    var thisGraph = this;

    if (thisGraph.state.mouseDownLink) {

      if (!thisGraph.state.ctrlDown) thisGraph.updateEdgeCurve(d, d3node, d3.mouse(thisGraph.svgG.node()));

    } else if (thisGraph.state.shiftNodeDrag){

      thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);

    } else {

      d.x += d3.event.dx;
      d.y +=  d3.event.dy;
      thisGraph.removeCurvesFromNode(d);

      thisGraph.getSelected().each(function(dd) {
        if (d!=dd && d3node.classed("selected")) {
          dd.x += d3.event.dx;
          dd.y +=  d3.event.dy;
          thisGraph.removeCurvesFromNode(dd);
        }
      });

      thisGraph.info.dragged();

      if (!d3node.classed("selected") && thisGraph.definitelyDragged(d)) {
        thisGraph.clearSelection();
      }
      thisGraph.updateGraph();
    }
  };


  GraphCreator.prototype.removeCurvesFromNode = function(d) {
    this.edges.forEach(function(e) {
      if (e.source === d || e.target === d) {
        e.curve = null;
      }
    });
  }


  GraphCreator.prototype.removeCurvesFromNodeSet = function(nodes) {
    var thisGraph = this;
    nodes.each(function(d) {
      thisGraph.removeCurvesFromNode(d);
    });
  }


  GraphCreator.prototype.selectElementContents = function(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };


  GraphCreator.prototype.svgMouseDown = function(){
    this.state.graphMouseDown = true;
  }


  GraphCreator.prototype.svgDoubleClick = function(){
    if (d3.event.target.nodeName!="svg") return;
    $("#dclick_prompt").hide();
    this.adder.newNode();
  }


  GraphCreator.prototype.svgMouseUp = function(){
    if (d3.event.target.nodeName!="svg") return;
    var thisGraph = this, state = thisGraph.state;
    if (!state.ctrlDown) {
      this.clearSelection();
    }
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


  GraphCreator.prototype.svgKeyDown = function() {
    if ($("input").is(":focus") || $("textarea").is(":focus")) return;

    var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;

    if(state.lastKeyDown !== -1) return; // make sure repeated key presses don't register for each keydown

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
          thisGraph.deleteSelectedEdge();
        }
      break;
    }
  };

  GraphCreator.prototype.deleteSelectedEdge = function() {
    var thisGraph = this, state = thisGraph.state;
    if (state.selectedEdge) {
      thisGraph.edges.splice(thisGraph.edges.indexOf(state.selectedEdge), 1);
      thisGraph.edge_master.kill( state.selectedEdge );
      state.selectedEdge = null;
      thisGraph.overlay.hide();
      thisGraph.updateGraph();
    }
  }

  GraphCreator.prototype.svgKeyUp = function() {
    this.state.lastKeyDown = -1;
    this.brush.show(false);
    if (!d3.event.ctrlKey) this.state.ctrlDown = false;
  };

  GraphCreator.prototype.zoomed = function(){
    this.state.transform = d3.event.transform;
    this.state.justScaleTransGraph = true;
    d3.select("." + this.consts.graphClass)
      .attr("transform", d3.event.transform);
    //this.save();
  };

  GraphCreator.prototype.linkify = function(text){
    return text.replace(/\[(.*?)\]\((.*?)\)/g,'<a href="$2" target="_blank">$1</a>')
  }

  GraphCreator.prototype.updateWindow = function(){
    var docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];
    var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    var y = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

    if (this.userView) {
      y -= $("#mapTitle").outerHeight();
      $("#zoomInButton, #zoomOutButton, #shareButton").toggle((y>165));
    }

    this.svg.attr("width", x-this.toolbarWidth).attr("height", y);
  };

  GraphCreator.prototype.serverSave = function( screenshot ) {
    var thisGraph = this;
    thisGraph.bodyloader(true);
    var fail = function(response) {
      var out = response && response.responseText ? response.responseText : "There was an error, please try again later";
      thisGraph.myalert("Whoops", out);
    }
    $.ajax({
       url: "loader.php",
       method: "POST",
       dataType: "json",
       data: {
         action: "save",
         title: thisGraph.project.meta().projectTitle,
         config: localStorage.getItem(thisGraph.storeId),
         screenshot: screenshot ? screenshot : "",
         directUrl: thisGraph.get_project_url(),
         id: thisGraph.mapId || "" //if blank, is new
       },
       error: function(response) {
         if (!navigator.onLine) {
           thisGraph.offlineMessage();
         } else {
           fail(response);
         }
       },
       success: function(response) {
         if (response.success==1) {
           if (response.id) {
             thisGraph.mapId = response.id;
             thisGraph.version = response.version;
           }
           thisGraph.myalert("Map Saved", "Well done! The Map URL has been copied.", "success");
           thisGraph.copyToClipboard( thisGraph.get_project_url() );
           thisGraph.project.preview.stop();
           thisGraph.project.build_link();
           $("#graphAdvanced").show();
         } else {
           fail(response);
         }
       },
       complete: function() {
         thisGraph.coverblock(false);
         thisGraph.bodyloader(false);
       }
    });
  }

  GraphCreator.prototype.coverblock = function(b) {
    $("#coverBlock").toggle(b);
  }

  GraphCreator.prototype.save = function() {
    if (this.userView) return;
    var out = window.JSON.stringify({
      "nodes": this.nodes,
      "edges": this.edge_master.saveFormat(),
      viewport: this.state.transform,
      shapes: this.info._shaper.config.history,
      meta: this.project.meta(),
      invertLogo: !!this.inverted
    });
    localStorage.setItem(this.storeId, out );
  }

  GraphCreator.prototype.home = function() {
    location.reload();
  }

  GraphCreator.prototype.preview = function() {
    this.load(false, false, false, false, true);
  }

  GraphCreator.prototype.load = function(id, version, config, title, preview) {

    var thisGraph = this;
    thisGraph.init(id, preview);
    if (id===false && !preview) return; //main

    var data;
    if (id) { //Load pre-made map
      thisGraph.mapId = id;
      thisGraph.version = version || 0;
      data = config;
    } else {
      if (preview) { //Preview current map
        data = localStorage.getItem(thisGraph.storeId);
      } else { //Brand new map
        data = thisGraph.defaultData();
        $("#graphAdvanced").hide(); //No need for Delete Map option
      }
    }
    var jsonObj = JSON.parse(data);
    if (!jsonObj) return;
    //db("Loaded", jsonObj);

    thisGraph.nodes = jsonObj.nodes.filter(function(n) {
      return !n.staging;
    });

    thisGraph.info._shaper.config.history = jsonObj.shapes || {};

    thisGraph.edge_master.addEdges(jsonObj.edges);

    thisGraph.overlay.show(thisGraph.overlay.panel.PROJECT);

    if (title) jsonObj.meta.projectTitle = title; //don't let meta get out of sync with file name
    thisGraph.project.meta( jsonObj.meta );

    if (jsonObj.invertLogo) thisGraph.invertLogo();

    if (thisGraph.nodes.length==0) $("#dclick_prompt").show();

    thisGraph.updateGraph();
    thisGraph.updateGraph(); //requires twice to make brush work?

    if (id || thisGraph.userView) thisGraph.recenter(); //new map shouldn't recenter (to a single node)

  }

  GraphCreator.prototype.setLoggedIn = function(b) {
    this.loggedIn = b;
  }

  GraphCreator.prototype.offlineMessage = function() {
    Swal.fire({
      type: 'warning',
      title: 'You are offline',
      text: 'Please connect to the internet & try again.'
    });
  }

  GraphCreator.prototype.createScreenshot = function( node, callback ) { //Called from parent frame
    //First make sure all image nodes are local uris, as that's what's required to make a composite image
    $("body").toggleClass("screenshotting", true);
    var thisGraph = this;

    var imageToURI = function(url, cb) {
      var canvas = document.createElement('canvas')
      var img = document.createElement('img')
      img.onload = function () {
        var ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        cb(null, canvas.toDataURL('image/png'))
      }
      img.onerror = function () {
        cb(new Error('FailedToLoadImage'))
      }
      if (!canvas.getContext) {
        setTimeout(cb, 0, new Error('CanvasIsNotSupported'))
      } else {
        img.setAttribute('crossOrigin', 'anonymous')
        img.src = url
      }
    }
    var toImage = function(node) {
      domtoimage.toJpeg($(node).get(0), {quality:0.92})
       .then(function (dataUrl) {
         callback(dataUrl);
       })
       .catch(function (err) {
         callback(false);
       });
    }
    var done = function() {
      toImage(node);
      setTimeout(function() {
        $("body").toggleClass("screenshotting", false);
      });
    }

    var images = thisGraph.circles.filter(function(d) {
      return !!d.image;
    });
    var fetched = 0, total = images.size();
    if (total==0) {
      done();
    } else {
      images.each(function(d) {
        var that = this;
        imageToURI('https://cors-anywhere.herokuapp.com/'+d.image, function (err, uri) {
          fetched++;
          if (!err) {
            d3.select(that).select("image").attr("href", uri)
          }
          if (fetched==total) {
            thisGraph.updateGraph();
            done();
          }
        })
      });
    }

  }

  GraphCreator.prototype.nodeTransform = function(d) {
    if (!d.scale) d.scale = 1;
    return "translate(" + d.x + "," + d.y + ") scale("+d.scale+" "+d.scale+")";
  }

  GraphCreator.prototype.defaultData = function() {
    return window.JSON.stringify({nodes:[], edges:[], meta:{}});
  }

  GraphCreator.prototype.Overlay = function() {
    var thisGraph = this;
    thisGraph.main = thisGraph.MainPanel();
    thisGraph.login = thisGraph.LoginPanel();
    thisGraph.adder = thisGraph.AdderPanel();
    thisGraph.info = thisGraph.InfoPanel();
    thisGraph.edgeInfo = thisGraph.EdgeInfoPanel();
    thisGraph.project = thisGraph.ProjectPanel();
    var self = {
      panel: {
        ADDER: "adder",
        INFO: "info",
        PROJECT: "project",
        MAIN: "main",
        LOGIN: "login",
        EDGE: "edge"
      },
      current: false,
      init: function() {
        $("#cover").on("click", self.forceClose);
        self.show( thisGraph.loggedIn ? self.panel.MAIN : self.panel.LOGIN );
      },
      show: function(panel, cover_nodes) {
        $("#overlay > div").hide();
        $("#overlay").show();
        if (cover_nodes) $("#cover").show();
        self.currentObject(panel).show();
        closeAllColourPickers();

        if (self.last_panel) $("body").removeClass(self.last_panel);
        self.last_panel = panel;
        $("body").addClass(self.last_panel);
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
          case self.panel.MAIN:
            return thisGraph.main;
          break;
          case self.panel.LOGIN:
            return thisGraph.login;
          break;
          case self.panel.EDGE:
            return thisGraph.edgeInfo;
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
        if (self._staging.awaitingData) return;
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
        $("#blankNodeAdder").on("click", self._blankNode)
        thisGraph.AutoSuggest(self);
        self._inited = true;
      },
      _blankNode: function() {
        thisGraph.overlay.hide();
        var node_pos = self._staging.node().data()[0];
        thisGraph.deleteNode(self._staging.node(), true);
        var new_id = new Date().getTime()/1000|0;
        var new_node = {
          id: new_id,
          title: "",
          x: node_pos.x,
          y: node_pos.y,
          blurb: {},
          image_node: false,
          bg_color: thisGraph.info._colour.picker ? thisGraph.info._colour.picker.val() : "#f6fbff"
        }
        thisGraph.nodes.push(new_node);
        thisGraph.updateGraph();
        thisGraph.clickNodeById(new_id);
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
          new_node.image_mode = !!node_det.display.image;
          if (node_det.display.image) {
            new_node.image = node_det.display.image;
            new_node.dimensions = self._staging.data.img;
          } else {
            new_node.bg_color = thisGraph.info._colour.picker ? thisGraph.info._colour.picker.val() : "#f6fbff" ;
          }
          thisGraph.nodes.push(new_node);
          thisGraph.edge_master.addLittleSisEdges( self._staging.data.edges );
          thisGraph.updateGraph();

          thisGraph.clickNodeById(node_det.id);

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
          var nodes_to_check_relationship_for = thisGraph.getAllNodeIds();

          function chunk(array, size) {
            const chunked_arr = [];
            let index = 0;
            while (index < array.length) {
              chunked_arr.push(array.slice(index, size + index));
              index += size;
            }
            return chunked_arr;
          }

          var sections = chunk(nodes_to_check_relationship_for, 250);
          var num_returned = 0;
          self._staging.data.edges = [];

          for (var i in sections) {
            LsDataSource.getNodeWithEdges( data.id, sections[i], function(response) {
              //LsDataSource.api("entities/"+data.id+"/relationships", function(response) {
              /*if (!response) {
                if (attempts==3) thisGraph.ajaxError();
                return setTimeout(function(){ self._staging.getEdgeInfo(data, (++attempts || 2)) }, 1000);
              }*/
              if (response) {
                self._staging.data.edges = self._staging.data.edges.concat(response.edges);
              }
              if (++num_returned==sections.length) {
                self._staging.proceedIfWaiting();
              }
            });
          }
        },
        getNodeInfo: function(data, attempts) {
          LsDataSource.api( "entities/"+data.id , function(response) {
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

  GraphCreator.prototype.EdgeMaster = function () {
    var thisGraph = this;
    var self = {
      list: [],
      addEdges: function( edges ) {
        for (var i in edges) {
          self.addSingle(edges[i]);
        }
      },
      addLittleSisEdges: function( edges ) {
        //It's in a funky format, clean the edges and reduce to standard this class uses
        edges.forEach(function(e) {
          var arrow = (!e.display.arrow) ? 0 : ((e.display.arrow=="1->2")? 1 : 2) ;
          self.addSingle({
            source: e.node1_id,
            target: e.node2_id,
            label: e.display.label,
            arrow: arrow
          });
        });
      },
      addSingle: function( edge ) {
        var exists = self.exists(edge);
        if (!exists) {
          exists = new self.Edge( edge );
          self.list.push(exists);
        }
        exists.add( edge );
        return exists;
      },
      saveFormat: function() {
        var out = [];
        self.list.forEach(function(e) {
          out = out.concat(e.saveFormat());
        });
        return out;
      },
      exists: function( edge ) {
        for (var i in self.list) {
          if (self.list[i].is(edge.source, edge.target)) {
            return self.list[i];
          }
        }
        return false;
      },
      kill: function( e ) {
        var edge = e.info;
        for (var i in self.list) {
          if (self.list[i]==edge) {
            self.list.splice(i, 1);
            return;
          }
        }
      },
      Edge: function(edge_det) {
        var me = this;
        me.list = [];
        me.source_id = edge_det.source;
        me.target_id = edge_det.target;
        me.curve = edge_det.curve;
        me.width = edge_det.width;
        me.is = function( source_id, target_id ) {
          return ( (me.source_id==source_id && me.target_id==target_id)
              || (me.source_id==target_id && me.target_id==source_id)
          )
        }
        me.add = function(edge) { /*relationship info*/
          var arrow = edge.arrow;
          if (edge.source!=me.source_id) {
            if (arrow==1) {
              arrow = 2;
            } else if (arrow==2) {
              arrow = 1;
            }
          }
          var out = {
            arrow: arrow,
            label: edge.label
          }
          me.list.push(out);
          return out;
        }
        me.setWidth = function(w) {
          if (!w) w = 0;
          me.directEdge.width = w || null;
          me.node().style("stroke-width", w || "");
          me.nodeShadow().style("stroke-width", w*3 || "");
          if (thisGraph.state.selectedEdge) thisGraph.edgeInfo.arrowWidth.set(w);
        }
        me.remove = function( data ) {
          for (var i in me.list) {
            if (me.list[i]==data) {
              me.list.splice(i, 1);
              if (me.list.length==0) {
                thisGraph.deleteSelectedEdge();
              }
              return;
            }
          }
        }
        me.node = function() {
          return d3.select("#Path_"+me.source_id+"_"+me.target_id);
        }
        me.nodeShadow = function() {
          return d3.select("#PathShadow_"+me.source_id+"_"+me.target_id);
        }
        me.init = function() { /*graph connection info*/
          me.directEdge = {
            source: me.findNodeDataById( me.source_id ),
            target: me.findNodeDataById( me.target_id ),
            curve: me.curve,
            width: me.width,
            info: me
          }
          thisGraph.edges.push( me.directEdge );
        }
        me.saveFormat = function() {
          var out = [], el;
          for (var i in me.list) {
            el = {
              source: me.source_id,
              target: me.target_id,
              label: me.list[i].label,
              arrow: me.list[i].arrow
            }
            if (me.directEdge.curve) el.curve = me.directEdge.curve;
            if (me.directEdge.width) el.width = me.directEdge.width;
            out.push(el);
          }
          return out;
        }
        me.findNodeDataById = function( id ) {
          for (var i in thisGraph.nodes) {
            if (thisGraph.nodes[i].id==id) return thisGraph.nodes[i];
          }
        }
        me.init();
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

  GraphCreator.prototype.previewFrame = function() {
    return $("#piframe iframe").get(0).contentWindow.graph;
  }

  GraphCreator.prototype.MainPanel = function() {
    var thisGraph = this;
    var self = {
      init: function() {
        $("#projectList > div").each(function() {
          $(this).on("click", self.chosen)
        });
        $("#createNewProject").on("click", function() {
          thisGraph.load();
        });
        $("#logout").on("click", function() {
          setCookie("logout", 1, 9999999999);
          location.href = location.href; //seems like a hack, but location.reload sends POST vars again, which I don't want!
        });
        self.inited = true;
      },
      chosen: function() {
        var mapId = $(this).data("value");
        if (!mapId) return;
        thisGraph.bodyloader(true, true);
        var fail = function() {
          thisGraph.myalert("Whoops", "There was an error, please try again later");
        }
        $.ajax({
           url: "loader.php",
           method: "POST",
           dataType: "json",
           data: {
             action: "load",
             id: mapId
           },
           error: fail,
           success: function(response) {
             if (response.success==1) {
               thisGraph.load(response.id, response.version, response.config, response.title);
             } else {
               fail();
             }
           },
           complete: function() {
             thisGraph.bodyloader(false, true);
           }
        });
      },
      show: function() { /*required*/
        if (!self._inited) self.init();
        $("#main").show();
      }
    }
    return self;
  }

  GraphCreator.prototype.LoginPanel = function() {
    var thisGraph = this;
    var self = {
      show: function() {
        $("#login").show();
        //$("#username").focus();
      }
    }
    return self;
  }

  GraphCreator.prototype.invertLogo = function() {
    var thisGraph = this;
    thisGraph.inverted = !thisGraph.inverted;
    $("#svgHolder .logo").css("filter", thisGraph.inverted ? "invert(100%)" : "none");
    if (!thisGraph.userView) {
      $("#svgHolder .logo").stop(true, true).show();
      if (thisGraph.invertLogoTimeout) clearTimeout(thisGraph.invertLogoTimeout);
      thisGraph.invertLogoTimeout = setTimeout(function() {
        $("#svgHolder .logo").fadeOut();
      }, 2000);
    }
  }


  GraphCreator.prototype.ProjectPanel = function() {
    var thisGraph = this;
    var self = {
      init: function() {
        $("#projectTitle").on("keyup", function() {
          //thisGraph.save();
        });
        $("#projectBackgroundURL").on("keyup", function() {
          self.background.image_update();
        });
        $("#projectBackgroundOpacity").slider({
          value: 0.2,
          min: 0,
          max: 1,
          step: 0.01,
          slide: function() {
            setTimeout(function() {
              self.background.opacity_update();
              //thisGraph.save();
            });
          }
        });

        self.projectArrowColour = new ColourPicker(function() {
          self.background.arrow_colour_update();
        }, function() {
          //thisGraph.save();
        }, "#projectArrowColour", "bbbbbb");

        $("#projectLinkCopy").on("click", function() {
          thisGraph.copyToClipboard( thisGraph.get_project_url() );
          var feedback = $(this).parent().find("span");
          feedback.text("Copied!").show().delay(800).fadeOut();
        });
        $("#projectArrowWidth").slider({
          value: 5,
          min: 1,
          max: 25,
          step: 1,
          slide: function() {
            setTimeout(function() {
              self.background.arrow_width_update(true);
              //thisGraph.save();
            });
          }
        });
        $("#project input[type=text]").on("keypress", function(e) {
          if (e.keyCode==13) $(this).blur(); //enter
        });
        self.preview.init();
        self._inited = true;
      },
      show: function() { /*required*/
        if (!self._inited) self.init();
        $("#project").show();
      },
      refresh: function() {/*Called after project metadata is set*/
        self.background.image_update();
        self.background.opacity_update();
        self.background.arrow_colour_update();
        self.background.arrow_width_update();
        self.build_link();
        if (thisGraph.userView) {
          $("#mapTitle").text( self.meta().projectTitle );
        } else {
          if (!$("#projectTitle").val()) $("#projectTitle").focus();
        }
      },
      build_link: function() {
        if (thisGraph.mapId) {
          var url = thisGraph.get_project_url();
          $("#projectLink").html( $("<a>").attr("href", url).text(url).attr("target", "_blank") );
        }
        $("#projectLinkHolder").toggle(!!thisGraph.mapId);
      },
      preview: {
        default: {width:840, height:600},
        start: function( preSave ) {
          preSave = preSave===true;
          self.ready = false;
          $("#piframe").html( $("<div>").append( $("<iframe>").attr("src","../preview").on("load", self.preview.iframeReady)) );
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
          $("body").toggleClass("preSave", preSave);
        },
        iframeReady: function() {
          self.ready = true;
        },
        saveStart: function() {
          thisGraph.save(); //Only Save that's really needed
          self.preview.start(true);
        },
        text_update: function(dim) {
          $("#pdimensions").text( dim.width +" x "+dim.height );
        },
        stop: function() {
          $("body").toggleClass("previewHolder", false);
          thisGraph.recenter();
        },
        finalSave: function() {
          if (!self.ready) return;
          if (!$.trim(thisGraph.project.meta().projectTitle)) {
            self.preview.stop();
            return thisGraph.myalert("Project Title Needed", "You must give your project a title before you can save it.", "warning", function() {
              $("#projectTitle").focus();
            });
          }
          //Make screenshot first
          thisGraph.bodyloader(true, true);
          thisGraph.previewFrame().createScreenshot("#svgHolder", function( dataUrl ) {
            var message = "It's all ready to go live, including this image, which will be shown when this map's link is shared via social media. Are you ready to save this map?";
            var img = dataUrl;
            if (dataUrl===false) { //browser security settings stops image being made
              img = "images/standardsocial.jpg";
              message = "This browser's security settings prevents an image of this map being created automatically (for social media sharing). This functionality will be available in most other browsers. If you choose to continue here, the following Desmog logo will be used instead. Do you wish to continue?";
            }
            thisGraph.bodyloader(false);
            Swal.fire({
              title: 'Are you sure?',
              html: "<div id='screenshotPopup'>"+message+" <img src='"+img+"'></div>",
              showCancelButton: true,
              focusCancel: true,
              confirmButtonText: 'Save'
            }).then((result) => {
              if (result.value) {
                thisGraph.serverSave( dataUrl );
              } else {
                thisGraph.coverblock(false);
              }
            });
          });

        },
        reset: function() {
          $("#piframe > div").css(self.preview.default);
          self.preview.text_update(self.preview.default);
        },
        init: function() {
          $("#graphPreview").on("click", self.preview.start);
          $("#graphSave").on("click", self.preview.saveStart);
          $("#exitPreviewMode").on("click", self.preview.stop);
          $("#pdimensions").on("click", self.preview.reset);
          $("#finalSave").on("click", self.preview.finalSave)
          $("#finalSaveCancel").on("click", self.preview.stop)
          $("#graphClose").on("click", function(){
            thisGraph.home();
          });
          $("#graphAdvanced").on("click", self.advancedOptions);
          $("#invertLogo").on("click", function() {
            thisGraph.invertLogo();
          });
          $("#graphDelete").on("click", function() {
            self.deleteProject();
          });
          $("#cloneMap").on("click", function() {
            self.cloneProject();
          });
          $("#guidelines").on("click", function() {
            thisGraph.myalert("Shortcuts", $("#guidelinesContent").clone(true).get(0));
          });
        }
      },
      deleteProject: function() {
        if (!thisGraph.mapId) return;
        Swal.fire({
          title: 'Delete Project?',
          html: "Are you sure you want to continue?",
          type: "warning",
          showCancelButton: true,
          focusCancel: true,
          confirmButtonColor: "#d80000",
          confirmButtonText: 'Delete'
        }).then((result) => {
          if (result.value) {
            thisGraph.bodyloader(true, true);
            var fail = function() {
              thisGraph.myalert("Whoops", "There was an error, please try again later");
            }
            $.ajax({
               url: "loader.php",
               method: "POST",
               dataType: "json",
               data: {
                 action: "delete",
                 id: thisGraph.mapId
               },
               error: fail,
               success: function(response) {
                 if (response.success==1) {
                   thisGraph.home();
                 } else {
                   fail();
                 }
               },
               complete: function() {
                 thisGraph.bodyloader(false, true);
               }
            });
          }
        });
      },
      cloneProject: function() {
        if (!thisGraph.mapId) return;
        Swal.fire({
          title: 'Clone Project?',
          html: "This will create a clone of the last saved version of this map. Would you like to continue?",
          type: "question",
          showCancelButton: true,
          focusCancel: true,
          confirmButtonText: 'Clone'
        }).then((result) => {
          if (result.value) {
            thisGraph.bodyloader(true, true);
            var fail = function() {
              thisGraph.myalert("Whoops", "There was an error, please try again later");
            }
            $.ajax({
               url: "loader.php",
               method: "POST",
               dataType: "json",
               data: {
                 action: "clone",
                 id: thisGraph.mapId
               },
               error: fail,
               success: function(response) {
                 if (response.success==1) {
                   thisGraph.home();
                 } else {
                   fail();
                 }
               },
               complete: function() {
                 thisGraph.bodyloader(false, true);
               }
            });
          }
        });
      },
      advancedOptions: function() {
        var show = !$("#advancedOptions").is(":visible");
        $("#graphAdvanced").val( show ? "\u25B2" : "\u25BC" );
        $("#advancedOptions").toggle(show);
        if (show) $("#project").scrollTop($("#project").get(0).scrollHeight);
      },
      background: {
        image_update: function() {
          var url = $("#projectBackgroundURL").val();
          if (url) {
            getImageDimensions(url, function(d, success) {
              if (success===false) {
                //if (!thisGraph.userView && navigator.onLine) thisGraph.myalert('Invalid Image', "Please try again with a different URL", 'warning'); //removed as it's blocking more important popups
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
          var darkness = colourBrightness(c);
          var hover_c = darkness<50 ? "#777" : ( darkness<100 ? d3.rgb(c).brighter(1.5) : d3.rgb(c).darker(2) );
          $("body").append("<style>path.link { stroke: "+c+"} path.link.hovered:not(.selected) { stroke: "+hover_c+"} g.conceptG:not(.selected) circle, g.conceptG:not(.selected) rect { stroke: "+c+"}</style>");
        },
        arrow_width_update: function( fromSlider ) {
          var width = $("#projectArrowWidth").slider("value");
          var shadowWidth = (width*3);
          if (shadowWidth<20) shadowWidth = 20;
          $("body").append("<style>path.link { stroke-width: "+width+"px} .pathsShadow path.link { stroke-width: "+shadowWidth+"px}</style>");
          if (fromSlider) {
            thisGraph.edge_master.list.forEach(function(edge) {
              if (edge.directEdge.width) {
                edge.setWidth(null);
              }
            });
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
          return out;
        }
      }
    }
    return self;
  }

  GraphCreator.prototype.EdgeInfoPanel = function() {
    var thisGraph = this;
    var self = {
      show: function() {
        $("#edgeInfo").show();
      },
      set: function( r ) {
        if (!self.inited) self.init();
        self.relationships = [];
        self.currentEdge = r.info;
        $("#relationshipFromName").text( r.source.title );
        $("#relationshipToName").text( r.target.title );
        $("#relationshipList").html("");
        for (var i in r.info.list) {
          self.add( r.info.list[i] );
        }
        self.arrowWidth.set( r.width );
        thisGraph.overlay.show(thisGraph.overlay.panel.EDGE);
      },
      add: function( n ) {
        var newRel = new self.relationship( n );
        $("#relationshipList").append( newRel.build() );
        self.relationships.push( newRel );
      },
      addBlankNode: function() {
        var directLinkToData = self.currentEdge.add({
          label: "Acquaintances",
          arrow: 0
        });
        self.add(directLinkToData);
      },
      init: function() {
        self.inited = true;
        $("#relationshipAdd").on("click", function() {
          self.addBlankNode();
        });
        $("#relationshipBack").on("click", function() {
          thisGraph.removeSelectFromEdge();
          thisGraph.overlay.hide(); //backup incase edge not clicked cleanly
        });
        self.arrowWidth.init();
      },
      arrowWidth: {
        init: function() {
          $("#individualArrowWidthSlider").slider({
            value: 0,
            min: 0,
            max: 25,
            step: 1,
            slide: function() {
              setTimeout(function() {
                self.arrowWidth.update();
                //thisGraph.save();
              });
            }
          });
        },
        set: function( v ) { //set new ui value
          if (!v) v = 0;
          $("#individualArrowWidthSlider").slider("value", v);
          self.arrowWidth.refresh();
        },
        update: function() { //match data to ui
          self.currentEdge.setWidth( $("#individualArrowWidthSlider").slider("value") );
          self.arrowWidth.refresh();
        },
        refresh: function() { //reflect ui to slider val
          var width = $("#individualArrowWidthSlider").slider("value");
          var title = "Arrow Width";
          var strokeWidth, propertyWidth;
          if (width===0) {
            title += " (using global value)";
            propertyWidth = null;
            strokeWidth = "";
          } else {
            propertyWidth = width;
            strokeWidth = width;
          }
          $("#individualArrowWidthTitle").text(title+":");
        }
      },
      find: function(r) {
        for (var i in self.relationships) {
          if (r==self.relationships[i]) return i;
        }
        return false;
      },
      delete: function( r ) {
        var index = self.find(r);
        if (index) self.relationships.splice(index, 1);
        r.destroy();
        self.currentEdge.remove( r.data );
      },
      relationship: function(r) {
        var me = this;
        me.data = r;
        me.build = function() {
          me.node = $("#hidden #RelationshipNode").clone(true);
          me.node.find(".relationshipName").val( r.label ).on("keyup", function() {
            r.label = $(this).val();
          });
          me.node.find(".relationshipDirection").val( r.arrow ).on("change", function() {
            r.arrow = $(this).val();
          });
          me.node.find(".myButton").on("click", function() {
            self.delete(me);
          });
          return me.node;
        }
        me.destroy = function() {
          me.node.remove();
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
        $("#colourRemoveButton, #imageRemoveButton, #alwaysDisplayTextButton, .showNodeBorderButton").toggle( thisGraph.getSelected().size()==1 );
        self._title.refresh();
        self._blurb.refresh();
        self._imageUrl.refresh();
        self._textPermanence.refresh();
        self._nodeBorder.refresh();
        self._nodeShaper.refresh();
        self._scaler.refresh();
        self._colour.refresh();
        self._shaper.refresh();
      },
      _nodeBorder: {
        init: function() {
          $(".showNodeBorderButton").on("click", function() {
            thisGraph.getSelected().each(function(d) {
              d.hb = !d.hb;
            }).classed("hide_border", function(d) {
              return d.hb;
            });
            thisGraph.clearSelection();
          });
        },
        refresh: function() {
          if (self.num==1) {
            var hiding = self._groupValue("hb");
            $(".showNodeBorderButton").css( "color", hiding ? "#0164b3" : "#aaa" );
          }
        }
      },
      _textPermanence: {
        init: function() {
          $("#alwaysDisplayTextButton").on("click", function() {
            thisGraph.getSelected().each(function(d) {
              d.tp = !d.tp;
              $(this).addClass
            }).classed("always_text", function(d){
              return d.tp;
            });
            self._textPermanence.refresh();
          });
        },
        refresh: function() {
          if (self.num==1) {
            var permanent = self._groupValue("tp");
            $("#alwaysDisplayTextButton")
              .css( "color", permanent ? "#0164b3" : "#aaa" );
          }
        }
      },
      _title: {
        init: function() {
          $("#info #selectionTitle").on("keyup", self._title.save )
        },
        refresh: function() {
          if (self.num==1) {
            $("#info #selectionTitle").val( self._groupValue("title") );
            setTimeout(function() {
              if (self._groupValue("title")=="") $("#info #selectionTitle").focus();
            });
          }
          $("#selectionTitleHolder").toggleClass("multiple", self.num>1);
        },
        save: function() {
          if (self.num==1) {
            thisGraph.getSelected().each(function(d) {
              d.title = $("#info #selectionTitle").val();
              thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
            });
          }
        }
      },
      _imageUrl: {
        default: "images/black.gif",
        refresh: function() {
          var show = thisGraph.getSelected().size()==1 && thisGraph.getSelected().data()[0].image_mode;
          $("#info #imageEditHolder").toggle(show); //multiple selected
          $("#imageEdit").val(thisGraph.getSelected().data()[0].image);
        },
        init: function() {
          $("#imageEdit").on("keyup", self._imageUrl.save);
        },
        hide: function() {
          thisGraph.getSelected().each(function(d) {
            d3.select(this).select("image").attr("href", self._imageUrl.default);
          });
        },
        change: function( url, dim ) {
          thisGraph.getSelected().each(function(d) {
            d3.select(this).select("image").attr("href", url);
            d.image = url;
            d.dimensions = dim;
          });
          thisGraph.positionNodeImages(thisGraph.getSelected().select("image"));
        },
        save: function() {
          if (self.num==1) {
            var new_url = $("#imageEdit").val();
            if (!new_url) {
              self._imageUrl.hide();
            } else {
              thisGraph.getSelected().each(function(d) { //just one
                d.image = $("#imageEdit").val();
                getImageDimensions(new_url, function(d, success) {
                  if (success===false) {
                    self._imageUrl.hide();
                  } else {
                    self._imageUrl.change(new_url, d);
                  }
                });
              });
            }
          }
        }
      },
      _nodeShaper: {
        shapes: [ //option value, display string
          ["", "Circle"],
          ["square", "Square"]
        ],
        init: function() {
          self._nodeShaper.shapes.forEach(function(o) {
            $("#nodeShaper select").append($("<option>").val(o[0]).text(o[1]));
          });
          $("#nodeShaper select").on("change", self._nodeShaper.save);
        },
        refresh: function() {
          var shape = self._groupValue("nodeShape");
          $("#nodeShaper select").val(shape || "");
          $("#info #nodeShaper").toggle(shape!==false);
        },
        save: function() {
          if (self.num==1) {
            var shape = $("#nodeShaper select").val();
            thisGraph.getSelected().each(function(d) {
              if (d.ns && shape=="") {
                delete d.ns;
              } else {
                d.ns = shape;
              }
            });
            self._nodeShaper.updateShape();
          }
        },
        updateShape: function() {
          thisGraph.getSelected().each(function(d) {
            var node = d3.select(this);
            self._nodeShaper.shapes.forEach(function(o) {
              if (o[0]) node.classed(o[0], false);
            });
            var shape = d.ns ? d.ns : "circle";
            node.classed(shape, true);
            node.select("image").attr("clip-path", "url(#"+shape+"-clip)" )
          });
        },
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
          case "image":
            return single ? firstData.image : false ;
          case "tp":
            return single ? firstData.tp : false ; //text permanence
          case "hb":
            return single ? firstData.hb : false ; //hide border
          case "nodeShape":
            return single ? firstData.ns : false ; //node shape
          case "scale":
            if (single) {
              return firstData.scale || 1;
            } else {
              var total = 0;
              thisGraph.getSelected().each(function(d) {
                total += d.scale*1 || 1 ;
              });
              var average = total / thisGraph.getSelected().size();
              return Math.round(average*10)/10;
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
        $("#nodeOptionsBackButton").on("click", function() {
          thisGraph.clearSelection();
        });
        $("#imageRemoveButton").on("click", function() {
          self._toggleNodeMode();
        });
        $("#colourRemoveButton").on("click", function() {
          self._toggleNodeMode();
        });

        self._scaler.init();
        self._title.init();
        self._colour.init();
        self._shaper.init();
        self._blurb.init();
        self._imageUrl.init();
        self._textPermanence.init();
        self._nodeBorder.init();
        self._nodeShaper.init();
        self._inited = true;
      },
      _toggleNodeMode: function() {
        var node = thisGraph.getSelected().each(function(d) {
          d.image_mode = !d.image_mode;
          $("#colourEditHolder").toggle( !d.image_mode );
          $("#imageEditHolder").toggle( d.image_mode );
          d3.select(this).classed("clr", !d.image_mode);
          d3.select(this).classed("img", d.image_mode);
          if (d.image_mode) {
            self._colour.set("#ccc");
            self._imageUrl.save();
          } else {
            if (d.bg_color) self._colour.picker.val(d.bg_color);
            self._colour.update();
          }
        });
      },
      _colour: {
        init: function() {
          self._colour.picker = new ColourPicker(function() {
            self._colour.update();
          }, function() {
            //thisGraph.save();
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
          var circles = self._colour.list();
          circles.classed("white_text", thisGraph.tooDark(c));
          circles.selectAll("circle.over, rect.over")
            .attr("fill", function(d) {
              d.bg_color = c;
              return d.bg_color;
            });
        },
        set: function(c) {
          /*without updating attribute, e.g. if just setting the background for an image node*/
          self._colour.list(true).selectAll("circle.over,rect.over").attr("fill", c);
        },
        count: function() {
          var num = 0;
          thisGraph.getSelected().each(function(d) {
            if (!d.image_mode) num++;
          });
          return num;
        },
        list: function( ignore_class ) {
          return d3.select("svg").select(".circles").selectAll(".selected"+(ignore_class?"":".clr"));
        }
      },
      _shaper: {
        shapes: {
          "circle": {
            sliders: [
              {
                default: function() {
                  var r = self._groupValue("width") / 2;
                  if (r<50) r = 50;
                  return r;
                },
                start: 0,
                end: 2500,
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
                default: 0.5,
                start: 0.5,
                end: 3,
                step: 0.01,
                prompt: "Curve",
                label: function(d) {
                  d += 0.5; //let's make circle = 1, instead of the actual equation variable 0.5, looks nicer
                  d = Math.round(d*100)/100;
                  if (d===1) return d+" (circle)";
                  return d;
                }
              }
            ],
            text: "Circle / Curve",
            updateCenterOnDrag: true,
            extraHtml: function() {
              var out = $("<div>").attr("id", "circleOptions");
                var help = $("<var>").text("Help").on("click", function() {
                  self._shaper.help.do();
                });
                var flip = $("<var>").text("Reverse Node Order").on("click", function() {
                  self._shaper.lastNodesOrder.reverse();
                  self._shaper.update();
                });
              out.append(flip).append(help);
              return out;
            },
            help: function() {
              thisGraph.myalert("Circle Example", "<div id='circleHelpContainer' style='font-size: 15px;text-align:left;'><ul><li>This tool allows you to make all kinds of curve &amp; circle.</li><li>If you would like a curve to be less rounded, simply increase the Curve value, then increase the Radius.</li><li>If you want to predict the ordering of the nodes around the circle, put them in a line first (either vertical or horizontal) using the tool. They will then be placed on the circle in the same left-to-right or top-to-bottom order they had been in.</li></ul> <img src='images/circlehelp_small.gif' style='width:100%;margin-top:5px'></div>");
            },
            position: function( fromDropdown ) {

              var nodes = thisGraph.getSelected();
              var verticalPositioning = false;

              if (fromDropdown) {

                var verticalOrderBy = "y";
                var firstTimePositioningSet = !self._shaper.config.current();

                if (firstTimePositioningSet) {
                  verticalPositioning = true;
                  if (thisGraph.info._groupValue("width") > thisGraph.info._groupValue("height")) {
                    verticalOrderBy = "x"
                  }
                } else {
                  var isLineX = self._shaper.inALine("x");
                  var isLineY = self._shaper.inALine("y");
                  if (isLineX || isLineY) {
                    verticalPositioning = true;
                    if (isLineY) {
                      verticalOrderBy = "x";
                    }
                  }
                }
                if (verticalPositioning) {
                  nodes = nodes.sort(function(a, b) {
                    return d3.descending(a[verticalOrderBy], b[verticalOrderBy]);
                  });
                }

              }

              var center_x = self._shaper.avg_x;
              var center_y = self._shaper.avg_y;

              var radius = self._shaper.sliders.get("circle", 0).val();
              var angle_start = self._shaper.sliders.get("circle", 1).val();
              if (angle_start>Math.PI*2) angle_start = Math.PI*2;

              var curve = self._shaper.sliders.get("circle", 2).val();

              var numNodes = nodes.size();
              var width = (radius * 2) + 50,
                  height = (radius * 2) + 50,
                  angle, node, i = 0;
              var positions = [];

              var order = fromDropdown ? [] : self._shaper.lastNodesOrder;

              for (var i=0; i<numNodes; i++) {
                angle = angle_start + (i / (numNodes*curve)) * Math.PI;

                var pos = {
                  x: center_x + (radius * Math.cos(angle)),
                  y: center_y + (radius * Math.sin(angle))
                }

                if (fromDropdown) {
                  var nodeIndex = verticalPositioning ? 0 : self._shaper.closestNode(nodes, pos); ;
                  node = nodes.filter(function (d, i) { return i === nodeIndex;});
                  nodes = nodes.filter(function (d, i) { return i !== nodeIndex;});
                  order.push(node);
                } else {
                  node = order[i];
                }

                node.each(function(d) {
                  d.x = pos.x;
                  d.y = pos.y;
                });

              }

              self._shaper.lastNodesOrder = order;

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
          self._shaper.help.init();
        },
        update: function( fromDropdown ) {
          if (!self._shaper.isActive()) return;
          var data = self._shaper.shapes[ self._shaper.options.val() ];
          data.position(fromDropdown);
          self._shaper.config.save();
          thisGraph.removeCurvesFromNodeSet(thisGraph.getSelected());
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
              //thisGraph.save();
            } else {
              //Not actively shaping, so just update the average position of the nodes in question, so that they can have the same relative position after dragging (e.g. circle needs to keep its proper center-point)
              for (var i in self._shaper.shapes) {
                if (self._shaper.shapes[i].updateCenterOnDrag) {
                  var history = c.history[c.currentId(i)];
                  if (history) {
                    history.center = {
                      x: self._shaper.avg_x,
                      y: self._shaper.avg_y
                    }
                    //thisGraph.save();
                  }
                }
              }
            }
          },
          current: function() {
            return self._shaper.config.history[ self._shaper.config.currentId() ];
          },
          load: function() {
            var history = self._shaper.config.current();
            var shape = self._shaper.options.val();
            var sliders = self._shaper.sliders.getAll( shape );

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
          var shortest, index;
          nodes.each(function(d, i) {
            var distance = Math.pow(d.x-pos.x, 2) + Math.pow(d.y-pos.y, 2); //square rooting unecessary
            if (typeof shortest=="undefined" || distance<shortest) {
              shortest = distance;
              index = i;
            }
          });
          return index;
        },
        inALine: function( dir ) {
          var last, different = false;
          thisGraph.getSelected().each(function(d) {
            if (typeof last === "undefined" || d[dir]==last) {
              last = d[dir];
            } else {
              different = true;
              return false; //actually no way to break out!
            }
          });
          return !different;
        },
        straightLinePositioner: function( dir ) { /* x or y*/
          var ds = thisGraph.getSelected();
          var size_dimension = dir=="x" ? "width" : "height";
          var opposite_point = dir=="x" ? "y" : "x";
          var slider_name = dir=="x" ? "horizontal" : "vertical";

          var num = ds.size();
          var padding = self._shaper.sliders.get(slider_name).val();
          var end_width = 0, j = 0;

          var orderBy = dir;
          if (self._shaper.inALine(dir)) { //Can't do in order of 'dir', because all x's or all y's are the same. So do the opposite dir order instead.
            orderBy = opposite_point;
          }

          ds = ds.sort(function(a, b) {
             return d3.ascending(a[orderBy], b[orderBy]);
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
            thisGraph.animation();
            self._shaper.sliders.select( self._shaper.options.val() ); //show relevant sliders
            self._shaper.config.load(); //load previous data, or set to default
            self._shaper.help.refresh();
            self._shaper.refreshSettingsFlag();
            self._shaper.update(true);
          }
        },
        refreshSettingsFlag: function(b) {
          var has_shape = false;
          if (b===true || b===false) {
            has_shape = b;
          } else {
            for (var i in self._shaper.shapes) {
              if (self._shaper.config.history[ self._shaper.config.currentId(i) ]) {
                has_shape = true;
                break;
              }
            }
          }
          $("#shaperExistingSettings").toggle( has_shape );
        },
        help: {
          init: function() {
            $("#shaperHelp").on("click", self._shaper.help.do);
            self._shaper.help.refresh();
          },
          refresh: function() {
            var shape = self._shaper.options.val();
            var shape_det = self._shaper.shapes[ shape ];
            var show = !!shape_det && !!shape_det.help;
            $("#shaperHelp").toggle( show );
          },
          do: function() {
            var shape = self._shaper.options.val();
            var shape_det = self._shaper.shapes[ shape ];
            shape_det.help();
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
              if (shapes[i].extraHtml) {
                var extra_info = shapes[i].extraHtml();
                extra_info.addClass(i);
                sliders.holder.append(extra_info);
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
            min: 0.3,
            max: 4,
            step: 0.1,
            slide: function() {
              setTimeout(function() {
                self._scaler.update();
                self._scaler.doScale();
              });
            }
          });
          $("#scaleShortcuts var").click(self._scaler.shortcut);
          self._scaler.update();
        },
        shortcut: function(e) {
          var sizes = {
            S : 0.5,
            M : 1,
            L : 2
          }
          self._scaler.val( sizes[$(this).text()] );
          self._scaler.doScale();
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

  GraphCreator.prototype.animation = function() {
    $("body").addClass("animate");
    if (this.animateWait) clearTimeout(this.animateWait);
    this.animateWait = setTimeout(function() {
      $("body").removeClass("animate");
    }, 250);
  }

  GraphCreator.prototype.data = function(selector) {
    return d3.select(selector).data()[0];
  }

  GraphCreator.prototype.get_project_url = function( include_version ) {
    var url = location.href;
    if (!this.userView) url = url.slice(0, -1); //remove trailing slash
    url = url.substr(0, url.lastIndexOf("/")); //everything up to last slash for the base url
    url += "/" + this.mapId;
    if (include_version && this.version>0) url += "." + this.version;
    return url;
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

  GraphCreator.prototype.tooDark = function(c) {
    return !c ? false : colourBrightness(c)<100;
  }

  GraphCreator.prototype.bodyloader = function(b, cover) {
    $("body").toggleClass("loading", b!==false);
    if (cover) this.coverblock(b);
  }

  GraphCreator.prototype.moveToFront = function(d) {
    this.circles.each(function(e) { //Rather than append the node to the front, push everything else behind, to avoid the hover flicker
      if (e.id!=d.id) {
        this.parentNode.prepend(this);
      }
    });
  };

  GraphCreator.prototype.copyToClipboard = function(str) {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  GraphCreator.prototype.help = function(title, text) {
    this.myalert(title, text, "question");
  }

  GraphCreator.prototype.myalert = function(title, text, icon, callback, close_button) {
    Swal.fire({
      title: title,
      html: text,
      type: icon,
      showCloseButton: close_button
    }).then((result) => {
      if (callback) callback(result);
    });
  }

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

  var CPS = [];
  function closeAllColourPickers() {
    for (var i in CPS) {
      CPS[i].picker.hide();
    }
  }

  function colourBrightness( c ) { //returns 0 to 255
    var c = c.substring(1);      // strip #
    var rgb = parseInt(c, 16);   // convert rrggbb to decimal
    var r = (rgb >> 16) & 0xff;  // extract red
    var g = (rgb >>  8) & 0xff;  // extract green
    var b = (rgb >>  0) & 0xff;  // extract blue

    var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
    return luma;
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

  function setCookie(cname, cvalue, seconds) {
    var d = new Date();
    d.setTime(d.getTime() + seconds);
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
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

  /** Main **/
  var graph = new GraphCreator();
  window.graph = graph;

})(window.d3);
