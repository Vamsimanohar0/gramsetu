<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
<meta name="description" content="Report civic issues directly to your Panchayat with beautiful wave animations.">
  <title>GRAMSETU</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  
  
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
<link rel="stylesheet" href="css/complaint.css">
</head>
<body>
<!-- NAVBAR -->
<div class="navbar-wrapper">
  <nav class="navbar">
    <a href="#" class="navbar__logo"><img src="gramsetu-logo.png" alt="GRAMSETU"></a>
    <span class="nav__logo-text">Gram<span class="nav__logo-green">Setu</span></span>
    <ul class="navbar__links">
      <li><a href="index.php">Home</a></li>
      <li><a href="complaint.php">Register Complaint</a></li>
      <li><a href="track.php">Track Complaint</a></li>
      <li><a href="admin/login.php">Panchayat Login</a></li>
    </ul>
    <div class="language-selector">
      <select id="languageSwitcher">
        <option value="en">🇬🇧 EN</option>
        <option value="te">🇮🇳 తెలుగు</option>
        <option value="hi">🇮🇳 हिन्दी</option>
      </select>
    </div>
    <button class="mobile-menu-btn" id="mobileMenuBtn">
      ☰
    </button>
  </nav>
</div>

<!-- Mobile menu moved outside nav so overflow:hidden on navbar doesn't clip it -->
<div class="mobile-overlay" id="mobileOverlay"></div>
<div class="mobile-menu" id="mobileMenu">
  <a href="index.php">🏠 Home</a>
  <a href="complaint.php">📝 Register Complaint</a>
  <a href="track.php">🔍 Track Complaint</a>
  <a href="admin/login.php">🏛️ Panchayat Login</a>
</div>

<script>
(function () {
  var btn     = document.getElementById("mobileMenuBtn");
  var menu    = document.getElementById("mobileMenu");
  var overlay = document.getElementById("mobileOverlay");

  function openMenu() {
    menu.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    menu.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    menu.classList.contains("active") ? closeMenu() : openMenu();
  });

  overlay.addEventListener("click", closeMenu);

  menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeMenu);
  });
})();
</script>

<!-- Active nav link script -->
<script>
(function () {
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__links a').forEach(function (link) {
    const linkPage = link.getAttribute('href').split('/').pop();
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });
})();
</script>
<div id="google_translate_element" style="display:none;"></div>
<script>

function googleTranslateElementInit() {

    new google.translate.TranslateElement(
        {
            pageLanguage: 'en',
            includedLanguages: 'en,te,hi',
            autoDisplay: false
        },
        'google_translate_element'
    );

}

</script>

<script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>

<script>

document
.getElementById('languageSwitcher')
.addEventListener('change', function () {

    const lang = this.value;

    localStorage.setItem(
        'language',
        lang
    );

    const translate = setInterval(() => {

        const googleSelect =
            document.querySelector('.goog-te-combo');

        if (googleSelect) {

            googleSelect.value = lang;

            googleSelect.dispatchEvent(
                new Event('change')
            );

            clearInterval(translate);
        }

    }, 300);

});

</script>
<script>

window.addEventListener('load', () => {

    const savedLang =
        localStorage.getItem('language');

    if (!savedLang) return;

    const translator = setInterval(() => {

        const googleSelect =
            document.querySelector('.goog-te-combo');

        if (googleSelect) {

            googleSelect.value = savedLang;

            googleSelect.dispatchEvent(
                new Event('change')
            );

            clearInterval(translator);
        }

    }, 500);

});

</script>
<script>

function setLanguage(lang) {

    localStorage.setItem(
        'language',
        lang
    );

    document
        .getElementById('languageModal')
        .style.display = 'none';

    document
        .getElementById('languageSwitcher')
        .value = lang;

    document
        .getElementById('languageSwitcher')
        .dispatchEvent(
            new Event('change')
        );
}

</script>
<script>

window.addEventListener('load', () => {

    const savedLang =
        localStorage.getItem('language');

    if (savedLang) {

        document.getElementById('languageModal').style.display = 'none';
    }

});

