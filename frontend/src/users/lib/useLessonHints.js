import { useCallback, useState } from "react";

function pickTwoWrongIndices(answers) {
  const wrong = answers
    .map((a, i) => (!a?.correct ? i : -1))
    .filter((i) => i >= 0);
  const shuffled = [...wrong].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(2, shuffled.length));
}

/**
 * Pool hint theo phiên chơi bài (từ itemEffects trên payload).
 * Không dùng khi reviewMode.
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
