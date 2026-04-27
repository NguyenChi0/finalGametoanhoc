-- Đặt DEFAULT cho `exam_templates.duration_time` (phút) để INSERT không bắt buộc phải truyền khi DB cũ chưa có default.
-- Chạy một lần trên DB thật nếu bạn gặp lỗi: Field 'duration_time' doesn't have a default value

ALTER TABLE `exam_templates`
  MODIFY COLUMN `duration_time` smallint unsigned NOT NULL DEFAULT 30 COMMENT 'Thời gian làm bài (phút)';
