<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GRAMSETU</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/style.css" />
  
</head>
<body>

  <section class="hero">

    <!-- Animated canvas background -->
    <canvas id="waveCanvas"></canvas>

    <!-- NAVBAR -->
    <div class="navbar-wrapper">
      <nav class="navbar">
        <a href="#" class="navbar__logo"><img src="gramsetu-logo.png" alt="GRAMSETU"></a>
        <span class="nav__logo-text">Gram<span class="nav__logo-green">Setu</span></span>
        <ul class="navbar__links">
          <li><a href="index.php">Home</a></li>
          <li><a href="complaint.php" >Register Complaint</a></li>
          <li><a href="track.php" >Track Complaint</a></li>
          <li><a href="admin/login.php" >Panchayat Login</a></li>
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

    <!-- HERO CONTENT -->
    <section class="hero">

    <div class="hero-content">

        <div class="hero-badge" data-lang="hero_badge">
            🌱 Your Voice, Your Village
        </div>

        <h1 data-lang="hero_title">
            Stronger Villages <br>
            Start with <span>Your Voice</span>
        </h1>

        <p data-lang="hero_desc">
            Report local issues directly to your Panchayat and
            track progress in real-time. Together we can build
            cleaner, safer and stronger communities.
        </p>

        <div class="hero-buttons">
            <a href="complaint.php" class="btn-primary" data-lang="complaint_btn">
                📝 File a Complaint
            </a>

            <a href="track.php" class="btn-secondary" data-lang="track_btn">
                🔍 Track Complaint
            </a>
        </div>

        <div class="hero-features">
            <span>🛡 Secure & Private</span>
            <span>⚡ Quick Response</span>
            <span>👥 For Every Citizen</span>
        </div>

    </div>

