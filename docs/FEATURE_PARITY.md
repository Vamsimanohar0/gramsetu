# GramSetu (VGMP) — Feature Parity Report

**Verification Legend:**
- **Completed and tested** — Implemented and verified by automated or live execution after the final edit.
- **Implemented but not tested** — Code written and compiled/built, awaiting live MySQL or interactive browser end-to-end verification.
- **Partially implemented** — Present in original PHP with incomplete wiring or documented UI-only behavior.
- **Not implemented** — Mentioned in PHP copy/FAQs or unused files only; not implemented in original PHP codebase.

---

## Feature Parity Matrix

| Feature / Workflow | Original PHP Status | Migrated Status | Verification & Notes |
|---|---|---|---|
| Landing Page (`/` — Hero `#waveCanvas`, HIW, Why, Categories, Stats, FAQ, Footer) | Implemented | **Implemented but not tested** | Exact HTML/CSS/animations ported to `HomePage.jsx`; Vite production build passes (`npm run build`); interactive visual check in browser pending. |
| Responsive Mobile Drawer Navbar | Implemented | **Implemented but not tested** | Implemented in `Navbar.jsx` with fixed brand/link alignment and `.mobile-menu` / `.mobile-overlay`. |
| Language Selection Modal & Switcher (`en`, `te`, `hi` via Google Translate) | Implemented (duplicate scripts & missing modal on `complaint.php`) | **Implemented but not tested** | Centralized in `LanguageContext.jsx` + `LanguageModal.jsx`; requires online browser test against `translate.google.com`. |
| Active Villages Dropdown (`GET /api/villages`) | Implemented (`complaint.php`) | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Tested in `api.test.js` (mocked pool); `live.test.js` provided for local MySQL run. |
| Complaint Registration (`POST /api/complaints`) + Validation + `panchayath_id` mapping + `GS-YYYY-XXXXX` ID + Rate Limit | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Transaction, validation, ID generation, and `10 / 15m` IP rate limit tested in `api.test.js`. |
| Multi-image Upload (up to 6 JPG/JPEG/PNG) + Magic-Byte Content Validation | Implemented (extension/MIME only) | **Completed and tested** (mocked DB + real disk upload) / **Implemented but not tested** (browser UI) | `api.test.js` verified real JPEG acceptance, cleanup, and rejection of spoofed `.jpg` HTML payloads via binary magic-byte inspection. |
| Web Speech API Voice-to-Text Dictation (`en-IN`) | Implemented (`form.js`) | **Implemented but not tested** | Ported to `ComplaintPage.jsx`; requires live browser microphone check. |
| Complaint Success Modal (`#successModal`) | Commented out in `complaint.php`, active in `form.js` | **Implemented but not tested** | Restored in `ComplaintPage.jsx` using original `.success-modal` CSS. |
| Track Complaint by ID + Mobile (`POST /api/complaints/track`) + Rate Limit | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Input validation (`complaint_id` + 10-digit `mobile`), `COALESCE(v.name, c.village)`, `image_path` JSON array parsing, and `30 / 15m` IP rate limit tested in `api.test.js`. |
| Lookup Complaint IDs by Mobile (`POST /api/complaints/lookup`) + Rate Limit | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | 10-digit `mobile` validation and `30 / 15m` IP rate limit tested in `api.test.js`; `TrackPage.jsx` displays validation error cleanly. |
| Evidence Gallery Image & Audio Display | Partially broken in PHP (`image_path` treated as single raw string) | **Implemented but not tested** | Fixed in `complaintUtils.parseImagePaths` + `TrackPage.jsx` + `AdminViewComplaintPage.jsx`. |
| Star Rating & Feedback Submission (`track.php`) | UI-only `alert()` in PHP | **Partially implemented** | Preserved exact UI and `alert()` behavior; no DB persistence added because no `feedback` table exists in `vgmp`. |
| Panchayat Login (`POST /api/admin/login`) — `HttpOnly` Cookie Only + Dev-Only Demo Box | Implemented (`panchayaths`, `password_verify` + plaintext fallback) | **Completed and tested** (mocked DB + prod build check) / **Implemented but not tested** (live MySQL) | `api.test.js` verified `HttpOnly; SameSite=Lax` cookie, zero `token` in JSON, rejection of `Bearer` headers, cookie clearing on logout, and safe `503` DB error. `client/dist` grep confirmed `0` demo credential strings in production build. |
| Protected Admin Routes & Panchayat Isolation (incl. Legacy Complaints) | Implemented on `dashboard.php` & `complaints.php`; missing scoping on `view_complaint.php` & legacy `panchayath_id` | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | `api.test.js` verified `(panchayath_id = ? OR village_id IN (...))` scoping, legacy complaint classification (`classifyLegacyComplaints`, including ambiguous-village skipping), and `404` isolation across Panchayats. |
| Admin Dashboard Stats, Alert Banner, CSS Chart, Recent 10 | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Backend aggregation tested in `api.test.js`; React chart/table built in `AdminDashboardPage.jsx`. |
| Admin Complaints List (Status Filters + Search) | Implemented | **Implemented but not tested** | Implemented in `complaintService.getAdminComplaints` and `AdminComplaintsPage.jsx`. |
| Admin View Complaint & Status Update (`PATCH /api/admin/complaints/:id/status`) | Implemented | **Completed and tested** (mocked DB) / **Implemented but not tested** (live MySQL) | Tested in `api.test.js` with Panchayat isolation check; supports all 6 `complaints.status` enum values. |
| District → Mandal → Village Cascading Dropdown | Not in PHP | **Not implemented** | Not present in original PHP or `vgmp` schema. |
| 60-Second Audio Recording & Upload | Mentioned in FAQ only (`uploads/audio/` empty) | **Not implemented** | Not implemented in original PHP (`complaint.php` only had Web Speech API dictation). |
| OTP Verification / SMS / Email / 24h Edit / GPS Map Pinning | Mentioned in FAQ/copy only | **Not implemented** | No implementation or tables exist in original PHP/MySQL. |
| Legacy `admins` Table Login (`action/pan_log.php`) | Unused/broken in PHP | **Not implemented** | `admins` lacks `panchayat_id`/`name`; active login uses `panchayaths`. |

