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
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int NOT NULL,
  `name` varchar(45) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  `link` varchar(200) DEFAULT NULL,
  `require_score` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (1,'Cầu ma thuật cấp 1','Future?Nah, just for the style.','bluebl1000.png',1000),(2,'Gậy ma thuật cấp 1','Phù hợp cho các phù thủy tập sự','bluest7000.png',7000),(3,'Kim cương cấp 1','Một vật phẩm không dành cho số đông','diamond5000.png',5000),(4,'Cầu ma thuật cấp 2','Nó biết điều gì đó','magic5000.png',5000),(5,'Gậy ma thuật cấp 2','Phù hợp cho các phù thủy cao cấp hơn','redst10000.png',10000),(6,'Song kiếm cấp 1','Dành cho các kiếm sĩ tập sự','sword8000.png',8000),(7,'King Golden crown ','Biểu trưng của uy quyền ','yellowcr20000.png',20000),(8,'Queen Golden Crown ','Biểu trưng của uy quyền','yellowcr22000.png',22000),(9,'123','123','/items-images/ac82755c-27b5-4a70-b9a8-55be2b287f18.jpg',123);
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_items`
--

DROP TABLE IF EXISTS `user_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `purchased_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `user_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_items`
--

LOCK TABLES `user_items` WRITE;
/*!40000 ALTER TABLE `user_items` DISABLE KEYS */;
INSERT INTO `user_items` VALUES (1,1,4,'2025-10-15 03:09:34'),(2,1,4,'2025-10-15 03:09:42');
/*!40000 ALTER TABLE `user_items` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 16:27:48
