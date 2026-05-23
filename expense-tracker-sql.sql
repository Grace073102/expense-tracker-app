CREATE DATABASE  IF NOT EXISTS `expense_tracker` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `expense_tracker`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: expense_tracker
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` varchar(36) NOT NULL DEFAULT (uuid()),
  `description` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `category` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
INSERT INTO `expenses` VALUES ('1ceef65f-3313-11f1-b6a2-005056c00001','Amazon Order',5000.00,'Shopping','2026-04-09','2026-04-08 06:21:00','2026-05-13 23:47:47',1),('1cef42df-3313-11f1-b6a2-005056c00001','Dinner',7300.00,'Food','2025-11-22','2026-04-08 06:21:00','2026-05-13 23:47:47',1),('38b539ee-6c38-49ee-85c1-428242042ad8','Petrol',45.00,'Transport','2026-05-18','2026-05-18 12:30:45','2026-05-22 15:48:09',1),('42391670-3319-11f1-b6a2-005056c00001','Groceries',99.99,'Shopping','2026-04-08','2026-04-08 07:05:00','2026-04-08 07:05:00',NULL),('44715560-3319-11f1-b6a2-005056c00001','Groceries',100.00,'Shopping','2026-04-08','2026-04-08 07:05:04','2026-04-08 07:05:04',NULL),('c7ba6314-36e5-11f1-a01a-005056c00001','Food',50.00,'Food','2026-04-11','2026-04-13 03:06:35','2026-04-13 03:06:35',NULL),('ecae4020-c301-4516-b19e-4be194334aad','Transport',5.95,'Transport','2026-05-18','2026-05-18 00:17:09','2026-05-18 00:23:31',1);
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_activity`
--

DROP TABLE IF EXISTS `user_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_activity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `username` varchar(15) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `details` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_activity`
--

