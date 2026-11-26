-- Migration 002: Safely Map Legacy Complaints (`village` text -> `village_id`, `panchayath_id`)
-- Safe, idempotent, and reversible.
-- Prerequisites: Back up the `vgmp` database with mysqldump before running.
-- Rules:
--   1. Never modifies rows that already have `village_id` or `panchayath_id` set.
--   2. Only maps rows where `LOWER(TRIM(c.village))` matches EXACTLY ONE active village.
--   3. Ambiguous village names (>1 active match) and unmatched/empty values are left untouched.
--   4. Preserves all complaint IDs (`id`, `complaint_id`), timestamps, and statuses.

USE `vgmp`;

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

-- Step 2: Audit table for reversibility (records original NULL values before update)
CREATE TABLE IF NOT EXISTS `legacy_complaint_mapping_audit` (
  `complaint_pk` int(11) NOT NULL,
  `complaint_id` varchar(20) DEFAULT NULL,
  `legacy_village_text` varchar(100) DEFAULT NULL,
  `previous_village_id` int(11) DEFAULT NULL,
  `previous_panchayath_id` int(11) DEFAULT NULL,
  `mapped_village_id` int(11) NOT NULL,
  `mapped_panchayath_id` int(11) NOT NULL,
  `migrated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`complaint_pk`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

START TRANSACTION;

-- Step 3: Record unambiguous legacy rows into audit table before updating
INSERT IGNORE INTO `legacy_complaint_mapping_audit` (
  `complaint_pk`,
  `complaint_id`,
  `legacy_village_text`,
  `previous_village_id`,
  `previous_panchayath_id`,
  `mapped_village_id`,
  `mapped_panchayath_id`
)
SELECT
  c.id,
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

-- Step 4: Apply unambiguous mappings
UPDATE complaints c
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
SET
  c.village_id = m.village_id,
  c.panchayath_id = m.panchayath_id
WHERE c.village_id IS NULL
  AND c.panchayath_id IS NULL
  AND c.village IS NOT NULL
  AND TRIM(c.village) <> '';

COMMIT;

-- Step 5: Post-migration verification
SELECT
  c.id,
  c.complaint_id,
  c.village AS legacy_village_text,
  c.village_id,
  c.panchayath_id,
  p.name AS panchayath_name
FROM complaints c
LEFT JOIN panchayaths p ON c.panchayath_id = p.id
ORDER BY c.id;

