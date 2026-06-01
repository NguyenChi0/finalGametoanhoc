-- Migration: đáp án mở rộng (tối đa 8) lưu JSON
ALTER TABLE questions
  ADD COLUMN answers_json JSON NULL
  COMMENT 'Mảng [{text, correct}, ...] tối đa 8; ưu tiên khi đọc API';
