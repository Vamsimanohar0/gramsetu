-- Read-Only Verification Script for Migration 005 (`005_repair_vgmp_schema.sql`)
-- Safe to run repeatedly; performs zero writes.

USE `vgmp`;

-- 1. Confirm migration ledger entry
SELECT version, description, applied_at
FROM schema_migrations
ORDER BY applied_at ASC;

-- 2. Confirm all expected tables exist and inspect engines + row counts
SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'admins',
    'panchayaths',
    'villages',
    'complaints',
    'rate_limits',
    'complaint_status_history',
    'complaint_feedback',
    'complaint_votes',
    'schema_migrations'
  )
ORDER BY TABLE_NAME;

-- 3. Confirm all 20 expected columns on `complaints`
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'complaints'
ORDER BY ORDINAL_POSITION;

-- 4. Confirm foreign keys referencing `complaints`
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME = 'complaints'
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- 5. Confirm zero data loss & existing complaint status distribution
SELECT COUNT(*) AS total_complaints,
       SUM(CASE WHEN village_id IS NULL AND panchayath_id IS NULL THEN 1 ELSE 0 END) AS legacy_unmapped_complaints,
       SUM(CASE WHEN latitude IS NOT NULL THEN 1 ELSE 0 END) AS complaints_with_coords
FROM complaints;

SELECT status, COUNT(*) AS count
FROM complaints
GROUP BY status
ORDER BY status;

