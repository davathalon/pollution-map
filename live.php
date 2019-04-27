<?php
$mysqli = include_once "editor/db_connect.php";
$isPreview = !isset($_GET["id"]);

if (!$isPreview) {
  $id = intval($_GET["id"]);
  $det = mysqli_fetch_assoc(mysqli_query($mysqli, "SELECT * FROM maps WHERE id=$id"));
  $title = $det["title"];
} else {
  $title = "Map Preview";
}
?>
<!DOCTYPE HTML>
<html>
  <head>
    <title>Desmog | <?=$title?></title>

    <?if (!$isPreview) {
      $base_url = "https://" . $_SERVER[HTTP_HOST] . substr($_SERVER[REQUEST_URI], 0, strrpos($_SERVER[REQUEST_URI], "/"));?>
      <meta property="og:title" content="<?=$title?>" />
      <meta property="og:description" content="DeSmog UK was launched in September 2014 as an investigative media outlet dedicated to cutting through the spin clouding the debate on energy and environment in Britain. Since then, our team of journalists and researchers has become a go-to source for accurate, fact-based information regarding misinformation campaigns on climate science in the UK." />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="<?=$base_url?>/share/<?=$id?>.jpg?v=<?=$det["version"]?>" />
    <?}?>

    <link rel="stylesheet" href="editor/static/graph-creator.css" />
    <link rel="stylesheet" href="editor/static/jquery-ui.css">
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

      #projectList > div {
        border-bottom: 1px solid #ccc;
        padding:8px;
        cursor:pointer;
      }
      #projectList > div:hover {
        background:#f3f3f3;
      }

      @font-face {
        font-family:Gotham;
        src: url(editor/static/Gotham-Black.otf);
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
        background: white url("editor/images/load.gif") right 10px center no-repeat;
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
    <script src="editor/static/jquery-1.10.2.js"></script>
    <script src="editor/static/jquery-ui.js"></script>
    <script src="editor/static/sweetalert2.js"></script>
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
          background: white;
          opacity:0.7;
          padding: 5px;
          border: 1px solid #999;
          border-radius: 3px;
          cursor:pointer;
        }
        #mapActionButtons > img:hover {
          opacity:1;
        }
        #mapActionButtons > img:active {
          margin-bottom:-1px;
          margin-top:1px;
        }
        body.screenshotting #mapActionButtons, body.screenshotting #dclick_prompt {
          display:none !important;
        }
        #screenshotPopup {
          font-size:14px;
        }
        #screenshotPopup img {
          margin-top:10px;
          width:100%;
          display:block;
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
          /*max-height: 120px;*/
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
        <div id="mapActionButtons" style="width:50px;text-align:right">
          <img id="fsButton" src="editor/images/fullscreen.svg" data-tippy-content="Full Screen">
          <img id="shareButton" src="editor/images/share.svg" data-tippy-content="Share">
          <img id="zoomInButton" src="editor/images/plus.svg" data-tippy-content="Zoom In">
          <img id="zoomOutButton" src="editor/images/minus.svg" data-tippy-content="Zoom Out">
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

        <div id="main">
          <div class="logo" style="margin-bottom:12px">DESMOG</div>
          <div class="subtitle" style="margin-bottom:5px;">Open a Map:</div>
          <div id="projectList" style="border:1px solid #ccc;margin-top:9px;border-radius:3px;max-height:200px;overflow-y:auto;">
          </div>
        </div>

        <div id="project" style="background:rgba(244,244,244,0.97)">
          <div class="logo" style="margin-bottom:12px">DESMOG</div>
          <div id="project_pre_save">
            <div class="buttons" style="margin-top:20px;">
              <div style="margin-bottom: 20px;font-size: 17px;font-style: italic;">
                You can change the social-media image size by altering the preview pane to the right (the default is recommended).
              </div>
              <input id="finalSave" class="myButton" type="button" value="Publish this Map">
              <input id="finalSaveCancel" class="myButton" type="button" value="Cancel">
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
                <input id="projectTitle" type="text">
              </div>
              <div>
                <div class="subtitle" style="margin-bottom:5px;">Background Image (URL):</div>
                <input id="projectBackgroundURL" type="text">
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
            </div>
            <div class="buttons" style="margin-top:30px;">
              <input id="graphSave" class="myButton" type="button" value="Publish" style="margin-right:6px">
              <input id="graphPreview" class="myButton" type="button" value="Preview">
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

    <script src="editor/static/d3.v4.js" charset="utf-8"></script>
    <script src="editor/static/LsDataSource.js"></script>
    <script src="editor/static/jscolor.js"></script>
    <script src="editor/static/graph-creator-dv4.js?v=2"></script>
    <script src="editor/static/dom-to-image.js"></script>
    <script src="https://unpkg.com/popper.js@1"></script>
    <script src="https://unpkg.com/tippy.js@4"></script>
    <script>
      $(function() {
        <?if (!$isPreview) {
          echo "graph.load({$det['id']}, {$det['version']}, ".json_encode($det['config']).")";
        } else {
          echo "graph.preview()";
        }?>
      });
      tippy('[data-tippy-content]', {
        placement:"left"
      });
    </script>

    <style>
      #icons {
        text-align:center;
        color:#0a0a0a;
      }
      #icons > div, #icons > a  {
        width:70px;
        float:left;
        margin-right:20px;
        cursor:pointer;
        display:block;
        text-decoration:none;
        color:inherit;
      }
      #icons .circle {
        width:100%;
        height:70px;
        border-radius:100px;
      }
      #icons .label {
        margin-top:8px;
        font-size:14px;
      }
    </style>
    <div style="display:none">
      <div id="embedPopupContent" style="padding:10px 20px 0">
        <textarea readonly style="border:1px solid #ccc;width:100%;height:auto;font-size:15px;padding:10px"></textarea>
      </div>
      <div id="sharePopupContent" style="padding:18px 0 10px">
        <div id="icons">
          <div id="embedLink">
            <div class="circle" style="border:1px solid #e4e4e4;background:#f4f4f4">
              <img src="https://image.flaticon.com/icons/svg/24/24207.svg" style="width: 32px;padding-top: 19px;opacity: 0.6;">
            </div>
            <div class="label">Embed</div>
          </div>
          <a id="facebookLink" href="#" target="_blank">
            <div class="circle" style="border:1px solid #3a5997;background:#3a5997">
              <img src="https://cdn3.iconfinder.com/data/icons/picons-social/57/06-facebook-512.png" style="width: 42px;padding-top: 13px;filter:invert(100%);">
            </div>
            <div class="label">Facebook</div>
          </a>
          <a id="twitterLink" href="#" target="_blank">
            <div class="circle" style="border:1px solid #1aa1f1;background:#1aa1f1">
              <img src="https://cdn3.iconfinder.com/data/icons/picons-social/57/03-twitter-256.png" style="width: 42px;padding-top: 14px;filter:invert(100%)">
            </div>
            <div class="label">Twitter</div>
          </div>
        </a>
        <div style="padding-top:25px;clear:both;position:relative">
          <input id="share_link_text" type="text" value="" style="width:100%;box-sizing: border-box;font-size:15px;padding: 11px 15px;border:1px solid #e4e4e4;background:#f4f4f4;text-align: left;color: #0a0a0a;">
          <div id="copy_link" style="position:absolute;right: 3px;bottom: 1px;color: #3a5996;padding:10px;font-size: 14px;cursor: pointer;">COPY</div>
        </div>
      </div>
    </div>

  </body>

</html>
