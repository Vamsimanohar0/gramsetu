<?php
session_start();
include("../include/config.php");

// Check if logged in
if(!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit();
}

// Get panchayath info from session
$panchayath_id = $_SESSION['panchayath_id'] ?? 0;
$panchayath_name = $_SESSION['panchayath_name'] ?? 'Panchayath';

// If panchayath_id is not set, redirect to login
if($panchayath_id == 0) {
    header("Location: login.php");
    exit();
}

// Get all villages under this panchayath
$villages_query = "SELECT id, name FROM villages WHERE panchayath_id = $panchayath_id AND status = 'active'";
$villages_result = mysqli_query($conn, $villages_query);

$village_ids = [];
$village_names = [];
while($row = mysqli_fetch_assoc($villages_result)) {
    $village_ids[] = $row['id'];
    $village_names[] = $row['name'];
}

// If no villages, show 0
if(empty($village_ids)) {
    $village_ids = [0];
}

$village_ids_str = implode(',', $village_ids);

// Get statistics for this panchayath's villages
$stats = [];

// Total complaints
$query = "SELECT COUNT(*) as total FROM complaints WHERE village_id IN ($village_ids_str)";
$result = mysqli_query($conn, $query);
$stats['total'] = mysqli_fetch_assoc($result)['total'] ?? 0;

// By status
$statuses = ['Submitted', 'Verified', 'In Progress', 'Resolved', 'Rejected'];
foreach($statuses as $status) {
    $query = "SELECT COUNT(*) as count FROM complaints WHERE village_id IN ($village_ids_str) AND status = '$status'";
    $result = mysqli_query($conn, $query);
    $stats[$status] = mysqli_fetch_assoc($result)['count'] ?? 0;
}

// Recent complaints from this panchayath's villages
$recent_query = "SELECT * FROM complaints WHERE village_id IN ($village_ids_str) ORDER BY created_at DESC LIMIT 10";
$recent_complaints = mysqli_query($conn, $recent_query);

