# GramSetu Database Setup & Safe Migration Guide

## 1. Backup Existing Database First (Mandatory Before Any Production Change)

```bash
mysqldump -u root -p --single-transaction --routines --triggers vgmp > vgmp_backup_YYYYMMDD.sql
```

On XAMPP Windows PowerShell:
```powershell
C:\xampp\mysql\bin\mysqldump.exe -u root vgmp > vgmp_backup.sql
```

## 2. Using an Existing `vgmp` Database (Zero Data Loss)

If your `vgmp` database already exists in MySQL/MariaDB with your `panchayaths`, `villages`, and `complaints` data:
- **Do NOT drop or recreate the database.**
- Point `server/.env` (`DB_NAME=vgmp`) directly at the existing database.
- Run the read-only verification script:
  ```powershell
  C:\xampp\mysql\bin\mysql.exe -u root vgmp < database/migrations/001_verify_integrity.sql
  ```

## 3. Fresh Setup (New Environment)

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p vgmp < database/seed.sql
```

## 4. Password Hashing Note

The existing `panchayaths` table stores `'admin'` in plaintext for `kondapalli`, `guntur`, and `narasaraopet`.
- Existing passwords continue to work on first login.
- Upon successful login, the Express backend automatically upgrades the plaintext password to a salted `bcrypt` hash in `panchayaths.password` without modifying any other column.
- Optionally, you can batch-hash all plaintext passwords ahead of time from `server/`:
  ```bash
  node scripts/hashPasswords.js
  ```

