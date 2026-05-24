-- Migration: tiến độ bài học + sao (0–3) theo user
-- Chạy thủ công trên MySQL database gametoanhoc.

CREATE TABLE IF NOT EXISTS `user_lesson_progress` (
  `user_id`        INT NOT NULL,
  `lesson_id`      SMALLINT UNSIGNED NOT NULL,
  `grade_id`       TINYINT UNSIGNED NOT NULL,
  `type_id`        SMALLINT UNSIGNED NOT NULL,
  `game_id`        VARCHAR(32) DEFAULT NULL COMMENT 'game1..game11',
  `correct_count`  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `total_count`    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `stars`          TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=chưa/chưa đạt, 1-3 sao',
  `attempt_count`  INT UNSIGNED NOT NULL DEFAULT 1,
  `completed_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `lesson_id`),
  KEY `idx_user_grade` (`user_id`, `grade_id`),
  KEY `idx_lesson` (`lesson_id`),
  CONSTRAINT `fk_ulp_user`   FOREIGN KEY (`user_id`)   REFERENCES `users`(`id`)   ON DELETE CASCADE,
  CONSTRAINT `fk_ulp_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ulp_grade`  FOREIGN KEY (`grade_id`)  REFERENCES `grades`(`id`),
  CONSTRAINT `fk_ulp_type`   FOREIGN KEY (`type_id`)   REFERENCES `types`(`id`),
  CONSTRAINT `chk_ulp_stars` CHECK (`stars` BETWEEN 0 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
