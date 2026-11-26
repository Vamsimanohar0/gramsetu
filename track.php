<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GRAMSETU - Track Complaint</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/complaint.css" />
  <link rel="stylesheet" href="css/track.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
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
    <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
  </nav>
</div>

<!-- Mobile menu -->
<div class="mobile-overlay" id="mobileOverlay"></div>
<div class="mobile-menu" id="mobileMenu">
  <a href="index.php">🏠 Home</a>
  <a href="complaint.php">📝 Register Complaint</a>
  <a href="track.php">🔍 Track Complaint</a>
  <a href="admin/login.php">🏛️ Panchayat Login</a>
</div>

<script>
(function () {
  var btn = document.getElementById("mobileMenuBtn");
  var menu = document.getElementById("mobileMenu");
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
document.getElementById('languageSwitcher').addEventListener('change', function () {
    const lang = this.value;
    localStorage.setItem('language', lang);
    const translate = setInterval(() => {
        const googleSelect = document.querySelector('.goog-te-combo');
        if (googleSelect) {
            googleSelect.value = lang;
            googleSelect.dispatchEvent(new Event('change'));
            clearInterval(translate);
        }
    }, 300);
});
</script>

<script>
window.addEventListener('load', () => {
    const savedLang = localStorage.getItem('language');
    if (!savedLang) return;
    const translator = setInterval(() => {
        const googleSelect = document.querySelector('.goog-te-combo');
        if (googleSelect) {
            googleSelect.value = savedLang;
            googleSelect.dispatchEvent(new Event('change'));
            clearInterval(translator);
        }
    }, 500);
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

<!-- =========================================================================================================================================
                                                      up to this the nav bar code 
======================================================================================================================================== -->

<!-- animated green waves -->
<div class="wave-bg">
  <div class="wave"></div>
  <div class="wave"></div>
  <div class="wave"></div>
</div>

<div class="app">

  <!-- HERO -->
  <section style="text-align: center; padding: 1rem 0 0.8rem; margin-top:100px;">
    <div class="badge" style="margin: 0 auto 1rem; width: fit-content;">
      <i class="fas fa-search" style="color: #7DFF6A;"></i> Track Complaint
    </div>
    <h1>Track Your Complaint Status</h1>
    <p class="subhead" style="margin-left: auto; margin-right: auto;">
      Enter your Complaint ID to view real-time progress and updates from your Panchayat.
    </p>
  </section>

  
<!-- search id -->
  <div class="tracking-wrapper">

    <!-- Existing Track Card -->
    <div class="glass tracking-card">

        <!-- SEARCH CARD -->
  <section class="glass" style="margin-bottom: 2rem;">
    <h3 style="font-weight: 500; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem;">
      <i class="fas fa-file-alt" style="color: #7DFF6A;"></i> Find Your Complaint
    </h3>
    <div class="form-group">
      <label for="complaintId"><i class="fas fa-hashtag" style="margin-right: 6px; color: #7DFF6A;"></i> Complaint ID</label>
      <div class="input-icon">
        <i class="fas fa-id-card"></i>
        <input type="text" id="complaintId" placeholder="GS-2026-001245" />
      </div>
    </div>
    <div class="form-group">
      <label for="mobile"><i class="fas fa-phone-alt" style="margin-right: 6px; color: #7DFF6A;"></i> Mobile Number</label>
      <div class="input-icon">
        <i class="fas fa-mobile-alt"></i>
        <input type="tel" id="mobile" placeholder="9876543210" />
      </div>
    </div>
    <div class="btn-group">
      <button class="btn btn-primary" id="trackBtn"><i class="fas fa-search"></i> Track Complaint</button>
      <button class="btn btn-secondary" id="clearBtn"><i class="fas fa-undo-alt"></i> Clear</button>
    </div>
  </section>
    </div>

    <!-- New Complaint ID Search -->

    <div class="glass search-card">

        <h2>Find Your Complaint ID</h2>

        <p class="text-muted">
            Enter your registered mobile number to view all complaint IDs.
        </p>

        <div class="form-group">

            <label>Mobile Number</label>

            <div class="input-icon">

                <i class="fas fa-phone"></i>

                <input
                    type="text"
                    id="searchMobile"
                    placeholder="Enter Mobile Number">

            </div>

        </div>

        <button
            class="btn btn-primary"
            id="searchComplaintBtn">

            Search Complaint IDs

        </button>

        <div
            id="complaintList"
            class="mt-1">

        </div>

    </div>

</div>

  <!-- LOADING STATE -->
  <div id="loadingState" class="glass" style="display:none;text-align:center;margin-top:2rem;">
    <h3>
        <i class="fas fa-spinner fa-spin"></i>
        Searching Complaint...
    </h3>
    <p>Please wait while we retrieve complaint details.</p>
  </div>

  <!-- TRACKING RESULTS -->
  <div id="trackingResults" style="display:none;">
    <!-- COMPLAINT DETAILS -->
    <section class="glass glass-light section-margin">
      <!-- Header with status -->
      <div style="display: flex; justify-content: space-between; flex-wrap: wrap; align-items: center;">
        <h3 style="font-weight: 500;"><i class="fas fa-clipboard-list" style="color: #7DFF6A; margin-right: 10px;"></i>Complaint Details</h3>
        <span class="status-badge" id="statusBadge"><i class="fas fa-spinner fa-pulse" style="margin-right: 6px;"></i> Loading...</span>
      </div>

      <!-- Description -->
      <div class="glass mt-1">
        <h4><i class="fas fa-align-left"></i> Complaint Description</h4>
        <p id="complaintDescription">Loading description...</p>
      </div>

      <!-- Details Grid -->
      <div class="detail-grid" id="detailGrid">
        <!-- Dynamic content will be inserted here -->
      </div>

      <!-- Progress Bar -->
      <div class="progress-track">
        <div class="progress-fill" id="progressFill" style="width: 0%;"></div>
      </div>
      <div class="progress-label">
        <span>Submitted</span>
        <span id="progressPercentage">0% Complete</span>
        <span>Resolved</span>
      </div>

      <!-- Status Timeline -->
      <div style="margin-top: 2rem;">
        <h4 style="font-weight: 500; margin-bottom: 1.4rem;">
          <i class="fas fa-clock" style="color: #7DFF6A; margin-right: 8px;"></i>
          Status Timeline
        </h4>
        <div class="timeline" id="timelineContainer">
          <!-- Dynamic timeline will be inserted here -->
        </div>
      </div>

      <!-- Evidence Gallery -->
      <div style="margin-top: 2rem;" id="evidenceSection">
        <h4 style="font-weight: 500; margin-bottom: 0.8rem;">
          <i class="fas fa-images" style="color: #7DFF6A; margin-right: 8px;"></i>
          Uploaded Evidence
        </h4>
        <div class="gallery" id="evidenceGallery">
          <p style="color: #b0c6e6;">No evidence uploaded</p>
        </div>
      </div>

      <!-- Feedback Section -->
      <div style="margin-top: 2.2rem;">
        <h4 style="font-weight: 500;">
          <i class="fas fa-star" style="color: #7DFF6A; margin-right: 8px;"></i>
          Rate Resolution
        </h4>
        <div class="stars" id="starRating">
          <i class="fas fa-star" data-star="1"></i>
          <i class="fas fa-star" data-star="2"></i>
          <i class="fas fa-star" data-star="3"></i>
          <i class="fas fa-star" data-star="4"></i>
          <i class="fas fa-star" data-star="5" style="color: #4a5d7a;"></i>
        </div>
        <div class="form-group" style="margin-top: 0.2rem;">
          <textarea rows="2" id="feedbackText" placeholder="Share your feedback..." style="border-radius: 1.8rem; padding: 0.9rem 1.4rem; width: 100%; background: rgba(255,255,255,0.02); border: 1px solid rgba(125,255,106,0.08); color: #fff;"></textarea>
        </div>
        <button class="btn btn-primary" id="submitFeedback" style="width: auto;">
          <i class="fas fa-paper-plane"></i> Submit Feedback
        </button>
      </div>
    </section>
  </div>

  <!-- NOT FOUND STATE -->
  <section class="glass" id="notFoundState" style="margin: 2rem 0; display: none;">
    <div class="not-found">
      <i class="fas fa-search" style="font-size: 3rem; color: #7DFF6A;"></i>
      <h3 style="color: #d6e4ff;">Complaint Not Found</h3>
      <p class="text-muted" style="max-width: 300px; margin: 0.4rem auto;">Please verify your Complaint ID and try again.</p>
      <button class="btn btn-primary" id="tryAgainBtn" style="margin-top: 1.2rem;">
        <i class="fas fa-redo"></i> Try Again
      </button>
    </div>
  </section>

  <!-- FAQ SECTION -->
  <section class="glass glass-light section-margin">
    <h3 style="font-weight: 500; margin-bottom: 1.5rem;">
      <i class="fas fa-question-circle" style="color: #7DFF6A; margin-right: 10px;"></i>
      Frequently Asked Questions
    </h3>
    <div class="faq-item">
      <strong>How do I find my Complaint ID?</strong>
      <p>Your Complaint ID is sent via SMS and email after submission. It starts with 'GS-'.</p>
    </div>
    <div class="faq-item">
      <strong>How often is status updated?</strong>
      <p>Status is updated in real-time. You may see changes within 2–4 hours of any action.</p>
    </div>
    <div class="faq-item">
      <strong>Can I edit my complaint?</strong>
      <p>Edits are allowed only within 24 hours of submission. Contact support for changes.</p>
    </div>
    <div class="faq-item">
      <strong>How do I contact support?</strong>
      <p>Call 1800-123-4567 or email support@gramsetu.gov.in (Mon-Sat 10am-5pm).</p>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <p>© 2026 GramSetu · Panchayat Grievance Management · Built with <span style="color: #7DFF6A;">❤</span> for rural India</p>
    <p style="font-size: 0.8rem; margin-top: 0.2rem;">Track · Resolve · Empower</p>
  </footer>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const trackBtn = document.getElementById("trackBtn");
    const clearBtn = document.getElementById("clearBtn");
    const complaintIdInput = document.getElementById("complaintId");
    const mobileInput = document.getElementById("mobile");
    const loadingState = document.getElementById("loadingState");
    const results = document.getElementById("trackingResults");
    const notFound = document.getElementById("notFoundState");
    const tryAgainBtn = document.getElementById("tryAgainBtn");

    // Track Complaint Button
    trackBtn.addEventListener("click", function(){
        const complaintId = complaintIdInput.value.trim();
        const mobile = mobileInput.value.trim();
        
        if(!complaintId || !mobile) {
            alert("Please enter both Complaint ID and Mobile Number");
            return;
        }
        
        // Show loading, hide results
        loadingState.style.display = "block";
        results.style.display = "none";
        notFound.style.display = "none";
        
        // Make API call
        fetch("action/track_com.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "complaint_id=" + encodeURIComponent(complaintId) + 
                  "&mobile=" + encodeURIComponent(mobile)
        })
        .then(response => response.json())
        .then(data => {
            loadingState.style.display = "none";
            
            if(data.status === "error") {
                notFound.style.display = "block";
                return;
            }
            
            if(data.status === "success") {
                loadComplaint(data);
                results.style.display = "block";
            }
        })
        .catch(error => {
            loadingState.style.display = "none";
            alert("Error fetching complaint: " + error.message);
        });
    });

    // Clear Button
    clearBtn.addEventListener("click", function() {
        complaintIdInput.value = "";
        mobileInput.value = "";
        results.style.display = "none";
        notFound.style.display = "none";
    });

    // Try Again Button
    tryAgainBtn.addEventListener("click", function() {
        notFound.style.display = "none";
        complaintIdInput.focus();
    });

    // Enter key support
    complaintIdInput.addEventListener("keypress", function(e) {
        if(e.key === "Enter") {
            mobileInput.focus();
        }
    });
    
    mobileInput.addEventListener("keypress", function(e) {
        if(e.key === "Enter") {
            trackBtn.click();
        }
    });

    // Star rating
    document.querySelectorAll('#starRating .fa-star').forEach(function(star) {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.star);
            document.querySelectorAll('#starRating .fa-star').forEach(function(s, index) {
                if(index < rating) {
                    s.style.color = '#FFD700';
                } else {
                    s.style.color = '#4a5d7a';
                }
            });
        });
    });

    // Submit Feedback
    document.getElementById("submitFeedback").addEventListener("click", function() {
        const feedback = document.getElementById("feedbackText").value.trim();
        if(!feedback) {
            alert("Please enter your feedback");
            return;
        }
        alert("Thank you for your feedback!");
        document.getElementById("feedbackText").value = "";
    });
});

