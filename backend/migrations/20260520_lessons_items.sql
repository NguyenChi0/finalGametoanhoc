-- Migration: lessons.description/status + items.level (không có bảng games)
-- Chạy thủ công trên MySQL (gametoanhoc).
-- Nếu cột đã tồn tại (vd. từ BACKUP2005(2).sql), bỏ qua lỗi duplicate column.

ALTER TABLE `lessons`
  ADD COLUMN `description` varchar(500) DEFAULT NULL COMMENT 'Mô tả bài học' AFTER `name`,
  ADD COLUMN `status` tinyint NOT NULL DEFAULT 1 COMMENT '0=ẩn, 1=hiện' AFTER `description`;

ALTER TABLE `items`
  ADD COLUMN `level` smallint unsigned NOT NULL DEFAULT 1
    COMMENT '1=thường,2=hiếm,3=đặc biệt,4=sử thi,5=huyền thoại,6=thần thoại'
    AFTER `require_score`;