// Get village names for display
$village_list = implode(', ', $village_names);
$urgent_count = ($stats['Submitted'] ?? 0) + ($stats['Verified'] ?? 0);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard - <?php echo htmlspecialchars($panchayath_name); ?></title>
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
        
        /* Sidebar */
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 260px;
            height: 100%;
            background: rgba(20, 30, 50, 0.95);
            backdrop-filter: blur(20px);
            border-right: 1px solid rgba(125, 255, 106, 0.05);
            padding: 25px 20px;
            overflow-y: auto;
            z-index: 1000;
            transition: transform 0.3s ease;
        }
        .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(125, 255, 106, 0.05);
        }
        .sidebar-brand i { font-size: 32px; color: #7DFF6A; }
        .sidebar-brand h2 { font-size: 22px; font-weight: 800; }
        .sidebar-brand span { color: #7DFF6A; }
        
        .sidebar-user {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: rgba(125, 255, 106, 0.05);
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .sidebar-user .avatar {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #7DFF6A, #4CAF50);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
            color: #0a0f1e;
        }
        .sidebar-user .user-info .name { font-weight: 600; font-size: 14px; }
        .sidebar-user .user-info .role { font-size: 12px; color: #8a9bb5; }
        
        .sidebar-nav {
            list-style: none;
        }
        .sidebar-nav li { margin-bottom: 5px; }
        .sidebar-nav a {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 15px;
            color: #8a9bb5;
            text-decoration: none;
            border-radius: 10px;
            transition: all 0.3s ease;
            font-size: 14px;
        }
        .sidebar-nav a:hover {
            background: rgba(125, 255, 106, 0.05);
            color: #ffffff;
        }
        .sidebar-nav a.active {
            background: rgba(125, 255, 106, 0.1);
            color: #7DFF6A;
        }
        .sidebar-nav a i { width: 20px; text-align: center; font-size: 16px; }
        .sidebar-nav .badge {
            margin-left: auto;
            background: rgba(125, 255, 106, 0.2);
            color: #7DFF6A;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 12px;
        }
        .sidebar-logout {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(125, 255, 106, 0.05);
        }
        .sidebar-logout a { color: #ff6b6b; }
        .sidebar-logout a:hover { background: rgba(255, 82, 82, 0.1); }
        
        /* Main Content */
        .main-content {
            margin-left: 260px;
            padding: 30px 40px;
            min-height: 100vh;
        }
        
        .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
            gap: 15px;
        }
        .top-bar h1 { font-size: 28px; font-weight: 700; }
        .top-bar h1 span { color: #7DFF6A; }
        .top-bar .panchayath-info {
            background: rgba(125, 255, 106, 0.05);
            border: 1px solid rgba(125, 255, 106, 0.1);
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            color: #7DFF6A;
        }
        .top-bar .panchayath-info i { margin-right: 8px; }
        .top-actions {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .top-actions .date { color: #8a9bb5; font-size: 14px; }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(125, 255, 106, 0.05);
            border-radius: 16px;
            padding: 20px 25px;
            transition: all 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            border-color: rgba(125, 255, 106, 0.2);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .stat-card .stat-icon { font-size: 28px; margin-bottom: 10px; }
        .stat-card .stat-number { font-size: 32px; font-weight: 800; margin-bottom: 5px; }
        .stat-card .stat-label { color: #8a9bb5; font-size: 14px; }
        .stat-card .villages-list {
            margin-top: 8px;
            font-size: 12px;
            color: #4a5d7a;
        }
        
        /* Alert Banner */
        .alert-banner {
            background: rgba(249, 184, 74, 0.1);
            border: 1px solid rgba(249, 184, 74, 0.2);
            border-radius: 12px;
            padding: 15px 20px;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;
        }
        .alert-banner i { font-size: 24px; color: #f9b84a; }
        .alert-banner .alert-text { flex: 1; }
        .alert-banner .alert-text strong { color: #f9b84a; }
        .alert-banner .alert-action {
            padding: 8px 20px;
            background: #f9b84a;
            color: #0a0f1e;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
        }
        .alert-banner .alert-action:hover { transform: scale(1.05); }
        
        /* Chart */
        .chart-section {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(125, 255, 106, 0.05);
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 30px;
        }
        .chart-section h3 { margin-bottom: 20px; font-weight: 600; }
        .chart-bars {
            display: flex;
            align-items: flex-end;
            justify-content: space-around;
            height: 200px;
            gap: 20px;
        }
        .chart-bar-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
        }
        .chart-bar {
            width: 100%;
            max-width: 60px;
            border-radius: 8px 8px 0 0;
            transition: height 0.5s ease;
            min-height: 10px;
        }
        .chart-bar-label { margin-top: 10px; font-size: 12px; color: #8a9bb5; text-align: center; }
        .chart-bar-value { font-size: 14px; font-weight: 600; margin-bottom: 5px; }
        
        /* Recent Complaints */
        .recent-section {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(125, 255, 106, 0.05);
            border-radius: 16px;
            padding: 25px;
        }
        .recent-section .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .recent-section .header h3 { font-weight: 600; }
        .recent-section .header a { color: #7DFF6A; text-decoration: none; font-size: 14px; }
        .recent-section .header a:hover { text-decoration: underline; }
        
        .complaint-table { width: 100%; border-collapse: collapse; }
        .complaint-table th {
            text-align: left;
            padding: 12px 15px;
            color: #8a9bb5;
            font-weight: 500;
            font-size: 13px;
            border-bottom: 1px solid rgba(125, 255, 106, 0.05);
        }
        .complaint-table td {
            padding: 12px 15px;
            border-bottom: 1px solid rgba(125, 255, 106, 0.05);
            font-size: 14px;
        }
        .complaint-table tr:hover { background: rgba(125, 255, 106, 0.02); }
        
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
        
        .mobile-toggle {
            display: none;
            background: none;
            border: none;
            color: #ffffff;
            font-size: 24px;
            cursor: pointer;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 0;
            color: #4a5d7a;
        }
        .empty-state i { font-size: 48px; display: block; margin-bottom: 15px; }
        
        @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%); }
            .sidebar.open { transform: translateX(0); }
            .main-content { margin-left: 0; padding: 20px; }
            .mobile-toggle { display: block; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .top-bar { flex-direction: column; align-items: flex-start; }
            .chart-bars { height: 150px; }
        }
        @media (max-width: 480px) {
            .stats-grid { grid-template-columns: 1fr; }
            .complaint-table { font-size: 12px; }
            .complaint-table th,
            .complaint-table td { padding: 8px 10px; }
        }
    </style>
</head>
<body>
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
            <i class="fas fa-landmark"></i>
            <h2>Gram<span>Setu</span></h2>
        </div>
        
        <div class="sidebar-user">
            <div class="avatar"><?php echo strtoupper(substr($panchayath_name, 0, 1)); ?></div>
            <div class="user-info">
                <div class="name"><?php echo htmlspecialchars($panchayath_name); ?></div>
                <div class="role">Panchayath Admin</div>
            </div>
        </div>
        
        <ul class="sidebar-nav">
            <li><a href="#" class="active"><i class="fas fa-chart-pie"></i> Dashboard</a></li>
            <li><a href="complaints.php"><i class="fas fa-list"></i> All Complaints <span class="badge"><?php echo $stats['total']; ?></span></a></li>
            <li><a href="complaints.php?status=Submitted"><i class="fas fa-clock"></i> Pending <span class="badge"><?php echo $stats['Submitted'] ?? 0; ?></span></a></li>
            <li><a href="complaints.php?status=In%20Progress"><i class="fas fa-spinner"></i> In Progress <span class="badge"><?php echo $stats['In Progress'] ?? 0; ?></span></a></li>
            <li><a href="complaints.php?status=Resolved"><i class="fas fa-check-circle"></i> Resolved <span class="badge"><?php echo $stats['Resolved'] ?? 0; ?></span></a></li>
        </ul>
        
        <div class="sidebar-logout">
            <ul class="sidebar-nav">
                <li><a href="logout.php"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
            </ul>
        </div>
    </aside>
    
    <!-- Main Content -->
    <div class="main-content">
        <div class="top-bar">
            <div>
                <button class="mobile-toggle" id="mobileToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h1>Dashboard <span>Overview</span></h1>
            </div>
            <div class="top-actions">
                <span class="panchayath-info">
                    <i class="fas fa-university"></i>
                    <?php echo htmlspecialchars($panchayath_name); ?>
                    <?php if(!empty($village_names)): ?>
                    <span style="color: #4a5d7a; margin-left: 5px;">(<?php echo count($village_names); ?> villages)</span>
                    <?php endif; ?>
                </span>
                <span class="date"><i class="far fa-calendar-alt"></i> <?php echo date('l, d M Y'); ?></span>
            </div>
        </div>
        
        <?php if($urgent_count > 0): ?>
        <div class="alert-banner">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="alert-text">
                <strong><?php echo $urgent_count; ?> pending complaints</strong> require your attention.
                Please review and take action.
            </div>
            <a href="complaints.php?status=Submitted" class="alert-action">Review Now</a>
        </div>
        <?php endif; ?>
        
        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="color: #7DFF6A;">📋</div>
                <div class="stat-number"><?php echo $stats['total']; ?></div>
                <div class="stat-label">Total Complaints</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="color: #f9b84a;">⏳</div>
                <div class="stat-number"><?php echo ($stats['Submitted'] ?? 0) + ($stats['Verified'] ?? 0); ?></div>
                <div class="stat-label">Pending Review</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="color: #3498db;">🔄</div>
                <div class="stat-number"><?php echo $stats['In Progress'] ?? 0; ?></div>
                <div class="stat-label">In Progress</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="color: #2ecc71;">✅</div>
                <div class="stat-number"><?php echo $stats['Resolved'] ?? 0; ?></div>
                <div class="stat-label">Resolved</div>
                <?php if(!empty($village_names)): ?>
                <div class="villages-list">
                    <i class="fas fa-map-marker-alt"></i> 
                    <?php echo implode(', ', array_slice($village_names, 0, 3)); ?>
                    <?php if(count($village_names) > 3): ?> +<?php echo count($village_names) - 3; ?> more<?php endif; ?>
                </div>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Chart -->
        <div class="chart-section">
            <h3><i class="fas fa-chart-bar" style="color: #7DFF6A;"></i> Complaint Status Distribution</h3>
            <div class="chart-bars">
                <?php
                $colors = ['#f9b84a', '#3498db', '#7DFF6A', '#2ecc71', '#ff6b6b'];
                $status_labels = ['Submitted', 'Verified', 'In Progress', 'Resolved', 'Rejected'];
                $max_count = max($stats['Submitted'] ?? 0, $stats['Verified'] ?? 0, $stats['In Progress'] ?? 0, $stats['Resolved'] ?? 0, $stats['Rejected'] ?? 0);
                if($max_count == 0) $max_count = 1;
                
                foreach($status_labels as $index => $label):
                    $count = $stats[$label] ?? 0;
                    $height = ($count / $max_count) * 180;
                    $color = $colors[$index];
                ?>
                <div class="chart-bar-container">
                    <div class="chart-bar-value"><?php echo $count; ?></div>
                    <div class="chart-bar" style="height: <?php echo max($height, 10); ?>px; background: <?php echo $color; ?>;"></div>
                    <div class="chart-bar-label"><?php echo $label; ?></div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        
        <!-- Recent Complaints -->
        <div class="recent-section">
            <div class="header">
                <h3><i class="fas fa-clock" style="color: #7DFF6A;"></i> Recent Complaints</h3>
                <a href="complaints.php">View All →</a>
            </div>
            
            <?php if(isset($recent_complaints) && mysqli_num_rows($recent_complaints) > 0): ?>
            <table class="complaint-table">
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
                    <?php while($row = mysqli_fetch_assoc($recent_complaints)): 
                        $status_class = strtolower(str_replace(' ', '-', $row['status']));
                        // Get village name
                        $village_q = "SELECT name FROM villages WHERE id = {$row['village_id']}";
                        $village_r = mysqli_query($conn, $village_q);
                        $village_name = ($village_r && mysqli_num_rows($village_r) > 0) ? mysqli_fetch_assoc($village_r)['name'] : 'N/A';
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
                <p>No complaints from your villages yet.</p>
            </div>
            <?php endif; ?>
        </div>
    </div>
    
    <script>
        document.getElementById('mobileToggle').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('open');
        });
        
        document.addEventListener('click', function(event) {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.getElementById('mobileToggle');
            if(window.innerWidth <= 768) {
                if(!sidebar.contains(event.target) && !toggle.contains(event.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    </script>
</body>
</html>