---

## Automated Test Results Summary (Executed After Final Code Edits)

### Executed & Passed in Sandbox (Mocked DB + Real Express/Multer/FS + Vite Build)
- **Backend (`cd server && npm test`):** **13/13** subtests passed in [`server/tests/api.test.js`](file:///c:/xampp/htdocs/vgmp/server/tests/api.test.js):
  - Validators (create, track, mobile lookup, status update)
  - `parseImagePaths`, `generateComplaintId`, bcrypt/`$2y$` + legacy plaintext `verifyPassword`
  - Legacy complaint classification (`classifyLegacyComplaints` unambiguous vs ambiguous vs unmatched)
  - Real JPEG/PNG magic-byte inspection (`detectImageTypeFromBuffer`) + disk upload & spoofed `.jpg` rejection/cleanup
  - Public `/test`, `/api/villages`, `/api/complaints`, `/api/complaints/track`, `/api/complaints/lookup` + `429` rate limits
  - `HttpOnly` cookie-only auth (no JWT in JSON, `Bearer` rejected), logout cookie clear, Panchayat isolation, safe `503` DB error
- **Frontend (`cd client && npm run build`):** Built cleanly (`54` modules transformed, `0` warnings/errors). Verified `0` occurrences of demo credentials (`Demo Credentials`, `kondapalli`, `narasaraopet`) in `client/dist/assets/*.js`.

### Not Executed in Sandbox (Requires Local MySQL 8.4 / Browser)
- **Live MySQL Tests (`cd server && npm run test:live`):** Implemented in [`server/tests/live.test.js`](file:///c:/xampp/htdocs/vgmp/server/tests/live.test.js); **not executed** here because sandbox restricts loopback TCP connections to `127.0.0.1:3306`.
- **Legacy DB Migration (`node scripts/migrateLegacyComplaints.js` / `002_map_legacy_complaints.sql`):** Prepared and unit-tested (`classifyLegacyComplaints`), awaiting execution against your live `vgmp` database after `mysqldump` backup.