// ==================== LOAD COMPLAINT FUNCTION ====================
function loadComplaint(data) {
    const complaint = data.complaint;
    
    // Update status badge
    const statusBadge = document.getElementById("statusBadge");
    let statusIcon = '';
    let statusColor = '#7DFF6A';
    
    switch(complaint.status.toLowerCase()) {
        case 'submitted':
            statusIcon = 'fa-clock';
            statusColor = '#f9b84a';
            break;
        case 'verified':
            statusIcon = 'fa-check-circle';
            statusColor = '#4CAF50';
            break;
        case 'in progress':
        case 'in-progress':
            statusIcon = 'fa-spinner fa-pulse';
            statusColor = '#7DFF6A';
            break;
        case 'resolved':
        case 'completed':
            statusIcon = 'fa-check-circle';
            statusColor = '#4CAF50';
            break;
        default:
            statusIcon = 'fa-circle';
            statusColor = '#7DFF6A';
    }
    
    statusBadge.innerHTML = `<i class="fas ${statusIcon}" style="color: ${statusColor}; margin-right: 6px;"></i> ${complaint.status}`;
    
    // Update description
    document.getElementById("complaintDescription").textContent = complaint.description || 'No description provided';
    
    // Update detail grid
    document.getElementById("detailGrid").innerHTML = `
        <div class="detail-item">
            <div class="label">Complaint ID</div>
            <div class="value">${complaint.complaint_id}</div>
        </div>
        <div class="detail-item">
            <div class="label">Citizen</div>
            <div class="value">${complaint.name || 'N/A'}</div>
        </div>
        <div class="detail-item">
            <div class="label">Category</div>
            <div class="value">${complaint.category || 'N/A'}</div>
        </div>
        <div class="detail-item">
            <div class="label">Mobile</div>
            <div class="value">${complaint.mobile}</div>
        </div>
        <div class="detail-item">
            <div class="label">Village</div>
            <div class="value">${complaint.village || 'N/A'}</div>
        </div>
        <div class="detail-item">
            <div class="label">Submitted</div>
            <div class="value">${complaint.created_at || 'N/A'}</div>
        </div>
    `;
    
    // Update progress bar
    updateProgress(complaint.status);
    
    // Build timeline
    buildTimeline(data.updates || []);
    
    // Show evidence if any
    showEvidence(complaint);
}

