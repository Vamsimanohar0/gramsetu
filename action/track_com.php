<?php
include("../include/config.php");

$complaint_id = $_POST['complaint_id'] ?? '';
$mobile = $_POST['mobile'] ?? '';

if(empty($complaint_id) || empty($mobile)) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing Complaint ID or Mobile Number"
    ]);
    exit;
}

// Get complaint details
$stmt = $conn->prepare("SELECT * FROM complaints WHERE complaint_id = ? AND mobile = ?");
$stmt->bind_param("ss", $complaint_id, $mobile);
$stmt->execute();
$result = $stmt->get_result();

if($result->num_rows == 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Complaint not found. Please verify your Complaint ID and Mobile Number."
    ]);
    exit;
}

$complaint = $result->fetch_assoc();

// Create timeline from status only (single update)
$updates = [
    [
        "status" => $complaint['status'],
        "remarks" => "Current status: " . $complaint['status'],
        "updated_at" => $complaint['created_at'] ?? date('Y-m-d H:i:s')
    ]
];

echo json_encode([
    "status" => "success",
    "complaint" => $complaint,
    "updates" => $updates
]);