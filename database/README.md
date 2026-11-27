# GramSetu Database Setup & Safe Migration Guide

## 1. Backup Existing Database First (Mandatory Before Any Migration)

On XAMPP / MySQL Windows PowerShell:
```powershell
mysqldump -u root -p --single-transaction --routines --triggers vgmp > vgmp_backup.sql
```

To test migrations against a **backed-up copy** first without touching production:
```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS vgmp_backup_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -p vgmp_backup_test < vgmp_backup.sql
```

## 2. Using an Existing `vgmp` Database (Zero Data Loss)

If your `vgmp` database already exists in MySQL/MariaDB with only the 4 original tables (`admins`, `panchayaths`, `villages`, `complaints`):
- **Do NOT drop or reset the database.**
- **Do NOT run `004_rollback_release_features.sql`** (it drops tables and columns).
- **Safe vs. Destructive SQL:** `SELECT`, `SHOW`, `mysqldump`, `CREATE TABLE IF NOT EXISTS`, and conditional nullable `ALTER TABLE ... ADD COLUMN` are safe and preserve existing records. `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, and `DELETE` are destructive.
- Point `server/.env` (`DB_NAME=vgmp`) directly at the existing database.
- Apply the **forward-only schema repair migration** (`005_repair_vgmp_schema.sql`), which creates `schema_migrations`, `rate_limits`, the 5 nullable `complaints` geolocation columns, `complaint_status_history`, `complaint_feedback`, and zero-OTP `complaint_votes` in one idempotent pass:
  ```powershell
  mysql -u root -p vgmp < database/migrations/005_repair_vgmp_schema.sql
  ```
- Verify the repaired schema & intact complaint records (read-only):
  ```powershell
  mysql -u root -p vgmp < database/migrations/005_verify_repair.sql
  mysql -u root -p vgmp < database/migrations/001_verify_integrity.sql
  ```

> **Note on `003` & `004`:** `005_repair_vgmp_schema.sql` supersedes manual separate execution of `003` and `004` on partially upgraded databases and records `005_repair_vgmp_schema` in `schema_migrations`.

---

## 3. Legacy Complaint Data Migration & Manual Review Workflow

Legacy complaints submitted before `village_id` normalization may have `village` text while `village_id` and `panchayath_id` are `NULL`.

1. **Dry-run classification** (read-only, from `server/`):
   ```bash
   node scripts/migrateLegacyComplaints.js
   ```
2. **Apply unambiguous auto-mappings** (prints a `batch_id`):
   ```bash
   node scripts/migrateLegacyComplaints.js --apply
   ```
   *(Or run `database/migrations/002_map_legacy_complaints.sql`, which uses `batch_id = 'batch_002_auto_unambiguous'`.)*
3. **Export ambiguous / unmatched complaints for human review:**
   ```bash
   node scripts/migrateLegacyComplaints.js --export-review
   ```
   Review `database/migrations/legacy_review_manifest.json`, fill `assigned_village_id` for records that should be assigned (leave unassignable rows `null`), then apply safely in its own batch:
   ```bash
   node scripts/migrateLegacyComplaints.js --apply-manual ../database/migrations/legacy_review_manifest.json
   ```
4. **Batch-scoped rollback (reverses ONLY the intended batch):**
   ```bash
   node scripts/migrateLegacyComplaints.js --rollback <batch_id>
   ```
   Or edit `@target_batch_id` in `database/migrations/002_rollback_legacy_complaints.sql` and run it.

## 4. Fresh Setup (Development vs Production)

- **Production / clean reference:**
  ```bash
  mysql -u root -p < database/schema.sql
  mysql -u root -p vgmp < database/seed.sql
  ```
  `seed.sql` seeds Panchayat accounts as **`inactive`** with disabled placeholder passwords. Set unique strong bcrypt hashes via `cd server && node scripts/generateHash.js <strong_password>` before activating them.
- **Local Development Demo Accounts ONLY:**
  ```bash
  mysql -u root -p vgmp < database/seed.dev.sql
  ```
