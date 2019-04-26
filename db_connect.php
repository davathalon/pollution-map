<?php

return db_connect();

function isLocalhost($whitelist = ['127.0.0.1', '::1']) {
    return in_array($_SERVER['REMOTE_ADDR'], $whitelist);
}

function db_connect() {
  if (isLocalhost()) {
    $mysqli = mysqli_connect("localhost", "root", "wickster", "desmog_local", 3306);
  } else {
    //Connect to remote DB
  }
  if (mysqli_connect_errno($mysqli))  {
  	die("Failed to connect to MySQL: " . mysqli_connect_error());
  }
  return $mysqli;
}

?>
