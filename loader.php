<?php

$mysqli = include "db_connect.php";

switch($_POST["action"]) {
  case "save":
    $config = mysqli_real_escape_string($mysqli, $_POST["config"]);
    $title = mysqli_real_escape_string($mysqli, $_POST["title"]);
    if (!$_POST["id"]) { //new map
      if (mysqli_query($mysqli, "INSERT INTO maps SET title='$title', config='$config'")) {
        die(json_encode(array("success"=>1, "mapId"=>mysqli_insert_id($mysqli))));
      }
    } else { //existing map
      $id = intval($_POST["id"]);
      if (mysqli_query($mysqli, "UPDATE maps SET title='$title', config='$config' WHERE id=$id")) {
        die(json_encode(array("success"=>1, "id"=>$id))); //mysqli_affected_rows($mysqli): stamp won't update if no changes made
      }
    }
  break;
  case "load":
    $id = mysqli_real_escape_string($mysqli, $_POST["id"]);
    if ($det = mysqli_fetch_assoc(mysqli_query($mysqli, "SELECT * FROM maps WHERE id=$id"))) {
      die(json_encode(array("success"=>1, "config"=>$det["config"], "id"=>$det["id"]))); //mysqli_affected_rows($mysqli): stamp won't update if no changes made
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
