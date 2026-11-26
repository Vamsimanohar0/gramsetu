<?php

include("../include/config.php");

header("Content-Type: application/json");

$mobile = $_POST['mobile'] ?? '';

if(empty($mobile))
{
    echo json_encode([]);
    exit;
}

$stmt = $conn->prepare("
SELECT complaint_id,
       title,
       status,
       created_at
FROM complaints
WHERE mobile=?
ORDER BY created_at DESC
");

$stmt->bind_param("s",$mobile);

$stmt->execute();

$result=$stmt->get_result();

$data=[];

while($row=$result->fetch_assoc())
{
    $data[]=$row;
}

echo json_encode($data);