</section>

  </section>
   <script>
    /* ── Active nav link: matches current page filename ── */
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

  <script>
    (function () {
      const canvas = document.getElementById('waveCanvas');
      const ctx = canvas.getContext('2d');

      function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      resize();
      window.addEventListener('resize', resize);

      let time = 0;
      const NUM_LAYERS = 16;

      const layers = Array.from({ length: NUM_LAYERS }, (_, i) => {
        const t = i / (NUM_LAYERS - 1);
        const hue = 105 + t * 22;
        const sat = 55  + t * 38;
        const lit = 11  + t * 38;
        return {
          ringFraction: 0.45 + t * 0.55,
          rotSpeed:     0.003 + (1 - t) * 0.006,
          rotDir:       i % 2 === 0 ? 1 : -1,
          waveAmp:      0.018 + (1 - t) * 0.06,
          waveFreq:     2 + Math.floor((1 - t) * 5),
          wavePhase:    (i / NUM_LAYERS) * Math.PI * 2.7,
          pulseAmp:     0.022,
          pulseFreq:    0.018 + (1 - t) * 0.012,
          color:        `hsl(${hue}, ${sat}%, ${lit}%)`,
          segments:     320,
        };
      });

      function drawLayer(layer, cx, cy, baseR, t) {
        const r = baseR * layer.ringFraction
                * (1 + layer.pulseAmp * Math.sin(layer.pulseFreq * t + layer.wavePhase));
        const angle = layer.rotDir * layer.rotSpeed * t;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        for (let s = 0; s <= layer.segments; s++) {
          const theta = (s / layer.segments) * Math.PI * 2;
          const wave  = 1 + layer.waveAmp
                      * Math.sin(layer.waveFreq * theta + layer.wavePhase + t * 0.025 * layer.rotDir);
          const rx = r * wave * 1.12;
          const ry = r * wave * 0.90;
          const px = rx * Math.cos(theta);
          const py = ry * Math.sin(theta);
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = layer.color;
        ctx.fill();
        ctx.restore();
      }

      function draw() {
        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;
        const baseR = Math.max(W, H) * 0.74;

        ctx.clearRect(0, 0, W, H);

        // outer bg colour (brightest lime bleeds past edges)
        ctx.fillStyle = 'hsl(127, 93%, 49%)';
        ctx.fillRect(0, 0, W, H);

        // draw largest → smallest (outermost first, innermost on top)
        for (let i = NUM_LAYERS - 1; i >= 0; i--) {
          drawLayer(layers[i], cx, cy, baseR, time);
        }

        // dark center
        const innerR = baseR * 0.45 * 0.95;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
        grad.addColorStop(0,    '#0c0e1c');
        grad.addColorStop(0.58, '#0c0e1c');
        grad.addColorStop(0.80, 'rgba(12,14,28,0.5)');
        grad.addColorStop(1,    'rgba(12,14,28,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        time++;
        requestAnimationFrame(draw);
      }

      draw();
    })();
  </script>

  <!-- HOW IT WORKS SECTION -->
<section class="hiw">
  <div class="hiw__container">

    <!-- Section Header -->
    <div class="hiw__header">
      <span class="hiw__badge">⚙️ How It Works</span>
      <h2 class="hiw__title">Simple. <span class="hiw__title--green">Transparent.</span> Effective.</h2>
      <p class="hiw__subtitle">Four easy steps to get your village issue resolved.</p>
    </div>

    <!-- Cards Row -->
    <div class="hiw__track">

      <!-- Card 1 -->
      <div class="hiw__card">
        <div class="hiw__icon-wrap">
          <span class="hiw__icon">📝</span>
          <div class="hiw__icon-ring"></div>
        </div>
        <span class="hiw__step-num">01</span>
        <h3 class="hiw__card-title">Register Complaint</h3>
        <p class="hiw__card-desc">Submit issue details, photos, or voice recordings easily from your phone.</p>
      </div>

      <!-- Arrow -->
      <div class="hiw__arrow">
        <svg viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow1">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M0 10 Q15 3 30 10 Q45 17 60 10" stroke="#4ade80" stroke-width="1.8"
                fill="none" stroke-dasharray="4 3" filter="url(#glow1)" opacity="0.85"/>
          <polygon points="56,6 64,10 56,14" fill="#4ade80" filter="url(#glow1)" opacity="0.85"/>
        </svg>
      </div>

      <!-- Card 2 -->
      <div class="hiw__card">
        <div class="hiw__icon-wrap">
          <span class="hiw__icon">🏛️</span>
          <div class="hiw__icon-ring"></div>
        </div>
        <span class="hiw__step-num">02</span>
        <h3 class="hiw__card-title">Panchayat Review</h3>
        <p class="hiw__card-desc">Officials review and assign the complaint to the right department.</p>
      </div>

      <!-- Arrow -->
      <div class="hiw__arrow">
        <svg viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow2">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M0 10 Q15 3 30 10 Q45 17 60 10" stroke="#4ade80" stroke-width="1.8"
                fill="none" stroke-dasharray="4 3" filter="url(#glow2)" opacity="0.85"/>
          <polygon points="56,6 64,10 56,14" fill="#4ade80" filter="url(#glow2)" opacity="0.85"/>
        </svg>
      </div>

      <!-- Card 3 -->
      <div class="hiw__card">
        <div class="hiw__icon-wrap">
          <span class="hiw__icon">📍</span>
          <div class="hiw__icon-ring"></div>
        </div>
        <span class="hiw__step-num">03</span>
        <h3 class="hiw__card-title">Track Progress</h3>
        <p class="hiw__card-desc">Receive live updates at every stage — no more chasing officials.</p>
      </div>

      <!-- Arrow -->
      <div class="hiw__arrow">
        <svg viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow3">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M0 10 Q15 3 30 10 Q45 17 60 10" stroke="#4ade80" stroke-width="1.8"
                fill="none" stroke-dasharray="4 3" filter="url(#glow3)" opacity="0.85"/>
          <polygon points="56,6 64,10 56,14" fill="#4ade80" filter="url(#glow3)" opacity="0.85"/>
        </svg>
      </div>

      <!-- Card 4 -->
      <div class="hiw__card hiw__card--last">
        <div class="hiw__icon-wrap">
          <span class="hiw__icon">✅</span>
          <div class="hiw__icon-ring"></div>
        </div>
        <span class="hiw__step-num">04</span>
        <h3 class="hiw__card-title">Resolution</h3>
        <p class="hiw__card-desc">Issue resolved and marked completed. Your village grows stronger.</p>
      </div>

    </div>
    <!-- end .hiw__track -->

  </div>
</section>

<!-- WHY USE GRAMSETU SECTION -->
<section class="why">
  <div class="why__container">

    <!-- LEFT: Illustration -->
    <div class="why__left">
      <div class="why__illustration">

        <!-- Floating phone mockup -->
        <div class="why__phone">
          <div class="why__phone-screen">
            <div class="why__phone-bar"></div>
            <div class="why__phone-line"></div>
            <div class="why__phone-line why__phone-line--short"></div>
            <div class="why__phone-badge">
              <span class="why__phone-dot"></span> Complaint Filed
            </div>
            <div class="why__phone-line"></div>
            <div class="why__phone-line why__phone-line--short"></div>
          </div>
        </div>

        <!-- Floating stat cards -->
        <div class="why__float-card why__float-card--tl">
          <span class="why__float-icon">🛡️</span>
          <span>100% Secure</span>
        </div>
        <div class="why__float-card why__float-card--br">
          <span class="why__float-icon">✅</span>
          <span>Resolved in 48h</span>
        </div>

        <!-- Glow orb -->
        <div class="why__orb"></div>
      </div>
    </div>

    <!-- RIGHT: Features -->
    <div class="why__right">

      <div class="why__header">
        <span class="why__badge">💡 Why GramSetu</span>
        <h2 class="why__title">
          Built for <span class="why__title--green">Every Citizen.</span><br/>
          Designed for <span class="why__title--green">Trust.</span>
        </h2>
        <p class="why__subtitle">
          A platform that puts the power back in the hands of the people —
          simple, transparent, and effective.
        </p>
      </div>

      <ul class="why__features">

        <li class="why__feature">
          <div class="why__feature-icon">🛡</div>
          <div class="why__feature-body">
            <h4 class="why__feature-title">Secure Complaint Submission</h4>
            <p class="why__feature-desc">Your data is encrypted and visible only to authorised Panchayat officials.</p>
          </div>
        </li>

        <li class="why__feature">
          <div class="why__feature-icon">📱</div>
          <div class="why__feature-body">
            <h4 class="why__feature-title">Mobile Friendly</h4>
            <p class="why__feature-desc">Works seamlessly on any smartphone — no app download required.</p>
          </div>
        </li>

        <li class="why__feature">
          <div class="why__feature-icon">🎤</div>
          <div class="why__feature-body">
            <h4 class="why__feature-title">Voice Complaint Recording</h4>
            <p class="why__feature-desc">Not comfortable typing? Just speak — we'll capture your complaint.</p>
          </div>
        </li>

        <li class="why__feature">
          <div class="why__feature-icon">📍</div>
          <div class="why__feature-body">
            <h4 class="why__feature-title">Location Based Reporting</h4>
            <p class="why__feature-desc">Pin the exact problem spot on the map for faster resolution.</p>
          </div>
        </li>

        <li class="why__feature">
          <div class="why__feature-icon">🔔</div>
          <div class="why__feature-body">
            <h4 class="why__feature-title">Real-Time Status Updates</h4>
            <p class="why__feature-desc">Get notified at every stage — from submission to resolution.</p>
          </div>
        </li>

        <li class="why__feature">
          <div class="why__feature-icon">📊</div>
          <div class="why__feature-body">
            <h4 class="why__feature-title">Transparency & Accountability</h4>
            <p class="why__feature-desc">Public dashboards keep officials accountable to the community.</p>
          </div>
        </li>

      </ul>
    </div>

  </div>
</section>

<!-- COMPLAINT CATEGORIES SECTION -->
<section class="cats">
  <div class="cats__container">

    <!-- Header -->
    <div class="cats__header">
      <span class="cats__badge">📋 What Can You Report?</span>
      <h2 class="cats__title">Know Your <span class="cats__title--green">Complaint Categories</span></h2>
      <p class="cats__subtitle">From broken streetlights to water issues — if it affects your village, report it.</p>
    </div>

    <!-- Grid -->
    <div class="cats__grid">

      <div class="cats__card">
        <div class="cats__icon-wrap">
          <span class="cats__icon">💡</span>
          <div class="cats__icon-glow"></div>
        </div>
        <h3 class="cats__card-title">Street Lights</h3>
        <p class="cats__card-desc">Broken or missing lights on roads and public spaces.</p>
        <span class="cats__arrow">→</span>
      </div>

      <div class="cats__card">
        <div class="cats__icon-wrap">
          <span class="cats__icon">🛣</span>
          <div class="cats__icon-glow"></div>
        </div>
        <h3 class="cats__card-title">Roads</h3>
        <p class="cats__card-desc">Potholes, damaged roads, or missing road signs.</p>
        <span class="cats__arrow">→</span>
      </div>

      <div class="cats__card">
        <div class="cats__icon-wrap">
          <span class="cats__icon">💧</span>
          <div class="cats__icon-glow"></div>
        </div>
        <h3 class="cats__card-title">Water Supply</h3>
        <p class="cats__card-desc">No water, contamination, or leaking pipelines.</p>
        <span class="cats__arrow">→</span>
      </div>

      <div class="cats__card">
        <div class="cats__icon-wrap">
          <span class="cats__icon">🗑</span>
          <div class="cats__icon-glow"></div>
        </div>
        <h3 class="cats__card-title">Sanitation</h3>
        <p class="cats__card-desc">Garbage overflow, blocked drains, or open defecation.</p>
        <span class="cats__arrow">→</span>
      </div>

      <div class="cats__card">
        <div class="cats__icon-wrap">
          <span class="cats__icon">🌳</span>
          <div class="cats__icon-glow"></div>
        </div>
        <h3 class="cats__card-title">Environment</h3>
        <p class="cats__card-desc">Illegal dumping, deforestation, or pollution incidents.</p>
        <span class="cats__arrow">→</span>
      </div>

      <div class="cats__card">
        <div class="cats__icon-wrap">
          <span class="cats__icon">⚡</span>
          <div class="cats__icon-glow"></div>
        </div>
        <h3 class="cats__card-title">Electricity</h3>
        <p class="cats__card-desc">Power cuts, exposed wiring, or faulty transformers.</p>
        <span class="cats__arrow">→</span>
      </div>

      <div class="cats__card">
        <div class="cats__icon-wrap">
          <span class="cats__icon">🏫</span>
          <div class="cats__icon-glow"></div>
        </div>
        <h3 class="cats__card-title">Public Infrastructure</h3>
        <p class="cats__card-desc">Damaged schools, hospitals, or community buildings.</p>
        <span class="cats__arrow">→</span>
      </div>

      <div class="cats__card">
        <div class="cats__icon-wrap">
          <span class="cats__icon">🐄</span>
          <div class="cats__icon-glow"></div>
        </div>
        <h3 class="cats__card-title">Animal Issues</h3>
        <p class="cats__card-desc">Stray animals, injured cattle, or livestock on roads.</p>
        <span class="cats__arrow">→</span>
      </div>

    </div>

    <!-- CTA -->
    <div class="cats__cta">
      <p class="cats__cta-text">Don't see your issue? You can still file a custom complaint.</p>
      <a href="#" class="cats__cta-btn">File a Custom Complaint →</a>
    </div>

  </div>
</section>

<!-- LIVE STATISTICS SECTION -->
<section class="stats">

  <!-- top wave divider -->
  <div class="stats__divider stats__divider--top">
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,30 C360,60 1080,0 1440,30 L1440,0 L0,0 Z" fill="#060d08"/>
    </svg>
  </div>

  <div class="stats__container">

    <!-- Header -->
    <div class="stats__header">
      <span class="stats__badge">📡 Live Data</span>
      <h2 class="stats__title">Real Impact. <span class="stats__title--green">Real Numbers.</span></h2>
      <p class="stats__subtitle">Updated in real-time from Panchayats across the network.</p>
    </div>

    <!-- Cards -->
    <div class="stats__grid">

      <div class="stats__card" data-target="15248" data-suffix="">
        <div class="stats__card-inner">
          <div class="stats__icon-ring">
            <span class="stats__icon">📝</span>
          </div>
          <div class="stats__number-wrap">
            <span class="stats__number" data-target="15248" data-suffix="">0</span>
          </div>
          <p class="stats__label">Complaints Registered</p>
          <div class="stats__bar">
            <div class="stats__bar-fill" style="--bar-w: 100%"></div>
          </div>
        </div>
        <div class="stats__card-glow"></div>
      </div>

      <div class="stats__card" data-target="12731" data-suffix="">
        <div class="stats__card-inner">
          <div class="stats__icon-ring">
            <span class="stats__icon">✅</span>
          </div>
          <div class="stats__number-wrap">
            <span class="stats__number" data-target="12731" data-suffix="">0</span>
          </div>
          <p class="stats__label">Complaints Resolved</p>
          <div class="stats__bar">
            <div class="stats__bar-fill" style="--bar-w: 83%"></div>
          </div>
        </div>
        <div class="stats__card-glow"></div>
      </div>

      <div class="stats__card stats__card--highlight">
        <div class="stats__card-inner">
          <div class="stats__icon-ring">
            <span class="stats__icon">📊</span>
          </div>
          <div class="stats__number-wrap">
            <span class="stats__number" data-target="83" data-suffix="%">0</span>
          </div>
          <p class="stats__label">Resolution Rate</p>
          <div class="stats__bar">
            <div class="stats__bar-fill" style="--bar-w: 83%"></div>
          </div>
        </div>
        <div class="stats__card-glow stats__card-glow--bright"></div>
      </div>

      <div class="stats__card">
        <div class="stats__card-inner">
          <div class="stats__icon-ring">
            <span class="stats__icon">🏛️</span>
          </div>
          <div class="stats__number-wrap">
            <span class="stats__number" data-target="145" data-suffix="">0</span>
          </div>
          <p class="stats__label">Active Panchayats</p>
          <div class="stats__bar">
            <div class="stats__bar-fill" style="--bar-w: 58%"></div>
          </div>
        </div>
        <div class="stats__card-glow"></div>
      </div>

    </div>
    <!-- end .stats__grid -->

    <!-- Ticker strip -->
    <div class="stats__ticker">
      <div class="stats__ticker-track">
        <span>🟢 Pothole fixed in Gudlavalleru</span>
        <span>🟢 Water supply restored in Eluru</span>
        <span>🟢 Street light replaced in Vijayawada</span>
        <span>🟢 Drain cleared in Nuzividu</span>
        <span>🟢 Animal issue resolved in Machilipatnam</span>
        <span>🟢 Electricity fault fixed in Kaikaluru</span>
        <span>🟢 Pothole fixed in Gudlavalleru</span>
        <span>🟢 Water supply restored in Eluru</span>
        <span>🟢 Street light replaced in Vijayawada</span>
        <span>🟢 Drain cleared in Nuzividu</span>
        <span>🟢 Animal issue resolved in Machilipatnam</span>
        <span>🟢 Electricity fault fixed in Kaikaluru</span>
      </div>
    </div>

  </div>

  <!-- bottom wave divider -->
  <div class="stats__divider stats__divider--bottom">
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,30 C360,0 1080,60 1440,30 L1440,60 L0,60 Z" fill="#060d08"/>
    </svg>
  </div>

</section>
<script>
(function () {

  /* ── Count-up animation ── */
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function animateCount(el) {
    const target  = parseInt(el.dataset.target, 10);
    const suffix  = el.dataset.suffix || '';
    const duration = 2200;
    const start   = performance.now();

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutExpo(progress);
      const current  = Math.floor(eased * target);

      el.textContent = current.toLocaleString('en-IN') + suffix;

      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('en-IN') + suffix;
    }

    requestAnimationFrame(step);
  }

  /* ── IntersectionObserver: trigger on scroll ── */
  const numbers = document.querySelectorAll('.stats__number');
  const bars    = document.querySelectorAll('.stats__bar-fill');

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        /* animate all numbers */
        numbers.forEach(function (el) {
          if (!el.dataset.done) {
            el.dataset.done = '1';
            animateCount(el);
          }
        });

        /* animate all progress bars */
        bars.forEach(function (bar) {
          bar.classList.add('animated');
        });

        observer.disconnect();
      });
    },
    { threshold: 0.25 }
  );

  const section = document.querySelector('.stats');
  if (section) observer.observe(section);

  /* ── 3D tilt on mouse move ── */
  document.querySelectorAll('.stats__card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      const rect   = card.getBoundingClientRect();
      const x      = (e.clientX - rect.left) / rect.width  - 0.5;
      const y      = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform =
        'translateY(-10px) rotateX(' + (-y * 10) + 'deg) rotateY(' + (x * 10) + 'deg)';
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });

})();
</script>

