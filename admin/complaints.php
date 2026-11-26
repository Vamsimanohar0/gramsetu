<?php
session_start();
include("../include/config.php");

// Check if logged in
if(!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit();
}

$panchayath_id = $_SESSION['panchayath_id'] ?? 0;

// If panchayath_id is not set, redirect to login
if($panchayath_id == 0) {
    header("Location: login.php");
    exit();
}

// Get villages under this panchayath
$villages_query = "SELECT id FROM villages WHERE panchayath_id = $panchayath_id AND status = 'active'";
$villages_result = mysqli_query($conn, $villages_query);
$village_ids = [];
while($row = mysqli_fetch_assoc($villages_result)) {
    $village_ids[] = $row['id'];
}
if(empty($village_ids)) {
    $village_ids = [0];
}
$village_ids_str = implode(',', $village_ids);

// ... rest of the code

$status_filter = isset($_GET['status']) ? mysqli_real_escape_string($conn, $_GET['status']) : '';
$search = isset($_GET['search']) ? mysqli_real_escape_string($conn, $_GET['search']) : '';

$where = "village_id IN ($village_ids_str)";
if($status_filter) {
    $where .= " AND status = '$status_filter'";
}
if($search) {
    $where .= " AND (name LIKE '%$search%' OR complaint_id LIKE '%$search%' OR mobile LIKE '%$search%')";
}

$query = "SELECT * FROM complaints WHERE $where ORDER BY created_at DESC";
$complaints = mysqli_query($conn, $query);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Complaints - GramSetu</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: #0a0f1e;
            color: #ffffff;
        }
        .container { max-width: 1200px; margin: 40px auto; padding: 0 20px; }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 30px;
        }
        .header h1 { font-size: 28px; }
        .header h1 span { color: #7DFF6A; }
        .back-link {
            color: #7DFF6A;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .back-link:hover { color: #5ae04a; }
        
        .filters {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }
        .filter-btn {
            padding: 8px 20px;
            border: 1px solid rgba(125, 255, 106, 0.1);
            border-radius: 20px;
            background: transparent;
            color: #8a9bb5;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            font-size: 14px;
        }
        .filter-btn:hover,
        .filter-btn.active {
            background: rgba(125, 255, 106, 0.1);
            border-color: #7DFF6A;
            color: #7DFF6A;
        }
        .search-box {
            display: flex;
            gap: 10px;
        }
        .search-box input {
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(125, 255, 106, 0.1);
            border-radius: 10px;
            color: #ffffff;
            min-width: 200px;
        }
        .search-box input:focus {
            outline: none;
            border-color: #7DFF6A;
        }
        .search-box button {
            padding: 10px 20px;
            background: #7DFF6A;
            border: none;
            border-radius: 10px;
            color: #0a0f1e;
            font-weight: 600;
            cursor: pointer;
        }
        
        .table-container {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(125, 255, 106, 0.05);
            border-radius: 16px;
            padding: 20px;
            overflow-x: auto;
        }
        table { width: 100%; border-collapse: collapse; }
        th {
            text-align: left;
            padding: 12px 15px;
            color: #8a9bb5;
            font-weight: 500;
            font-size: 13px;
            border-bottom: 1px solid rgba(125, 255, 106, 0.05);
        }
        td {
            padding: 12px 15px;
            border-bottom: 1px solid rgba(125, 255, 106, 0.05);
            font-size: 14px;
        }
        tr:hover { background: rgba(125, 255, 106, 0.02); }
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        .status-badge.submitted { background: rgba(249, 184, 74, 0.2); color: #f9b84a; }
        .status-badge.verified { background: rgba(52, 152, 219, 0.2); color: #3498db; }
        .status-badge.in-progress { background: rgba(125, 255, 106, 0.2); color: #7DFF6A; }
        .status-badge.resolved { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
        .status-badge.rejected { background: rgba(255, 82, 82, 0.2); color: #ff6b6b; }
        .view-btn {
            padding: 5px 15px;
            background: rgba(125, 255, 106, 0.1);
            color: #7DFF6A;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            font-size: 13px;
            transition: all 0.3s ease;
        }
        .view-btn:hover { background: rgba(125, 255, 106, 0.2); }
        .empty-state {
            text-align: center;
            padding: 50px 0;
            color: #4a5d7a;
        }
        .empty-state i { font-size: 48px; display: block; margin-bottom: 15px; }
        
        @media (max-width: 768px) {
            .header { flex-direction: column; align-items: stretch; }
            .search-box input { min-width: auto; }
            .filters { justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <a href="dashboard.php" class="back-link"><i class="fas fa-arrow-left"></i> Dashboard</a>
                <h1>All <span>Complaints</span></h1>
            </div>
            <div class="search-box">
                <form method="GET" style="display: flex; gap: 10px;">
                    <input type="text" name="search" placeholder="Search by name, ID, mobile..." value="<?php echo htmlspecialchars($search); ?>">
                    <button type="submit"><i class="fas fa-search"></i></button>
                </form>
            </div>
        </div>
        
        <div class="filters">
            <a href="complaints.php" class="filter-btn <?php echo !$status_filter ? 'active' : ''; ?>">All</a>
            <a href="complaints.php?status=Submitted" class="filter-btn <?php echo $status_filter == 'Submitted' ? 'active' : ''; ?>">Submitted</a>
            <a href="complaints.php?status=Verified" class="filter-btn <?php echo $status_filter == 'Verified' ? 'active' : ''; ?>">Verified</a>
            <a href="complaints.php?status=In%20Progress" class="filter-btn <?php echo $status_filter == 'In Progress' ? 'active' : ''; ?>">In Progress</a>
            <a href="complaints.php?status=Resolved" class="filter-btn <?php echo $status_filter == 'Resolved' ? 'active' : ''; ?>">Resolved</a>
            <a href="complaints.php?status=Rejected" class="filter-btn <?php echo $status_filter == 'Rejected' ? 'active' : ''; ?>">Rejected</a>
        </div>
        
        <div class="table-container">
            <?php if(mysqli_num_rows($complaints) > 0): ?>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Citizen</th>
                        <th>Village</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php while($row = mysqli_fetch_assoc($complaints)): 
                        $status_class = strtolower(str_replace(' ', '-', $row['status']));
                        // Get village name
                        $village_q = "SELECT name FROM villages WHERE id = {$row['village_id']}";
                        $village_r = mysqli_query($conn, $village_q);
                        $village_name = mysqli_fetch_assoc($village_r)['name'] ?? 'N/A';
                    ?>
                    <tr>
                        <td><strong><?php echo $row['complaint_id']; ?></strong></td>
                        <td><?php echo htmlspecialchars($row['name']); ?></td>
                        <td><?php echo htmlspecialchars($village_name); ?></td>
                        <td><?php echo htmlspecialchars($row['category']); ?></td>
                        <td><span class="status-badge <?php echo $status_class; ?>"><?php echo $row['status']; ?></span></td>
                        <td><?php echo date('d M Y', strtotime($row['created_at'])); ?></td>
                        <td><a href="view_complaint.php?id=<?php echo $row['id']; ?>" class="view-btn">View</a></td>
                    </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
            <?php else: ?>
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No complaints found</h3>
                <p style="color: #8a9bb5;"><?php echo $status_filter ? "No $status_filter complaints" : "No complaints from your villages yet"; ?></p>
            </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>