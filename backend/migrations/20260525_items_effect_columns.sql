-- Migration: chức năng vật phẩm (effect_type, lesson_bonus_points, hint_questions)
-- Chạy thủ công trên MySQL database gametoanhoc.

ALTER TABLE `items`
  ADD COLUMN `effect_type` TINYINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT '0=trang trí, 1=cộng điểm hoàn thành bài, 2=hint loại 2 đáp án sai'
    AFTER `level`,
  ADD COLUMN `lesson_bonus_points` INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Điểm cộng thêm khi hoàn thành 1 lesson (effect_type=1)'
    AFTER `effect_type`,
  ADD COLUMN `hint_questions` INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Số câu/bài được dùng hint (effect_type=2)'
    AFTER `lesson_bonus_points`;
