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
    <link rel="stylesheet" href="static/main.css?v=6" />
    <link rel="stylesheet" href="static/editor.css" />
    <link rel="stylesheet" href="static/jquery-ui.css">
    <script src="static/jquery-1.10.2.js"></script>
    <script src="static/jquery-ui.js"></script>
    <script src="static/sweetalert2.js"></script>
    <script>
      var db = console.log;
    </script>
  </head>

  <body class="main">

    <div style="height:100%">

      <div id="svgHolder">
        <div id="dclick_prompt">Double-click to add a Node</div>
        <div id="svgBackground"></div>
        <a href="https://desmog.co.uk" target="_blank" class="logo">DESMOG</a>
        <div id="mapActionButtons" style="width:50px;text-align:right">
          <img id="fsButton" src="images/fullscreen.svg">
          <img id="zoomInButton" src="images/plus.svg" data-tippy-content="Zoom In">
          <img id="zoomOutButton" src="images/minus.svg" data-tippy-content="Zoom Out">
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
          <a class="logo" style="margin-bottom:12px;display:block;text-decoration:none;" href="./">DESMOG</a>
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

        <div id="project">
          <a class="logo" style="margin-bottom:12px;display:block;text-decoration:none;" href="./">DESMOG</a>
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
                  <span>Map Title:</span> <img class="help" src="images/help.png" onclick="graph.help('Map Title', 'The map title has three uses: 1) To help you distinguish between maps on the main page, 2) It is displayed when sharing the map via social-media, and 3) It is displayed at the top of maps that have been embedded (whether on desmog.co.uk, or elsewhere).')">
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
          <div>
            <div id="individualArrowWidthTitle" class="subtitle" style="margin-bottom:7px;">Arrow Width:</div>
            <div id="individualArrowWidthSlider"></div>
          </div>
          <div style="margin-top:35px">
            <input id="relationshipBack" class="myButton grayscale" type="button" value="Done">
            <input id="relationshipAdd" class="myButton" type="button" value="Add" style="float:right">
          </div>
        </div>

        <div id="info">
          <div id="selectionTitleHolder" style="font-size:18px">
            <div>
              <div class="subtitle" style="margin-bottom:7px">
                Edit Title: <img class="help" src="images/help.png" style="margin-left:4px" onclick="graph.help('Node Title', 'Each word of the title goes onto a new line. If you have a long name that overlaps the bounds of the circle, e.g. a double-barrel name, just add a space in after the hyphen.')">
              </div>
              <input id="selectionTitle" type="text">
            </div>
            <span style="font-weight:bold">Multiple Nodes</span>
          </div>
          <div style="margin-top:20px">
            <div class="subtitle valign" style="margin-bottom:9px">
              <span id="scaleAmount"></span> <img class="help" src="images/help.png" style="margin-left:4px" onclick="graph.help('Node Scaling', 'This option is <i>not</i> for deciding the size of node that the user sees, because the zoom feature negates that entirely. Rather, this feature is meant for choosing your node size <i>relative</i> to the other nodes. <br><br>Your most common-sized node should have a setting of 1. If that appears too large, then simply zoom out.')">
              <span id="scaleShortcuts">
                <var class="rightOption" title="Large Node" style="margin-right:-4px">L</var>
                <var class="rightOption" title="Medium Node">M</var>
                <var class="rightOption" title="Small Node">S</var>
              </span>
            </div>
            <div id="scaleSlider"></div>
            <div id="nodeShaper" style="margin-top:25px">
              <div class="subtitle" style="margin-bottom:9px">
                Select a Shape:
              </div>
              <div>
                <select></select>
              </div>
            </div>
            <div id="colourEditHolder" style="margin-top:25px">
              <div class="subtitle" style="margin-bottom:9px">
                Select Colour:
              </div>
              <input id="colouriserEdit" type="color" style="width:100%;height:50px">
              <div class="extra_input_options">
                <var id="colourRemoveButton" class="leftOption" style="margin-right: 12px;">Switch to Image</var>
                <var class="showNodeBorderButton leftOption">Hidden Border</var>
              </div>
            </div>
            <div id="imageEditHolder" style="margin-top:25px">
              <div class="subtitle" style="margin-bottom:9px">
                Edit Image:
              </div>
              <input id="imageEdit" type="text" class="url">
              <div class="extra_input_options">
                <var id="imageRemoveButton" class="leftOption" style="margin-right: 12px;">Switch to Colour </var>
                <var id="alwaysDisplayTextButton" class="leftOption" style="margin-right: 12px;">Always Title</var>
                <var class="showNodeBorderButton leftOption">Hidden Border</var>
              </div>
            </div>
          </div>
          <div id="blurb">
            <div class="subtitle" style="margin-top:25px;margin-bottom:9px">
              Edit Short Description:
            </div>
            <textarea id="blurbShort" style="height: 45px;"></textarea>
            <div class="subtitle" style="margin-top:22px;margin-bottom:9px">
              Edit Long Description:  <img class="help" src="images/help.png" style="margin-left:4px" onclick="graph.help('Adding Links', 'To add a clickable link, simply include text with the format [LinkText](LinkURL) - i.e. square brackets containing the text to display, immediately followed by standard brackets containing the web address to direct the user to.<br><br>e.g. [Desmog](http://desmog.com) becomes <a href=\'http://desmog.com\' target=\'_blank\'>Desmog</a>')">
            </div>
            <textarea id="blurbLong" style="height: 120px;"></textarea>
          </div>
          <div id="shaper" style="margin-top:20px">
            <div class="subtitle" style="margin-bottom:9px">
              Auto-Position:
              <img id="shaperHelp" class="help" src="images/help.png">
              <span id="shaperExistingSettings" style="float:right;color:#888;padding-top:5px;font-size:11px">Existing Settings</span>
            </div>

            <div id="shaperOptions" style="padding-bottom:15px">

            </div>
          </div>
          <div style="margin-top:20px">
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
    <script src="static/main.js?v=7"></script>
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
        <b>Uncurving a Relationship</b>
        <div>
          Double-click a relationship to put it back to a straight-line, and restore its original width.
        </div>
      </div>
    </div>

  </body>

</html>
