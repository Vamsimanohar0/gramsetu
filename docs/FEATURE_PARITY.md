# GramSetu (VGMP) — Feature Parity Report

**Verification Legend:**
- **Completed and tested** — Implemented and verified by automated or live execution after the final edit.
- **Implemented but not tested** — Code written and compiled/built, awaiting live MySQL or interactive browser verification.
- **Partially implemented** — Present in original PHP with incomplete wiring or documented UI-only behavior.
- **Not implemented** — Mentioned in PHP copy/FAQs or unused files only; not implemented in original PHP codebase.

---

## Feature Parity Matrix

| Feature / Workflow | Original PHP Status (`f326545`) | Migrated Status | Verification & Notes |
|---|---|---|---|
| Landing Page (`/` — Hero `#waveCanvas`, HIW, Why, Categories, Stats, FAQ, Footer) | Implemented | **Implemented but not tested** | Exact HTML/CSS/animations ported to `HomePage.jsx`; CSS media-query count (`12/12`) & Vite build verified; interactive browser check pending. |
| Responsive Mobile Drawer Navbar | Implemented | **Implemented but not tested** | Implemented in `Navbar.jsx` with fixed brand/link alignment and `.mobile-menu` / `.mobile-overlay`. |
| Language Selection Modal & Switcher (`en`, `te`, `hi` via Google Translate) | Implemented (duplicate scripts & missing modal on `complaint.php`) | **Implemented but not tested** | Centralized in `LanguageContext.jsx` + `LanguageModal.jsx`; requires online browser test against `translate.google.com`. |
| Active Villages Dropdown (`GET /api/villages`) | Implemented (`complaint.php`) | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Tested in `api.test.js` (mocked pool); `live.test.js` provided for local MySQL run. |
| Complaint Registration (`POST /api/complaints`) + Validation + `panchayath_id` mapping + `GS-YYYY-XXXXX` ID + Shared Rate Limit | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Transaction, validation, ID generation, and `express-rate-limit` (`10 / 15m` IP) tested in `api.test.js`. |
| Multi-image Upload (up to 6 JPG/JPEG/PNG) + Magic-Byte Content Validation | Implemented (extension/MIME only) | **Completed and tested** (mocked DB + real disk upload) / **Implemented but not tested** (browser UI) | `api.test.js` verified real JPEG acceptance, cleanup, and rejection of spoofed `.jpg` HTML payloads via binary magic-byte inspection. |
| Private Evidence Access (`GET /api/complaints/evidence/...`, `GET /api/admin/complaints/:id/evidence/:filename`) | Public static files in PHP | **Completed and tested** (mocked DB + real disk file) / **Implemented but not tested** (live MySQL + browser) | `app.js` no longer serves `/uploads` publicly (`404`); `api.test.js` verified short-lived signed citizen tokens (`403` on tampered) and Panchayat-scoped admin cookie access (`401`/`404`/`200`). |
| Web Speech API Voice-to-Text Dictation (`en-IN`) | Implemented (`form.js`) | **Implemented but not tested** | Ported to `ComplaintPage.jsx`; requires live browser microphone check. |
| Complaint Success Modal (`#successModal`) | Commented out in `complaint.php`, active in `form.js` | **Implemented but not tested** | Restored in `ComplaintPage.jsx` using original `.success-modal` CSS. |
| Track Complaint by ID + Mobile (`POST /api/complaints/track`) + PII Masking + Shared Rate Limit | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | `api.test.js` verified input validation, PII masking (`name`, `mobile`), removal of internal DB IDs, signed evidence URLs, and `30 / 15m` IP rate limit. |
| Lookup Complaint IDs by Mobile (`POST /api/complaints/lookup`) + Enumeration Protection | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | `api.test.js` verified masked titles, 10-digit `mobile` validation, and dual per-mobile (`5 / 15m`) + per-IP (`10 / 15m`) rate limits. |
| Shared-Store Rate Limiter (`MySQLRateLimitStore` + `rate_limits` table) | Not in PHP | **Completed and tested** (mocked DB SQL assertions) / **Implemented but not tested** (live MySQL) | `api.test.js` verified `INSERT INTO rate_limits ... ON DUPLICATE KEY UPDATE` and `SELECT hits, reset_at`; falls back safely to memory in tests or if table is absent. |
| Star Rating & Feedback Submission (`track.php`) | UI-only `alert()` in PHP | **Partially implemented** | Preserved exact UI and `alert()` behavior; no DB persistence added because no `feedback` table exists in `vgmp`. |
| Panchayat Login (`POST /api/admin/login`) — `HttpOnly` Cookie Only + Dev-Only Demo Accounts + Prod Default Password Block | Implemented (`panchayaths`, `password_verify` + plaintext fallback) | **Completed and tested** (mocked DB + prod build check) / **Implemented but not tested** (live MySQL) | `api.test.js` verified `HttpOnly; SameSite=Lax` cookie, zero `token` in JSON, `Bearer` rejection, logout clear, and `NODE_ENV=production` rejection of plaintext & default passwords (`'admin'`). `client/dist` grep confirmed `0` demo credentials in production build. |
| Legacy Complaint Migration, Manual Review Workflow & Batch-Scoped Rollback | Not in PHP | **Completed and tested** (mocked DB logic) / **Implemented but not tested** (live MySQL backup copy) | `api.test.js` verified `classifyLegacyComplaints`, `buildManualReviewManifest`, `validateManualAssignments`, and batch-scoped `rollbackBatch`. |
| Protected Admin Routes & Panchayat Isolation (incl. Legacy Complaints) | Implemented on `dashboard.php` & `complaints.php`; missing scoping on `view_complaint.php` | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | `api.test.js` verified `(panchayath_id = ? OR village_id IN (...))` scoping and `404` isolation across Panchayats. |
| Admin Dashboard Stats, Alert Banner, CSS Chart, Recent 10 | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Backend aggregation tested in `api.test.js`; React chart/table built in `AdminDashboardPage.jsx`. |
| Admin Complaints List (Status Filters + Search) | Implemented | **Implemented but not tested** | Implemented in `complaintService.getAdminComplaints` and `AdminComplaintsPage.jsx`. |
| Admin View Complaint & Status Update (`PATCH /api/admin/complaints/:id/status`) | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Tested in `api.test.js` with Panchayat isolation check; supports all 6 `complaints.status` enum values. |
| District → Mandal → Village Cascading Dropdown | Not in PHP | **Not implemented** | Not present in original PHP or `vgmp` schema. |
| 60-Second Audio Recording & Upload | Mentioned in FAQ only (`uploads/audio/` empty) | **Not implemented** | Not implemented in original PHP (`complaint.php` only had Web Speech API dictation). |
| OTP Verification / SMS / Email / 24h Edit / GPS Map Pinning | Mentioned in FAQ/copy only | **Not implemented** | No implementation or tables exist in original PHP/MySQL. |
| Legacy `admins` Table Login (`action/pan_log.php`) | Unused/broken in PHP | **Not implemented** | `admins` lacks `panchayat_id`/`name`; active login uses `panchayaths`. |

