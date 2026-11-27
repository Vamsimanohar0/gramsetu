-- MySQL dump 10.13  Distrib 8.4.11, for Win64 (x86_64)
--
-- Host: localhost    Database: vgmp
-- ------------------------------------------------------
-- Server version	8.4.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'admin','admin');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `complaints`
--

DROP TABLE IF EXISTS `complaints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `complaints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `complaint_id` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mobile` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `village` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ward_no` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `image_path` text COLLATE utf8mb4_general_ci,
  `audio_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('Submitted','Verified','Assigned','In Progress','Resolved','Rejected') COLLATE utf8mb4_general_ci DEFAULT 'Submitted',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `village_id` int DEFAULT NULL,
  `panchayath_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `complaint_id` (`complaint_id`),
  KEY `village_id` (`village_id`),
  KEY `panchayath_id` (`panchayath_id`),
  CONSTRAINT `complaints_ibfk_1` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`),
  CONSTRAINT `complaints_ibfk_2` FOREIGN KEY (`panchayath_id`) REFERENCES `panchayaths` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `complaints`
--

LOCK TABLES `complaints` WRITE;
/*!40000 ALTER TABLE `complaints` DISABLE KEYS */;
INSERT INTO `complaints` VALUES (1,'GS-2026-36691','vvit25bq5a1205','8790808059','hjgf','','Street Light','ubginhj','awsedxrcftgy',NULL,NULL,'Submitted','2026-06-24 06:02:43',NULL,NULL),(2,'GS-2026-95894','MVR','8790808059','hjgf','','','g rd dg','rgfv ',NULL,NULL,'Submitted','2026-06-24 06:08:22',NULL,NULL),(3,'GS-2026-83437','MVR','8790808059','hjgf','','','g rd dg','rgfv ',NULL,NULL,'Submitted','2026-06-24 06:09:11',NULL,NULL),(4,'GS-2026-20627','','','','','','','',NULL,NULL,'Submitted','2026-06-24 06:09:40',NULL,NULL),(5,'GS-2026-86186','','','','','','','',NULL,NULL,'Submitted','2026-06-24 06:12:08',NULL,NULL),(6,'GS-2026-60715','vvit25bq5a1205','8790808059','hjgf','','Drainage Issue','vgybhuniojk','fgybuhnijokp',NULL,NULL,'Submitted','2026-06-24 06:12:38',NULL,NULL),(7,'GS-2026-55967','','','','','','','',NULL,NULL,'Submitted','2026-06-24 07:11:38',NULL,NULL),(8,'GS-2026-77716','indu hasan','9490572233','kaza','','Road Damage','road damage','guntalu near ganavaram',NULL,NULL,'Resolved','2026-06-25 07:41:59',NULL,NULL),(9,'GS-2026-73512','nithin','8790808059','guntur','','Street Light','wev','3erg itb  fjlqe',NULL,NULL,'Resolved','2026-06-25 10:02:59',NULL,NULL),(10,'GS-2026-13724','Gopisetti Hemalatha','8790808059',NULL,'','Street Light','rbgyhgf','rgfbvd',NULL,NULL,'Submitted','2026-06-25 11:22:19',4,2),(11,'GS-2026-59312','vamsi','8790808059',NULL,'','Garbage Collection','shit','waste',NULL,NULL,'Resolved','2026-06-25 11:28:31',1,1),(12,'GS-2026-17276','vamsi','8790808059',NULL,'','Road Damage','the','bad',NULL,NULL,'Submitted','2026-06-26 05:04:14',4,2),(13,'GS-2026-97886','Generic H2 (Embedded)','8317682194',NULL,'','Public Safety','not safe','not at all safe','[\"uploads/images/1795692756651_b0a80afcaa1c.png\"]',NULL,'In Progress','2026-11-26 11:32:36',4,2);
/*!40000 ALTER TABLE `complaints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `panchayaths`
--

DROP TABLE IF EXISTS `panchayaths`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `panchayaths` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `panchayaths`
--

LOCK TABLES `panchayaths` WRITE;
/*!40000 ALTER TABLE `panchayaths` DISABLE KEYS */;
INSERT INTO `panchayaths` VALUES (1,'Kondapalli Panchayath','kondapalli','$2a$10$HrjNfz2MX5LtJsSp6JYkpOB2..bRgs2XaFi8zx0o7H7wMe7sGcXG2','kondapalli@panchayath.in',NULL,'active','2026-06-25 10:51:43'),(2,'Guntur Panchayath','guntur','$2a$10$HrjNfz2MX5LtJsSp6JYkpOB2..bRgs2XaFi8zx0o7H7wMe7sGcXG2','guntur@panchayath.in',NULL,'active','2026-06-25 10:51:43'),(3,'Narasaraopet Panchayath','narasaraopet','$2a$10$HrjNfz2MX5LtJsSp6JYkpOB2..bRgs2XaFi8zx0o7H7wMe7sGcXG2','narasaraopet@panchayath.in',NULL,'active','2026-06-25 10:51:43');
/*!40000 ALTER TABLE `panchayaths` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `villages`
--

DROP TABLE IF EXISTS `villages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `villages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `panchayath_id` int NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `panchayath_id` (`panchayath_id`),
  CONSTRAINT `villages_ibfk_1` FOREIGN KEY (`panchayath_id`) REFERENCES `panchayaths` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `villages`
--

LOCK TABLES `villages` WRITE;
/*!40000 ALTER TABLE `villages` DISABLE KEYS */;
INSERT INTO `villages` VALUES (1,'Kondapalli',1,'active','2026-06-25 10:51:43'),(2,'Pedakakani',1,'active','2026-06-25 10:51:43'),(3,'Kollipara',1,'active','2026-06-25 10:51:43'),(4,'Guntur',2,'active','2026-06-25 10:51:43'),(5,'Tenali',2,'active','2026-06-25 10:51:43'),(6,'Mangalagiri',2,'active','2026-06-25 10:51:43'),(7,'Narasaraopet',3,'active','2026-06-25 10:51:43'),(8,'Chilakaluripet',3,'active','2026-06-25 10:51:43'),(9,'Gurazala',3,'active','2026-06-25 10:51:43');
/*!40000 ALTER TABLE `villages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'vgmp'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-27 12:20:28
