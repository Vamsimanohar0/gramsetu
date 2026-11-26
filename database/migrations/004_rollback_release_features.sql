-- Rollback Migration 004: Removes additive objects from Migration 004 only.
-- Existing complaints, villages, panchayaths, and admins records remain intact.

USE `vgmp`;

DROP TABLE IF EXISTS `complaint_votes`;
DROP TABLE IF EXISTS `complaint_feedback`;
DROP TABLE IF EXISTS `complaint_status_history`;

ALTER TABLE `complaints`
  DROP INDEX `idx_complaints_approx_coords`,
  DROP COLUMN `location_source`,
  DROP COLUMN `approx_longitude`,
  DROP COLUMN `approx_latitude`,
  DROP COLUMN `longitude`,
  DROP COLUMN `latitude`;