LOCK TABLES `user_activity` WRITE;
/*!40000 ALTER TABLE `user_activity` DISABLE KEYS */;
INSERT INTO `user_activity` VALUES (1,6,'admin','logout','User logged out','::1','2026-05-21 13:27:02'),(2,6,'admin','login','Login successful','::1','2026-05-21 13:28:11'),(3,6,'admin','logout','User logged out','::1','2026-05-21 13:32:48'),(4,6,'admin','login','Login successful','::1','2026-05-21 13:33:42'),(5,6,'admin','logout','User logged out','::1','2026-05-21 13:36:49'),(6,6,'admin','login','Login successful','::1','2026-05-21 13:37:24'),(7,6,'admin','logout','User logged out','::1','2026-05-21 13:39:01'),(8,1,'aaa','login','Login successful','::1','2026-05-21 13:39:06'),(9,1,'aaa','logout','User logged out','::1','2026-05-21 13:39:14'),(10,6,'admin','login','Login successful','::1','2026-05-21 13:39:18'),(11,6,'admin','logout','User logged out','::1','2026-05-21 13:39:56'),(12,1,'aaa','login_failed','Wrong password','::1','2026-05-21 13:39:59'),(13,6,'admin','login','Login successful','::1','2026-05-21 13:40:04'),(14,6,'admin','admin_edit_user','Edited user 1: username: aab, email: aa@gmail.com','::1','2026-05-21 23:29:34'),(15,6,'admin','logout','User logged out','::1','2026-05-21 23:29:38'),(16,NULL,'aaa','login_failed','User not found','::1','2026-05-21 23:29:43'),(17,1,'aab','login','Login successful','::1','2026-05-21 23:29:45'),(18,1,'aab','logout','User logged out','::1','2026-05-21 23:29:49'),(19,6,'admin','login','Login successful','::1','2026-05-21 23:29:52'),(20,6,'admin','logout','User logged out','::1','2026-05-21 23:31:45'),(21,NULL,'bbb','register','Account created','::1','2026-05-21 23:31:57'),(22,NULL,'bbb','logout','User logged out','::1','2026-05-21 23:31:58'),(23,6,'admin','login','Login successful','::1','2026-05-21 23:32:01'),(24,6,'admin','admin_delete_user','Deleted user: bbb (ID: 7)','::1','2026-05-21 23:32:40'),(25,6,'admin','admin_create_user','Created user: bbb (bb@gmail.com)','::1','2026-05-21 23:43:06'),(26,6,'admin','admin_edit_user','Edited user 8: username: bbbc, email: bb@gmail.com','::1','2026-05-21 23:43:16'),(27,6,'admin','admin_reset_password','Reset password for: bbbc (ID: 8)','::1','2026-05-21 23:43:23'),(28,6,'admin','admin_delete_user','Deleted user: bbbc (ID: 8)','::1','2026-05-21 23:43:30'),(29,6,'admin','admin_edit_user','Edited user 1: username: aaa, email: aa@gmail.com','::1','2026-05-22 15:47:40'),(30,6,'admin','logout','User logged out','::1','2026-05-22 15:47:48'),(31,1,'aaa','login','Login successful','::1','2026-05-22 15:47:53'),(32,1,'aaa','expense_update','Petrol - $45 (Transport)','::1','2026-05-22 15:48:09'),(33,1,'aaa','logout','User logged out','::1','2026-05-22 22:40:03'),(34,NULL,'admin1','register','Account created','::1','2026-05-22 22:40:24'),(35,NULL,'admin1','logout','User logged out','::1','2026-05-22 22:40:37'),(36,NULL,'admin1','login','Login successful','::1','2026-05-22 22:40:43'),(37,NULL,'admin1','logout','User logged out','::1','2026-05-22 22:40:46'),(38,6,'admin','login','Login successful','::1','2026-05-22 22:40:50'),(39,6,'admin','admin_delete_user','Deleted user: admin1 (ID: 9)','::1','2026-05-22 22:40:55'),(40,1,'aaa','login','Login successful','::1','2026-05-23 14:16:02'),(41,1,'aaa','expense_create','Grocery - $20 (Food)','::1','2026-05-23 14:24:17'),(42,1,'aaa','expense_update','Grocery - $15 (Food)','::1','2026-05-23 14:24:40'),(43,1,'aaa','expense_update','Grocery - $15 (Food)','::1','2026-05-23 14:24:46'),(44,1,'aaa','expense_delete','Grocery - $15.00','::1','2026-05-23 14:24:55'),(45,1,'aab','profile_update','username: aab','::1','2026-05-23 14:26:20'),(46,1,'aaa','profile_update','username: aaa','::1','2026-05-23 14:26:32'),(47,1,'aaa','logout','User logged out','::1','2026-05-23 14:26:48'),(48,NULL,'bbb','register','Account created','::1','2026-05-23 14:27:07'),(49,NULL,'bbb','expense_create','transport - $1.55 (Transport)','::1','2026-05-23 14:27:34'),(50,NULL,'bbb','expense_delete','transport - $1.55','::1','2026-05-23 14:27:43'),(51,NULL,'bbb','account_delete','Account deleted by user','::1','2026-05-23 14:27:50'),(53,6,'admin','login_failed','Wrong password','::1','2026-05-23 14:27:55'),(54,6,'admin','login','Login successful','::1','2026-05-23 14:28:00'),(55,6,'admin','logout','User logged out','::1','2026-05-23 14:54:28'),(56,1,'aaa','login','Login successful','::1','2026-05-23 14:54:32'),(57,1,'aaa','logout','User logged out','::1','2026-05-23 14:55:24'),(58,6,'admin','login','Login successful','::1','2026-05-23 14:55:29'),(59,6,'admin','logout','User logged out','::1','2026-05-23 14:57:34'),(60,1,'aaa','login','Login successful','::1','2026-05-23 14:57:37'),(61,1,'aaa','logout','User logged out','::1','2026-05-23 14:58:43'),(62,6,'admin','login','Login successful','::1','2026-05-23 14:58:46'),(63,6,'admin','logout','User logged out','::1','2026-05-23 14:59:23'),(64,1,'aaa','login_failed','Wrong password','::1','2026-05-23 14:59:27'),(65,1,'aaa','login','Login successful','::1','2026-05-23 14:59:29'),(66,1,'aaa','logout','User logged out','::1','2026-05-23 15:02:17'),(67,6,'admin','login','Login successful','::1','2026-05-23 15:02:20'),(68,6,'admin','logout','User logged out','::1','2026-05-23 15:02:36'),(69,6,'admin','login','Login successful','::1','2026-05-23 15:02:47'),(70,6,'admin','admin_create_user','Created user: aab (aab@gmail.com)','::1','2026-05-23 15:05:36'),(71,6,'admin','admin_edit_user','Edited user 11: username: aabc, email: aab@gmail.com','::1','2026-05-23 15:05:46'),(72,6,'admin','admin_reset_password','Reset password for: aabc (ID: 11)','::1','2026-05-23 15:06:31'),(73,6,'admin','admin_edit_user','Edited user 11: username: aab, email: aab@gmail.com','::1','2026-05-23 15:09:58'),(74,6,'admin','admin_reset_password','Reset password for: aab (ID: 11)','::1','2026-05-23 15:10:06'),(75,6,'admin','admin_delete_user','Deleted user: aab (ID: 11)','::1','2026-05-23 15:10:09'),(76,6,'admin','admin_create_user','Created user: aaaa (aaa@gmail.com)','::1','2026-05-23 15:10:24'),(77,6,'admin','admin_delete_user','Deleted user: aaaa (ID: 12)','::1','2026-05-23 15:10:27'),(78,6,'admin','logout','User logged out','::1','2026-05-23 15:21:45'),(79,1,'aaa','login','Login successful','::1','2026-05-23 15:21:48'),(80,1,'aaa','logout','User logged out','::1','2026-05-23 15:27:07'),(81,6,'admin','login','Login successful','::1','2026-05-23 15:27:10');
/*!40000 ALTER TABLE `user_activity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(15) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'aaa','aa@gmail.com','$2b$10$HXJh1TTHhHCNKuv760kNq.ZPJbpQnF.8BKUGNYKAKQoCp7ELeTHgG','2026-05-13 23:44:28','2026-05-23 14:26:32'),(6,'admin','admin@gmail.com','$2b$10$gzo7Wyr6Zqiunyns.sXIBOgw1t6oxpUbNWRtmZ6C4hhqoJE/6JERO','2026-05-21 13:17:07','2026-05-21 13:17:07');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-24  1:45:42
