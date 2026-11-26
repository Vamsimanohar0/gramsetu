<?php
session_start();
include("../include/config.php");

// Check if form was submitted
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: ../complaint.php");
    exit();
}

// Get form data
$name = mysqli_real_escape_string($conn, $_POST['name'] ?? '');
$mobile = mysqli_real_escape_string($conn, $_POST['mobile'] ?? '');
$village_id = isset($_POST['village_id']) ? intval($_POST['village_id']) : 0;
$ward_no = mysqli_real_escape_string($conn, $_POST['ward_no'] ?? '');
$category = mysqli_real_escape_string($conn, $_POST['category'] ?? '');
$title = mysqli_real_escape_string($conn, $_POST['title'] ?? '');
$description = mysqli_real_escape_string($conn, $_POST['description'] ?? '');

// Validate required fields
if(empty($name) || empty($mobile) || $village_id == 0 || empty($category) || empty($title) || empty($description)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Please fill all required fields'
    ]);
    exit;
}

// Validate mobile number
if(!preg_match('/^[0-9]{10}$/', $mobile)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Please enter a valid 10-digit mobile number'
    ]);
    exit;
}

// Generate complaint ID
$complaint_id = 'GS-2026-' . rand(10000, 99999);

// Get panchayath_id from village
$panchayath_id = 0;
$village_query = "SELECT panchayath_id FROM villages WHERE id = $village_id";
$village_result = mysqli_query($conn, $village_query);

if ($village_result && mysqli_num_rows($village_result) > 0) {
    $village_data = mysqli_fetch_assoc($village_result);
    $panchayath_id = $village_data['panchayath_id'] ?? 0;
}

// Handle image uploads
$image_paths = [];
if(isset($_FILES['images']) && !empty($_FILES['images']['name'][0])) {
    $allowed = ['jpg', 'jpeg', 'png'];
    $upload_dir = "../uploads/images/";
    
    // Create directory if not exists
    if(!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    $files = $_FILES['images'];
    $file_count = count($files['name']);
    
    for($i = 0; $i < $file_count && $i < 6; $i++) {
        if($files['error'][$i] == 0) {
            $filename = $files['name'][$i];
            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            
            if(in_array($ext, $allowed)) {
                $new_filename = time() . '_' . uniqid() . '.' . $ext;
                $upload_path = $upload_dir . $new_filename;
                
                if(move_uploaded_file($files['tmp_name'][$i], $upload_path)) {
                    $image_paths[] = "uploads/images/" . $new_filename;
                }
            }
        }
    }
}

// Convert image paths to JSON string for storage
$image_paths_json = !empty($image_paths) ? json_encode($image_paths) : NULL;

// Insert complaint
$query = "INSERT INTO complaints (
    complaint_id, 
    name, 
    mobile, 
    village_id, 
    panchayath_id,
    ward_no, 
    category, 
    title, 
    description, 
    image_path,
    status, 
    created_at
) VALUES (
    '$complaint_id',
    '$name',
    '$mobile',
    $village_id,
    " . ($panchayath_id > 0 ? $panchayath_id : "NULL") . ",
    '$ward_no',
    '$category',
    '$title',
    '$description',
    " . ($image_paths_json ? "'$image_paths_json'" : "NULL") . ",
    'Submitted',
    NOW()
)";

if(mysqli_query($conn, $query)) {
    echo json_encode([
        'status' => 'success',
        'complaint_id' => $complaint_id,
        'message' => 'Complaint submitted successfully!',
        'images' => $image_paths
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . mysqli_error($conn)
    ]);
}
?>