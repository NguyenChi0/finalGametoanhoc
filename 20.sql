-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: gametoanhoc
-- ------------------------------------------------------
-- Server version	9.3.0

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
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `ma_tre_em` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `score` bigint DEFAULT '0',
  `items` int DEFAULT NULL,
  `week_score` bigint DEFAULT NULL,
  `role` tinyint(1) DEFAULT '0',
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `ma_tre_em` (`ma_tre_em`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'123',NULL,'$2b$08$VK9olrmdM2Da6Wg7xO6Ld.6.THDUBOup8EqAARb4TY0DGz/SlZUkK','2025-10-13 10:17:24',1667,NULL,679,0,'minhanhphung91@gmail.com','+84 945932004'),(5,'username01',NULL,'$2b$08$KeZYBISLmGf53cJ7vWpZTuv8FbSL4sp80oF./xIAZMKX/qooUdHOq','2025-10-14 15:35:27',22,NULL,16,0,'4356','567'),(7,'username02',NULL,'$2b$08$5Dl2cncIiqRmWdcjVgec6.ElGfMjx0IGvAN5Mymf7OkQOa33k/klO','2025-10-14 15:35:36',30,NULL,10,0,'567456','457'),(8,'username03',NULL,'$2b$08$33dZuvYdY2YXgnhWKCnbyuhFeBPc9LxcPufnH1i7UGRA26XMogfsy','2025-10-14 15:36:01',500,NULL,17,0,'547','7546'),(9,'username04',NULL,'$2b$08$vMt87Ug01ASbYBdMPISnbuICazlS7h9yrT/Pf7V5XPeZSer32B.7G','2025-10-14 15:36:04',0,NULL,NULL,0,'4357457','7'),(10,'username05',NULL,'$2b$08$pmmMfJSoRv5HO1/6B6gVhusoQJNCjKPA8bcboGcxlJZgqDKuv8Lia','2025-10-14 15:36:06',8,NULL,8,0,'24565427','5467'),(11,'username06',NULL,'$2b$08$.8pp8UeOoFLYLYV5xPQ5.OiYAPS6a6pz5S8XXVMZWSp3awR6tnqoC','2025-10-14 15:36:09',0,NULL,NULL,0,'547567','546'),(12,'username07',NULL,'$2b$08$9PBFeK.g7Z0PkgZd4zq9NeAxHYJ/EN33RPNfpwHn94RTdZH45lB5u','2025-10-14 15:36:11',0,NULL,NULL,0,'568568','7456'),(13,'username08',NULL,'$2b$08$fVFNEzhaigD5OtqSIUaBvO0rCdN326R1p9VigHz97kQQgWPvdSS72','2025-10-14 15:36:14',0,NULL,NULL,0,'43572457','856'),(14,'admin',NULL,'$2b$08$mwf94C17PtWDoz7u/uGYEeKRFbtg.1D05fa78MmZSVsQUTdRg58d.','2025-10-14 15:36:16',1072,NULL,72,1,'5638','46'),(15,'username10',NULL,'$2b$08$G70N7uhoqQlj/P5ulaQvd.r/BwkE88UmC2RE3JUUxkrv3M/Sx6Hze','2025-10-14 15:36:19',400,NULL,400,0,'367567','37'),(17,'regsreh',NULL,'$2b$08$2GeVzR8IWKeu62X6t4VbROsfdwvL5URBU16IljnD.LRBx5CPQZ1aW','2026-04-14 11:06:59',0,NULL,NULL,0,'etyjj5368563856','3457');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `app_runtime_state`
--

DROP TABLE IF EXISTS `app_runtime_state`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_runtime_state` (
  `key_name` varchar(64) NOT NULL,
  `value_text` varchar(64) NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-27 13:28:43
