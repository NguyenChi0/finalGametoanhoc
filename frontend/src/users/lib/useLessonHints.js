/**
 * React hook quản lý pool gợi ý (hint) trong một lượt chơi bài.
 * Ẩn ngẫu nhiên 2 đáp án sai mỗi lần dùng; mỗi câu tối đa 1 lần hint.
 */
import { useCallback, useState } from "react";

/**
 * Chọn ngẫu nhiên tối đa 2 chỉ số đáp án có `correct !== true`.
 *
 * @param {Array} answers - Mảng đáp án câu hiện tại.
 * @returns {number[]} Mảng index (0-based) cần ẩn trên UI.
 */
function pickTwoWrongIndices(answers) {
  const wrong = answers
    .map((a, i) => (!a?.correct ? i : -1))
    .filter((i) => i >= 0);
  const shuffled = [...wrong].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(2, shuffled.length));
}

/**
 * Hook hint theo phiên — đọc pool từ `payload.itemEffects.hintQuestionsPerLesson`.
 *
 * Luồng khởi tạo:
 * - `reviewMode` → pool = 0 (không hint).
 * - Ngược lại → `hintsRemaining` = tổng hint từ vật phẩm đã chọn mang vào bài.
 *
 * API trả về:
 * - `hintsRemaining` — lượt còn lại trong lượt chơi.
 * - `hasHintFeature` — có item hint hay không (ẩn/hiện nút Gợi ý).
 * - `canUseHint(questionId, answers)` — đủ điều kiện bấm (còn lượt, chưa dùng câu này, ≥3 đáp án, ≥2 sai).
 * - `applyHint(questionId, answers)` — trừ 1 lượt, lưu index ẩn vào Map theo `questionId`.
 * - `getHiddenIndices(questionId)` — Set index cần không render / disable nút đáp án.
 * - `resetHints()` — replay bài: reset pool và state đã dùng.
 *
 * @param {object} [payload] - Payload game từ `gamepage`.
 * @returns {object} API hint cho component MCQ.
 */
export function useLessonHints(payload) {
  const total = payload?.reviewMode
    ? 0
    : Number(payload?.itemEffects?.hintQuestionsPerLesson) || 0;

  const [hintsRemaining, setHintsRemaining] = useState(total);
  const [hintUsedOn, setHintUsedOn] = useState(() => new Set());
  const [hiddenByQuestion, setHiddenByQuestion] = useState(() => new Map());

  const getHiddenIndices = useCallback(
    (questionId) => hiddenByQuestion.get(questionId) ?? new Set(),
    [hiddenByQuestion]
  );

  const canUseHint = useCallback(
    (questionId, answers) => {
      if (!questionId || hintsRemaining <= 0 || hintUsedOn.has(questionId)) {
        return false;
      }
      if (!Array.isArray(answers) || answers.length < 3) return false;
      const wrongCount = answers.filter((a) => !a?.correct).length;
      return wrongCount >= 2;
    },
    [hintsRemaining, hintUsedOn]
  );

  const applyHint = useCallback(
    (questionId, answers) => {
      if (!canUseHint(questionId, answers)) return;
      const picked = pickTwoWrongIndices(answers);
      if (picked.length === 0) return;
      setHiddenByQuestion((prev) => {
        const next = new Map(prev);
        next.set(questionId, new Set(picked));
        return next;
      });
      setHintUsedOn((prev) => new Set(prev).add(questionId));
      setHintsRemaining((n) => Math.max(0, n - 1));
    },
    [canUseHint]
  );

  const resetHints = useCallback(() => {
    setHintsRemaining(total);
    setHintUsedOn(new Set());
    setHiddenByQuestion(new Map());
  }, [total]);

  return {
    hintsRemaining,
    hasHintFeature: total > 0,
    canUseHint,
    applyHint,
    getHiddenIndices,
    resetHints,
  };
}
