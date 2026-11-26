-- Migration 001: Verification & Non-Destructive Integrity Checks
-- Run this against an existing `vgmp` database after taking a full backup.
-- No existing tables, columns, or records are deleted or overwritten.

USE `vgmp`;

-- 1. Verify row counts
SELECT 'panchayaths' AS table_name, COUNT(*) AS row_count FROM panchayaths
UNION ALL
SELECT 'villages', COUNT(*) FROM villages
UNION ALL
SELECT 'complaints', COUNT(*) FROM complaints;

-- 2. Check for orphan village references (should return 0 rows)
SELECT c.id, c.complaint_id, c.village_id
FROM complaints c
LEFT JOIN villages v ON c.village_id = v.id
WHERE c.village_id IS NOT NULL AND v.id IS NULL;

-- 3. Check for orphan panchayath references (should return 0 rows)
SELECT c.id, c.complaint_id, c.panchayath_id
FROM complaints c
LEFT JOIN panchayaths p ON c.panchayath_id = p.id
WHERE c.panchayath_id IS NOT NULL AND p.id IS NULL;

