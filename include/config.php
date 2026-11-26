<?php

$host = "localhost";
$user = "root";
$password = "";
$database = "vgmp";

// $host = "sql210.infinityfree.com";
// $user = "if0_42379083";
// $password = "8pT0bejKHYweF3";
// $database   = "if0_42379083_gramsetu";

$conn = mysqli_connect(
    $host,
    $user,
    $password,
    $database
);

if (!$conn) {
    die("Connection Failed");
}
?>