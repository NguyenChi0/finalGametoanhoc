-- Migration: nhiều đáp án đúng trên một câu (bitmask theo slot 0..3)
ALTER TABLE questions
  ADD COLUMN answer_correct_mask TINYINT UNSIGNED NOT NULL DEFAULT 1
  COMMENT 'Bitmask: bit0=answercorrect_*, bit1=answer2_*, bit2=answer3_*, bit3=answer4_*';
