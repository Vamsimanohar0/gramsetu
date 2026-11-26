-- GramSetu (VGMP) MySQL Schema
-- Preserves exact table names, columns, indexes, and foreign keys from the existing `vgmp` database.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `vgmp`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE `vgmp`;

CREATE TABLE IF NOT EXISTS `admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `panchayaths` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `villages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `panchayath_id` int(11) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `panchayath_id` (`panchayath_id`),
  CONSTRAINT `villages_ibfk_1` FOREIGN KEY (`panchayath_id`) REFERENCES `panchayaths` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `complaints` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `complaint_id` varchar(20) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `village` varchar(100) DEFAULT NULL,
  `ward_no` varchar(20) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_path` text DEFAULT NULL,
  `audio_path` varchar(255) DEFAULT NULL,
  `status` enum('Submitted','Verified','Assigned','In Progress','Resolved','Rejected') DEFAULT 'Submitted',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `village_id` int(11) DEFAULT NULL,
  `panchayath_id` int(11) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `approx_latitude` decimal(10,7) DEFAULT NULL,
  `approx_longitude` decimal(10,7) DEFAULT NULL,
  `location_source` enum('gps','manual') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `complaint_id` (`complaint_id`),
  KEY `village_id` (`village_id`),
  KEY `panchayath_id` (`panchayath_id`),
  KEY `idx_complaints_approx_coords` (`approx_latitude`, `approx_longitude`),
  CONSTRAINT `complaints_ibfk_1` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`),
  CONSTRAINT `complaints_ibfk_2` FOREIGN KEY (`panchayath_id`) REFERENCES `panchayaths` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `complaint_status_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `complaint_pk` int(11) NOT NULL,
  `from_status` varchar(32) DEFAULT NULL,
  `to_status` varchar(32) NOT NULL,
  `actor_type` enum('system','admin','citizen') NOT NULL DEFAULT 'system',
  `actor_id` int(11) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_csh_complaint_created` (`complaint_pk`, `created_at`),
  CONSTRAINT `fk_csh_complaint` FOREIGN KEY (`complaint_pk`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `complaint_feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `complaint_pk` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `comment` text DEFAULT NULL,
  `resolution_confirmed` tinyint(1) NOT NULL DEFAULT 1,
  `reopen_requested` tinyint(1) NOT NULL DEFAULT 0,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feedback_complaint` (`complaint_pk`),
  CONSTRAINT `fk_cf_complaint` FOREIGN KEY (`complaint_pk`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `complaint_votes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `complaint_pk` int(11) NOT NULL,
  `voter_mobile_hmac` char(64) NOT NULL,
  `verification_method` varchar(32) NOT NULL,
  `verified_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_complaint_voter` (`complaint_pk`, `voter_mobile_hmac`),
  KEY `idx_cv_complaint` (`complaint_pk`),
  CONSTRAINT `fk_cv_complaint` FOREIGN KEY (`complaint_pk`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `rate_limits` (
  `rate_key` varchar(191) NOT NULL,
  `hits` int(11) NOT NULL DEFAULT 1,
  `reset_at` datetime(3) NOT NULL,
  PRIMARY KEY (`rate_key`),
  KEY `idx_reset_at` (`reset_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

