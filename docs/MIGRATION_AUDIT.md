# GramSetu (VGMP) — Migration Audit

**Audit Date:** 2026-11-26  
**Original PHP Reference:** Git commit `f326545` (preserved in Git history)  
**Target Stack:** React.js (Vite) + Node.js (Express.js) + MySQL (`mysql2`)

> **Post-Migration Hardening Update:** Legacy PHP files were removed from the working tree in commit `8a02b8c` (remaining preserved in `f326545`). Subsequent security, legacy-data, and parity updates implemented `HttpOnly` cookie-only auth (no `localStorage` JWT), dev-only demo credentials, IP rate limiting, binary JPEG/PNG magic-byte upload validation, and safe/reversible legacy complaint mapping.

---

## 1. Executive Summary & Project Understanding

**GramSetu** (Village Grievance Management Portal / `vgmp`) is a PHP + MySQL civic grievance portal with a dark-emerald glassmorphic UI (`#060d08`, `#080f0a`, `#02081a`, `#0a0f1e`, neon green accents `#7DFF6A` / `#4ade80`).

It consists of two primary user surfaces:
1. **Citizen Portal (Public):**
   - Landing page ([`index.php`](file:///c:/xampp/htdocs/vgmp/index.php)) introducing GramSetu, workflow steps, benefits, complaint categories, live-style statistics, FAQ accordion, footer, and language selection (English, Telugu, Hindi via Google Translate).
   - Complaint Registration ([`complaint.php`](file:///c:/xampp/htdocs/vgmp/complaint.php) + [`form.js`](file:///c:/xampp/htdocs/vgmp/form.js) + [`action/submit_complaint.php`](file:///c:/xampp/htdocs/vgmp/action/submit_complaint.php)) where citizens select their village, enter personal & issue details, optionally use browser speech-to-text dictation, upload up to 6 images, and receive a generated Complaint ID (`GS-2026-XXXXX`).
   - Complaint Tracking & Lookup ([`track.php`](file:///c:/xampp/htdocs/vgmp/track.php) + [`action/track_com.php`](file:///c:/xampp/htdocs/vgmp/action/track_com.php) + [`action/find_complaints.php`](file:///c:/xampp/htdocs/vgmp/action/find_complaints.php)) where citizens track a complaint by Complaint ID + Mobile Number, or look up all Complaint IDs registered under a Mobile Number.
2. **Panchayat Admin Portal (Authenticated):**
   - Login ([`admin/login.php`](file:///c:/xampp/htdocs/vgmp/admin/login.php)) authenticating Panchayat officials against the `panchayaths` table.
   - Dashboard ([`admin/dashboard.php`](file:///c:/xampp/htdocs/vgmp/admin/dashboard.php)) showing village-scoped statistics, pending alert banner, CSS status bar chart, and 10 most recent complaints.
   - All Complaints ([`admin/complaints.php`](file:///c:/xampp/htdocs/vgmp/admin/complaints.php)) with status filter pills and search by citizen name, Complaint ID, or mobile number.
   - Complaint Detail & Status Update ([`admin/view_complaint.php`](file:///c:/xampp/htdocs/vgmp/admin/view_complaint.php)) to inspect complaint fields/evidence and update complaint status.
   - Logout ([`admin/logout.php`](file:///c:/xampp/htdocs/vgmp/admin/logout.php)).

---

## 2. Complete Repository File Inventory

### Active Application Files
| File | Role | Notes |
|---|---|---|
| [`index.php`](file:///c:/xampp/htdocs/vgmp/index.php) | Citizen landing page | 1,220 lines; pure static HTML/JS + inline Google Translate & canvas wave animation (`#waveCanvas`) |
| [`complaint.php`](file:///c:/xampp/htdocs/vgmp/complaint.php) | Complaint registration page | 455 lines; queries active `villages` + `panchayaths` |
| [`form.js`](file:///c:/xampp/htdocs/vgmp/form.js) | Client-side form logic | 323 lines; Web Speech API dictation, drag-drop image preview (max 6), validation, `fetch('action/submit_complaint.php')` |
| [`track.php`](file:///c:/xampp/htdocs/vgmp/track.php) | Track complaint & ID lookup | 726 lines; calls `action/track_com.php` & `action/find_complaints.php` |
| [`include/config.php`](file:///c:/xampp/htdocs/vgmp/include/config.php) | MySQL connection config | Connects to `localhost`, user `root`, db `vgmp` (commented-out InfinityFree credentials present) |
| [`action/submit_complaint.php`](file:///c:/xampp/htdocs/vgmp/action/submit_complaint.php) | Submit complaint API | Validates fields/mobile, looks up `panchayath_id`, saves up to 6 images, inserts into `complaints` |
| [`action/track_com.php`](file:///c:/xampp/htdocs/vgmp/action/track_com.php) | Track complaint API | Queries `complaints` by `complaint_id` + `mobile`, returns complaint + 1-item `updates` array |
| [`action/find_complaints.php`](file:///c:/xampp/htdocs/vgmp/action/find_complaints.php) | Mobile lookup API | Queries `complaints` by `mobile`, returns `complaint_id`, `title`, `status`, `created_at` |
| [`admin/login.php`](file:///c:/xampp/htdocs/vgmp/admin/login.php) | Panchayat login page & POST handler | Queries `panchayaths` (`username`, `status='active'`), checks `password_verify()` or plaintext match |
| [`admin/dashboard.php`](file:///c:/xampp/htdocs/vgmp/admin/dashboard.php) | Panchayat admin dashboard | Session-guarded, village-scoped counts, CSS bar chart, recent 10 complaints |
| [`admin/complaints.php`](file:///c:/xampp/htdocs/vgmp/admin/complaints.php) | Panchayat complaints list | Session-guarded, village-scoped, status filter + search (`name`, `complaint_id`, `mobile`) |
| [`admin/view_complaint.php`](file:///c:/xampp/htdocs/vgmp/admin/view_complaint.php) | Complaint detail & status update | Session-guarded, displays details/evidence, updates `complaints.status` |
| [`admin/logout.php`](file:///c:/xampp/htdocs/vgmp/admin/logout.php) | Admin logout | Destroys session and redirects to `login.php` |

### Stylesheets & Media Assets
| Asset | Used By | Notes |
|---|---|---|
| [`css/style.css`](file:///c:/xampp/htdocs/vgmp/css/style.css) | `index.php` | 2,632 lines; navbar, hero, HIW, Why, Categories, Stats, FAQ, Footer, Language Modal, Mobile Menu |
| [`css/complaint.css`](file:///c:/xampp/htdocs/vgmp/css/complaint.css) | `complaint.php`, `track.php`, `admin/login.php` | 1,074 lines; navbar, video banner, form cards, upload dropzone, stats panel, modal, toast |
| [`css/track.css`](file:///c:/xampp/htdocs/vgmp/css/track.css) | `track.php` | 533 lines; wave background, glass cards, tracking/search wrapper, timeline, progress bar, gallery, stars |
| [`gramsetu-logo.png`](file:///c:/xampp/htdocs/vgmp/gramsetu-logo.png) | Navbar & Footer | 56.5 KB |
| [`banner.mp4`](file:///c:/xampp/htdocs/vgmp/banner.mp4) | `complaint.php` | 12.0 MB video background |
| [`uploads/images/`](file:///c:/xampp/htdocs/vgmp/uploads/images) | `submit_complaint.php` | Upload target directory (currently empty) |
| [`uploads/audio/`](file:///c:/xampp/htdocs/vgmp/uploads/audio) | Unused | Empty directory |

### Unused / Legacy / Prototype Files (Reference Only)
| File | Status | Findings |
|---|---|---|
| [`action/pan_log.php`](file:///c:/xampp/htdocs/vgmp/action/pan_log.php) | Unused | Legacy login handler querying `admins` table (`admin_id`, `panchayat_id`, `name`), redirects to `dashboard.php` (broken relative path). `admin/login.php` does not call it. |
| [`css/login.css`](file:///c:/xampp/htdocs/vgmp/css/login.css) | Unused | Old login stylesheet; `admin/login.php` uses inline `<style>` + `../css/complaint.css`. |
| [`css/bg 2.jpg`](file:///c:/xampp/htdocs/vgmp/css/bg%202.jpg) | Unused | 1.86 MB image not referenced in any PHP/CSS file. |
| [`gramsetu.png`](file:///c:/xampp/htdocs/vgmp/gramsetu.png), [`gramsetu-removebg-preview.png`](file:///c:/xampp/htdocs/vgmp/gramsetu-removebg-preview.png) | Unused | Extra logo files not referenced in active PHP files. |
| [`db.php`](file:///c:/xampp/htdocs/vgmp/db.php), [`test.php`](file:///c:/xampp/htdocs/vgmp/test.php) | Empty (0 bytes) | Placeholder files. |
| [`test1.php`](file:///c:/xampp/htdocs/vgmp/test1.php), [`test2.php`](file:///c:/xampp/htdocs/vgmp/test2.php), [`test.css`](file:///c:/xampp/htdocs/vgmp/test.css) | Prototypes | Early static prototypes for video banner and track page. |

---

## 3. Audit Categorization

### A. Confirmed Implemented Features
- Public landing page with animated HTML5 Canvas background (`#waveCanvas`), responsive mobile drawer, 4-step workflow, 6 feature items, 8 category cards, animated count-up stats section + ticker strip, 7-item FAQ accordion, and footer.
- Google Translate multi-language switching (`en`, `te`, `hi`) persisted in `localStorage` (`language`), with initial modal on `index.php`.
- Complaint registration with active village dropdown (`villages` + `panchayaths`), ward number, 7 categories, title, 1000-char description with counter, 10-digit mobile validation, drag-and-drop/browse upload of up to 6 JPG/JPEG/PNG images, and Web Speech API (`en-IN`) voice-to-text dictation.
- Automatic `panchayath_id` assignment from `villages` table and `GS-2026-XXXXX` complaint ID generation.
- Complaint tracking by `complaint_id` + `mobile` with status badge, progress percentage (`25%`/`50%`/`75%`/`100%`), single-step timeline, and detail grid.
- Citizen complaint ID lookup by `mobile` returning list of `{ complaint_id, title, status, created_at }`.
- Panchayat login (`panchayaths` table, `status = 'active'`, `password_verify` + plaintext fallback) with session auth.
- Village-scoped Panchayat Dashboard (`total`, `Submitted`, `Verified`, `In Progress`, `Resolved`, `Rejected` counts, pending alert banner, CSS bar chart, recent 10 complaints).
- Village-scoped Admin Complaints listing with status filters and search (`name`, `complaint_id`, `mobile`).
- Admin Complaint Detail page with status update (`Submitted`, `Verified`, `In Progress`, `Resolved`, `Rejected`).

### B. Partially Implemented / Defective in Original PHP
1. **Success Modal on `complaint.php`:** `form.js` populates `#complaintIdDisplay` and sets `#successModal` to `display: flex`, but `#successModal` HTML is commented out in `complaint.php` (lines 438–449).
2. **Missing `banner.js`:** `complaint.php` line 286 loads `banner.js`, which does not exist in the repository.
3. **Language Modal JS on `complaint.php`:** `complaint.php` lines 180–216 reference `#languageModal`, which only exists in `index.php` (causes `TypeError` when `language` is set in `localStorage` or `setLanguage()` is called on `complaint.php`). Duplicate Google Translate scripts also appear in `index.php` (lines 1052–1218).
4. **Evidence Image Display (`track.php` & `admin/view_complaint.php`):** `action/submit_complaint.php` stores `image_path` as a JSON array string (e.g. `["uploads/images/123.jpg"]`), but `track.php` (line 647) and `admin/view_complaint.php` (line 348) render `<a href="${complaint.image_path}">` directly as a single URL instead of parsing the JSON array (and `admin/view_complaint.php` lacks `../` prefix).
5. **Village Name on Detail/Track Views:** `submit_complaint.php` inserts `village_id` and `panchayath_id`, while `track.php` (line 542) and `admin/view_complaint.php` (line 316) display `$complaint['village']` without joining `villages`.
6. **Remarks on `admin/view_complaint.php`:** Line 31 reads `$_POST['remarks']`, but the form has no `remarks` field and the `UPDATE` query only updates `status`.
7. **Authorization Scoping on `admin/view_complaint.php`:** Line 18 queries `WHERE id = $complaint_id` without checking whether the complaint belongs to the logged-in Panchayat's villages.
8. **Feedback & Star Rating on `track.php`:** Interactive UI only; clicking Submit shows a browser `alert("Thank you for your feedback!")` without saving to MySQL.
9. **Placeholder Links on `index.php`:** Category cards, "File a Custom Complaint", "Contact Support", and footer links have `href="#"` or no click handler.
10. **Category List Mismatch:** `index.php` displays 8 categories (`Street Lights`, `Roads`, `Water Supply`, `Sanitation`, `Environment`, `Electricity`, `Public Infrastructure`, `Animal Issues`), whereas `complaint.php` `<select>` has 7 options (`Road Damage`, `Street Light`, `Drainage Issue`, `Water Supply`, `Garbage Collection`, `Public Safety`, `Other`).
11. **SQL Injection & Unprepared Queries in PHP:** `submit_complaint.php`, `dashboard.php`, `complaints.php`, `view_complaint.php`, and `admin/login.php` interpolate variables directly into SQL strings (`mysqli_real_escape_string` or `intval`), whereas `action/find_complaints.php`, `action/track_com.php`, and `action/pan_log.php` use prepared statements.

### C. Mentioned in Copy / FAQs Only — NOT Implemented in Code
- **District → Mandal → Village cascading selection** (not present; only flat `villages` dropdown exists).
- **Audio recording & upload** (`uploads/audio/` is empty; `complaint.php` only uses browser Web Speech API dictation to text, not 60-second audio recording mentioned in FAQ).
- **OTP verification** (mentioned in FAQ; no OTP flow or backend exists).
- **SMS & Email notifications** (mentioned in `track.php` FAQ; no integration exists).
- **Complaint editing within 24 hours** (mentioned in `track.php` FAQ; no edit route/UI exists).
- **Map / GPS location pinning** (mentioned in `index.php` "Why GramSetu" and FAQ; no map exists).
- **Live DB-driven homepage statistics & ticker** (`index.php` stats `15,248`, `12,731`, `83%`, `145` and ticker items are static HTML).
- **Multi-stage status history timeline** (`action/track_com.php` constructs a 1-item array from `complaints.status`; no `complaint_updates` table is queried).
- **Citizen accounts / push notifications** (mentioned in FAQ as optional; no citizen auth exists).

### D. Missing or Inaccessible Information
1. **MySQL Database Schema & Seed Data:** No `.sql` dump exists in the repository, and local MySQL (`localhost:3306`) returned `ERROR 2002 (HY000): Can't connect to MySQL server on 'localhost' (10013)` from the workspace shell. Exact column types, lengths, indexes, foreign keys, `NULL` constraints, `AUTO_INCREMENT` definitions, and existing seed records (`panchayaths`, `villages`, `complaints`, `admins`) cannot be verified until a schema/dump is provided.
2. **Missing `banner.js`:** Referenced in `complaint.php` (line 286) and `test1.php` (line 122), not present in the repository.
3. **Production `.env` / Hosting Requirements:** `include/config.php` contains commented-out InfinityFree credentials; target deployment/MySQL host details are needed before production deployment.