</script>
<script>
setInterval(() => {

    const banner = document.querySelector('.goog-te-banner-frame');

    if (banner) {
        banner.remove();
    }

    document.body.style.top = '0px';

}, 500);

</script>

<script>
setInterval(() => {

    document.body.style.top = "0px";

}, 500);
</script>
<script>
setInterval(() => {

    document.body.style.setProperty(
        "top",
        "0px",
        "important"
    );

    const skipTranslate =
        document.querySelector("body > .skiptranslate");

    if (skipTranslate) {
        skipTranslate.style.display = "none";
    }

}, 100);

</script>
<!-- =========================================================================================================================================
                                                      up to this the nav bar code 
======================================================================================================================================== -->
 <!-- BANNER SECTION WITH VIDEO BACKGROUND -->
  <section class="banner">
    <!-- Video Background - Replace 'your-video.mp4' with your actual video file -->
    <video class="banner-video" autoplay loop muted playsinline>
      <source src="banner.mp4" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    
    <!-- Overlay for better text readability -->
    <div class="banner-overlay"></div>


 

    <!-- BANNER CONTENT -->
    <div class="banner-content">
      <p class="banner-text"><br><br>
        <h1 class="raise">"Raise Your Voice,"<br>
    <span class="accent">Improve Your Village</span></h1>
    <span class="form-badge">📢 Register a Complaint</span>
      </p>
    </div>
  </section>

  <script src="banner.js"></script>
<div class="form-wrapper">
  <div class="form-container">
    <!-- <div class="form-header">
      <span class="form-badge">📢 Register a Complaint</span>
      <h2 class="form-title">Raise Your Voice,<br>Improve Your Village</h2>
      <p class="form-subtitle">Report local issues directly to your Panchayat and help build cleaner, safer, and stronger communities.</p>
    </div> -->
<br>
    <form id="complaintForm" action="action/submit_complaint.php" method="POST" enctype="multipart/form-data" class="complaint-form" novalidate>
      <!-- PERSONAL INFORMATION SECTION -->
      <div class="form-card">
        <div class="card-header">
          <i class="fas fa-user-circle"></i>
          <h3>Personal Information <span class="step-badge">Step 1</span></h3>
        </div>
        <div class="form-grid">
          <div class="input-group">
            <label><i class="fas fa-user"></i> Full Name</label>
            <input type="text" id="fullName" name="name" placeholder="e.g. Lakshmi Devi" required>
          </div>
          <div class="input-group">
            <label><i class="fas fa-phone-alt"></i> Mobile Number</label>
            <input type="tel" id="mobile" name="mobile" placeholder="10-digit number" pattern="[0-9]{10}" required>
          </div>
          <!-- <div class="input-group">
            <label><i class="fas fa-map-marker-alt"></i> Village Name</label>
            <input type="text" id="village" name="village" placeholder="e.g. Kondapalli" required> 
             
          </div> -->
          <div class="input-group">
    <label><i class="fas fa-map-marker-alt"></i> Village Name</label>
    <select name="village_id" required>
        <option value="" disabled selected>Select your village</option>
        <?php
        include("include/config.php");
        
        // Check if connection is successful
        if ($conn) {
            // Query to get villages with panchayath names
            $query = "SELECT v.id, v.name as village_name, p.name as panchayath_name 
                      FROM villages v 
                      LEFT JOIN panchayaths p ON v.panchayath_id = p.id 
                      WHERE v.status = 'active' 
                      ORDER BY v.name";
            
            $result = mysqli_query($conn, $query);
            
            if ($result && mysqli_num_rows($result) > 0) {
                while($row = mysqli_fetch_assoc($result)) {
                    $display_name = $row['village_name'];
                    if(!empty($row['panchayath_name'])) {
                        $display_name .= " (" . $row['panchayath_name'] . ")";
                    }
                    echo "<option value='{$row['id']}'>" . htmlspecialchars($display_name) . "</option>";
                }
            } else {
                // No villages found
                echo "<option value='' disabled>No villages available</option>";
            }
        } else {
            echo "<option value='' disabled>Database connection error</option>";
        }
        ?>
    </select>