// ==================== UPDATE PROGRESS ====================
function updateProgress(status) {
    let percentage = 0;
    
    switch(status.toLowerCase()) {
        case 'submitted':
            percentage = 25;
            break;
        case 'verified':
            percentage = 50;
            break;
        case 'in progress':
        case 'in-progress':
            percentage = 75;
            break;
        case 'resolved':
        case 'completed':
            percentage = 100;
            break;
        default:
            percentage = 25;
    }
    
    document.getElementById("progressFill").style.width = percentage + "%";
    document.getElementById("progressPercentage").textContent = percentage + "% Complete";
}

// ==================== BUILD TIMELINE ====================
function buildTimeline(updates) {
    const container = document.getElementById("timelineContainer");
    
    if(!updates || updates.length === 0) {
        container.innerHTML = `<p style="color: #b0c6e6;">No status updates available.</p>`;
        return;
    }
    
    let html = "";
    const total = updates.length;
    
    updates.forEach(function(item, index) {
        const isLast = (index === total - 1);
        let iconClass = 'completed';
        let iconHtml = '<i class="fas fa-check"></i>';
        
        if(isLast) {
            iconClass = 'current';
            iconHtml = '<i class="fas fa-circle"></i>';
        }
        
        html += `
            <div class="timeline-item">
                <div class="timeline-icon ${iconClass}">
                    ${iconHtml}
                </div>
                <div class="timeline-content">
                    <div class="timeline-title">${item.status || 'Update'}</div>
                    <div class="timeline-sub">
                        ${item.remarks || ''}
                        ${item.updated_at ? '<br>' + item.updated_at : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== SHOW EVIDENCE ====================
function showEvidence(complaint) {
    const gallery = document.getElementById("evidenceGallery");
    
    // Check if there are images or audio
    const hasImage = complaint.image_path && complaint.image_path !== 'NULL' && complaint.image_path !== '';
    const hasAudio = complaint.audio_path && complaint.audio_path !== 'NULL' && complaint.audio_path !== '';
    
    if(!hasImage && !hasAudio) {
        gallery.innerHTML = `<p style="color: #b0c6e6;">No evidence uploaded</p>`;
        return;
    }
    
    let html = '';
    
    if(hasImage) {
        html += `
            <div class="gallery-item">
                <i class="fas fa-image"></i> 
                <a href="${complaint.image_path}" target="_blank">View Image</a>
            </div>
        `;
    }
    
    if(hasAudio) {
        html += `
            <div class="gallery-item">
                <i class="fas fa-microphone-alt"></i> 
                <audio controls style="height: 30px; max-width: 200px;">
                    <source src="${complaint.audio_path}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>
        `;
    }
    
    gallery.innerHTML = html;
}
</script>
<!-- search id's -->
<script>
  document
.getElementById("searchComplaintBtn")
.addEventListener("click",function(){

let mobile=document.getElementById("searchMobile").value;

fetch("action/find_complaints.php",{

method:"POST",

headers:{
"Content-Type":"application/x-www-form-urlencoded"
},

body:"mobile="+encodeURIComponent(mobile)

})

.then(r=>r.json())

.then(data=>{

let html="";

if(data.length==0){

html="<p>No complaints found.</p>";

}

data.forEach(c=>{

html+=`

<div class="complaint-card">

<h4>${c.complaint_id}</h4>

<p>${c.title}</p>

<p>Status :
<strong>${c.status}</strong></p>

</div>

`;

});

document.getElementById("complaintList").innerHTML=html;

});

});
</script>

</body>
</html>