<!-- FAQ SECTION -->
<section class="faq">

  <div class="faq__container">

    <!-- Header -->
    <div class="faq__header">
      <span class="faq__badge">❓ FAQ</span>
      <h2 class="faq__title">Got <span class="faq__title--green">Questions?</span></h2>
      <p class="faq__subtitle">Everything you need to know about using GramSetu.</p>
    </div>

    <!-- Two-column layout -->
    <div class="faq__layout">

      <!-- Left: Accordion -->
      <div class="faq__list">

        <div class="faq__item">
          <button class="faq__question" aria-expanded="false">
            <span>How do I register a complaint?</span>
            <span class="faq__icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path class="faq__icon-h" d="M4 9h10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
                <path class="faq__icon-v" d="M9 4v10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
          </button>
          <div class="faq__answer">
            <p>Click <strong>File a Complaint</strong> on the homepage. Fill in the issue details, choose a category, optionally attach a photo or voice note, and pin your location. Submit — and your complaint is instantly registered with a unique tracking ID.</p>
          </div>
        </div>

        <div class="faq__item">
          <button class="faq__question" aria-expanded="false">
            <span>Can I track my complaint?</span>
            <span class="faq__icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path class="faq__icon-h" d="M4 9h10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
                <path class="faq__icon-v" d="M9 4v10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
          </button>
          <div class="faq__answer">
            <p>Yes. Use the <strong>Track Complaint</strong> page and enter your tracking ID. You'll see the full status timeline — from submission to assignment to resolution — updated in real time by the Panchayat officials.</p>
          </div>
        </div>

        <div class="faq__item">
          <button class="faq__question" aria-expanded="false">
            <span>Do I need an account to file a complaint?</span>
            <span class="faq__icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path class="faq__icon-h" d="M4 9h10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
                <path class="faq__icon-v" d="M9 4v10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
          </button>
          <div class="faq__answer">
            <p>No account needed to file or track a complaint. Just your mobile number for OTP verification. Creating an optional profile lets you view complaint history and get push notifications.</p>
          </div>
        </div>

        <div class="faq__item">
          <button class="faq__question" aria-expanded="false">
            <span>Can I upload photos with my complaint?</span>
            <span class="faq__icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path class="faq__icon-h" d="M4 9h10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
                <path class="faq__icon-v" d="M9 4v10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
          </button>
          <div class="faq__answer">
            <p>Absolutely. You can attach up to <strong>3 photos</strong> per complaint directly from your camera or gallery. Clear images help officials assess the severity faster and speed up resolution.</p>
          </div>
        </div>

        <div class="faq__item">
          <button class="faq__question" aria-expanded="false">
            <span>Can I submit a voice complaint?</span>
            <span class="faq__icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path class="faq__icon-h" d="M4 9h10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
                <path class="faq__icon-v" d="M9 4v10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
          </button>
          <div class="faq__answer">
            <p>Yes — tap the microphone button on the complaint form and record up to <strong>60 seconds</strong> of audio. This is especially useful for citizens who find typing difficult or prefer speaking in their local language.</p>
          </div>
        </div>

        <div class="faq__item">
          <button class="faq__question" aria-expanded="false">
            <span>How long does resolution take?</span>
            <span class="faq__icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path class="faq__icon-h" d="M4 9h10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
                <path class="faq__icon-v" d="M9 4v10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
          </button>
          <div class="faq__answer">
            <p>Most complaints are acknowledged within <strong>24 hours</strong> and resolved within <strong>7 working days</strong> depending on the category and urgency. Critical issues like water contamination or exposed wiring are escalated automatically for faster response.</p>
          </div>
        </div>

        <div class="faq__item">
          <button class="faq__question" aria-expanded="false">
            <span>Is my complaint information kept private?</span>
            <span class="faq__icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path class="faq__icon-h" d="M4 9h10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
                <path class="faq__icon-v" d="M9 4v10" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
          </button>
          <div class="faq__answer">
            <p>Your personal details are encrypted and only visible to authorised Panchayat officials handling your complaint. Public dashboards show only anonymised, aggregated data — never your identity.</p>
          </div>
        </div>

      </div>
      <!-- end .faq__list -->

      <!-- Right: Static info card -->
      <div class="faq__side">

        <div class="faq__side-card">
          <div class="faq__side-icon">🤝</div>
          <h3 class="faq__side-title">Still have questions?</h3>
          <p class="faq__side-desc">Our support team is available Monday to Saturday, 9 AM – 6 PM. We typically respond within 2 hours.</p>
          <a href="#" class="faq__side-btn">Contact Support →</a>
        </div>

        <div class="faq__side-stats">
          <div class="faq__side-stat">
            <span class="faq__side-num">2 hrs</span>
            <span class="faq__side-lbl">Avg. response time</span>
          </div>
          <div class="faq__side-divider"></div>
          <div class="faq__side-stat">
            <span class="faq__side-num">98%</span>
            <span class="faq__side-lbl">Satisfaction rate</span>
          </div>
          <div class="faq__side-divider"></div>
          <div class="faq__side-stat">
            <span class="faq__side-num">24/7</span>
            <span class="faq__side-lbl">Platform uptime</span>
          </div>
        </div>

      </div>

    </div>
    <!-- end .faq__layout -->

  </div>
