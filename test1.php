<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>TITAN | Banner with Video Background</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
<style>
    /* ============================================================
   RESET & BASE
============================================================ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background: #0a0a0a;
  overflow-x: hidden;
}

/* ============================================================
   BANNER SECTION WITH VIDEO BACKGROUND
============================================================ */
.banner {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  isolation: isolate;
}

/* Video Background */
.banner-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

/* Overlay for better text readability */
.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.4) 100%);
  z-index: 1;
}

/* ============================================================
   BANNER CONTENT
============================================================ */
.banner-content {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  animation: fadeInUp 1s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.banner-text {
  font-size: clamp(1rem, 4vw, 1.6rem);
  font-weight: 400;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.3px;
  max-width: 900px;
  margin: 0 auto;
}
 </style>
</head>
<body>

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
      <p class="banner-text">
        A wonderful serenity has taken possession of my entire soul, like these sweet<br>
        mornings of spring which I enjoy with my whole heart.
      </p>
    </div>
  </section>

  <script src="banner.js"></script>
</body>
</html>