# GramSetu (VGMP) — UI & Behavior Comparison Report

## 1. Visual & CSS Preservation Strategy

To keep **zero visual regressions** and **zero cross-page CSS bleed** inside the React SPA:
- Original stylesheets ([`css/style.css`](file:///c:/xampp/htdocs/vgmp/css/style.css), [`css/complaint.css`](file:///c:/xampp/htdocs/vgmp/css/complaint.css), [`css/track.css`](file:///c:/xampp/htdocs/vgmp/css/track.css)) and the exact inline `<style>` blocks from `admin/login.php`, `admin/dashboard.php`, `admin/complaints.php`, and `admin/view_complaint.php` were scoped under dedicated route wrapper classes (`.page-home`, `.page-complaint`, `.page-track`, `.page-admin-login`, `.page-admin-dashboard`, `.page-admin-complaints`, `.page-admin-view`) in `client/src/styles/`.
- Original assets [`gramsetu-logo.png`](file:///c:/xampp/htdocs/vgmp/gramsetu-logo.png) and [`banner.mp4`](file:///c:/xampp/htdocs/vgmp/banner.mp4) were copied verbatim to `client/public/`.
- Original typography (`Inter` Google Font) and icon set (Font Awesome 6.0.0-beta3) were preserved in `client/index.html`.

---

## 2. Page-by-Page Parity & Documented Technical Fixes

| Page | Visual Match Strategy | Documented Technical Fixes vs. Original PHP |
|---|---|---|
| **Home (`/`)** | Identical 16-layer `#waveCanvas`, floating glass navbar, HIW 4-step track with SVG arrows, Why GramSetu phone illustration, 8-card category grid, count-up + 3D-tilt stats + ticker, 7-item FAQ accordion, footer, and language modal. | Removed duplicate Google Translate script blocks from `index.php`; replaced `<a href="#">` on "File a Custom Complaint" and footer quick links with React Router `<Link>` routes (`/complaint`, `/track`, `/admin/login`). |
| **Register Complaint (`/complaint`)** | Identical `banner.mp4` video banner, 2-column Step 1 & Step 2 glass cards, Web Speech API mic button, drag-and-drop image dropzone with previews, review checkbox, and bottom stats panel. | 1) Removed 404 `<script src="banner.js">` reference (file did not exist). 2) Restored `#successModal` markup using the existing `.success-modal` styles in `complaint.css` (was commented out in `complaint.php` despite `form.js` targeting it). 3) Prevented `#languageModal` null-reference JS error present in `complaint.php`. |
| **Track Complaint (`/track`)** | Identical `.wave-bg` 3-layer CSS waves, two-column `.tracking-wrapper`, detail grid, progress bar, timeline, evidence gallery, star rating, FAQ, and footer. | 1) Fixed `image_path` rendering to parse JSON arrays of up to 6 images (`["uploads/images/..."]`) and fetch via short-lived signed citizen evidence URLs (`/api/complaints/evidence/...?token=...`). 2) Displays `COALESCE(v.name, c.village)` so both legacy (`id` 1–9) and `village_id`-linked (`id` 10–12) complaints show their village name. 3) Masks citizen PII (`name`, `mobile`) on tracking and masks `title` on mobile lookup to prevent enumeration. |
| **Panchayat Login (`/admin/login`)** | Identical navbar + centered glass card on dark `#0a0f1e -> #1a2a3a -> #0f1a2e` gradient with password visibility toggle and dev-only demo credentials box. | 1) Demo credentials box (`kondapalli / admin`, etc.) is gated behind `import.meta.env.DEV` so it is omitted from production builds. 2) Authentication uses `HttpOnly` cookies exclusively with no JWT stored in `localStorage`. |
| **Admin Dashboard (`/admin/dashboard`)** | Identical fixed `#sidebar` with avatar, village counts, nav badges, urgent pending banner, 4 stat cards, 5-bar CSS status chart, and recent 10 complaints table. | Added responsive outside-click close, full-viewport dark `#0a0f1e` wrapper (`min-height: 100vh`), and SPA navigation without full page reloads. |
| **Admin Complaints (`/admin/complaints`)** | Identical header, back link, search box, 6 status filter pills, and dark table container. | Synced search & status filters cleanly with React Router URL search params (`?status=&search=`), and enforced full-viewport `#0a0f1e` background with `overflow: auto`. |
| **Admin View Complaint (`/admin/complaints/:id`)** | Identical detail grid, evidence card, and status update card. | 1) Enforced Panchayat village scoping (`panchayath_id` or `village_id`) on backend GET/PATCH so officials cannot view/modify another Panchayat's complaint. 2) Fixed multi-image URL resolution (`resolveUploadUrl`) and village name display (`COALESCE`). 3) Included `'Assigned'` in status options to match the MySQL `complaints.status` enum. |

---

## 3. Responsive & Future Capacitor Compatibility
- All responsive breakpoints (`960px`, `900px`, `768px`, `680px`, `540px`, `480px`, `420px`) from the original CSS files are preserved intact, and navbar logo/text alignment (`Navbar.jsx`) was stabilized without negative-margin overlaps.
- API base URL is configurable via `VITE_API_BASE_URL`, and authentication uses `HttpOnly` cookies (`credentials: 'include'`) without storing JWTs in `localStorage`.

---

## 4. Browser Visual Verification Checklist (To Run Locally)
Because the local XAMPP Apache/MySQL server could not be reached from the sandbox, run the following visual & responsive checks locally after starting `server/` and `client/`:
1. Desktop (`1440×900`): Compare `http://localhost/vgmp/index.php` vs `http://localhost:5173/` (hero canvas, navbar alignment, HIW arrows, stats 3D tilt, FAQ accordion, footer).
2. Mobile (`375×812`): Compare hamburger drawer, stacked cards, `complaint.php` single-column form grid, `track.php` stacked lookup cards, and `admin/dashboard.php` collapsible sidebar.
3. End-to-end flows: Submit complaint with image → Track by ID + Mobile → Lookup by Mobile → Login as `kondapalli` / `admin` → Update status → Re-track to verify persistence in MySQL.

