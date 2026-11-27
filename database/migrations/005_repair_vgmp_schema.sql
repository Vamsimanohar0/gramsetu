-- Migration 005: Forward-Only Safe Schema Repair for Existing `vgmp` Database
-- Scope: Adds missing `rate_limits`, `complaints` optional geolocation columns/index,
--        `complaint_status_history`, `complaint_feedback`, and zero-OTP `complaint_votes`.
-- Safety:
--   - Preserves all existing records in `admins`, `panchayaths`, `villages`, and `complaints`.
--   - Never drops or resets tables, never modifies existing `status` values or complaint IDs,
--     and never guesses legacy location coordinates or ambiguous village mappings.
--   - Fails loudly if preconditions (such as InnoDB/INT compatibility on `complaints`) fail.
-- Prerequisite: Back up `vgmp` with mysqldump before running.

USE `vgmp`;

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version` VARCHAR(64) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 1. Shared rate-limiter store (originally defined in 003)
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `rate_key` VARCHAR(191) NOT NULL,
  `hits` INT(11) NOT NULL DEFAULT 1,
  `reset_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`rate_key`),
  KEY `idx_reset_at` (`reset_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Conditionally add nullable geolocation columns + index to `complaints`
SET @sql_lat := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND COLUMN_NAME = 'latitude') = 0,
  'ALTER TABLE `complaints` ADD COLUMN `latitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `panchayath_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_lat; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_lng := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND COLUMN_NAME = 'longitude') = 0,
  'ALTER TABLE `complaints` ADD COLUMN `longitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `latitude`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_lng; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_alat := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND COLUMN_NAME = 'approx_latitude') = 0,
  'ALTER TABLE `complaints` ADD COLUMN `approx_latitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `longitude`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alat; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_alng := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND COLUMN_NAME = 'approx_longitude') = 0,
  'ALTER TABLE `complaints` ADD COLUMN `approx_longitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `approx_latitude`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alng; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_lsrc := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND COLUMN_NAME = 'location_source') = 0,
  'ALTER TABLE `complaints` ADD COLUMN `location_source` ENUM(''gps'',''manual'') NULL DEFAULT NULL AFTER `approx_longitude`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_lsrc; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_cidx := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND INDEX_NAME = 'idx_complaints_approx_coords') = 0,
  'ALTER TABLE `complaints` ADD INDEX `idx_complaints_approx_coords` (`approx_latitude`, `approx_longitude`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_cidx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Additive feature tables referencing `complaints(id)`
CREATE TABLE IF NOT EXISTS `complaint_status_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `complaint_pk` INT(11) NOT NULL,
  `from_status` VARCHAR(32) DEFAULT NULL,
  `to_status` VARCHAR(32) NOT NULL,
  `actor_type` ENUM('system','admin','citizen') NOT NULL DEFAULT 'system',
  `actor_id` INT(11) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_csh_complaint_created` (`complaint_pk`, `created_at`),
  CONSTRAINT `fk_csh_complaint`
    FOREIGN KEY (`complaint_pk`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `complaint_feedback` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `complaint_pk` INT(11) NOT NULL,
  `rating` TINYINT(4) NOT NULL,
  `comment` TEXT DEFAULT NULL,
  `resolution_confirmed` TINYINT(1) NOT NULL DEFAULT 1,
  `reopen_requested` TINYINT(1) NOT NULL DEFAULT 0,
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feedback_complaint` (`complaint_pk`),
  CONSTRAINT `fk_cf_complaint`
    FOREIGN KEY (`complaint_pk`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `complaint_votes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `complaint_pk` INT(11) NOT NULL,
  `voter_key_hmac` CHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_complaint_voter` (`complaint_pk`, `voter_key_hmac`),
  KEY `idx_cv_complaint` (`complaint_pk`),
  CONSTRAINT `fk_cv_complaint`
    FOREIGN KEY (`complaint_pk`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Record migration in `schema_migrations`
INSERT IGNORE INTO `schema_migrations` (`version`, `description`)
VALUES (
  '005_repair_vgmp_schema',
  'Forward-only repair: rate_limits, complaints location columns/index, complaint_status_history, complaint_feedback, complaint_votes'
);