---

## Automated Test & Verification Summary

### Verified in This Environment (Mocked DB + Real Express/Multer/FS + Vite Build)
- **Backend (`cd server && npm test`):** **12/12** subtests passed in [`server/tests/api.test.js`](file:///c:/xampp/htdocs/vgmp/server/tests/api.test.js) (`0` failures, `0` express-rate-limit validation warnings).
- **Frontend Production Build (`cd client && npm run build`):** Built cleanly (`54` modules transformed, `0` warnings/errors); `client/dist/assets/*.js` scan confirmed `0` matches for demo credentials (`Demo Credentials`, `kondapalli`, `narasaraopet`).
- **CSS Media-Query & Asset Parity Check:** Compared `client/src/styles/*` and `client/public/*` directly against Git commit `f326545`.

### Not Executed in This Environment (Requires Local MySQL 8.4 & Browser)
- **Live MySQL Backup-Copy Migration & Live Integration Tests (`npm run test:live`):** Database TCP port `127.0.0.1:3306` is unreachable from inside the sandbox (`WSAEACCES 10013`), so testing migrations against a backed-up copy of the live `vgmp` database and running [`server/tests/live.test.js`](file:///c:/xampp/htdocs/vgmp/server/tests/live.test.js) must be run locally.
- **Interactive Desktop & Mobile Visual Browser Comparison:** Requires starting `server/` and `client/` locally alongside XAMPP Apache/PHP (`f326545`) or reviewing side-by-side in a local browser.
