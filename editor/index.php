<!DOCTYPE HTML>
<html>
  <head>
    <title>Desmog | Map Editor</title>
    <link rel="stylesheet" href="static/graph-creator.css" />
    <link rel="stylesheet" href="static/jquery-ui.css">
    <style>
      html, body {
        font-family:arial,sans-serif;
        background:white;
        padding-right: 0 !important; /*swal adds padding to stop shift on scroll-bar*/
      }
      body.loading * {
        cursor:wait !important;
      }
      #svgHolder {
        background:white;
      }
      var, a {
        color:#096ba5;
        cursor:pointer;
        font-style:normal;
        text-decoration:none;
      }
      var:hover, a:hover {
        text-decoration:underline;
      }
      /*#project_non_preview .buttons input {
        padding:6px 16px;
      }*/
      #projectLink {
        margin-right:-200px;
      }
      #projectLink a {
        font-size:11px
      }
      #projectLinkCopy {
        width: 11px;vertical-align: middle;cursor: pointer;
        opacity:0.6;
      }
      #projectLinkCopy:hover {
        opacity:1;
      }
      .colourpicker {
        width:100%;
        height:40px;
        box-sizing:border-box;
        border-radius:3px;
        border:3px solid white;
        box-shadow:0 0 1px black;
      }
      body.previewHolder #svgHolder, body #previewer, body #project_preview, body.previewHolder #project_non_preview, body #project_pre_save {
        display:none;
      }
      body.previewHolder:not(.preSave) #project_preview {
        display:block;
      }
      body.previewHolder #previewer, body.previewHolder.preSave #project_pre_save {
        display:block;
      }

      body.previewHolder {
        overflow:auto;
      }

      #projectList {
        border:1px solid #ccc;margin-top:9px;border-radius:3px;max-height:200px;overflow-y:auto;
        background: white;
        max-height:300px;
        max-height: calc(100% - 140px);
        min-height:115px;
      }
      #projectList > div {
        border-bottom: 1px solid #ccc;
        padding:10px;
        cursor:pointer;
      }
      #projectList > div:hover {
        background:#eee;
      }

      @font-face {
        font-family:Gotham;
        src: url(static/Gotham-Black.otf);
      }
      .logo {
        font-family:Gotham;
        font-weight:bold;
        font-size:42px;
        text-align:left;
        color:black;
      }
      .logo:after {
        content:"UK";
        color:#0065B3
      }
      svg {
          position:relative;
          z-index:2;
          /*cursor: move;
          cursor: grab;
          cursor: -moz-grab;
          cursor: -webkit-grab;*/
      }
      /*body.dragging svg {
        cursor: grabbing;
        cursor: -moz-grabbing;
        cursor: -webkit-grabbing;
      }*/
      body.animate svg g {
        -webkit-transition: transform 0.3s; /* Safari */
      }
      body.animate svg path {
        -webkit-transition: d 0.3s; /* Safari */
      }
      svg path, svg circle, svg image {
        cursor:default;
      }


      .ui-autocomplete-loading {
        background: white url("images/load.gif") right 10px center no-repeat;
      }
      #node_search_text {
        padding: 3px;
        font-size: 24px;
        border-radius: 4px;
        width:100%;
        box-sizing:border-box;
      }
      #adder .card .name {
        margin-bottom:5px
      }
      #adder .card img {
        max-height:200px;max-width:100%;
        border-radius:3px;
      }
      #adder .card.noimg img {
        display:none;
      }
      #dclick_prompt {
        display:none;
        position:absolute;
        top:45%;
        width:100%;
        text-align:center;
        font-size:27px;
        font-weight:bold;
        color:#cecece;
        pointer-events:none;
        text-shadow:0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white;
        z-index:5;
      }
      .subtitle {
        font-size:15px;
        color:#666;
      }
      .myButton {
      	-moz-box-shadow:inset 0px 1px 0px 0px #54a3f7;
      	-webkit-box-shadow:inset 0px 1px 0px 0px #54a3f7;
      	box-shadow:inset 0px 1px 0px 0px #54a3f7;
      	background:-webkit-gradient(linear, left top, left bottom, color-stop(0.05, #007dc1), color-stop(1, #0061a7));
      	background:-moz-linear-gradient(top, #007dc1 5%, #0061a7 100%);
      	background:-webkit-linear-gradient(top, #007dc1 5%, #0061a7 100%);
      	background:-o-linear-gradient(top, #007dc1 5%, #0061a7 100%);
      	background:-ms-linear-gradient(top, #007dc1 5%, #0061a7 100%);
      	background:linear-gradient(to bottom, #007dc1 5%, #0061a7 100%);
      	filter:progid:DXImageTransform.Microsoft.gradient(startColorstr='#007dc1', endColorstr='#0061a7',GradientType=0);
      	background-color:#007dc1;
      	-moz-border-radius:3px;
      	-webkit-border-radius:3px;
      	border-radius:3px;
      	border:1px solid #124d77;
      	display:inline-block;
      	cursor:pointer;
      	color:#ffffff;
      	font-family:Arial;
      	font-size:13px;
      	padding:6px 24px;
      	text-decoration:none;
      	text-shadow:0px 1px 0px #154682;
      }
      .myButton:hover {
      	background:-webkit-gradient(linear, left top, left bottom, color-stop(0.05, #0061a7), color-stop(1, #007dc1));
      	background:-moz-linear-gradient(top, #0061a7 5%, #007dc1 100%);
      	background:-webkit-linear-gradient(top, #0061a7 5%, #007dc1 100%);
      	background:-o-linear-gradient(top, #0061a7 5%, #007dc1 100%);
      	background:-ms-linear-gradient(top, #0061a7 5%, #007dc1 100%);
      	background:linear-gradient(to bottom, #0061a7 5%, #007dc1 100%);
      	filter:progid:DXImageTransform.Microsoft.gradient(startColorstr='#0061a7', endColorstr='#007dc1',GradientType=0);
      	background-color:#0061a7;
      }
      .myButton:active {
      	position:relative;
      	top:1px;
      }
      .myButton.grayscale {
        filter:grayscale(100%) brightness(120%);
      }
      svg text {
        font-size:16px;
        font-weight:bold;
      }
      svg .conceptG.img text {
        text-shadow: 0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 6px white,0px 0px 4px white;
      }
      svg .conceptG.img text {
        visibility:hidden;
      }
      body:not(.brushing) svg .conceptG.img:hover text {
        visibility:visible;
      }
      body:not(.brushing) svg .conceptG.img:hover image {
        opacity:0.75;
      }
      body:not(.brushing) g.conceptG.clr:hover circle.over {
        opacity:0.92;
      }
      body.brush .conceptG circle {
        cursor:cell;
      }
      body.brush .conceptG.selected circle {
        cursor:default;
      }
      body.brushing path, body.brushing circle  {
        cursor: crosshair !important;
      }
    </style>
    <script src="static/jquery-1.10.2.js"></script>
    <script src="static/jquery-ui.js"></script>
    <script src="static/sweetalert2.js"></script>
    <script>
      var db = console.log;
    </script>
  </head>

  <body>

    <div style="height:100%">

      <style>
        #overlay > div {
          position:fixed;
          width:300px;height:100%;
          background:rgba(256,256,256,0.97);
          z-index:1;
          box-shadow:2px 0px 5px #999;
          padding:20px;
          box-sizing:border-box;
          overflow-y:auto;
        }
        #project input[type=text] {
          width: 100%;
          box-sizing: border-box;
          padding: 3px;
          font-size: 19px;
        }
        #svgHolder, #previewer {
          margin-left:300px;
          position:relative;
        }
        #svgBackground {
          position:absolute;
          top:0;
          left:0;
          width:100%;
          height:100%;
          background-size:cover;
          opacity:0.1;
        }
        #project .fields > div {
          margin-bottom:25px;
        }
        #previewer {
          display:none;
          z-index:10;
          position:relative;
        }
        #piframe > div {
          width:840px; /*default size*/
          height:600px;
        }
        #piframe iframe {
          display:block;
          width:100%;
          height:100%;
          border:0;
          border: 1px solid #444;
        }
        #pdimensions {
          margin-top: 10px;
          color: #bbb;
          font-size: 13px;
          cursor:pointer;
          display:inline-block;
        }
        #previewer #pcover {
          display:none;
          position:absolute;
          left:0;top:0;width:100%;height:100%;
          z-index:10;
        }
        #previewer.dragging #pcover {
          display:block;
        }

        body.preview #overlay {
          display:none !important;
        }
        body.preview #svgHolder {
          margin-left:0;
        }
        #svgHolder .logo {
          font-size: 25px;
          position: absolute;
          right: 11px;
          bottom: 7px;
          display:none;
          z-index:100;
          text-decoration:none;
        }
        body.preview #svgHolder .logo {
          display:block;
        }
        @media (max-width: 500px) {
          #svgHolder .logo {
            font-size:20px;
          }
        }
        @media (max-width: 350px) {
          #svgHolder .logo {
            font-size:14px;
          }
        }
        @media (max-width: 200px) {
          #svgHolder .logo {
            visibility:hidden;
          }
        }
        #mapActionButtons {
          position:absolute;top:10px;right:10px;
          z-index:100
        }
        #mapActionButtons > img {
          width: 17px;
          background: rgba(256,256,256,0.7);
          padding: 5px;
          border: 1px solid #999;
          border-radius: 3px;
          cursor:pointer;
        }
        body.main #mapActionButtons, body.main #svgHolder {
          display:none;
        }
        body.screenshotting #mapActionButtons, body.screenshotting #dclick_prompt {
          display:none !important;
          visibility:hidden;
        }
        #screenshotPopup {
          font-size:14px;
        }
        #screenshotPopup img {
          margin-top:10px;
          width:100%;
          display:block;
          border: 1px solid #eee;
          border-radius: 3px;
        }
        #blurb textarea {
          width: 100%;
          max-width:100%;
          min-width:100%;
          box-sizing: border-box;
          font-size:12px;
        }
        .infopopup em {
          font-style:italic;
          display:block;
          margin-bottom:15px;
          font-size:20px;
          font-weight:bold
        }
        .infopopup span {
          display:block;
          max-height: 120px;
          overflow-y: auto;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-size: 13px;
          text-align: left;
          white-space: pre-wrap;
          padding: 5px;
        }
      </style>

      <div id="svgHolder">
        <div id="dclick_prompt">Double-click to add a Node</div>
        <div id="svgBackground"></div>
        <a href="https://desmog.co.uk" target="_blank" class="logo">DESMOG</a>
        <div id="mapActionButtons">
          <img id="fsbutton" src="images/fullscreen.svg">
        </div>
      </div>
      <div id="previewer">
        <div id="pcover"></div>
        <div style="padding:40px 40px 15px">
          <div>
            <div id="piframe"></div>
            <div id="pdimensions"></div>
          </div>
        </div>
      </div>
      <div id="overlay" style="display:none;position:absolute;top:0;left:0;height:100%;z-index:10">

        <div id="main" style="background:#f4f4f4">
          <div class="logo" style="margin-bottom:12px">DESMOG</div>
          <div class="subtitle" style="margin-bottom:5px;">Open a Map:</div>
          <div id="projectList">
            <?
            $mysqli = include "db_connect.php";
            $maps = mysqli_query($mysqli, "SELECT id, title FROM maps WHERE deleted=0 ORDER BY updated_stamp DESC");
            while ($row = mysqli_fetch_assoc($maps)) {
              echo "<div data-value='{$row['id']}'>{$row['title']}</div>";
            }
            ?>
          </div>
          <div style="margin-top:20px">
            <input id="createNewProject" class="myButton" type="button" value="Create New Map">
          </div>
        </div>

        <div id="project" style="background:rgba(244,244,244,0.97)">
          <div class="logo" style="margin-bottom:12px">DESMOG</div>
          <div id="project_pre_save">
            <div class="buttons" style="margin-top:20px;">
              <div style="margin-bottom: 20px;font-size: 17px;">
                <div style="font-weight:bold;">Preview Mode</div>
                <div style="font-style:italic">You can change the social-media image size by altering the preview pane to the right (the default is recommended).</div>
              </div>
              <input id="finalSave" class="myButton" type="button" value="Publish this Map">
              <input id="finalSaveCancel" class="myButton grayscale" type="button" value="Cancel">
            </div>
          </div>
          <div id="project_preview">
            <div class="buttons" style="margin-top:20px;">
              <div style="margin-bottom: 20px;font-size: 17px;font-style: italic;">
                You are in Preview Mode. You can change the size of the preview pane by dragging the edges.
              </div>
              <input id="exitPreviewMode" class="myButton" type="button" value="Exit Preview Mode" style="width:100%">
            </div>
          </div>
          <div id="project_non_preview">
            <div class="fields">
              <div>
                <div class="subtitle" style="margin-bottom:5px;">Map Title:</div>
                <input id="projectTitle" type="text" autocomplete="off">
              </div>
              <div>
                <div class="subtitle" style="margin-bottom:5px;">Background Image (URL):</div>
                <input id="projectBackgroundURL" type="text" autocomplete="off">
              </div>
              <div>
                <div class="subtitle" style="margin-bottom:7px;">Background Opacity:</div>
                <div id="projectBackgroundOpacity"></div>
              </div>
              <div>
                <div class="subtitle" style="margin-bottom:7px;">Arrow Width:</div>
                <div id="projectArrowWidth"></div>
              </div>
              <div>
                <div class="subtitle" style="margin-bottom:4px;">Arrow Colour:</div>
                <div id="projectArrowColour"></div>
              </div>
              <div id="projectLinkHolder">
                <div class="subtitle" style="margin-bottom:4px;">
                  Sharing Link:
                  <img id="projectLinkCopy" src="images/copy.png">
                  <span></span>
                </div>
                <div id="projectLink"></div>
              </div>
            </div>
            <div id="advancedOptions" style="display: none; margin-left:2px;margin-top: 20px; font-size: 15px; color: rgb(34, 34, 34);">
              <div class="subtitle" style="margin-bottom:7px">
                Advanced Options:
              </div>
              <div style="font-size:11px">
                <var id="graphDelete">Delete Map</var>
              </div>
            </div>
            <div class="buttons" style="margin-top:30px;">
              <input id="graphSave" class="myButton" type="button" value="Preview">
              <input id="graphPreview" class="myButton" type="button" value="Preview" style="display:none">
              <input id="graphClose" class="myButton grayscale" type="button" value="Cancel">
              <input id="graphAdvanced" class="myButton grayscale" type="button" value="&#9660;" style="padding: 6px 8px;">
            </div>
          </div>
        </div>

        <div id="info" style="background:rgba(244,244,244,0.97)">
          <div id="selection_title" style="font-size:18px;font-weight:bold">

          </div>
          <div style="margin-top:20px">
            <div id="scaleAmount" class="subtitle" style="margin-bottom:9px"></div>
            <div id="scaleSlider"></div>
            <div id="colourEditHolder" style="margin-top:25px">
              <div class="subtitle" style="margin-bottom:9px">
                Select a Colour:
              </div>
              <input id="colouriserEdit" type="color" value="#f6fbff" style="width:100%;height:50px">
            </div>
          </div>
          <div id="blurb">
            <div class="subtitle" style="margin-top:25px;margin-bottom:9px">
              Edit Short Description:
            </div>
            <textarea id="blurbShort" style="height: 45px;"></textarea>
            <div class="subtitle" style="margin-top:25px;margin-bottom:9px">
              Edit Long Description:
            </div>
            <textarea id="blurbLong" style="height: 120px;"></textarea>
          </div>
          <div id="shaper" style="margin-top:25px">
            <div class="subtitle" style="margin-bottom:9px">
              Select a Shape
            </div>
            <style>
              #shaperOptions select {
                width:100%;
                font-size:14px;
              }
              #shaperOptions > div > div {
                margin: 20px 25px 0;
                font-size: 12px; /*changes slider size*/
              }
              #shaperOptions .prompt {
                margin-bottom:5px;
                font-size:11px;
                color:#999;
              }
            </style>
            <div id="shaperOptions">

            </div>
          </div>
        </div>

        <div id="adder">
          <div class="subtitle" style="margin-bottom:5px;">Search for a name:</div>
          <input id="node_search_text" type="text">
          <div class="card" style="display:none;font-size:20px;margin-top:20px;">
            <div class="name"></div>
            <img src="#">
            <input id="nodeChosenButton" class="myButton" type="button" value="Add to Map" style="display:block;margin-top:20px">
          </div>
        </div>

      </div>

    </div>

    <div id="cover" style="display:none;position:absolute;cursor:alias;left:0;width:100%;top:0;height:100%;background:black;opacity:0.15;z-index:3"></div>

    <div id="coverBlock" style="display:none;position:fixed;left:0;width:100%;top:0;height:100%;background:black;opacity:0.15;z-index:11"></div>


    <script>
      var loadMapId = false, isPreview = false;
    </script>
    <script src="static/d3.v4.js" charset="utf-8"></script>
    <script src="static/LsDataSource.js"></script>
    <script src="static/jscolor.js"></script>
    <script src="static/graph-creator-dv4.js?v=2"></script>
    <script src="static/dom-to-image.js"></script>


  </body>

</html>