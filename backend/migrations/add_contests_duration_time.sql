-- Thêm thời gian làm bài (phút) cho cuộc thi — chạy nếu bảng `contests` chưa có cột này.
-- Khớp schema trong `2.sql` (cột `duration_time`).

ALTER TABLE `contests`
  ADD COLUMN `duration_time` smallint unsigned NOT NULL DEFAULT 30 COMMENT 'Thời gian làm bài (phút)' AFTER `prize`;
