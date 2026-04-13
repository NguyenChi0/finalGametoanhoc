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
-- Table structure for table `contests`
--

DROP TABLE IF EXISTS `contests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grade_id` tinyint unsigned NOT NULL,
  `template_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0: upcoming, 1: running, 2: ended',
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `week_start` (`grade_id`),
  KEY `template_id` (`template_id`),
  KEY `idx_time` (`start_time`,`end_time`),
  KEY `idx_status` (`status`),
  KEY `idx_grade` (`grade_id`),
  CONSTRAINT `contests_ibfk_1` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`),
  CONSTRAINT `contests_ibfk_2` FOREIGN KEY (`template_id`) REFERENCES `exam_templates` (`id`),
  CONSTRAINT `chk_status` CHECK ((`status` in (0,1,2))),
  CONSTRAINT `chk_time` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contests`
--

LOCK TABLES `contests` WRITE;
/*!40000 ALTER TABLE `contests` DISABLE KEYS */;
/*!40000 ALTER TABLE `contests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_template_questions`
--

DROP TABLE IF EXISTS `exam_template_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_template_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `question_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `exam_template_questions_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `exam_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `exam_template_questions_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_template_questions`
--

LOCK TABLES `exam_template_questions` WRITE;
/*!40000 ALTER TABLE `exam_template_questions` DISABLE KEYS */;
INSERT INTO `exam_template_questions` VALUES (11,1,2),(12,1,3),(13,1,4),(14,1,9),(15,1,10),(16,1,11),(17,1,12),(18,1,121),(19,1,122),(20,1,1),(21,1,126),(22,1,128);
/*!40000 ALTER TABLE `exam_template_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_templates`
--

DROP TABLE IF EXISTS `exam_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `grade_id` tinyint unsigned NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `grade_id` (`grade_id`),
  CONSTRAINT `exam_templates_ibfk_1` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_templates`
--

LOCK TABLES `exam_templates` WRITE;
/*!40000 ALTER TABLE `exam_templates` DISABLE KEYS */;
INSERT INTO `exam_templates` VALUES (1,'Đề kiểm tra giữa kỳ 1 - Lớp 1',1,'Ôn về cộng trừ dưới 10','2026-04-13 09:20:46');
/*!40000 ALTER TABLE `exam_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `grade_id` tinyint unsigned NOT NULL,
  `type_id` smallint unsigned NOT NULL,
  `lesson_id` smallint unsigned NOT NULL,
  `question_text` text NOT NULL,
  `question_image` varchar(1024) DEFAULT NULL,
  `answercorrect_text` varchar(45) DEFAULT NULL,
  `answer2_text` varchar(45) DEFAULT NULL,
  `answer3_text` varchar(45) DEFAULT NULL,
  `answer4_text` varchar(45) DEFAULT NULL,
  `answercorrect_image` varchar(45) DEFAULT NULL,
  `answer2_image` varchar(45) DEFAULT NULL,
  `answer3_image` varchar(45) DEFAULT NULL,
  `answer4_image` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_grade` (`grade_id`),
  KEY `idx_type` (`type_id`),
  KEY `idx_lesson` (`lesson_id`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`type_id`) REFERENCES `types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `questions_ibfk_3` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=380 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `questions`
--

