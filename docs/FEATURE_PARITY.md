# GramSetu (VGMP) — Feature Parity Report

**Verification Legend:**
- **Completed and tested** — Implemented and verified by automated or live execution after final edit.
- **Implemented but not tested** — Code written and compiled/built, awaiting live MySQL + browser end-to-end verification in user's XAMPP/MySQL environment.
- **Partially implemented** — Present in original PHP with incomplete wiring or documented behavioral fix.
- **Not implemented** — Mentioned in PHP copy/FAQs or unused files only; not implemented in original PHP codebase.
- **Requires clarification** — Needs explicit user preference if future expansion is desired.

---

## Feature Parity Matrix

| Feature / Workflow | Original PHP Status | Migrated Status | Verification & Notes |
|---|---|---|---|
| Landing Page (`/` — Hero `#waveCanvas`, HIW, Why, Categories, Stats, FAQ, Footer) | Implemented | **Implemented but not tested** | Exact HTML/CSS/animations ported to `HomePage.jsx`; Vite production build verified (`npm run build`); visual check in live browser pending. |
| Responsive Mobile Drawer Navbar | Implemented | **Implemented but not tested** | Implemented in `Navbar.jsx` with original `.mobile-menu` / `.mobile-overlay` classes. |
| Language Selection Modal & Switcher (`en`, `te`, `hi` via Google Translate) | Implemented (with duplicate scripts & missing modal on `complaint.php`) | **Implemented but not tested** | Centralized in `LanguageContext.jsx` + `LanguageModal.jsx`; requires online browser test against `translate.google.com`. |
| Active Villages Dropdown (`GET /api/villages`) | Implemented (`complaint.php`) | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Tested via `api.test.js` (`GET /api/villages`); live MySQL query pending local MySQL access. |
| Complaint Registration (`POST /api/complaints`) + Validation + `panchayath_id` mapping + `GS-YYYY-XXXXX` ID | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Transaction, validation, and ID generation verified in `api.test.js`; live MySQL insert pending. |
| Multi-image Upload (up to 6 JPG/JPEG/PNG) & Previews | Implemented | **Implemented but not tested** | `multer` validation + rollback cleanup in `uploadMiddleware.js`; browser upload UI in `ComplaintPage.jsx`; live file upload test pending. |
| Web Speech API Voice-to-Text Dictation (`en-IN`) | Implemented (`form.js`) | **Implemented but not tested** | Ported to `ComplaintPage.jsx` (`SpeechRecognition` / `webkitSpeechRecognition`); requires live browser mic check. |
| Complaint Success Modal (`#successModal`) | Commented out in `complaint.php`, active in `form.js` | **Implemented but not tested** | Restored in `ComplaintPage.jsx` using original `.success-modal` CSS. |
| Track Complaint by ID + Mobile (`POST /api/complaints/track`) | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Tested in `api.test.js` including `COALESCE(v.name, c.village)` and `image_path` JSON array parsing. |
| Lookup Complaint IDs by Mobile (`POST /api/complaints/lookup`) | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Tested in `api.test.js`; clicking a result card in `TrackPage.jsx` also pre-fills the track form. |
| Evidence Gallery Image & Audio Display | Partially broken in PHP (`image_path` treated as raw single string) | **Implemented but not tested** | Fixed in `complaintUtils.parseImagePaths` + `TrackPage.jsx` + `AdminViewComplaintPage.jsx` to parse JSON arrays and resolve via `VITE_API_BASE_URL`. |
| Star Rating & Feedback Submission (`track.php`) | UI-only `alert()` in PHP | **Partially implemented** | Preserved exact UI and `alert()` behavior; no DB persistence added because no `feedback` table exists in `vgmp`. |
| Panchayat Login (`POST /api/admin/login`) | Implemented (`panchayaths`, `password_verify` + plaintext fallback) | **Completed and tested** (auth logic) / **Implemented but not tested** (live MySQL) | Password helper tested for both plaintext `'admin'` and PHP `$2y$` bcrypt hashes in `api.test.js`. Demo hint updated from `admin123` to `admin` to match actual `vgmp` DB dump. |
| Protected Admin Routes & Panchayat Scoping | Implemented on `dashboard.php` & `complaints.php`; missing scoping on `view_complaint.php` | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Verified `401` on unauthenticated `/api/admin/dashboard` and `404` on cross-Panchayat complaint IDs in `api.test.js`. |
| Admin Dashboard Stats, Alert Banner, CSS Chart, Recent 10 | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Backend aggregation tested in `api.test.js`; React chart/table built in `AdminDashboardPage.jsx`. |
| Admin Complaints List (Status Filters + Search) | Implemented | **Implemented but not tested** | Implemented in `complaintService.getAdminComplaints` and `AdminComplaintsPage.jsx`. |
| Admin View Complaint & Status Update (`PATCH /api/admin/complaints/:id/status`) | Implemented (`status` only; `remarks` unused in PHP) | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Tested in `api.test.js`; supports all 6 `complaints.status` enum values including `'Assigned'`. |
| District → Mandal → Village Cascading Dropdown | Not in PHP | **Not implemented** | Not present in original PHP or `vgmp` schema (`villages` maps directly to `panchayaths`). |
| 60-Second Audio Recording & Upload | Mentioned in FAQ only (`uploads/audio/` empty) | **Not implemented** | Not implemented in original PHP (`complaint.php` only had Web Speech API dictation). |
| OTP Verification / SMS / Email / 24h Edit / GPS Map Pinning | Mentioned in FAQ/copy only | **Not implemented** | No implementation or tables exist in original PHP/MySQL. |
| Legacy `admins` Table Login (`action/pan_log.php`) | Unused/broken in PHP | **Not implemented** | `admins` schema (`id, username, password`) lacks `panchayat_id`/`name`; `admin/login.php` uses `panchayaths`. |

---

## Automated Test Results Summary (Executed After Final Edits)

- **Backend (`cd server && npm test`):** `10/10` subtests passed (`tests/api.test.js` with mocked `mysql2` pool).
- **Frontend (`cd client && npm run build`):** Built cleanly (results reported after command completion).
- **Pending Live Environment Verification:** Connecting Express (`server/`) directly to XAMPP MySQL (`vgmp`) and running interactive browser visual/responsive checks against PHP (`http://localhost/vgmp`) vs React (`http://localhost:5173`).

