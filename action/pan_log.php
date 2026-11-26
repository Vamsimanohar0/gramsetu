<?php
session_start();
include("../include/config.php");

if(isset($_POST['login']))
{
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    $stmt = $conn->prepare("
        SELECT *
        FROM admins
        WHERE username = ?
    ");

    $stmt->bind_param("s",$username);
    $stmt->execute();

    $result = $stmt->get_result();

    if($result->num_rows == 1)
    {
        $user = $result->fetch_assoc();

        if(password_verify($password,$user['password']))
        {
            $_SESSION['admin_id'] = $user['id'];
            $_SESSION['panchayat_id'] = $user['panchayat_id'];
            $_SESSION['name'] = $user['name'];

            header("Location: dashboard.php");
            exit;
        }
    }

    $error = "Invalid Username or Password";
}
?>