LOCK TABLES `questions` WRITE;
/*!40000 ALTER TABLE `questions` DISABLE KEYS */;
INSERT INTO `questions` VALUES (1,1,1,1,'2 + 3 = ?',NULL,'5','6','4','2',NULL,NULL,NULL,NULL),(2,1,1,1,'5 + 4 = ?',NULL,'9','8','10','7',NULL,NULL,NULL,NULL),(3,1,1,2,'7 - 2 = ?',NULL,'5','6','4','9',NULL,NULL,NULL,NULL),(4,1,1,2,'9 - 5 = ?',NULL,'4','3','5','6',NULL,NULL,NULL,NULL),(9,1,2,5,'Lan có 3 quả táo, mẹ cho thêm 2 quả. Hỏi Lan có tất cả bao nhiêu quả táo?',NULL,'5','6','4','7',NULL,NULL,NULL,NULL),(10,1,2,5,'Nhà có 4 con gà, mua thêm 3 con. Hỏi có tất cả bao nhiêu con gà?',NULL,'7','6','8','5',NULL,NULL,NULL,NULL),(11,1,2,6,'Có 7 cái kẹo, ăn 2 cái. Hỏi còn lại bao nhiêu cái?',NULL,'5','6','4','9',NULL,NULL,NULL,NULL),(12,1,2,6,'Có 9 quả bóng, cho bạn 4 quả. Hỏi còn lại bao nhiêu quả?',NULL,'5','4','6','7',NULL,NULL,NULL,NULL),(17,1,3,9,'Hình vuông có mấy cạnh?',NULL,'4','6','8','5',NULL,NULL,NULL,NULL),(18,1,3,9,'Hình tam giác có mấy cạnh?',NULL,'3','2','5','4',NULL,NULL,NULL,NULL),(25,2,4,13,'15 + 25 = ?',NULL,'40','35','45','50',NULL,NULL,NULL,NULL),(26,2,4,13,'38 + 17 = ?',NULL,'55','45','50','60',NULL,NULL,NULL,NULL),(27,2,4,14,'50 - 25 = ?',NULL,'25','20','30','35',NULL,NULL,NULL,NULL),(28,2,4,14,'72 - 38 = ?',NULL,'34','32','36','40',NULL,NULL,NULL,NULL),(29,2,4,15,'6 × 7 = ?',NULL,'42','36','48','49',NULL,NULL,NULL,NULL),(30,2,4,15,'8 × 9 = ?',NULL,'72','64','81','80',NULL,NULL,NULL,NULL),(31,2,4,16,'56 ÷ 7 = ?',NULL,'8','7','9','6',NULL,NULL,NULL,NULL),(32,2,4,16,'81 ÷ 9 = ?',NULL,'9','8','7','10',NULL,NULL,NULL,NULL),(33,2,5,17,'Một cửa hàng có 45 quyển vở, nhập thêm 25 quyển. Hỏi có tất cả bao nhiêu quyển vở?',NULL,'70','65','75','80',NULL,NULL,NULL,NULL),(34,2,5,17,'Lớp 2A có 32 học sinh, lớp 2B có 28 học sinh. Hỏi cả hai lớp có bao nhiêu học sinh?',NULL,'60','55','65','70',NULL,NULL,NULL,NULL),(35,2,5,18,'Có 80 viên kẹo, chia cho 40 bạn. Mỗi bạn được mấy viên?',NULL,'2','3','4','1',NULL,NULL,NULL,NULL),(36,2,5,18,'Mẹ có 60.000 đồng, mua sách hết 35.000 đồng. Hỏi còn lại bao nhiêu tiền?',NULL,'25.000','20.000','30.000','35.000',NULL,NULL,NULL,NULL),(37,2,5,19,'Mỗi hộp có 6 cái bút, 7 hộp có bao nhiêu cái bút?',NULL,'42','36','48','49',NULL,NULL,NULL,NULL),(38,2,5,19,'Mỗi túi có 8 kg gạo, 9 túi có bao nhiêu kg gạo?',NULL,'72','64','81','80',NULL,NULL,NULL,NULL),(39,2,5,20,'Có 56 viên bi, chia đều cho 7 bạn. Mỗi bạn được mấy viên?',NULL,'8','7','9','6',NULL,NULL,NULL,NULL),(40,2,5,20,'Có 81 quả cam, xếp vào 9 giỏ. Mỗi giỏ có mấy quả?',NULL,'9','8','7','10',NULL,NULL,NULL,NULL),(121,1,1,1,'1 + 5',NULL,'6','7','8','9',NULL,NULL,NULL,NULL),(122,1,1,1,'2 + 6',NULL,'8','6','7','9',NULL,NULL,NULL,NULL),(123,1,1,1,'8 + 4',NULL,'12','14','13','10',NULL,NULL,NULL,NULL),(124,1,1,1,'8 + 3',NULL,'11','12','15','10',NULL,NULL,NULL,NULL),(125,1,1,1,'7 + 5',NULL,'12','13','14','11',NULL,NULL,NULL,NULL),(126,1,1,1,'4 + 6',NULL,'10','11','9','12',NULL,NULL,NULL,NULL),(127,1,1,1,'9 + 8',NULL,'17','16','15','18',NULL,NULL,NULL,NULL),(128,1,1,1,'4 + 2',NULL,'6','5','8','7',NULL,NULL,NULL,NULL),(129,1,1,1,'6 + 8',NULL,'14','15','13','16',NULL,NULL,NULL,NULL),(130,1,1,1,'3 + 9',NULL,'12','11','13','15',NULL,NULL,NULL,NULL),(132,1,1,1,'4 + 3',NULL,'7','5','8','9',NULL,NULL,NULL,NULL),(133,1,3,9,'Có bao nhiêu hình tròn','/hh1-cauhoi/ques4hinhtron.png','4','5','3','6',NULL,NULL,NULL,NULL),(134,1,3,9,'Có bao nhiêu hình vuông','/hh1-cauhoi/ques5hinhvuong.png','5','6','4','3',NULL,NULL,NULL,NULL),(135,1,3,9,'Hình này là hình gì','/hh1-cauhoi/queshinhchunhat.png','Hình chữ nhật','Hình tròn','Hình tam giác','Hình méo',NULL,NULL,NULL,NULL),(136,1,3,9,'Hình này là hình gì','/hh1-cauhoi/queshinhvuong.png','Hình vuông','Hình tam giác','Hình lục giác','Hình tròn',NULL,NULL,NULL,NULL),(200,1,1,2,'8 - 3',NULL,'5','3','6','7',NULL,NULL,NULL,NULL),(201,1,1,2,'8 - 7',NULL,'1','2','3','4',NULL,NULL,NULL,NULL),(202,1,1,2,'5 - 3',NULL,'2','3','1','5',NULL,NULL,NULL,NULL),(203,1,1,2,'9 - 3',NULL,'6','7','4','8',NULL,NULL,NULL,NULL),(204,1,1,2,'12 - 7',NULL,'5','4','3','6',NULL,NULL,NULL,NULL),(205,1,1,2,'3 - 1',NULL,'2','1','3','4',NULL,NULL,NULL,NULL),(206,1,1,2,'5 - 4',NULL,'1','2','3','4',NULL,NULL,NULL,NULL),(207,1,1,2,'9 - 3',NULL,'6','5','4','7',NULL,NULL,NULL,NULL),(208,1,1,2,'9 - 5',NULL,'4','3','2','5',NULL,NULL,NULL,NULL),(209,1,1,2,'2 - 1',NULL,'1','2','3','4','',NULL,NULL,NULL),(210,1,1,2,'5 - 2',NULL,'3','2','1','4',NULL,NULL,NULL,NULL),(211,1,1,2,'7 - 6',NULL,'1','2','4','5',NULL,NULL,NULL,NULL),(212,1,1,2,'7 - 3',NULL,'4','3','2','5',NULL,NULL,NULL,NULL),(213,1,1,2,'8 - 6',NULL,'2','3','4','1',NULL,NULL,NULL,NULL),(214,1,1,2,'8 - 2',NULL,'6','4','5','8',NULL,NULL,NULL,NULL),(215,1,1,2,'8 - 5',NULL,'3','2','4','1',NULL,NULL,NULL,NULL),(216,1,2,5,'Kiệt có 5 quả cam, bạn cho thêm 3 quả. Vậy Kiệt có bao nhiêu táo?',NULL,'8','9','10','7',NULL,NULL,NULL,NULL),(217,1,2,5,'Lan Anh có 3 quả táo, mẹ cho Lan Anh thêm 2 quả táo nữa. Hỏi Lan Anh có tất cả bao nhiêu quả táo?',NULL,'5','4','6','7',NULL,NULL,NULL,NULL),(218,1,2,5,'Trong rổ có 5 quả cam, mẹ mua thêm 4 quả nữa. Hỏi trong rổ có tất cả bao nhiêu quả cam?',NULL,'9','8','7','12',NULL,NULL,NULL,NULL),(219,1,2,5,'Trên cành có 6 con chim, 3 con chim nữa bay tới. Hỏi trên cành có tất cả bao nhiêu con chim?',NULL,'9','10','8','7',NULL,NULL,NULL,NULL),(220,1,2,5,'Trong lớp có 8 bạn nam và 7 bạn nữ. Hỏi cả lớp có bao nhiêu bạn học sinh?',NULL,'15','13','17','16',NULL,NULL,NULL,NULL),(221,1,2,5,'Bé Anh có 9 cái kẹo, bạn Bình cho thêm 1 cái. Hỏi bé Anh có tất cả bao nhiêu cái kẹo?',NULL,'10','13','8','14',NULL,NULL,NULL,NULL),(222,1,2,5,'Bé có 6 chiếc xe đồ chơi, mẹ mua thêm cho 2 chiếc. Hỏi bé có bao nhiêu chiếc xe?',NULL,'8','6','9','10',NULL,NULL,NULL,NULL),(223,1,2,5,'Bình có 7 cái bút, Bình được mẹ mua thêm 4 cái. Hỏi Bình có mấy cái bút?',NULL,'11','14','9','12',NULL,NULL,NULL,NULL),(224,1,2,6,'Có 13 con cá trong hồ, người ta bắt lên 7 con. Hỏi trong hồ còn lại mấy con cá?',NULL,'6','4','8','10',NULL,NULL,NULL,NULL),(225,1,2,6,'Trên cây có 14 con chim, có 9 con bay đi. Hỏi trên cây còn lại bao nhiêu con chim?',NULL,'5','7','3','10',NULL,NULL,NULL,NULL),(226,1,2,6,'Bình có 10 cái bánh, Bình cho bạn 4 cái. Hỏi Bình còn lại bao nhiêu cái bánh?',NULL,'6','4','3','8',NULL,NULL,NULL,NULL),(227,1,2,6,'Có 15 bông hoa trong lọ, mẹ lấy ra 5 bông để cắm ở phòng khách. Hỏi trong lọ còn bao nhiêu bông hoa?',NULL,'10','7','8','9',NULL,NULL,NULL,NULL),(228,1,2,6,'Trên bàn có 11 chiếc kẹo, bé ăn 6 chiếc. Hỏi còn lại mấy chiếc kẹo?',NULL,'5','1','2','3',NULL,NULL,NULL,NULL),(229,1,2,6,'Trong tủ có 8 quyển sách xanh, mẹ lấy ra 3 quyển màu đỏ để đọc. Hỏi trong tủ còn lại bao nhiêu quyển sách màu xanh?',NULL,'8','5','9','4',NULL,NULL,NULL,NULL),(230,1,2,6,'Có 7 con gà trong sân,lúc sau 4 con đi vào chuồng. Hỏi ngoài sân còn lại mấy con gà?',NULL,'3','2','5','1',NULL,NULL,NULL,NULL),(231,1,2,6,'Lan có 9 cái bút chì, Lan làm rơi mất 2 cái. Hỏi Lan còn lại mấy cái bút chì?',NULL,'7','6','9','4',NULL,NULL,NULL,NULL),(232,2,4,13,'25 + 14 = ?',NULL,'39','47','41','37',NULL,NULL,NULL,NULL),(233,2,4,13,'37 + 28 = ?',NULL,'65','63','62','68',NULL,NULL,NULL,NULL),(234,2,4,13,'46 + 33 = …\r ',NULL,'79','52','78','74',NULL,NULL,NULL,NULL),(235,2,4,13,'13 + 19 = …',NULL,'32','67','35','36',NULL,NULL,NULL,NULL),(236,2,4,13,'29 + 40 = …',NULL,'69','35','67','68',NULL,NULL,NULL,NULL),(237,2,4,13,'64 + 25 = …',NULL,'89','95','85','90',NULL,NULL,NULL,NULL),(238,2,4,13,'13 + 45 = …',NULL,'58','76','62','60',NULL,NULL,NULL,NULL),(239,2,4,13,'48 + 17 = …',NULL,'65','45','64','69',NULL,NULL,NULL,NULL),(240,2,4,13,'55 + 35 = …',NULL,'90','67','46',NULL,NULL,NULL,NULL,NULL),(241,2,4,13,'72 + 8 = …',NULL,'80','70','47','65',NULL,NULL,NULL,NULL),(242,2,4,13,'58 + 21 = …',NULL,'79','90','78','65',NULL,NULL,NULL,NULL),(243,2,4,13,'23 + 43 = ?',NULL,'66','57','65','69',NULL,NULL,NULL,NULL),(244,2,4,13,'29 + 54 = ?','','83','45','88','89',NULL,NULL,NULL,NULL),(245,2,4,13,'34 + 42 = ?',NULL,'76','34','73','79',NULL,NULL,NULL,NULL),(246,2,4,14,'87 - 25 = …\n\n',NULL,'62','67','65','58',NULL,NULL,NULL,NULL),(247,2,4,14,'95 - 27 = …',NULL,'68','67','66','65',NULL,NULL,NULL,NULL),(248,2,4,14,'83 - 42 = …',NULL,'41','42','43','40',NULL,NULL,NULL,NULL),(249,2,4,14,'58 - 19 = …',NULL,'39','38','40','33',NULL,NULL,NULL,NULL),(250,2,4,14,'66 - 28 = …',NULL,'38','35','67','37',NULL,NULL,NULL,NULL),(251,2,4,14,'\r91 - 34 = …',NULL,'57','58','54','45',NULL,NULL,NULL,NULL),(252,2,4,14,'99 - 64 = …',NULL,'35','23','36','23',NULL,NULL,NULL,NULL),(278,2,4,14,'60 - 38 = …',NULL,'22','23','24','21',NULL,NULL,NULL,NULL),(279,2,4,15,'2 × 3 = ?',NULL,'6','5','8','9',NULL,NULL,NULL,NULL),(280,2,4,15,'4 × 5 = ?',NULL,'20','18','25','16',NULL,NULL,NULL,NULL),(281,2,4,15,'6 × 7 = ?',NULL,'42','36','48','49',NULL,NULL,NULL,NULL),(282,2,4,15,'8 × 9 = ?',NULL,'72','64','81','80',NULL,NULL,NULL,NULL),(283,2,4,15,'3 × 8 = ?',NULL,'24','21','27','32',NULL,NULL,NULL,NULL),(284,2,4,15,'7 × 6 = ?',NULL,'42','36','48','49',NULL,NULL,NULL,NULL),(285,2,4,15,'9 × 4 = ?',NULL,'36','32','40','45',NULL,NULL,NULL,NULL),(286,2,4,15,'5 × 5 = ?',NULL,'25','20','30','15',NULL,NULL,NULL,NULL),(287,2,4,15,'2 × 9 = ?',NULL,'18','16','20','14',NULL,NULL,NULL,NULL),(288,2,4,15,'8 × 3 = ?',NULL,'24','21','27','32',NULL,NULL,NULL,NULL),(289,2,4,15,'4 × 7 = ?',NULL,'28','24','32','35',NULL,NULL,NULL,NULL),(290,2,4,15,'6 × 6 = ?',NULL,'36','32','40','42',NULL,NULL,NULL,NULL),(291,2,4,15,'9 × 2 = ?',NULL,'18','16','20','14',NULL,NULL,NULL,NULL),(292,2,4,15,'7 × 4 = ?',NULL,'28','24','32','35',NULL,NULL,NULL,NULL),(293,2,4,15,'3 × 7 = ?',NULL,'21','18','24','28',NULL,NULL,NULL,NULL),(294,2,4,15,'5 × 8 = ?',NULL,'40','35','45','48',NULL,NULL,NULL,NULL),(295,2,4,15,'9 × 5 = ?',NULL,'45','40','50','35',NULL,NULL,NULL,NULL),(296,2,4,15,'6 × 4 = ?',NULL,'24','20','28','32',NULL,NULL,NULL,NULL),(297,2,4,15,'8 × 7 = ?',NULL,'56','49','63','64',NULL,NULL,NULL,NULL),(298,2,4,15,'4 × 9 = ?',NULL,'36','32','40','45',NULL,NULL,NULL,NULL),(299,2,4,16,'12 ÷ 3 = ?',NULL,'4','3','6','5',NULL,NULL,NULL,NULL),(300,2,4,16,'20 ÷ 4 = ?',NULL,'5','4','6','7',NULL,NULL,NULL,NULL),(301,2,4,16,'56 ÷ 7 = ?',NULL,'8','7','9','6',NULL,NULL,NULL,NULL),(302,2,4,16,'81 ÷ 9 = ?',NULL,'9','8','7','10',NULL,NULL,NULL,NULL),(303,2,4,16,'24 ÷ 6 = ?',NULL,'4','3','5','6',NULL,NULL,NULL,NULL),(304,2,4,16,'36 ÷ 4 = ?',NULL,'9','8','7','6',NULL,NULL,NULL,NULL),(305,2,4,16,'45 ÷ 5 = ?',NULL,'9','8','7','10',NULL,NULL,NULL,NULL),(306,2,4,16,'28 ÷ 7 = ?',NULL,'4','3','5','6',NULL,NULL,NULL,NULL),(307,2,4,16,'32 ÷ 8 = ?',NULL,'4','3','5','6',NULL,NULL,NULL,NULL),(308,2,4,16,'18 ÷ 2 = ?',NULL,'9','8','7','6',NULL,NULL,NULL,NULL),(309,2,4,16,'27 ÷ 3 = ?',NULL,'9','8','7','6',NULL,NULL,NULL,NULL),(310,2,4,16,'48 ÷ 6 = ?',NULL,'8','7','9','6',NULL,NULL,NULL,NULL),(311,2,4,16,'63 ÷ 7 = ?',NULL,'9','8','7','6',NULL,NULL,NULL,NULL),(312,2,4,16,'35 ÷ 5 = ?',NULL,'7','6','8','5',NULL,NULL,NULL,NULL),(313,2,4,16,'42 ÷ 6 = ?',NULL,'7','6','8','5',NULL,NULL,NULL,NULL),(314,2,4,16,'54 ÷ 9 = ?',NULL,'6','5','7','8',NULL,NULL,NULL,NULL),(315,2,4,16,'16 ÷ 4 = ?',NULL,'4','3','5','6',NULL,NULL,NULL,NULL),(316,2,4,16,'40 ÷ 8 = ?',NULL,'5','4','6','7',NULL,NULL,NULL,NULL),(317,2,4,16,'72 ÷ 9 = ?',NULL,'8','7','9','6',NULL,NULL,NULL,NULL),(318,2,4,16,'30 ÷ 5 = ?',NULL,'6','5','7','8',NULL,NULL,NULL,NULL),(319,2,5,19,'Mỗi bàn có 2 bạn ngồi. Hỏi 6 bàn như thế có bao nhiêu bạn?',NULL,'12','10','14','8',NULL,NULL,NULL,NULL),(320,2,5,19,'Mỗi hộp có 5 cái bánh. Hỏi 4 hộp như thế có bao nhiêu cái bánh?',NULL,'20','18','25','15',NULL,NULL,NULL,NULL),(321,2,5,19,'Mỗi con gà có 2 chân. Hỏi 8 con gà có bao nhiêu chân?',NULL,'16','14','18','10',NULL,NULL,NULL,NULL),(322,2,5,19,'Mỗi túi có 3 quả cam. Hỏi 7 túi như thế có bao nhiêu quả cam?',NULL,'21','18','24','28',NULL,NULL,NULL,NULL),(323,2,5,19,'Mỗi ngày Lan học 4 giờ. Hỏi 5 ngày Lan học bao nhiêu giờ?',NULL,'20','18','25','15',NULL,NULL,NULL,NULL),(324,2,5,19,'Mỗi lọ có 6 bông hoa. Hỏi 3 lọ như thế có bao nhiêu bông hoa?',NULL,'18','15','21','24',NULL,NULL,NULL,NULL),(325,2,5,19,'Mỗi xe đạp có 2 bánh. Hỏi 9 xe đạp có bao nhiêu bánh xe?',NULL,'18','16','20','14',NULL,NULL,NULL,NULL),(326,2,5,19,'Mỗi giỏ có 8 quả trứng. Hỏi 4 giỏ như thế có bao nhiêu quả trứng?',NULL,'32','28','36','40',NULL,NULL,NULL,NULL),(327,2,5,19,'Mỗi tổ có 4 học sinh. Hỏi 5 tổ như thế có bao nhiêu học sinh?',NULL,'20','18','25','15',NULL,NULL,NULL,NULL),(328,2,5,19,'Mỗi thùng có 7 chai sữa. Hỏi 6 thùng như thế có bao nhiêu chai sữa?',NULL,'42','36','48','49',NULL,NULL,NULL,NULL),(329,2,5,19,'Mỗi bao có 5 kg gạo. Hỏi 8 bao như thế có bao nhiêu kg gạo?',NULL,'40','35','45','48',NULL,NULL,NULL,NULL),(330,2,5,19,'Mỗi bàn có 3 cái ghế. Hỏi 7 bàn như thế có bao nhiêu cái ghế?',NULL,'21','18','24','28',NULL,NULL,NULL,NULL),(331,2,5,19,'Mỗi ngăn kéo có 9 cuốn vở. Hỏi 3 ngăn kéo có bao nhiêu cuốn vở?',NULL,'27','24','30','36',NULL,NULL,NULL,NULL),(332,2,5,19,'Mỗi chuồng có 4 con thỏ. Hỏi 6 chuồng như thế có bao nhiêu con thỏ?',NULL,'24','20','28','32',NULL,NULL,NULL,NULL),(333,2,5,20,'Có 18 cái kẹo chia đều cho 3 bạn. Hỏi mỗi bạn được mấy cái kẹo?',NULL,'6','5','7','8',NULL,NULL,NULL,NULL),(334,2,5,20,'Có 24 quả cam xếp đều vào 4 giỏ. Hỏi mỗi giỏ có bao nhiêu quả cam?',NULL,'6','5','7','8',NULL,NULL,NULL,NULL),(335,2,5,20,'Có 35 học sinh chia đều vào 5 tổ. Hỏi mỗi tổ có bao nhiêu học sinh?',NULL,'7','6','8','5',NULL,NULL,NULL,NULL),(336,2,5,20,'Có 28 cái bánh chia đều cho 4 bạn. Hỏi mỗi bạn được mấy cái bánh?',NULL,'7','6','8','5',NULL,NULL,NULL,NULL),(337,2,5,20,'Có 30 viên bi chia đều cho 6 bạn. Hỏi mỗi bạn được mấy viên bi?',NULL,'5','4','6','7',NULL,NULL,NULL,NULL),(338,2,5,20,'Có 36 bông hoa cắm đều vào 6 lọ. Hỏi mỗi lọ có bao nhiêu bông hoa?',NULL,'6','5','7','8',NULL,NULL,NULL,NULL),(339,2,5,20,'Có 42 quyển vở chia đều cho 7 bạn. Hỏi mỗi bạn được bao nhiêu quyển vở?',NULL,'6','5','7','8',NULL,NULL,NULL,NULL),(340,2,5,20,'Có 27 cái bút chia đều vào 3 hộp. Hỏi mỗi hộp có bao nhiêu cái bút?',NULL,'9','8','7','6',NULL,NULL,NULL,NULL),(341,2,5,20,'Có 32 kg gạo đóng đều vào 8 túi. Hỏi mỗi túi có bao nhiêu kg gạo?',NULL,'4','3','5','6',NULL,NULL,NULL,NULL),(342,2,5,20,'Có 45 viên sỏi chia đều vào 9 hộp. Hỏi mỗi hộp có bao nhiêu viên sỏi?',NULL,'5','4','6','7',NULL,NULL,NULL,NULL),(343,2,5,20,'Có 21 quả táo chia đều cho 3 bạn. Hỏi mỗi bạn được mấy quả táo?',NULL,'7','6','8','5',NULL,NULL,NULL,NULL),(344,2,5,20,'Có 40 cái kẹo chia đều cho 5 bạn. Hỏi mỗi bạn được mấy cái kẹo?',NULL,'8','7','9','6',NULL,NULL,NULL,NULL),(345,2,5,20,'Có 54 trang giấy chia đều cho 6 bạn. Hỏi mỗi bạn được bao nhiêu trang giấy?',NULL,'9','8','7','6',NULL,NULL,NULL,NULL),(346,2,5,20,'Có 48 hạt đậu chia đều vào 8 lọ. Hỏi mỗi lọ có bao nhiêu hạt đậu?',NULL,'6','5','7','8',NULL,NULL,NULL,NULL),(347,2,5,17,'Lớp 2A có 15 bạn nam và 13 bạn nữ. Hỏi lớp 2A có tất cả bao nhiêu bạn?',NULL,'28','27','29','30',NULL,NULL,NULL,NULL),(348,2,5,17,'Hôm qua, mẹ mua 12 quả trứng. Hôm nay, mẹ mua thêm 18 quả trứng. Hỏi mẹ đã mua tất cả bao nhiêu quả trứng?',NULL,'30','28','32','26',NULL,NULL,NULL,NULL),(349,2,5,17,'Trong vườn có 25 cây cam và 14 cây bưởi. Hỏi trong vườn có tất cả bao nhiêu cây?',NULL,'39','38','40','41',NULL,NULL,NULL,NULL),(350,2,5,17,'Bạn Hoa có 17 viên bi đỏ và 15 viên bi xanh. Hỏi Hoa có tất cả bao nhiêu viên bi?',NULL,'32','31','33','34',NULL,NULL,NULL,NULL),(351,2,5,17,'Thùng thứ nhất đựng 23 lít nước, thùng thứ hai đựng 19 lít nước. Hỏi cả hai thùng đựng bao nhiêu lít nước?',NULL,'42','41','43','44',NULL,NULL,NULL,NULL),(352,2,5,17,'Một cửa hàng buổi sáng bán được 35 kg gạo, buổi chiều bán được 28 kg gạo. Hỏi cả ngày cửa hàng bán được bao nhiêu kg gạo?',NULL,'63','62','64','65',NULL,NULL,NULL,NULL),(353,2,5,17,'Đội Một trồng được 27 cây, đội Hai trồng được 25 cây. Hỏi cả hai đội trồng được bao nhiêu cây?',NULL,'52','51','53','54',NULL,NULL,NULL,NULL),(354,2,5,17,'Lan có 18 cái kẹo, mẹ cho thêm 12 cái kẹo. Hỏi Lan có tất cả bao nhiêu cái kẹo?',NULL,'30','29','31','32',NULL,NULL,NULL,NULL),(355,2,5,17,'Trên giá sách có 14 quyển truyện và 16 quyển sách giáo khoa. Hỏi trên giá sách có tất cả bao nhiêu quyển sách?',NULL,'30','29','31','32',NULL,NULL,NULL,NULL),(356,2,5,17,'Nhà An nuôi 22 con gà và 17 con vịt. Hỏi nhà An nuôi tất cả bao nhiêu con gà và vịt?',NULL,'39','38','40','41',NULL,NULL,NULL,NULL),(357,2,5,17,'Một trang trại có 33 con bò và 26 con trâu. Hỏi trang trại có tất cả bao nhiêu con bò và trâu?',NULL,'59','58','60','61',NULL,NULL,NULL,NULL),(358,2,5,17,'Tổ một thu nhặt được 36 vỏ chai, tổ hai thu nhặt được 24 vỏ chai. Hỏi cả hai tổ thu nhặt được bao nhiêu vỏ chai?',NULL,'60','59','61','62',NULL,NULL,NULL,NULL),(359,2,5,17,'Bác nông dân thu hoạch được 41 kg cà chua và 38 kg khoai tây. Hỏi bác thu hoạch được bao nhiêu kg cả hai loại?',NULL,'79','78','80','81',NULL,NULL,NULL,NULL),(360,2,5,17,'Lớp 2B có 19 học sinh giỏi Toán và 21 học sinh giỏi Tiếng Việt. Hỏi lớp 2B có tất cả bao nhiêu học sinh giỏi?',NULL,'40','39','41','42',NULL,NULL,NULL,NULL),(361,2,5,18,'Một cửa hàng có 56 chiếc áo, đã bán được 23 chiếc. Hỏi cửa hàng còn lại bao nhiêu chiếc áo?',NULL,'33','32','34','35',NULL,NULL,NULL,NULL),(362,2,5,18,'Đoạn dây dài 47 cm, Lan cắt đi 15 cm. Hỏi đoạn dây còn lại dài bao nhiêu cm?',NULL,'32','31','33','34',NULL,NULL,NULL,NULL),(363,2,5,18,'Lớp 2C có 38 học sinh, trong đó có 16 học sinh nữ. Hỏi lớp 2C có bao nhiêu học sinh nam?',NULL,'22','21','23','24',NULL,NULL,NULL,NULL),(364,2,5,18,'Bác Tư nuôi 45 con gà, đã bán đi 12 con. Hỏi bác Tư còn lại bao nhiêu con gà?',NULL,'33','32','34','35',NULL,NULL,NULL,NULL),(365,2,5,18,'Hộp bánh có 36 cái bánh, Mai lấy ra 14 cái. Hỏi trong hộp còn lại bao nhiêu cái bánh?',NULL,'22','21','23','24',NULL,NULL,NULL,NULL),(366,2,5,18,'Tổng số kẹo của Hai và Lan là 50 cái, trong đó Lan có 27 cái. Hỏi Hai có bao nhiêu cái kẹo?',NULL,'23','22','24','25',NULL,NULL,NULL,NULL),(367,2,5,18,'Một xe chở 65 bao gạo, đã bán xuống 28 bao. Hỏi trên xe còn lại bao nhiêu bao gạo?',NULL,'37','36','38','39',NULL,NULL,NULL,NULL),(368,2,5,18,'Cuốn sách có 72 trang, Nam đã đọc 35 trang. Hỏi còn bao nhiêu trang chưa đọc?',NULL,'37','36','38','39',NULL,NULL,NULL,NULL),(369,2,5,18,'Vườn nhà bà có 54 cây hoa hồng, đã chặt 19 cây. Hỏi vườn nhà bà còn bao nhiêu cây hoa hồng?',NULL,'35','34','36','37',NULL,NULL,NULL,NULL),(370,2,5,18,'Thùng nước có 48 lít, đã dùng hết 25 lít. Hỏi thùng còn lại bao nhiêu lít nước?',NULL,'23','22','24','25',NULL,NULL,NULL,NULL),(371,2,5,18,'Hai anh em có 60 viên bi, anh có 35 viên. Hỏi em có bao nhiêu viên bi?',NULL,'25','24','26','27',NULL,NULL,NULL,NULL),(372,2,5,18,'Lớp 2D có 40 học sinh, đi lao động 18 học sinh. Hỏi trong lớp còn lại bao nhiêu học sinh?',NULL,'22','21','23','24',NULL,NULL,NULL,NULL),(373,2,5,18,'Có 57 con vịt ở trên bờ, 25 con xuống ao. Hỏi trên bờ còn lại bao nhiêu con vịt?',NULL,'32','31','33','34',NULL,NULL,NULL,NULL),(374,2,5,18,'Mẹ mua 42 quả cam, đã cho bà 15 quả. Hỏi mẹ còn lại bao nhiêu quả cam?',NULL,'27','26','28','29',NULL,NULL,NULL,NULL),(375,2,4,13,'jghjghj',NULL,'kyuk','yuk','yuk','yuk',NULL,NULL,NULL,NULL),(376,1,1,1,'123123',NULL,'123','123','123','123',NULL,NULL,NULL,NULL),(377,1,1,1,'yjrtj',NULL,'jrtj','rtjrt','rtj','rtj',NULL,NULL,NULL,NULL),(378,1,1,1,'rgrherherhreh',NULL,'sẻhsehs','ẻhserhserh','sẻhserhesr','hserhserhseh',NULL,NULL,NULL,NULL),(379,1,3,9,'test nội dung','/questions-images/b6a0eac0-0744-42a1-ae22-c47777a04a30.png','đúng','đúng 1','đúng sai','sai đúng',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `questions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-13 18:54:27