</section>
<!-- FAQ JS -->
<script>
(function () {

  document.querySelectorAll('.faq__question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const item     = btn.closest('.faq__item');
      const isOpen   = item.classList.contains('open');
      const allItems = document.querySelectorAll('.faq__item');

      /* close all first */
      allItems.forEach(function (el) {
        el.classList.remove('open');
        el.querySelector('.faq__question').setAttribute('aria-expanded', 'false');
      });

      /* open clicked one if it was closed */
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

})();
</script>

<!-- FOOTER -->
<footer class="footer">
  <div class="footer__container">

    <!-- Top row -->
    <div class="footer__top">

      <!-- Brand -->
      <div class="footer__brand">
        <div class="footer__logo">
          <span class="footer__logo-icon"><a href="#" class="footer__logo"><img src="gramsetu-logo.png" alt="GRAMSETU"></a></span>
          <span class="footer__logo-text">Gram<span class="footer__logo-green">Setu</span></span>
        </div>
        <p class="footer__tagline">Connecting citizens to their Panchayat.<br/>Your voice. Your village. Your change.</p>
        <div class="footer__socials">
          <a href="#" class="footer__social" aria-label="Twitter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0016 2a4.48 4.48 0 00-4.48 4.48v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
            </svg>
          </a>
          <a href="#" class="footer__social" aria-label="Facebook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
            </svg>
          </a>
          <a href="#" class="footer__social" aria-label="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a href="#" class="footer__social" aria-label="YouTube">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
              <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- Links -->
      <div class="footer__links-group">
        <h4 class="footer__group-title">Platform</h4>
        <ul class="footer__links">
          <li><a href="#">About GramSetu</a></li>
          <li><a href="#">How It Works</a></li>
          <li><a href="#">Complaint Categories</a></li>
          <li><a href="#">Live Statistics</a></li>
        </ul>
      </div>

      <div class="footer__links-group">
        <h4 class="footer__group-title">Quick Access</h4>
        <ul class="footer__links">
          <li><a href="#">File a Complaint</a></li>
          <li><a href="#">Track Complaint</a></li>
          <li><a href="#">Panchayat Login</a></li>
          <li><a href="#">Citizen Support</a></li>
        </ul>
      </div>

      <div class="footer__links-group">
        <h4 class="footer__group-title">Legal</h4>
        <ul class="footer__links">
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Terms of Service</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </div>

    </div>
    <!-- end .footer__top -->

    <!-- Divider -->
    <div class="footer__divider"></div>

    <!-- Bottom row -->
    <div class="footer__bottom">
      <p class="footer__copy">© 2025 GramSetu. Made with 🌿 for every citizen of India.</p>
      <div class="footer__bottom-badges">
        <span class="footer__bottom-badge">🛡 Secure</span>
        <span class="footer__bottom-badge">📱 Mobile Friendly</span>
        <span class="footer__bottom-badge">🇮🇳 Made in India</span>
      </div>
    </div>

  </div>
</footer>

<div class="language-modal" id="languageModal">

    <div class="language-card">

        <h2>🌐 Welcome to GramSetu</h2>

        <p>Select your preferred language</p>

        <button class="lang-btn" onclick="setLanguage('en')">
            🇬🇧 English
        </button>

        <button class="lang-btn" onclick="setLanguage('te')">
            🇮🇳 తెలుగు
        </button>

        <button class="lang-btn" onclick="setLanguage('hi')">
            🇮🇳 हिन्दी
        </button>

    </div>

</div>


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

        document
            .getElementById('languageModal')
            .style.display = 'none';
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
</body>
</html>