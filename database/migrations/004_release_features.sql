-- Migration 004: Advanced Release Features (Voting, Feedback & Reopening, Interactive Maps)
-- Additive and reversible migration. Preserves all existing records, IDs, statuses, and relationships.

USE `vgmp`;

ALTER TABLE `complaints`
  ADD COLUMN `latitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `panchayath_id`,
  ADD COLUMN `longitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `latitude`,
  ADD COLUMN `approx_latitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `longitude`,
  ADD COLUMN `approx_longitude` DECIMAL(10,7) NULL DEFAULT NULL AFTER `approx_latitude`,
  ADD COLUMN `location_source` ENUM('gps','manual') NULL DEFAULT NULL AFTER `approx_longitude`,
  ADD INDEX `idx_complaints_approx_coords` (`approx_latitude`, `approx_longitude`);

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
  CONSTRAINT `fk_csh_complaint` FOREIGN KEY (`complaint_pk`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
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
  CONSTRAINT `fk_cf_complaint` FOREIGN KEY (`complaint_pk`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `complaint_votes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `complaint_pk` INT(11) NOT NULL,
  `voter_mobile_hmac` CHAR(64) NOT NULL,
  `verification_method` VARCHAR(32) NOT NULL,
  `verified_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_complaint_voter` (`complaint_pk`, `voter_mobile_hmac`),
  KEY `idx_cv_complaint` (`complaint_pk`),
  CONSTRAINT `fk_cv_complaint` FOREIGN KEY (`complaint_pk`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

