-- Migration 003: Additive shared rate-limit store table for Express API
-- Does not alter, reset, or drop any existing VGMP table or record.

USE `vgmp`;

CREATE TABLE IF NOT EXISTS `rate_limits` (
  `rate_key` varchar(191) NOT NULL,
  `hits` int(11) NOT NULL DEFAULT 1,
  `reset_at` datetime(3) NOT NULL,
  PRIMARY KEY (`rate_key`),
  KEY `idx_reset_at` (`reset_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

