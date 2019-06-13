<?php
session_start();
if (!$_SESSION["logged_in"]) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  die("You must be logged in to perform this action");
}

$mysqli = include "db_connect.php";

switch($_POST["action"]) {
  case "save":
    $config = mysqli_real_escape_string($mysqli, $_POST["config"]);
    $title = mysqli_real_escape_string($mysqli, $_POST["title"]);
    if (!$_POST["id"]) { //new map
      if (mysqli_query($mysqli, "INSERT INTO maps SET title='$title', config='$config'")) {
        $id = mysqli_insert_id($mysqli);
        $out = array("success"=>1, "id"=>$id, "version"=>0);
      }
    } else { //existing map
      $id = intval($_POST["id"]);
      if (mysqli_query($mysqli, "UPDATE maps SET title='$title', config='$config', version=version+1 WHERE id=$id")) {
        $det = mysqli_fetch_assoc(mysqli_query($mysqli, "SELECT * FROM maps WHERE id=$id"));
        $out = array("success"=>1, "id"=>$id, "version"=>$det["version"]);
      }
    }
    if ($id && $out && $_POST["screenshot"]) {
      $img = base64_decode( str_replace("data:image/jpeg;base64,", "", $_POST["screenshot"]) );
      file_put_contents("../share/{$id}.jpg", $img);
      $out["scrape_return"] = fb_rescrape($_POST["directUrl"]);
    }
    die(json_encode($out));
  break;
  case "load":
    $id = mysqli_real_escape_string($mysqli, $_POST["id"]);
    if ($det = mysqli_fetch_assoc(mysqli_query($mysqli, "SELECT * FROM maps WHERE id=$id"))) {
      die(json_encode(array("success"=>1, "version"=>$det["version"], "config"=>$det["config"], "title"=>$det["title"], "id"=>$det["id"]))); //mysqli_affected_rows($mysqli): stamp won't update if no changes made
    }
  break;
  case "delete":
    $id = mysqli_real_escape_string($mysqli, $_POST["id"]);
    if (mysqli_query($mysqli, "UPDATE maps SET deleted=1 WHERE id=$id")) {
      die(json_encode(array("success"=>1)));
    }
  break;
  case "clone":
    $id = mysqli_real_escape_string($mysqli, $_POST["id"]);
    if ($det = mysqli_fetch_assoc(mysqli_query($mysqli, "SELECT title FROM maps WHERE id=$id"))) {
      if (mysqli_query($mysqli, "INSERT INTO maps (title, config) SELECT 'Clone: ".addslashes($det[title])."', config FROM maps WHERE id=$id")) {
        die(json_encode(array("success"=>1)));
      }
    }
  break;
}

die(json_encode(array("success"=>0)));


/** Functions **/
function fb_rescrape($url)
{
	$graph = 'https://graph.facebook.com/';
	$post = 'id='.urlencode($url).'&scrape=true&access_token=53894946388|QACGAFXLOvAKghgQv3VlSKvSaD8'; //Get an App Access Token from here: https://developers.facebook.com/tools/explorer
	return send_post($graph, $post);
}
function send_post($url, $post)
{
	$r = curl_init();
	curl_setopt($r, CURLOPT_URL, $url);
	curl_setopt($r, CURLOPT_POST, 1);
	curl_setopt($r, CURLOPT_POSTFIELDS, $post);
	curl_setopt($r, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($r, CURLOPT_CONNECTTIMEOUT, 5);
	$data = curl_exec($r);
	curl_close($r);
	return $data;
}

?>
