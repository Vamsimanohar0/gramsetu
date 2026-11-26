# GramSetu (VGMP) — Database Audit (Verified)

**Audit Status:** **Verified** against the phpMyAdmin SQL dump (`vgmp`, MariaDB 10.4.32, dumped 2026-07-10).

---

## 1. Database Configuration

From [`include/config.php`](file:///c:/xampp/htdocs/vgmp/include/config.php):
- Local database name: `vgmp` (`host: localhost`, `user: root`, `password: ""`)
- Character set: `utf8mb4` (`utf8mb4_general_ci`)
- Engine: `InnoDB`

---

## 2. Verified Tables, Columns, Indexes & Constraints

### Table 1: `panchayaths`
| Column | Type | Null | Key | Default | Notes |
|---|---|---|---|---|---|
| `id` | `int(11)` | NO | `PRI` (`AUTO_INCREMENT`) | — | Primary key |
| `name` | `varchar(100)` | NO | `UNI` | — | e.g. `Kondapalli Panchayath` |
| `username` | `varchar(50)` | NO | `UNI` | — | Login username |
| `password` | `varchar(255)` | NO | — | — | Seed rows store plaintext `'admin'`; `admin/login.php` supports both `password_verify` and plaintext |
| `email` | `varchar(100)` | YES | — | `NULL` | Contact email |
| `phone` | `varchar(15)` | YES | — | `NULL` | Contact phone |
| `status` | `enum('active','inactive')` | YES | — | `'active'` | Checked on login |
| `created_at` | `timestamp` | NO | — | `current_timestamp()` | Created timestamp |

Existing reference rows (`id` 1–3):
1. `Kondapalli Panchayath` (`username: kondapalli`)
2. `Guntur Panchayath` (`username: guntur`)
3. `Narasaraopet Panchayath` (`username: narasaraopet`)

---

### Table 2: `villages`
| Column | Type | Null | Key | Default | Notes |
|---|---|---|---|---|---|
| `id` | `int(11)` | NO | `PRI` (`AUTO_INCREMENT`) | — | Primary key |
| `name` | `varchar(100)` | NO | — | — | Village display name |
| `panchayath_id` | `int(11)` | NO | `MUL` (FK → `panchayaths.id`) | — | Constraint `villages_ibfk_1` |
| `status` | `enum('active','inactive')` | YES | — | `'active'` | Filtered in dropdowns & scoping |
| `created_at` | `timestamp` | NO | — | `current_timestamp()` | Created timestamp |

Existing reference rows (`id` 1–9):
- Panchayath 1 (`Kondapalli`): `1 Kondapalli`, `2 Pedakakani`, `3 Kollipara`
- Panchayath 2 (`Guntur`): `4 Guntur`, `5 Tenali`, `6 Mangalagiri`
- Panchayath 3 (`Narasaraopet`): `7 Narasaraopet`, `8 Chilakaluripet`, `9 Gurazala`

---

### Table 3: `complaints`
| Column | Type | Null | Key | Default | Notes |
|---|---|---|---|---|---|
| `id` | `int(11)` | NO | `PRI` (`AUTO_INCREMENT`) | — | Primary key |
| `complaint_id` | `varchar(20)` | YES | `UNI` | `NULL` | Public tracking ID (`GS-2026-XXXXX`) |
| `name` | `varchar(100)` | YES | — | `NULL` | Citizen full name |
| `mobile` | `varchar(15)` | YES | — | `NULL` | Citizen mobile number |
| `village` | `varchar(100)` | YES | — | `NULL` | Legacy string populated in rows 1–9; `NULL` in rows 10–12 |
| `ward_no` | `varchar(20)` | YES | — | `NULL` | Optional ward number |
| `category` | `varchar(100)` | YES | — | `NULL` | Category label |
| `title` | `varchar(255)` | YES | — | `NULL` | Short summary |
| `description` | `text` | YES | — | `NULL` | Detailed description |
| `image_path` | `text` | YES | — | `NULL` | JSON array of image paths (`["uploads/images/..."]`) |
| `audio_path` | `varchar(255)` | YES | — | `NULL` | Always `NULL` in current data; retained for schema compatibility |
| `status` | `enum('Submitted','Verified','Assigned','In Progress','Resolved','Rejected')` | YES | — | `'Submitted'` | Note `'Assigned'` exists in DB enum even though admin dropdown omits it |
| `created_at` | `timestamp` | NO | — | `current_timestamp()` | Submission timestamp |
| `village_id` | `int(11)` | YES | `MUL` (FK → `villages.id`) | `NULL` | Constraint `complaints_ibfk_1` (populated in rows 10–12) |
| `panchayath_id` | `int(11)` | YES | `MUL` (FK → `panchayaths.id`) | `NULL` | Constraint `complaints_ibfk_2` (populated in rows 10–12) |

---

### Table 4: `admins` *(Legacy / Unused by Active PHP Portal)*
| Column | Type | Null | Key | Default | Notes |
|---|---|---|---|---|---|
| `id` | `int(11)` | NO | `PRI` (`AUTO_INCREMENT`) | — | Primary key |
| `username` | `varchar(50)` | YES | `UNI` | `NULL` | Seed row: `(1, 'admin', 'admin')` |
| `password` | `varchar(255)` | YES | — | `NULL` | — |

> **Audit Note:** `admins` does **not** have `panchayat_id` or `name` columns. Unused file [`action/pan_log.php`](file:///c:/xampp/htdocs/vgmp/action/pan_log.php) referenced `$user['panchayat_id']` and `$user['name']`, confirming it was superseded by [`admin/login.php`](file:///c:/xampp/htdocs/vgmp/admin/login.php) which authenticates against `panchayaths`.

---

## 3. Verified Relationships & Data Nuances

```
panchayaths (1) ──────< (N) villages
     │                       │
     │ (panchayath_id)       │ (village_id)
     ▼                       ▼
complaints (N) >─────────────┘
```

1. **Legacy vs. Normalized Complaints:** Rows `1–9` in `complaints` have `village` as plain text and `village_id = NULL`, `panchayath_id = NULL`. Rows `10–12` have `village = NULL` and valid `village_id` + `panchayath_id` FKs. The migrated backend preserves all 12 rows untouched and resolves display village via `COALESCE(v.name, c.village)`.
2. **Password Handling:** Existing `panchayaths` rows store `'admin'` in plaintext. The Express backend verifies both bcrypt hashes (including PHP `$2y$` prefix) and legacy plaintext passwords, automatically upgrading plaintext rows to bcrypt on successful login.
3. **Status Enum:** Preserves all 6 enum values (`Submitted`, `Verified`, `Assigned`, `In Progress`, `Resolved`, `Rejected`).
