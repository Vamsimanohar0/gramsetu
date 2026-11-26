<?php
session_start();
include("../include/config.php");

// Redirect if already logged in
if(isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header("Location: dashboard.php");
    exit();
}

$error = '';

if($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = mysqli_real_escape_string($conn, $_POST['username']);
    $password = $_POST['password'];
    
    if(empty($username) || empty($password)) {
        $error = "Please fill in all fields";
    } else {
        // Get panchayath details
        $query = "SELECT * FROM panchayaths WHERE username = '$username' AND status = 'active'";
        $result = mysqli_query($conn, $query);
        
        if($result && mysqli_num_rows($result) == 1) {
            $panchayath = mysqli_fetch_assoc($result);
            
            // Verify password (using password_verify if hashed, or direct comparison)
            if(password_verify($password, $panchayath['password']) || $password === $panchayath['password']) {
                // Set session variables - THIS IS THE IMPORTANT PART
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['panchayath_id'] = $panchayath['id'];        // ← Make sure this is set
                $_SESSION['panchayath_name'] = $panchayath['name'];    // ← Make sure this is set
                $_SESSION['panchayath_username'] = $panchayath['username'];
                $_SESSION['panchayath_email'] = $panchayath['email'] ?? '';
                
                header("Location: dashboard.php");
                exit();
            } else {
                $error = "Invalid username or password";
            }
        } else {
            $error = "Invalid username or password";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Panchayath Login - GramSetu</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="../css/complaint.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0a0f1e 0%, #1a2a3a 50%, #0f1a2e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-container { width: 100%; max-width: 420px; margin-top:10%; }
        .login-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(125, 255, 106, 0.1);
            border-radius: 24px;
            padding: 40px 35px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
        }
        .login-header { text-align: center; margin-bottom: 35px; }
        .login-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 10px;
        }
        .login-logo i { font-size: 36px; color: #7DFF6A; }
        .login-logo h1 { color: #ffffff; font-size: 28px; font-weight: 800; }
        .login-logo span { color: #7DFF6A; }
        .login-subtitle { color: #8a9bb5; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        .form-group label {
            display: block;
            color: #d6e4ff;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
        }
        .input-group { position: relative; }
        .input-group i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #5a7a9a;
            font-size: 16px;
        }
        .input-group input {
            width: 100%;
            padding: 14px 15px 14px 45px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(125, 255, 106, 0.1);
            border-radius: 12px;
            color: #ffffff;
            font-size: 15px;
            transition: all 0.3s ease;
        }
        .input-group input:focus {
            outline: none;
            border-color: #7DFF6A;
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 20px rgba(125, 255, 106, 0.1);
        }
        .input-group input::placeholder { color: #4a5d7a; }
        .input-group .toggle-password {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #5a7a9a;
            transition: color 0.3s ease;
            left:90%;
        }
        .input-group .toggle-password:hover { color: #7DFF6A; }
        .login-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #7DFF6A, #4CAF50);
            border: none;
            border-radius: 12px;
            color: #0a0f1e;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(125, 255, 106, 0.3);
        }
        .error-message {
            background: rgba(255, 82, 82, 0.1);
            border: 1px solid rgba(255, 82, 82, 0.2);
            border-radius: 10px;
            padding: 12px 15px;
            color: #ff6b6b;
            font-size: 14px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .error-message i { font-size: 18px; }
        .demo-credentials {
            background: rgba(125, 255, 106, 0.05);
            border: 1px solid rgba(125, 255, 106, 0.1);
            border-radius: 10px;
            padding: 12px 15px;
            margin-top: 15px;
            text-align: center;
            color: #8a9bb5;
            font-size: 13px;
        }
        .demo-credentials strong { color: #7DFF6A; }
        .demo-credentials .creds {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 5px;
            flex-wrap: wrap;
        }
        .demo-credentials .creds span {
            background: rgba(125, 255, 106, 0.1);
            padding: 2px 10px;
            border-radius: 4px;
            color: #7DFF6A;
        }
        @media (max-width: 480px) {
            .login-card { padding: 30px 20px; }
            .login-logo h1 { font-size: 24px; }
        }
    </style>
</head>
<body>
        <!-- NAVBAR -->
<div class="navbar-wrapper">
  <nav class="navbar">
    <a href="#" class="navbar__logo"><img src="/vgmp/gramsetu-logo.png" alt="GRAMSETU"></a>
    <span class="nav__logo-text">Gram<span class="nav__logo-green">Setu</span></span>
    <ul class="navbar__links">
      <li><a href="/vgmp/index.php">Home</a></li>
      <li><a href="/vgmp/complaint.php">Register Complaint</a></li>
      <li><a href="/vgmp/track.php">Track Complaint</a></li>
      <li><a href="login.php">Panchayat Login</a></li>
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
 
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="login-logo">
                    <i class="fas fa-landmark"></i>
                    <h1>Gram<span>Setu</span></h1>
                </div>
                <p class="login-subtitle">Panchayath Admin Portal</p>
            </div>
            
            <?php if($error): ?>
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <?php echo $error; ?>
            </div>
            <?php endif; ?>
            
            <form method="POST" action="">
                <div class="form-group">
                    <label for="username"><i class="fas fa-user"></i> Username</label>
                    <div class="input-group">
                        <i class="fas fa-user"></i>
                        <input type="text" id="username" name="username" placeholder="Enter username" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="password"><i class="fas fa-lock"></i> Password</label>
                    <div class="input-group">
                        <i class="fas fa-lock"></i>
                        <input type="password" id="password" name="password" placeholder="Enter password" required>
                        <i class="fas fa-eye toggle-password" id="togglePassword"></i>
                    </div>
                </div>
                
                <button type="submit" class="login-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    Login to Dashboard
                </button>
            </form>
            
            <div class="demo-credentials">
                <i class="fas fa-info-circle" style="color: #7DFF6A;"></i>
                Demo Credentials:
                <div class="creds">
                    <span>kondapalli / admin123</span>
                    <span>guntur / admin123</span>
                    <span>narasaraopet / admin123</span>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('togglePassword').addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    </script>
</body>
</html>