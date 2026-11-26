# GramSetu (VGMP) — Existing Features & UI Inventory

This document catalogs every page, UI section, interaction, and backend workflow verified in the PHP source code.

---

## 1. Pages & Routes Inventory

| Original PHP URL | Target React Route | Auth Required | Source Files |
|---|---|---|---|
| `/index.php` | `/` | Public | [`index.php`](file:///c:/xampp/htdocs/vgmp/index.php), [`css/style.css`](file:///c:/xampp/htdocs/vgmp/css/style.css) |
| `/complaint.php` | `/complaint` | Public | [`complaint.php`](file:///c:/xampp/htdocs/vgmp/complaint.php), [`form.js`](file:///c:/xampp/htdocs/vgmp/form.js), [`css/complaint.css`](file:///c:/xampp/htdocs/vgmp/css/complaint.css) |
| `/track.php` | `/track` | Public | [`track.php`](file:///c:/xampp/htdocs/vgmp/track.php), [`css/complaint.css`](file:///c:/xampp/htdocs/vgmp/css/complaint.css), [`css/track.css`](file:///c:/xampp/htdocs/vgmp/css/track.css) |
| `/admin/login.php` | `/admin/login` | Public (redirects if logged in) | [`admin/login.php`](file:///c:/xampp/htdocs/vgmp/admin/login.php), [`css/complaint.css`](file:///c:/xampp/htdocs/vgmp/css/complaint.css) |
| `/admin/dashboard.php` | `/admin/dashboard` | Panchayat Admin | [`admin/dashboard.php`](file:///c:/xampp/htdocs/vgmp/admin/dashboard.php) |
| `/admin/complaints.php` | `/admin/complaints` | Panchayat Admin | [`admin/complaints.php`](file:///c:/xampp/htdocs/vgmp/admin/complaints.php) |
| `/admin/view_complaint.php?id=...` | `/admin/complaints/:id` | Panchayat Admin | [`admin/view_complaint.php`](file:///c:/xampp/htdocs/vgmp/admin/view_complaint.php) |
| `/admin/logout.php` | Action (`POST /api/auth/logout` + redirect) | Panchayat Admin | [`admin/logout.php`](file:///c:/xampp/htdocs/vgmp/admin/logout.php) |

---

## 2. Shared Citizen Navigation & Translation

Present on `index.php`, `complaint.php`, `track.php`, and `admin/login.php`:
- **Floating Glassmorphic Navbar (`.navbar-wrapper` / `.navbar`):**
  - Logo image (`gramsetu-logo.png`) + `GramSetu` wordmark (`Gram` white, `Setu` green `#4ade80`).
  - Links: `Home`, `Register Complaint`, `Track Complaint`, `Panchayat Login` with active pill highlighting.
  - Language switcher `<select id="languageSwitcher">`: `🇬🇧 EN` (`en`), `🇮🇳 తెలుగు` (`te`), `🇮🇳 हिन्दी` (`hi`).
  - Mobile menu button (`☰`) opening a slide-in right drawer (`.mobile-menu`) with dark backdrop overlay (`.mobile-overlay`).
- **Google Translate Integration:**
  - Hidden `#google_translate_element` initialized via `//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit` with `pageLanguage: 'en'`, `includedLanguages: 'en,te,hi'`.
  - Syncs with `localStorage.getItem('language')` and hides `.goog-te-banner-frame` / `.skiptranslate`.
  - Language Selection Modal (`.language-modal`) on `index.php` shown on first visit if `localStorage.language` is unset.

---

## 3. Page-by-Page Feature Breakdown

### A. Landing Page (`index.php`)
1. **Hero Section (`.hero`):**
   - Full-viewport animated HTML5 `<canvas id="waveCanvas">` rendering 16 rotating, pulsing organic green HSL wave layers over `#0c0e1c` radial center.
   - Badge: `🌱 Your Voice, Your Village`.
   - Headline: `Stronger Villages Start with Your Voice`.
   - Primary CTA (`📝 File a Complaint` → `complaint.php`) & Secondary CTA (`🔍 Track Complaint` → `track.php`).
   - 3 feature pills: `🛡 Secure & Private`, `⚡ Quick Response`, `👥 For Every Citizen`.
2. **How It Works (`.hiw`):**
   - 4 numbered cards (`01 Register Complaint`, `02 Panchayat Review`, `03 Track Progress`, `04 Resolution`) connected by glowing dashed SVG arrows.
3. **Why GramSetu (`.why`):**
   - Left: Animated CSS phone mockup with pulsing dot (`Complaint Filed`) and floating cards (`100% Secure`, `Resolved in 48h`).
   - Right: 6 feature list items with hover slide & glow.
4. **Complaint Categories (`.cats`):**
   - 4-column responsive grid of 8 category cards (`Street Lights`, `Roads`, `Water Supply`, `Sanitation`, `Environment`, `Electricity`, `Public Infrastructure`, `Animal Issues`) + CTA button (`File a Custom Complaint →`). *(Note: links currently point to `#`.)*
5. **Live Statistics (`.stats`):**
   - Top & bottom SVG wave dividers (`#060d08`), dot-grid background.
   - 4 cards with `IntersectionObserver` count-up animation, progress bar fill, and mouse-move 3D tilt:
     - `15,248` Complaints Registered (`100%` bar)
     - `12,731` Complaints Resolved (`83%` bar)
     - `83%` Resolution Rate (highlighted)
     - `145` Active Panchayats (`58%` bar)
   - Infinite horizontal marquee ticker (`.stats__ticker-track`) with 6 village resolution snippets. *(All numbers and ticker items are hardcoded in HTML.)*
6. **FAQ Section (`.faq`):**
   - Left: 7-item single-open accordion (`How do I register a complaint?`, `Can I track my complaint?`, `Do I need an account...`, `Can I upload photos...`, `Can I submit a voice complaint?`, `How long does resolution take?`, `Is my complaint information kept private?`).
   - Right: Sticky support card (`Still have questions?`, `Contact Support →`) and 3-stat strip (`2 hrs`, `98%`, `24/7`).
7. **Footer (`.footer`):**
   - Brand logo & tagline, 4 social icon links (`#`), 3 link columns (`Platform`, `Quick Access`, `Legal` — all `#`), copyright `© 2025 GramSetu`, 3 bottom badges.

### B. Complaint Registration (`complaint.php` + `form.js` + `action/submit_complaint.php`)
1. **Video Banner (`.banner`):** Looping muted `banner.mp4` with dark overlay, headline `"Raise Your Voice," Improve Your Village`, and badge `📢 Register a Complaint`.
2. **Step 1 — Personal Information:**
   - `Full Name` (`name`, required)
   - `Mobile Number` (`mobile`, required, 10-digit numeric validation `/^\d{10}$/`)
   - `Village Name` (`village_id`, required, populated from active `villages` joined with `panchayaths` as `Village (Panchayath)`)
   - `Ward Number` (`ward_no`, optional)
3. **Step 2 — Complaint Details:**
   - `Complaint Category` (`category`, required): `Road Damage`, `Street Light`, `Drainage Issue`, `Water Supply`, `Garbage Collection`, `Public Safety`, `Other`.
   - `Complaint Title` (`title`, required)
   - `Detailed Description` (`description`, required, `maxlength="1000"`, live character counter `0 / 1000 Characters`)
   - **Voice Dictation Button (`#micSpeechBtn`):** Uses browser `SpeechRecognition` / `webkitSpeechRecognition` (`lang = 'en-IN'`) to append dictated text to `#description`. Disables cleanly if unsupported.
4. **Upload Evidence (Optional):**
   - Drag-and-drop zone + Browse Files button (`accept="image/jpeg,image/jpg,image/png"`).
   - Client-side validation: JPG/JPEG/PNG only, max 6 images, thumbnail previews with per-image remove button (`×`).
   - Backend saves uploaded files to `uploads/images/<timestamp>_<uniqid>.<ext>` and stores JSON array in `complaints.image_path`.
5. **Review & Submit:**
   - Accuracy confirmation checkbox (`#confirmCheck`, required in client validation).
   - `Register Complaint` submit button (loading spinner state while posting `FormData`) & `Reset Form` button.
   - Toast notifications (`.toast-msg`) for validation errors, file limits, reset, and submission status.
   - *(Note: `#successModal` is commented out in `complaint.php` even though `form.js` handles displaying it with `result.complaint_id`.)*
6. **Bottom Stats Panel:** `Secure & Private`, `Real-Time Updates`, `12,731 Issues Resolved`.

### C. Track Complaint (`track.php` + `action/track_com.php` + `action/find_complaints.php`)
1. **Animated Green Wave Background (`.wave-bg`):** 3 CSS wave layers over `#02081a`.
2. **Two-Column Lookup Area (`.tracking-wrapper`):**
   - **Left (`Find Your Complaint`):** `Complaint ID` + `Mobile Number`, `Track Complaint` & `Clear` buttons, Enter-key navigation. Calls `action/track_com.php`.
   - **Right (`Find Your Complaint ID`):** `Mobile Number` + `Search Complaint IDs` button. Calls `action/find_complaints.php`, renders list of `.complaint-card` items (`complaint_id`, `title`, `status`).
3. **States:** Loading card (`#loadingState`), Not Found card (`#notFoundState` with `Try Again` button), and Tracking Results (`#trackingResults`).
4. **Tracking Results Content:**
   - Status badge (`Submitted`, `Verified`, `In Progress`, `Resolved`/`Completed`)
   - Complaint Description card
   - 6-item Detail Grid (`Complaint ID`, `Citizen`, `Category`, `Mobile`, `Village`, `Submitted`)
   - Progress Bar (`25%` Submitted, `50%` Verified, `75%` In Progress, `100%` Resolved)
   - Status Timeline (built from `data.updates` — currently 1 entry from `action/track_com.php`)
   - Uploaded Evidence gallery (image link & audio player if `image_path`/`audio_path` set)
   - Rate Resolution UI (5 interactive gold/grey stars + feedback textarea + Submit button — client-side `alert` only)
5. **FAQ & Footer:** 4 static FAQ items + simple footer (`© 2026 GramSetu`).

### D. Panchayat Admin Portal (`admin/*`)
1. **Login (`admin/login.php`):**
   - Citizen navbar at top + centered glassmorphic login card (`GramSetu — Panchayath Admin Portal`).
   - Username + Password (with eye toggle) + `Login to Dashboard` button.
   - Displays demo credentials box (`kondapalli / admin123`, `guntur / admin123`, `narasaraopet / admin123`).
2. **Dashboard (`admin/dashboard.php`):**
   - Fixed left sidebar (collapses on `<=768px` with hamburger toggle) showing brand, logged-in Panchayat avatar/name/role, nav links with live count badges (`Dashboard`, `All Complaints`, `Pending`, `In Progress`, `Resolved`), and `Logout`.
   - Top bar with Panchayat name, active village count, and current date.
   - Conditional orange alert banner when `Submitted + Verified > 0`.
   - 4 Stat Cards (`Total Complaints`, `Pending Review`, `In Progress`, `Resolved` + preview of up to 3 village names).
   - Pure CSS bar chart (`Complaint Status Distribution` across 5 statuses).
   - Recent Complaints table (latest 10 for the Panchayat's villages) with `View` link.
3. **All Complaints (`admin/complaints.php`):**
   - Back to Dashboard link, search box (`name`, `complaint_id`, `mobile`), 6 status filter pills (`All`, `Submitted`, `Verified`, `In Progress`, `Resolved`, `Rejected`), and responsive complaints table.
4. **View Complaint (`admin/view_complaint.php`):**
   - Back to Complaints link, detail grid (`Complaint ID`, `Status`, `Citizen Name`, `Mobile Number`, `Village`, `Ward Number`, `Category`, `Submitted On`, `Title`, `Description`).
   - Evidence card (if `image_path` or `audio_path` present).
   - Update Status form (`Submitted`, `Verified`, `In Progress`, `Resolved`, `Rejected`) with success/error alert banner.

