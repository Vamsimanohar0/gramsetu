# GramSetu — Village Grievance Management Portal (VGMP)

Migrated from PHP + MySQL to **React.js (Vite) + Node.js (Express.js) + MySQL (`mysql2`)**, preserving the original GramSetu visual design, CSS, media assets, database structure, and workflows.

> Legacy PHP files were removed after migration and remain preserved in Git commit `f326545`.

---

## Project Structure

```text
vgmp/
├── client/                  # React.js + Vite frontend
│   ├── public/              # gramsetu-logo.png, banner.mp4
│   └── src/
│       ├── components/      # Navbar, LanguageModal, ProtectedRoute
│       ├── context/         # AuthContext, LanguageContext
│       ├── pages/           # HomePage, ComplaintPage, TrackPage, admin/*
│       ├── services/        # api.js (VITE_API_BASE_URL)
│       └── styles/          # Scoped CSS derived from original PHP stylesheets
├── server/                  # Node.js + Express REST API
│   ├── config/              # env.js, db.js (mysql2 pool)
│   ├── controllers/         # authController, publicController, adminController
│   ├── middleware/          # authMiddleware, uploadMiddleware, errorHandler
│   ├── routes/              # publicRoutes, adminRoutes
│   ├── scripts/             # hashPasswords.js
│   ├── services/            # authService, complaintService
│   ├── tests/               # Node test suite (api.test.js)
│   ├── uploads/images/      # Uploaded complaint evidence images
│   ├── utils/               # complaintUtils.js
│   ├── validators/          # complaintValidator.js
│   ├── app.js
│   └── server.js
├── database/
│   ├── schema.sql           # Verified `vgmp` schema
│   ├── seed.sql             # Reference `panchayaths` & `villages` data
│   ├── migrations/          # Non-destructive verification scripts
│   └── README.md            # Backup & migration instructions
└── docs/
    ├── MIGRATION_AUDIT.md
    ├── EXISTING_FEATURES.md
    ├── DATABASE_AUDIT.md
    ├── MIGRATION_PLAN.md
    ├── API_DOCUMENTATION.md
    ├── FEATURE_PARITY.md
    └── UI_COMPARISON.md
```

---

## Prerequisites

- **Node.js** `>= 20.x` and **npm** `>= 10.x`
- **MySQL / MariaDB** (e.g. XAMPP MariaDB 10.4+ with the `vgmp` database)

---

## 1. Database Setup

### Using an Existing `vgmp` Database (Recommended)
1. Take a safety backup first:
   ```powershell
   C:\xampp\mysql\bin\mysqldump.exe -u root vgmp > vgmp_backup.sql
   ```
2. Keep your existing database as-is (do **not** drop or reset it).
3. Optionally run the read-only verification script:
   ```powershell
   C:\xampp\mysql\bin\mysql.exe -u root vgmp < database/migrations/001_verify_integrity.sql
   ```

### Fresh Database Setup
```powershell
C:\xampp\mysql\bin\mysql.exe -u root < database/schema.sql
C:\xampp\mysql\bin\mysql.exe -u root vgmp < database/seed.sql
```

---

## 2. Backend Setup (`server/`)

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=vgmp
JWT_SECRET=your-long-random-secret-key
```

Start the Express API:
```bash
npm run dev     # or: npm start
```

Run backend unit & integration tests:
```bash
npm test
```

---

## 3. Frontend Setup (`client/`)

```bash
cd client
npm install
cp .env.example .env
```

`client/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the Vite development server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

Build for production:
```bash
npm run build
```

---

## 4. Production Deployment Notes

1. Set `NODE_ENV=production`, a strong `JWT_SECRET`, production `DB_*` credentials, and `CLIENT_ORIGIN=https://your-domain.com` in `server/.env`.
2. Hash any legacy plaintext Panchayat passwords ahead of time:
   ```bash
   cd server && npm run hash-passwords
   ```
3. Build `client/` (`npm run build`) and serve `client/dist/` via Nginx/Apache/CDN, proxying `/api` and `/uploads` to the Node.js server (or configure `VITE_API_BASE_URL` to your API origin).
4. Ensure `server/uploads/images/` is persistent and writable on the host.

