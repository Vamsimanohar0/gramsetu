# GramSetu (VGMP) — Phased Migration Plan

**Objective:** Migrate GramSetu (`c:\xampp\htdocs\vgmp`) from PHP + MySQL to React.js (Vite) + Node.js (Express.js) + MySQL (`mysql2`) while preserving the exact visual design, CSS, assets, workflows, and existing MySQL data.

**Branch Strategy:** `main` remains untouched as the PHP reference; all migration work happens on the `migration` branch inside a clean workspace structure (`client/`, `server/`, `database/`, `docs/`).

---

## Target Directory Architecture

```text
vgmp/ (migration branch)
├── client/                     # React + Vite frontend
│   ├── public/                 # banner.mp4, gramsetu-logo.png, static assets
│   └── src/
│       ├── components/         # Navbar, MobileMenu, LanguageModal, WaveCanvas, WaveBg, StatusBadge, etc.
│       ├── context/            # AuthContext, LanguageContext
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── ComplaintPage.jsx
│       │   ├── TrackPage.jsx
│       │   └── admin/
│       │       ├── AdminLoginPage.jsx
│       │       ├── AdminDashboardPage.jsx
│       │       ├── AdminComplaintsPage.jsx
│       │       └── AdminViewComplaintPage.jsx
│       ├── services/           # api.js (VITE_API_BASE_URL)
│       ├── styles/             # Original style.css, complaint.css, track.css, admin scoped styles
│       ├── App.jsx
│       └── main.jsx
├── server/                     # Node.js + Express REST API
│   ├── config/                 # db.js (mysql2 pool), env.js
│   ├── controllers/            # publicController, complaintController, authController, adminController
│   ├── middleware/             # authMiddleware (JWT/cookie), uploadMiddleware (multer), errorHandler
│   ├── routes/                 # complaints.routes.js, villages.routes.js, auth.routes.js, admin.routes.js
│   ├── validators/             # Request validation
│   ├── utils/                  # complaintId generator, path helpers
│   ├── uploads/images/         # Preserved/migrated uploaded evidence images
│   ├── app.js
│   └── server.js
├── database/
│   ├── schema.sql              # Verified CREATE TABLE statements matching existing MySQL DB
│   ├── seed.sql                # Reference data (panchayaths, villages)
│   └── migrations/             # Non-destructive ALTER/migration scripts if approved
└── docs/                       # Audit, API docs, Feature Parity, UI Comparison
```

---

## Planned REST API Surface (Based Strictly on Existing Features)

### Public Endpoints
1. `GET /api/villages` — Returns active villages joined with `panchayath_name` (replaces inline PHP query in `complaint.php`).
2. `POST /api/complaints` — `multipart/form-data` with `name`, `mobile`, `village_id`, `ward_no`, `category`, `title`, `description`, `images[]` (max 6 JPG/JPEG/PNG). Looks up `panchayath_id`, generates unique `GS-2026-XXXXX`, inserts `complaints` with `status = 'Submitted'` (replaces `action/submit_complaint.php`).
3. `POST /api/complaints/track` — Body `{ complaint_id, mobile }`. Returns `{ status, complaint, updates }` with joined `village_name` (replaces `action/track_com.php`).
4. `POST /api/complaints/lookup` — Body `{ mobile }`. Returns array of `{ complaint_id, title, status, created_at }` ordered by `created_at DESC` (replaces `action/find_complaints.php`).

### Panchayat Admin Endpoints
5. `POST /api/admin/login` — Body `{ username, password }`. Verifies active `panchayaths` row (`bcrypt`/PHP `$2y$` compatible hash verification, plus documented legacy plaintext migration path), sets HTTP-only cookie / JWT token (replaces `admin/login.php`).
6. `POST /api/admin/logout` — Clears auth cookie/session (replaces `admin/logout.php`).
7. `GET /api/admin/me` — Returns current authenticated Panchayat profile and active villages list.
8. `GET /api/admin/dashboard` — Protected. Returns village-scoped stats (`total`, `Submitted`, `Verified`, `In Progress`, `Resolved`, `Rejected`), `villages`, and recent 10 complaints (replaces `admin/dashboard.php`).
9. `GET /api/admin/complaints?status=&search=` — Protected. Returns village-scoped complaints list with status and search filters (replaces `admin/complaints.php`).
10. `GET /api/admin/complaints/:id` — Protected. Returns single complaint details scoped to the logged-in Panchayat's villages (replaces `admin/view_complaint.php` GET).
11. `PATCH /api/admin/complaints/:id/status` — Protected. Validates allowed statuses (`Submitted`, `Verified`, `In Progress`, `Resolved`, `Rejected`), updates `complaints.status` scoped to Panchayat (replaces `admin/view_complaint.php` POST).

---

## Execution Phases

- **Phase 1–4 (Completed / Awaiting User Verification):** Source-code audit, feature/UI inventory, database audit, migration & API architecture plan (`docs/*.md`).
- **Phase 5 (Backend Implementation):** Scaffold `server/` (`package.json`, `.env.example`, `mysql2` pool, `multer` image upload, JWT/cookie auth, parameterized SQL queries, all endpoints, static `/uploads` serving).
- **Phase 6 (Frontend React Migration):** Scaffold `client/` (Vite + React Router), copy original assets (`gramsetu-logo.png`, `banner.mp4`) and original CSS (`style.css`, `complaint.css`, `track.css`, admin styles), convert each PHP page to pixel-faithful React components, preserve `#waveCanvas`, Google Translate (`en`/`te`/`hi`), Web Speech API dictation, and responsive mobile menus.
- **Phase 7 (Frontend-Backend Integration):** Connect React forms/dashboards to Express APIs via `VITE_API_BASE_URL`, verify image evidence rendering (including handling JSON array `image_path` cleanly), and fix broken/commented PHP wiring where approved.
- **Phase 8 (Database & Feature Testing):** Verify against live MySQL `vgmp` schema and test every citizen & admin workflow end-to-end.
- **Phase 9 (UI Comparison & Responsive Testing):** Side-by-side comparison of React vs PHP across desktop, tablet, and mobile viewports.
- **Phase 10 (Documentation & Deployment Prep):** Finalize `FEATURE_PARITY.md`, API docs, DB backup/migration guide, `.env.example`, and `README.md`.

