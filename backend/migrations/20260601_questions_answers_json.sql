-- Một cột JSON chứa toàn bộ đáp án (text, image, correct).
-- API / game vẫn nhận mảng answers[] — backend map từ answers_json.
-- Dữ liệu cũ (answercorrect_text, answer2_text, ...) giữ nguyên để đọc ngược;
-- sau khi chạy script migrate, có thể xóa các cột cũ (tùy chọn, file 20260602).

ALTER TABLE `questions`
  ADD COLUMN `answers_json` JSON NULL DEFAULT NULL
    COMMENT '[{id,text,image,correct}, ...] tối đa 4 phần tử'
    AFTER `question_image`;
