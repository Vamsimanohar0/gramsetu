-- Rollback for Migration 002: Restores legacy `village_id` and `panchayath_id` values
-- ONLY for rows recorded in `legacy_complaint_mapping_audit`.
-- Preserves all complaints, IDs, statuses, and newly created records.

USE `vgmp`;

START TRANSACTION;

UPDATE complaints c
INNER JOIN legacy_complaint_mapping_audit a
  ON c.id = a.complaint_pk
SET
  c.village_id = a.previous_village_id,
  c.panchayath_id = a.previous_panchayath_id;

DELETE FROM legacy_complaint_mapping_audit;

COMMIT;

