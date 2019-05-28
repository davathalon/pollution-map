<?php
session_start();

if (isset($_COOKIE["logout"]) && $_COOKIE["logout"]==1) {
  $_SESSION["logged_in"] = false;
  unset($_SESSION["logged_in"]);
  setcookie("logout", "", 1, "/");
} else if (isset($_POST["username"])) {
  if ($_POST["username"]=="admin" && $_POST["password"]=="admin") {
    $_SESSION["logged_in"] = true;
  } else {
    $login_fail = true; //alert at EOF
  }
}
?>
<!DOCTYPE HTML>
<html>
  <head>
    <title>Desmog | Map Editor</title>
    <link rel="stylesheet" href="static/main.css" />
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
      #projectLink a {
        font-size:13px
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
        /*min-height:115px;*/
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
        /*text-shadow:0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white;*/
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
      svg .conceptG.img text.blurred {
        stroke-width:5px;
        stroke:white;
        filter:url(#blur);
        /*text-shadow:0 0 6px white;*/
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

  <body class="main">

    <div style="height:100%">

      <style>
        #overlay > div {
          position:fixed;
          width:300px;height:100%;
          background:#f4f4f4;
          z-index:1;
          box-shadow:2px 0px 5px #999;
          padding:20px;
          box-sizing:border-box;
          overflow-y:auto;
        }
        #overlay input[type=text], #overlay input[type=password] {
          width: 100%;
          box-sizing: border-box;
          padding: 3px;
          font-size: 19px;
        }
        #login input[type=text], #login input[type=password] {
          font-size:17px;
          border: 1px solid #d5d5d5;
          padding:4px;
        }
        #overlay input[type=text].url, #overlay input[type=password].url {
          font-size:16px;
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
        body.main #svgHolder, body.login #svgHolder {
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
          /*max-height: 120px;*/
          overflow-y: auto;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-size: 13px;
          text-align: left;
          white-space: pre-wrap;
          padding: 5px;
        }
        #advancedOptions .list > var {
          margin-right:10px;
          margin-bottom:6px;
          display:inline-block;
        }
      </style>

      <div id="svgHolder">
        <div id="dclick_prompt">Double-click to add a Node</div>
        <div id="svgBackground"></div>
        <a href="https://desmog.co.uk" target="_blank" class="logo">DESMOG</a>
        <div id="mapActionButtons">
          <img id="fsButton" src="images/fullscreen.svg">
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
          <div id="projectList">
            <?
            if ($_SESSION["logged_in"]) {
              $mysqli = include "db_connect.php";
              $maps = mysqli_query($mysqli, "SELECT id, title FROM maps WHERE deleted=0 ORDER BY updated_stamp DESC");
              while ($row = mysqli_fetch_assoc($maps)) {
                echo "<div data-value='{$row['id']}'>{$row['title']}</div>";
              }
            }
            ?>
          </div>
          <div style="margin-top:20px">
            <input id="createNewProject" class="myButton" type="button" value="Create New Map" style="margin-right:8px">
            <input id="logout" class="myButton grayscale" type="button" value="Logout">
          </div>
        </div>

        <div id="login">
          <form action="./" method="post">
            <div class="logo" style="margin-bottom:20px">DESMOG</div>
            <div>
              <div class="subtitle" style="margin-bottom:5px;">Username:</div>
              <input id="username" name="username" type="text" autocomplete="off">
            </div>
            <div style="margin-top:12px">
              <div class="subtitle" style="margin-bottom:5px;">Password:</div>
              <input type="password" name="password" autocomplete="off">
            </div>
            <div style="margin-top:15px">
              <input id="loginButton" class="myButton" type="submit" value="Login" style="padding: 6px 33px">
            </div>
          </form>
        </div>

        <style>
          #project ul {
            margin:0;
            padding:15px 0 8px 20px;
          }
          #project li {
            padding-bottom:20px;
            font-size:16px;
          }
          .help {
            width: 13px;
            opacity: 0.5;
            cursor:pointer;
            margin-bottom:-2px;
          }
          .help:hover {
            opacity:1;
          }
          .valign span, .valign img, .valign a {
            vertical-align:middle;
          }
        </style>
        <div id="project">
          <div class="logo" style="margin-bottom:12px">DESMOG</div>
          <div id="project_pre_save">
            <div class="buttons" style="margin-top:20px;">
              <div style="font-size: 17px;">
                <div style="font-weight:bold;">Preview Mode</div>
                <ul>
                  <li>This shows the exact view and interactivity the user will get.</li>
                  <li>Drag the sides of the pane to preview different-sized maps.</li>
                  <li>The image used for social-media will be however you leave the view to the right (small=blurry).</li>
                </ul>
              </div>
              <input id="finalSave" class="myButton" type="button" value="Save" style="padding:6px 30px">
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
                <div class="subtitle valign" style="margin-bottom:5px;">
                  <span>Map Title:</span> <img class="help" src="images/help.png" onclick="graph.help('Map Title', 'The map title has two uses: 1) To help you distinguish between maps on the main page, and 2) It is displayed when sharing the map via social-media.')">
                </div>
                <input id="projectTitle" type="text" autocomplete="off">
              </div>
              <div>
                <div class="subtitle" style="margin-bottom:5px;">Background Image (URL):</div>
                <input id="projectBackgroundURL" type="text" autocomplete="off" class="url">
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
              <div class="subtitle" style="margin-bottom:8px">
                Advanced Options:
              </div>
              <div class="list" style="font-size:13px;margin-bottom:-6px">
                <var id="graphDelete">Delete</var>
                <var id="cloneMap">Clone</var>
                <var id="invertLogo">Invert Logo</var>
                <var id="guidelines">Shortcuts</var>
              </div>
            </div>
            <div class="buttons" style="margin-top:30px;">
              <input id="graphSave" class="myButton" type="button" value="Preview">
              <input id="graphPreview" class="myButton" type="button" value="Preview" style="display:none">
              <input id="graphClose" class="myButton grayscale" type="button" value="Home">
              <input id="graphAdvanced" class="myButton grayscale" type="button" value="&#9660;" style="padding: 6px 8px;">
            </div>
          </div>
        </div>

        <div id="edgeInfo">
          <div style="font-size: 23px;font-weight:bold;text-align:center;">
            <span id="relationshipFromName"></span>
            <div style="margin: 3px 0;color:#666;font-size: 15px;">AND</div>
            <span id="relationshipToName"></span>
          </div>
          <div id="relationshipList"></div>
          <div style="margin-top:35px">
            <input id="relationshipBack" class="myButton grayscale" type="button" value="Back">
            <input id="relationshipAdd" class="myButton" type="button" value="Add" style="float:right">
          </div>
        </div>

        <div id="info">
          <div id="selectionTitleHolder" style="font-size:18px;font-weight:bold">
            <input id="selectionTitle" type="text">
            <div>Multiple Nodes</div>
          </div>
          <div style="margin-top:20px">
            <div class="subtitle valign" style="margin-bottom:9px">
              <span id="scaleAmount"></span> <img class="help" src="images/help.png" style="margin-left:4px" onclick="graph.help('Node Scaling', 'This option is <i>not</i> for deciding the size of node that the user sees, because the zoom feature negates that entirely. Rather, this feature is meant for choosing your node size <i>relative</i> to the other nodes. Ideally, your most common-sized node has a setting around 1. If that appears too large, then simply zoom out.')">
            </div>
            <div id="scaleSlider"></div>
            <div id="colourEditHolder" style="margin-top:25px">
              <div class="subtitle" style="margin-bottom:9px">
                Select a Colour: <var id="colourRemoveButton" class="rightOption">(Image)</var>
              </div>
              <input id="colouriserEdit" type="color" style="width:100%;height:50px">
            </div>
            <div id="imageEditHolder" style="margin-top:25px">
              <div class="subtitle" style="margin-bottom:9px">
                Edit Image URL: <var id="imageRemoveButton" class="rightOption">(Colour)</var>
              </div>
              <input id="imageEdit" type="text" class="url">
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
              <img id="shaperHelp" class="help" src="images/help.png">
              <var id="forgetShape" style="float:right;padding-top:5px;font-size:11px">Forget Settings</var>
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
            <div id="shaperOptions" style="padding-bottom:15px">

            </div>
          </div>
          <div style="margin-top:25px">
            <input id="nodeOptionsBackButton" class="myButton grayscale" type="button" value="Back">
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
          <div id="blankNodeAdder" class="subtitle" style="margin-top:20px">
            <var>Or add a blank node</var>
          </div>
        </div>

      </div>

    </div>

    <div id="cover" style="display:none;position:absolute;cursor:alias;left:0;width:100%;top:0;height:100%;background:black;opacity:0.15;z-index:3"></div>

    <div id="coverBlock" style="display:none;position:fixed;left:0;width:100%;top:0;height:100%;background:black;opacity:0.15;z-index:11"></div>

    <script src="static/d3.v4.js" charset="utf-8"></script>
    <script src="static/LsDataSource.js"></script>
    <script src="static/jscolor.js"></script>
    <script src="static/main.js"></script>
    <script src="static/dom-to-image.js"></script>

    <script>
      graph.setLoggedIn(<?=json_encode($_SESSION["logged_in"])?>);
      graph.load(false);
      <?if ($login_fail) {?>
        Swal.fire({
          title: "Incorrect Login",
          html: "Please try again",
          type: "warning"
        });
      <?}?>
    </script>

    <style>
      #relationshipList {
        text-align:left;
        padding-top:30px;
      }
      #RelationshipNode {
        margin-bottom:20px;
      }
      #RelationshipNode select {
        font-size:21px;
        width:220px;
      }
      #RelationshipNode div {
        margin-top:3px;
      }
      #RelationshipNode .myButton {
        padding: 6px 10px;
        float:right;
      }
      #RelationshipNode select, #RelationshipNode input {
        vertical-align:middle;
      }
      .away {
        width:10px;
        height:10px;
        position:absolute;
        left:-10000px;
      }
    </style>
    <div id="hidden" style="display:none">
      <div id="RelationshipNode">
        <input class="relationshipName" type="text" value="">
        <div>
          <select class="relationshipDirection">
            <option value="0"> &#10231; </option>
            <option value="1"> &#10230; </option>
            <option value="2"> &#10229; </option>
          </select>
          <input type="button" class="myButton grayscale" value="X">
        </div>
      </div>
      <div id="guidelinesContent">
        <b>Adding New Relationships</b>
        <div>
          Hold down the Shift key whilst dragging from one node to another.
        </div>
        <b>Multiple Node Selection</b>
        <div>
          Hold down the Ctrl key and drag a box around the nodes you wish to select. You can add or remove individual nodes from your selection by clicking on them, whilst holding down the Ctrl key. You will then be able to edit, move, and arrange into shapes multiple nodes at once.
        </div>
        <b>Selecting All</b>
        <div>
          A quick way to select all nodes is by pressing Ctrl and A.
        </div>
        <b>Deleting Nodes & Relationships</b>
        <div>
          Press the Backspace or Delete key whilst a node or relationship is selected, in order to delete it.
        </div>
        <b>Adding new Nodes</b>
        <div>
          Double-click any blank bit of background to bring up the New Node options.
        </div>
        <b>Zooming</b>
        <div>
          You can use your mouse-wheel or trackpack to zoom in and out.
        </div>
      </div>
    </div>

  </body>

</html>
