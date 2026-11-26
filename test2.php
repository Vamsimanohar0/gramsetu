<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.5" />
  <title>GramSetu · Track Complaint</title>
  <!-- Google Font (clean, professional) -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap" rel="stylesheet" />
  <!-- Font Awesome 6 (free icons) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #02081a;
      color: #eef2f9;
      line-height: 1.5;
      padding: 1rem;
      min-height: 100vh;
      position: relative;
      overflow-x: hidden;
    }

    /* ------ animated green wave background (subtle) ------ */
    .wave-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .wave {
      position: absolute;
      bottom: 0;
      left: -50%;
      width: 200%;
      height: 180px;
      background: repeating-linear-gradient(90deg, 
        transparent, 
        transparent 40px, 
        rgba(125, 255, 106, 0.03) 40px, 
        rgba(125, 255, 106, 0.06) 80px);
      border-radius: 50% 50% 0 0 / 20% 20% 0 0;
      animation: waveFlow 18s linear infinite;
      opacity: 0.5;
    }

    .wave:nth-child(2) {
      bottom: 20px;
      height: 130px;
      animation-duration: 24s;
      opacity: 0.3;
      background: repeating-linear-gradient(120deg, 
        transparent, 
        transparent 60px, 
        rgba(125, 255, 106, 0.04) 60px, 
        rgba(125, 255, 106, 0.08) 100px);
    }

    .wave:nth-child(3) {
      bottom: -10px;
      height: 200px;
      animation-duration: 30s;
      opacity: 0.2;
      background: repeating-linear-gradient(200deg, 
        transparent, 
        transparent 30px, 
        rgba(125, 255, 106, 0.02) 30px, 
        rgba(125, 255, 106, 0.05) 70px);
    }

    @keyframes waveFlow {
      0% { transform: translateX(0) rotate(0deg); }
      100% { transform: translateX(30%) rotate(1deg); }
    }

    /* ------ main container (relative to wave) ------ */
    .app {
      max-width: 820px;
      margin: 0 auto;
      position: relative;
      z-index: 2;
    }

    /* ------ glassmorphism card ------ */
    .glass {
      background: rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(14px) saturate(180%);
      -webkit-backdrop-filter: blur(14px) saturate(180%);
      border: 1px solid rgba(125, 255, 106, 0.12);
      border-radius: 2.5rem;
      padding: 2rem 1.8rem;
      box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(125, 255, 106, 0.06) inset;
      transition: all 0.2s ease;
    }

    .glass-light {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(125, 255, 106, 0.08);
    }

    /* ------ typography & spacing ------ */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(125, 255, 106, 0.08);
      padding: 0.4rem 1.2rem;
      border-radius: 60px;
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.3px;
      color: #b5ffa0;
      border: 1px solid rgba(125, 255, 106, 0.15);
      margin-bottom: 1.2rem;
    }

    h1 {
      font-size: 2.8rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin-bottom: 0.6rem;
      background: linear-gradient(135deg, #ffffff 0%, #b5ffa0 80%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subhead {
      color: #b0c6e6;
      font-size: 1.1rem;
      max-width: 480px;
      margin-bottom: 2rem;
    }

    /* ------ form elements ------ */
    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      font-size: 0.9rem;
      font-weight: 500;
      color: #d6e4ff;
      margin-bottom: 0.4rem;
      letter-spacing: 0.2px;
    }

    .input-icon {
      position: relative;
    }

    .input-icon i {
      position: absolute;
      left: 1.2rem;
      top: 50%;
      transform: translateY(-50%);
      color: #7DFF6A;
      opacity: 0.7;
      font-size: 1.1rem;
    }

    input, select, textarea {
      width: 100%;
      padding: 0.9rem 1rem 0.9rem 3rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(125, 255, 106, 0.15);
      border-radius: 60px;
      color: #fff;
      font-size: 1rem;
      transition: 0.2s;
      outline: none;
      font-family: inherit;
    }

    input::placeholder {
      color: #6c7f9e;
      font-weight: 300;
    }

    input:focus {
      border-color: #7DFF6A;
      box-shadow: 0 0 0 3px rgba(125, 255, 106, 0.15);
      background: rgba(255, 255, 255, 0.06);
    }

    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.9rem;
      margin-top: 0.5rem;
    }

    .btn {
      padding: 0.85rem 2.2rem;
      border-radius: 60px;
      font-weight: 600;
      font-size: 1rem;
      border: none;
      background: rgba(255, 255, 255, 0.03);
      color: #d6e4ff;
      display: inline-flex;
      align-items: center;
      gap: 0.7rem;
      cursor: pointer;
      transition: 0.2s;
      border: 1px solid rgba(125, 255, 106, 0.1);
      backdrop-filter: blur(4px);
      font-family: inherit;
    }

    .btn-primary {
      background: #7DFF6A;
      color: #02081a;
      border: none;
      box-shadow: 0 6px 20px rgba(125, 255, 106, 0.2);
    }

    .btn-primary:hover {
      background: #8eff7a;
      box-shadow: 0 8px 28px rgba(125, 255, 106, 0.35);
      transform: scale(1.01);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    /* ------ detail cards (grid) ------ */
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1.2rem;
      margin: 1.8rem 0;
    }

    .detail-item {
      background: rgba(255, 255, 255, 0.02);
      padding: 0.9rem 1.2rem;
      border-radius: 2rem;
      border: 1px solid rgba(125, 255, 106, 0.06);
    }

    .detail-item .label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #7f95bd;
    }

    .detail-item .value {
      font-weight: 500;
      font-size: 1.1rem;
      margin-top: 0.2rem;
      color: #eef2f9;
    }

    .status-badge {
      background: rgba(125, 255, 106, 0.12);
      color: #b5ffa0;
      padding: 0.2rem 1rem;
      border-radius: 40px;
      font-size: 0.8rem;
      display: inline-block;
      border: 1px solid rgba(125, 255, 106, 0.2);
    }

    /* ------ timeline ------ */
    .timeline {
      margin: 2rem 0 1.5rem 0;
      padding-left: 0.5rem;
    }

    .timeline-item {
      display: flex;
      gap: 1.2rem;
      margin-bottom: 1.6rem;
      align-items: flex-start;
    }

    .timeline-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.02);
      border: 1.5px solid rgba(125, 255, 106, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      flex-shrink: 0;
      color: #7f95bd;
    }

    .timeline-icon.completed {
      background: rgba(125, 255, 106, 0.15);
      border-color: #7DFF6A;
      color: #7DFF6A;
      box-shadow: 0 0 16px rgba(125, 255, 106, 0.15);
    }

    .timeline-icon.current {
      background: rgba(125, 255, 106, 0.25);
      border-color: #7DFF6A;
      color: #7DFF6A;
      box-shadow: 0 0 28px rgba(125, 255, 106, 0.35);
    }

    .timeline-icon.pending {
      border-color: rgba(255, 255, 255, 0.08);
      color: #4a5d7a;
    }

    .timeline-content {
      flex: 1;
      padding-top: 0.2rem;
    }

    .timeline-title {
      font-weight: 500;
      color: #eef2f9;
    }

    .timeline-sub {
      font-size: 0.8rem;
      color: #7f95bd;
    }

    /* progress bar */
    .progress-track {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 60px;
      height: 8px;
      margin: 1.8rem 0 0.6rem;
      overflow: hidden;
      border: 1px solid rgba(125, 255, 106, 0.06);
    }

    .progress-fill {
      height: 100%;
      width: 75%;
      background: linear-gradient(90deg, #7DFF6A, #a5ff8f);
      border-radius: 60px;
      box-shadow: 0 0 20px rgba(125, 255, 106, 0.25);
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #8ea5cb;
    }

    /* gallery (evidence) */
    .gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin: 1.2rem 0;
    }

    .gallery-item {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 20px;
      padding: 0.8rem 1.4rem;
      border: 1px solid rgba(125, 255, 106, 0.06);
      display: flex;
      align-items: center;
      gap: 0.7rem;
      color: #b5cfff;
    }

    .gallery-item i {
      color: #7DFF6A;
      font-size: 1.2rem;
    }

    /* resolution card */
    .success-card {
      border: 1px solid rgba(125, 255, 106, 0.2);
      background: rgba(125, 255, 106, 0.04);
      border-radius: 2rem;
      padding: 1.6rem;
      margin: 1.6rem 0;
    }

    /* feedback stars */
    .stars {
      display: flex;
      gap: 0.6rem;
      font-size: 2rem;
      color: #4a5d7a;
      margin: 0.8rem 0;
    }

    .stars i {
      cursor: default;
      color: #7DFF6A;
      text-shadow: 0 0 12px rgba(125, 255, 106, 0.2);
    }

    /* FAQ */
    .faq-item {
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      padding: 1rem 0;
    }

    .faq-item strong {
      color: #d6e4ff;
      display: block;
      margin-bottom: 0.2rem;
    }

    .faq-item p {
      color: #8ea5cb;
      font-size: 0.95rem;
    }

    /* not found */
    .not-found {
      text-align: center;
      padding: 3rem 1rem;
    }

    .not-found i {
      font-size: 4rem;
      color: #4a5d7a;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    /* footer */
    .footer {
      margin-top: 3rem;
      padding: 1.5rem 0 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.03);
      color: #5f7399;
      font-size: 0.9rem;
      text-align: center;
    }

    /* responsive */
    @media (max-width: 600px) {
      .glass { padding: 1.5rem 1rem; }
      h1 { font-size: 2.2rem; }
      .detail-grid { grid-template-columns: 1fr 1fr; }
      .btn-group { flex-direction: column; }
      .btn { justify-content: center; }
      input { padding-left: 3rem; }
    }

    /* demo spacing */
    .section-margin { margin-top: 2.8rem; }
    .flex-center { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
    .gap-1 { gap: 0.5rem; }
    .mt-1 { margin-top: 1rem; }
    .mb-1 { margin-bottom: 1rem; }
    .text-green { color: #7DFF6A; }
    .text-muted { color: #6c7f9e; }
  </style>
</head>
<body>

<!-- animated green waves -->
<div class="wave-bg">
  <div class="wave"></div>
  <div class="wave"></div>
  <div class="wave"></div>
</div>

<div class="app">

  <!-- HERO -->
  <section style="text-align: center; padding: 1rem 0 0.8rem;">
    <div class="badge" style="margin: 0 auto 1rem; width: fit-content;">
      <i class="fas fa-search" style="color: #7DFF6A;"></i> Track Complaint
    </div>
    <h1>Track Your Complaint Status</h1>
    <p class="subhead" style="margin-left: auto; margin-right: auto;">
      Enter your Complaint ID to view real-time progress and updates from your Panchayat.
    </p>
  </section>

  <!-- SEARCH CARD -->
  <section class="glass" style="margin-bottom: 2rem;">
    <h3 style="font-weight: 500; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem;">
      <i class="fas fa-file-alt" style="color: #7DFF6A;"></i> Find Your Complaint
    </h3>
    <div class="form-group">
      <label for="complaintId"><i class="fas fa-hashtag" style="margin-right: 6px; color: #7DFF6A;"></i> Complaint ID</label>
      <div class="input-icon">
        <i class="fas fa-id-card"></i>
        <input type="text" id="complaintId" placeholder="GS-2026-001245" value="GS-2026-001245" />
      </div>
    </div>
    <div class="form-group">
      <label for="mobile"><i class="fas fa-phone-alt" style="margin-right: 6px; color: #7DFF6A;"></i> Mobile Number</label>
      <div class="input-icon">
        <i class="fas fa-mobile-alt"></i>
        <input type="tel" id="mobile" placeholder="9876543210" value="9876543210" />
      </div>
    </div>
    <div class="btn-group">
      <button class="btn btn-primary" id="trackBtn"><i class="fas fa-search"></i> Track Complaint</button>
      <button class="btn btn-secondary"><i class="fas fa-undo-alt"></i> Clear</button>
    </div>
  </section>
  <div id="loadingState" class="glass"
     style="display:none;text-align:center;margin-top:2rem;">

    <h3>
        <i class="fas fa-spinner fa-spin"></i>
        Searching Complaint...
    </h3>

    <p>Please wait while we retrieve complaint details.</p>

</div>
<div id="trackingResults" style="display:none;">
  <!-- COMPLAINT DETAILS + TIMELINE (visible after search) -->
  <section class="glass glass-light section-margin">

    <!-- Detail grid -->
    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; align-items: center;">
      <h3 style="font-weight: 500;"><i class="fas fa-clipboard-list" style="color: #7DFF6A; margin-right: 10px;"></i>Complaint Details</h3>
      <span class="status-badge"><i class="fas fa-spinner fa-pulse" style="margin-right: 6px;"></i> In Progress</span>
    </div>
    <div class="glass mt-1">

    <h4>
        <i class="fas fa-align-left"></i>
        Complaint Description
    </h4>

    <p>
        Large potholes near the Government School
        causing accidents during rainy season.
        Immediate repair is required.
    </p>

</div>

    <div class="detail-grid">
      <div class="detail-item"><div class="label">Complaint ID</div><div class="value">GS-2026-001245</div></div>
      <div class="detail-item"><div class="label">Citizen</div><div class="value">Ramesh Kumar</div></div>
      <div class="detail-item"><div class="label">Village</div><div class="value">Pedakakani</div></div>
      <div class="detail-item"><div class="label">Category</div><div class="value">Road Damage</div></div>
      <div class="detail-item"><div class="label">Submitted</div><div class="value">12 June 2026</div></div>
      <div class="detail-item"><div class="label">Priority</div><div class="value" style="color: #f9b84a;">Medium</div></div>
    </div>

    <!-- progress bar -->
    <div class="progress-track"><div class="progress-fill" style="width: 75%;"></div></div>
    <div class="progress-label"><span>Submitted</span><span>75% Complete</span><span>Resolved</span></div>

    <!-- STATUS TIMELINE -->
    <div style="margin-top: 2rem;">
      <h4 style="font-weight: 500; margin-bottom: 1.4rem;"><i class="fas fa-clock" style="color: #7DFF6A; margin-right: 8px;"></i>Status Timeline</h4>
      <div class="timeline">
        <div class="timeline-item"><div class="timeline-icon completed"><i class="fas fa-check"></i></div><div class="timeline-content"><div class="timeline-title">Complaint Submitted</div><div class="timeline-sub">12 Jun 2026, 10:30</div></div></div>
        <div class="timeline-item"><div class="timeline-icon completed"><i class="fas fa-check"></i></div><div class="timeline-content"><div class="timeline-title">Complaint Verified</div><div class="timeline-sub">13 Jun 2026, 14:20</div></div></div>
        <div class="timeline-item"><div class="timeline-icon completed"><i class="fas fa-check"></i></div><div class="timeline-content"><div class="timeline-title">Assigned to Panchayat Officer</div><div class="timeline-sub">14 Jun 2026, 09:15</div></div></div>
        <div class="timeline-item"><div class="timeline-icon current"><i class="fas fa-circle"></i></div><div class="timeline-content"><div class="timeline-title">Work In Progress</div><div class="timeline-sub" style="color: #7DFF6A;">Current Stage</div></div></div>
        <div class="timeline-item"><div class="timeline-icon pending"><i class="far fa-circle"></i></div><div class="timeline-content"><div class="timeline-title" style="color: #4a5d7a;">Resolved</div><div class="timeline-sub">Pending</div></div></div>
      </div>
    </div>

    <!-- EVIDENCE GALLERY -->
    <div style="margin-top: 2rem;">
      <h4 style="font-weight: 500; margin-bottom: 0.8rem;"><i class="fas fa-images" style="color: #7DFF6A; margin-right: 8px;"></i>Uploaded Evidence</h4>
      <div class="gallery">
        <div class="gallery-item"><i class="fas fa-image"></i> Photo_1.jpg</div>
        <div class="gallery-item"><i class="fas fa-image"></i> Photo_2.jpg</div>
        <div class="gallery-item"><i class="fas fa-microphone-alt"></i> Voice_20260612.mp3</div>
      </div>
    </div>

    <!-- RESOLUTION (demo: currently not resolved, but show placeholder) -->
    <div style="margin-top: 2rem; opacity: 0.5; pointer-events: none; filter: grayscale(0.3);">
      <div class="success-card" style="border-color: rgba(125,255,106,0.1);">
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <i class="fas fa-check-circle" style="color: #7DFF6A; font-size: 2rem;"></i>
          <div><strong style="color: #d6e4ff;">Resolution (resolved)</strong><br><span class="text-muted">Resolution Date: 20 Jun 2026 · Officer: Smt. Priya</span></div>
        </div>
        <p style="margin-top: 0.8rem; color: #b0c6e6;">Road repaired with gravel & asphalt. Work completed.</p>
        <div class="gallery" style="margin-top: 0.6rem;">
          <span class="gallery-item"><i class="fas fa-image"></i> before.jpg</span>
          <span class="gallery-item"><i class="fas fa-image"></i> after.jpg</span>
        </div>
      </div>
    </div>

    <!-- FEEDBACK (demo) -->
    <div style="margin-top: 2.2rem;">
      <h4 style="font-weight: 500;"><i class="fas fa-star" style="color: #7DFF6A; margin-right: 8px;"></i>Rate Resolution</h4>
      <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star" style="color: #4a5d7a;"></i></div>
      <div class="form-group" style="margin-top: 0.2rem;">
        <textarea rows="2" placeholder="Share your feedback..." style="border-radius: 1.8rem; padding: 0.9rem 1.4rem; width: 100%; background: rgba(255,255,255,0.02); border: 1px solid rgba(125,255,106,0.08); color: #fff;"></textarea>
      </div>
      <button class="btn btn-primary" style="width: auto;"><i class="fas fa-paper-plane"></i> Submit Feedback</button>
    </div>
  </section>
</div>
  <!-- NOT FOUND STATE (demo hidden) -->
  <section class="glass" style="margin: 2rem 0; display: none;">
    <div class="not-found">
      <i class="fas fa-search"></i>
      <h3 style="color: #d6e4ff;">Complaint Not Found</h3>
      <p class="text-muted" style="max-width: 300px; margin: 0.4rem auto;">Please verify your Complaint ID and try again.</p>
      <button class="btn btn-primary" style="margin-top: 1.2rem;"><i class="fas fa-redo"></i> Try Again</button>
    </div>
  </section>

  <!-- FAQ SECTION -->
  <section class="glass glass-light section-margin">
    <h3 style="font-weight: 500; margin-bottom: 1.5rem;"><i class="fas fa-question-circle" style="color: #7DFF6A; margin-right: 10px;"></i>Frequently Asked Questions</h3>
    <div class="faq-item"><strong>How do I find my Complaint ID?</strong><p>Your Complaint ID is sent via SMS and email after submission. It starts with 'GS-'.</p></div>
    <div class="faq-item"><strong>How often is status updated?</strong><p>Status is updated in real-time. You may see changes within 2–4 hours of any action.</p></div>
    <div class="faq-item"><strong>Can I edit my complaint?</strong><p>Edits are allowed only within 24 hours of submission. Contact support for changes.</p></div>
    <div class="faq-item"><strong>How do I contact support?</strong><p>Call 1800-123-4567 or email support@gramsetu.gov.in (Mon-Sat 10am-5pm).</p></div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <p>© 2026 GramSetu · Panchayat Grievance Management · Built with <span style="color: #7DFF6A;">❤</span> for rural India</p>
    <p style="font-size: 0.8rem; margin-top: 0.2rem;">Track · Resolve · Empower</p>
  </footer>
</div>

<!-- (no JS interaction required for demo) -->
 <script>

const trackBtn =
document.getElementById("trackBtn");

const results =
document.getElementById("trackingResults");

const loading =
document.getElementById("loadingState");

trackBtn.addEventListener("click", () => {

    loading.style.display = "block";

    results.style.display = "none";

    setTimeout(() => {

        loading.style.display = "none";

        results.style.display = "block";

        results.scrollIntoView({
            behavior: "smooth"
        });

    }, 1500);

});

</script>
</body>
</html>