-- Migration 002: Safely Map Legacy Complaints (`village` text -> `village_id`, `panchayath_id`)
-- Safe, idempotent, batch-tracked, and reversible.
-- Prerequisites: Take a full backup with mysqldump before running.
-- Rules:
--   1. Never modifies rows that already have `village_id` or `panchayath_id` set.
--   2. Only maps rows where `LOWER(TRIM(c.village))` matches EXACTLY ONE active village.
--   3. Ambiguous village names (>1 active match) and unmatched/empty values are left untouched
--      for safe manual review via `server/scripts/migrateLegacyComplaints.js --export-review`.
--   4. Preserves all complaint IDs (`id`, `complaint_id`), timestamps, and statuses.

USE `vgmp`;

SET @batch_id = 'batch_002_auto_unambiguous';

-- Step 1: Preview legacy complaints and match classification (read-only)
SELECT
  c.id,
  c.complaint_id,
  c.village AS legacy_village_text,
  COUNT(v.id) AS active_village_matches,
  CASE
    WHEN c.village IS NULL OR TRIM(c.village) = '' THEN 'UNMATCHED_EMPTY'
    WHEN COUNT(v.id) = 1 THEN 'UNAMBIGUOUS_MATCH'
    WHEN COUNT(v.id) > 1 THEN 'AMBIGUOUS_MANUAL_REVIEW_REQUIRED'
    ELSE 'UNMATCHED_UNKNOWN_VILLAGE'
  END AS classification,
  MIN(v.id) AS matched_village_id,
  MIN(v.panchayath_id) AS matched_panchayath_id
FROM complaints c
LEFT JOIN villages v
  ON v.status = 'active'
  AND LOWER(TRIM(v.name)) = LOWER(TRIM(c.village))
WHERE c.village_id IS NULL
  AND c.panchayath_id IS NULL
GROUP BY c.id, c.complaint_id, c.village
ORDER BY c.id;

-- Step 2: Batch-aware audit table for targeted rollback
CREATE TABLE IF NOT EXISTS `legacy_complaint_mapping_audit` (
  `complaint_pk` int(11) NOT NULL,
  `batch_id` varchar(64) NOT NULL,
  `mapping_source` enum('auto_unambiguous','manual_review') NOT NULL DEFAULT 'auto_unambiguous',
  `complaint_id` varchar(20) DEFAULT NULL,
  `legacy_village_text` varchar(100) DEFAULT NULL,
  `previous_village_id` int(11) DEFAULT NULL,
  `previous_panchayath_id` int(11) DEFAULT NULL,
  `mapped_village_id` int(11) NOT NULL,
  `mapped_panchayath_id` int(11) NOT NULL,
  `migrated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`complaint_pk`),
  KEY `idx_batch_id` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

START TRANSACTION;

-- Step 3: Record unambiguous legacy rows for this batch before updating
INSERT IGNORE INTO `legacy_complaint_mapping_audit` (
  `complaint_pk`,
  `batch_id`,
  `mapping_source`,
  `complaint_id`,
  `legacy_village_text`,
  `previous_village_id`,
  `previous_panchayath_id`,
  `mapped_village_id`,
  `mapped_panchayath_id`
)
SELECT
  c.id,
  @batch_id,
  'auto_unambiguous',
  c.complaint_id,
  c.village,
  c.village_id,
  c.panchayath_id,
  m.village_id,
  m.panchayath_id
FROM complaints c
INNER JOIN (
  SELECT
    LOWER(TRIM(name)) AS norm_name,
    MIN(id) AS village_id,
    MIN(panchayath_id) AS panchayath_id
  FROM villages
  WHERE status = 'active'
  GROUP BY LOWER(TRIM(name))
  HAVING COUNT(*) = 1
) m
  ON LOWER(TRIM(c.village)) = m.norm_name
WHERE c.village_id IS NULL
  AND c.panchayath_id IS NULL
  AND c.village IS NOT NULL
  AND TRIM(c.village) <> '';

-- Step 4: Apply unambiguous mappings recorded in this batch
UPDATE complaints c
INNER JOIN legacy_complaint_mapping_audit a
  ON c.id = a.complaint_pk
SET
  c.village_id = a.mapped_village_id,
  c.panchayath_id = a.mapped_panchayath_id
WHERE a.batch_id = @batch_id
  AND c.village_id IS NULL
  AND c.panchayath_id IS NULL;

COMMIT;

-- Step 5: Report remaining unmapped complaints requiring manual review
SELECT
  c.id,
  c.complaint_id,
  c.name,
  c.village AS legacy_village_text,
  c.status,
  c.created_at
FROM complaints c
WHERE c.village_id IS NULL
  AND c.panchayath_id IS NULL
ORDER BY c.id;
