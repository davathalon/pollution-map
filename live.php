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
    <meta charset="UTF-8">
    <?if (!$isPreview) {
      $base_url = "https://" . $_SERVER[HTTP_HOST] . substr($_SERVER[REQUEST_URI], 0, strrpos($_SERVER[REQUEST_URI], "/"));
      $img = (file_exists("share/{$id}.jpg")) ?  "share/{$id}.jpg?v={$det['version']}" : "editor/images/standardsocial.jpg" ; ?>
      <meta property="og:title" content="<?=$title?>" />
      <meta property="og:description" content="DeSmog UK was launched in September 2014 as an investigative media outlet dedicated to cutting through the spin clouding the debate on energy and environment in Britain. Since then, our team of journalists and researchers has become a go-to source for accurate, fact-based information regarding misinformation campaigns on climate science in the UK." />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="<?=$base_url."/".$img?>" />
    <?}?>

    <link rel="stylesheet" href="editor/static/main.css?v=6" />
    <link rel="stylesheet" href="editor/static/live.css" />
    <link rel="stylesheet" href="editor/static/jquery-ui.css">

    <script src="editor/static/jquery-1.10.2.js"></script>
    <script src="editor/static/jquery-ui.js"></script>
    <script src="editor/static/sweetalert2.js"></script>
    <script>
      var db = console.log;
    </script>
  </head>

  <body>

    <div style="height:100%">

      <div id="mapTitle">&nbsp;</div>

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
    <script src="editor/static/jscolor.js"></script>
    <script src="editor/static/main.js?v=6"></script>
    <script src="editor/static/popper.min.js"></script>
    <script src="editor/static/tippy.min.js"></script>
    <script>
      $(function() {
        <?
        if ($det["deleted"]) {
          echo "graph.myalert('Deleted', 'This map has been removed. Oh well.', 'warning', function(){ location.href='https://desmog.co.uk' })";
        } else {
          if (!$isPreview) {
            echo "graph.load({$det['id']}, {$det['version']}, ".json_encode($det['config']).")";
          } else {
            echo "graph.preview()";
          }
        }?>
      });
      tippy('[data-tippy-content]', {
        placement:"left"
      });
    </script>

    <div id="hidden" style="display:none">
      <div id="PathFeedback">
        <div style="display:table;width:100%;background:#f3f3f3;">
          <div class="round"></div>
          <div class="roles" style="display:table-cell;vertical-align:middle">

          </div>
          <div class="round"></div>
        </div>
      </div>
      <div id="embedPopupContent" style="padding:10px 20px 0">
        <textarea readonly style="border:1px solid #ccc;width:100%;height:55px;font-size:16px;padding:10px"></textarea>
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