</div>
          <div class="input-group">
            <label><i class="fas fa-hashtag"></i> Ward Number <span class="optional">(Optional)</span></label>
            <input type="text" id="ward" name="ward_no" placeholder="e.g. 7">
          </div>
        </div>
      </div>

      <!-- COMPLAINT DETAILS SECTION -->
      <div class="form-card">
        <div class="card-header">
          <i class="fas fa-clipboard-list"></i>
          <h3>Complaint Details <span class="step-badge">Step 2</span></h3>
        </div>
        <div class="form-grid">
          <div class="input-group">
            <label>Complaint Category</label>
            <select id="category" name="category" required>
              <option value="" disabled selected>Select Category</option>
              <option>Road Damage</option>
              <option>Street Light</option>
              <option>Drainage Issue</option>
              <option>Water Supply</option>
              <option>Garbage Collection</option>
              <option>Public Safety</option>
              <option>Other</option>
            </select>
          </div>
          <div class="input-group">
            <label>Complaint Title</label>
            <input type="text" id="title" name="title" placeholder="Short summary, e.g. Streetlight not working" required>
          </div>
        </div>
        <div class="input-group full-width">
          <div class="microphone-row">
            <label><i class="fas fa-edit"></i> Detailed Description</label>
            <button type="button" id="micSpeechBtn" class="mic-button">
              <i class="fas fa-microphone"></i> Can't type? Click & speak
            </button>
          </div>
          <textarea id="description" rows="4" maxlength="1000" name="description" placeholder="Describe the issue, its exact location, and how long it has been a problem..." required></textarea>
          <div class="char-counter"><span id="charCount">0</span> / 1000 Characters</div>
        </div>
      </div>

      <!-- EVIDENCE UPLOAD SECTION -->
      <div class="form-card">
        <div class="card-header">
          <i class="fas fa-camera"></i>
          <h3>Upload Evidence <span class="step-badge optional-badge">Optional but helpful</span></h3>
        </div>
        <div id="dropzone" class="upload-area">
          <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
          <div class="upload-text">Drag & Drop Photos</div>
          <small class="upload-hint">Upload JPG, JPEG or PNG images</small>
          <button type="button" id="browseFilesBtn" class="browse-btn">Browse Files</button>
          <input type="file" id="fileInput" accept="image/jpeg,image/jpg,image/png" multiple hidden>
        </div>
        <div id="previewContainer" class="preview-list"></div>
      </div>

      <!-- SUBMIT SECTION -->
      <div class="form-card">
        <div class="card-header">
          <i class="fas fa-check-circle"></i>
          <h3>Review & Submit</h3>
        </div>
        <div class="confirm-row">
          <input type="checkbox" id="confirmCheck" required>
          <label for="confirmCheck">I confirm that the information provided is accurate.</label>
        </div>
        <div class="action-buttons">
          <button type="submit" class="btn-submit"><i class="fas fa-paper-plane"></i> Register Complaint</button>
          <button type="button" id="resetFormBtn" class="btn-reset"><i class="fas fa-undo-alt"></i> Reset Form</button>
        </div>
      </div>
    </form>

    <!-- STATS PANEL -->
    <div class="stats-panel">
      <div class="stat-item"><i class="fas fa-lock"></i> <span>Secure & Private</span></div>
      <div class="stat-item"><i class="fas fa-chart-line"></i> <span>Real-Time Updates</span></div>
      <div class="stat-item"><i class="fas fa-check-circle"></i> <span>12,731 Issues Resolved</span></div>
    </div>
  </div>

  <!-- SUCCESS MODAL -->
  <!-- <div id="successModal" class="success-modal">
    <div class="success-modal-content">
      <div class="success-icon">✅</div>
      <h2>Complaint Registered Successfully!</h2>
      <p>Your complaint has been submitted to the Panchayat.</p>
      <div class="complaint-id-box">
        <i class="fas fa-file-alt"></i>
        <span id="complaintIdDisplay">GS-2026-001245</span>
      </div>
      <button type="button" id="closeSuccessModal" class="btn-primary-modal">Submit Another Complaint</button>
    </div>
  </div> -->
</div>

<script src="form.js"></script>

</body>
</html>