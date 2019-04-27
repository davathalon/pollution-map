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
    if ($id && $out) {
      $img = base64_decode( str_replace("data:image/jpeg;base64,", "", $_POST["screenshot"]) );
      file_put_contents("../share/{$id}.jpg", $img);
      die(json_encode($out));
    }
  break;
  case "load":
    $id = mysqli_real_escape_string($mysqli, $_POST["id"]);
    if ($det = mysqli_fetch_assoc(mysqli_query($mysqli, "SELECT * FROM maps WHERE id=$id"))) {
      die(json_encode(array("success"=>1, "version"=>$det["version"], "config"=>$det["config"], "id"=>$det["id"]))); //mysqli_affected_rows($mysqli): stamp won't update if no changes made
    }
  break;
  case "delete":
    $id = mysqli_real_escape_string($mysqli, $_POST["id"]);
    if (mysqli_query($mysqli, "UPDATE maps SET deleted=1 WHERE id=$id")) {
      die(json_encode(array("success"=>1)));
    }
  break;
}

die(json_encode(array("success"=>0)));

?>
