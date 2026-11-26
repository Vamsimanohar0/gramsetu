<?php
session_start();
include("../include/config.php");

// Check if logged in
if(!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit();
}

$complaint_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if($complaint_id == 0) {
    header("Location: complaints.php");
    exit();
}

$query = "SELECT * FROM complaints WHERE id = $complaint_id";
$result = mysqli_query($conn, $query);

if(mysqli_num_rows($result) == 0) {
    header("Location: complaints.php");
    exit();
}

$complaint = mysqli_fetch_assoc($result);

// Handle status update
if($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['update_status'])) {
    $new_status = mysqli_real_escape_string($conn, $_POST['status']);
    $remarks = mysqli_real_escape_string($conn, $_POST['remarks']);
    
    $update_query = "UPDATE complaints SET 
                     status = '$new_status' WHERE id = $complaint_id";
    
    if(mysqli_query($conn, $update_query)) {
        $success = "Complaint status updated successfully!";
        // Refresh complaint data
        $result = mysqli_query($conn, $query);
        $complaint = mysqli_fetch_assoc($result);
    } else {
        $error = "Failed to update status: " . mysqli_error($conn);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>View Complaint - GramSetu</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: #0a0f1e;
            color: #ffffff;
        }
        
        .container {
            max-width: 900px;
            margin: 40px auto;
            padding: 0 20px;
        }
        
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #7DFF6A;
            text-decoration: none;
            margin-bottom: 20px;
            transition: color 0.3s ease;
        }
        
        .back-link:hover {
            color: #5ae04a;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(125, 255, 106, 0.05);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 25px;
        }
        
        .card h2 {
            font-weight: 600;
            margin-bottom: 20px;
        }
        
        .card h2 i {
            color: #7DFF6A;
            margin-right: 10px;
        }
        
        .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .detail-item {
            padding: 12px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 10px;
        }
        
        .detail-item .label {
            color: #8a9bb5;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .detail-item .value {
            font-weight: 500;
            margin-top: 4px;
        }
        
        .detail-item.full-width {
            grid-column: 1 / -1;
        }
        
        .status-badge {
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            display: inline-block;
        }
        
        .status-badge.submitted {
            background: rgba(249, 184, 74, 0.2);
            color: #f9b84a;
        }
        
        .status-badge.verified {
            background: rgba(52, 152, 219, 0.2);
            color: #3498db;
        }
        
        .status-badge.in-progress {
            background: rgba(125, 255, 106, 0.2);
            color: #7DFF6A;
        }
        
        .status-badge.resolved {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
        }
        
        .status-badge.rejected {
            background: rgba(255, 82, 82, 0.2);
            color: #ff6b6b;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            color: #d6e4ff;
            font-weight: 500;
            margin-bottom: 8px;
        }
        
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(125, 255, 106, 0.1);
            border-radius: 10px;
            color: #ffffff;
            font-size: 14px;
            font-family: inherit;
            transition: all 0.3s ease;
        }
        
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #7DFF6A;
        }
        
        .form-group select option {
            background: #1a2a3a;
            color: #ffffff;
        }
        
        .btn-primary {
            padding: 12px 30px;
            background: linear-gradient(135deg, #7DFF6A, #4CAF50);
            border: none;
            border-radius: 10px;
            color: #0a0f1e;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(125, 255, 106, 0.3);
        }
        
        .alert {
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        .alert-success {
            background: rgba(46, 204, 113, 0.1);
            border: 1px solid rgba(46, 204, 113, 0.2);
            color: #2ecc71;
        }
        
        .alert-error {
            background: rgba(255, 82, 82, 0.1);
            border: 1px solid rgba(255, 82, 82, 0.2);
            color: #ff6b6b;
        }
        
        .evidence-item {
            display: inline-block;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        
        .evidence-item i {
            color: #7DFF6A;
            margin-right: 8px;
        }
        
        .evidence-item a {
            color: #ffffff;
            text-decoration: none;
        }
        
        .evidence-item a:hover {
            color: #7DFF6A;
        }
        
        @media (max-width: 768px) {
            .detail-grid {
                grid-template-columns: 1fr;
            }
            
            .card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="complaints.php" class="back-link">
            <i class="fas fa-arrow-left"></i> Back to Complaints
        </a>
        
        <div class="card">
            <h2><i class="fas fa-clipboard-list"></i> Complaint Details</h2>
            
            <?php if(isset($success)): ?>
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> <?php echo $success; ?>
            </div>
            <?php endif; ?>
            
            <?php if(isset($error)): ?>
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i> <?php echo $error; ?>
            </div>
            <?php endif; ?>
            
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="label">Complaint ID</div>
                    <div class="value"><?php echo $complaint['complaint_id']; ?></div>
                </div>
                <div class="detail-item">
                    <div class="label">Status</div>
                    <div class="value">
                        <span class="status-badge <?php echo strtolower(str_replace(' ', '-', $complaint['status'])); ?>">
                            <?php echo $complaint['status']; ?>
                        </span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="label">Citizen Name</div>
                    <div class="value"><?php echo htmlspecialchars($complaint['name']); ?></div>
                </div>
                <div class="detail-item">
                    <div class="label">Mobile Number</div>
                    <div class="value"><?php echo htmlspecialchars($complaint['mobile']); ?></div>
                </div>
                <div class="detail-item">
                    <div class="label">Village</div>
                    <div class="value"><?php echo htmlspecialchars($complaint['village']); ?></div>
                </div>
                <div class="detail-item">
                    <div class="label">Ward Number</div>
                    <div class="value"><?php echo htmlspecialchars($complaint['ward_no'] ?? 'N/A'); ?></div>
                </div>
                <div class="detail-item">
                    <div class="label">Category</div>
                    <div class="value"><?php echo htmlspecialchars($complaint['category']); ?></div>
                </div>
                <div class="detail-item">
                    <div class="label">Submitted On</div>
                    <div class="value"><?php echo date('d M Y, h:i A', strtotime($complaint['created_at'])); ?></div>
                </div>
                <div class="detail-item full-width">
                    <div class="label">Title</div>
                    <div class="value"><?php echo htmlspecialchars($complaint['title']); ?></div>
                </div>
                <div class="detail-item full-width">
                    <div class="label">Description</div>
                    <div class="value"><?php echo nl2br(htmlspecialchars($complaint['description'])); ?></div>
                </div>
            </div>
        </div>
        
        <!-- Evidence Section -->
        <?php if($complaint['image_path'] || $complaint['audio_path']): ?>
        <div class="card">
            <h2><i class="fas fa-image"></i> Evidence</h2>
            <?php if($complaint['image_path']): ?>
            <div class="evidence-item">
                <i class="fas fa-image"></i>
                <a href="<?php echo $complaint['image_path']; ?>" target="_blank">View Image</a>
            </div>
            <?php endif; ?>
            <?php if($complaint['audio_path']): ?>
            <div class="evidence-item">
                <i class="fas fa-microphone-alt"></i>
                <audio controls style="height: 30px; max-width: 300px;">
                    <source src="<?php echo $complaint['audio_path']; ?>" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>
        
        <!-- Update Status -->
        <div class="card">
            <h2><i class="fas fa-edit"></i> Update Status</h2>
            <form method="POST" action="">
                <div class="form-group">
                    <label for="status">Change Status</label>
                    <select name="status" id="status" required>
                        <option value="Submitted" <?php echo $complaint['status'] == 'Submitted' ? 'selected' : ''; ?>>Submitted</option>
                        <option value="Verified" <?php echo $complaint['status'] == 'Verified' ? 'selected' : ''; ?>>Verified</option>
                        <option value="In Progress" <?php echo $complaint['status'] == 'In Progress' ? 'selected' : ''; ?>>In Progress</option>
                        <option value="Resolved" <?php echo $complaint['status'] == 'Resolved' ? 'selected' : ''; ?>>Resolved</option>
                        <option value="Rejected" <?php echo $complaint['status'] == 'Rejected' ? 'selected' : ''; ?>>Rejected</option>
                    </select>
                </div>
                
                <button type="submit" name="update_status" class="btn-primary">
                    <i class="fas fa-save"></i> Update Status
                </button>
            </form>
        </div>
    </div>
</body>
</html>