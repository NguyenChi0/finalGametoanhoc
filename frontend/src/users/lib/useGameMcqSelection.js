import { useCallback, useState } from "react";
import {
  getCorrectIndices,
  isAnswerSetFullyCorrect,
  normalizeSelectedIndices,
} from "./questionScoring";

export function isMultiCorrectQuestion(answers) {
  return getCorrectIndices(answers).length > 1;
}

export function getMcqAnswerVisualState(
  pendingIndices,
  confirmedIndices,
  answerIndex,
  answer
) {
  const pending = normalizeSelectedIndices(pendingIndices);
  const confirmed = normalizeSelectedIndices(confirmedIndices);
  const locked = confirmed.length > 0;
  const isSelected = locked
    ? confirmed.includes(answerIndex)
    : pending.includes(answerIndex);

  if (!locked) {
    return { locked: false, isSelected, showMissedCorrect: false, tone: "idle" };
  }

  const chosen = isSelected;
  if (chosen && answer?.correct) {
    return { locked: true, isSelected: true, showMissedCorrect: false, tone: "correct" };
  }
  if (chosen && !answer?.correct) {
    return { locked: true, isSelected: true, showMissedCorrect: false, tone: "wrong" };
  }
  if (!chosen && answer?.correct) {
    return { locked: true, isSelected: false, showMissedCorrect: true, tone: "missed" };
  }
  return { locked: true, isSelected: false, showMissedCorrect: false, tone: "neutral" };
}

export function useGameMcqSelection() {
  const [pendingByQ, setPendingByQ] = useState({});
  const [confirmedByQ, setConfirmedByQ] = useState({});
  const [resultByQ, setResultByQ] = useState({});

  const isLocked = useCallback(
    (questionId) => confirmedByQ[questionId] !== undefined,
    [confirmedByQ]
  );

  const getPendingIndices = useCallback(
    (questionId) => pendingByQ[questionId] ?? [],
    [pendingByQ]
  );

  const getConfirmedIndices = useCallback(
    (questionId) => confirmedByQ[questionId],
    [confirmedByQ]
  );

  const getLastResult = useCallback(
    (questionId) => resultByQ[questionId] ?? null,
    [resultByQ]
  );

  const revealAfterConfirm = useCallback(
    (questionId) => confirmedByQ[questionId] !== undefined,
    [confirmedByQ]
  );

  const resetAll = useCallback(() => {
    setPendingByQ({});
    setConfirmedByQ({});
    setResultByQ({});
  }, []);

  const confirmSelection = useCallback(
    (questionId, answers, indices) => {
      if (confirmedByQ[questionId] !== undefined) {
        return resultByQ[questionId] === "correct";
      }
      const sel = normalizeSelectedIndices(
        indices !== undefined ? indices : pendingByQ[questionId]
      );
      const ok = isAnswerSetFullyCorrect(sel, answers);
      setConfirmedByQ((prev) => ({ ...prev, [questionId]: sel }));
      setResultByQ((prev) => ({
        ...prev,
        [questionId]: ok ? "correct" : "wrong",
      }));
      setPendingByQ((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      return ok;
    },
    [confirmedByQ, pendingByQ, resultByQ]
  );

  const toggleIndex = useCallback(
    (questionId, answers, index) => {
      if (confirmedByQ[questionId] !== undefined) return null;
      if (!isMultiCorrectQuestion(answers)) {
        return confirmSelection(questionId, answers, [index]);
      }
      setPendingByQ((prev) => {
        const cur = prev[questionId] ?? [];
        const next = cur.includes(index)
          ? cur.filter((i) => i !== index)
          : [...cur, index].sort((a, b) => a - b);
        return { ...prev, [questionId]: next };
      });
      return null;
    },
    [confirmSelection, confirmedByQ]
  );

  const confirmPending = useCallback(
    (questionId, answers) => confirmSelection(questionId, answers),
    [confirmSelection]
  );

  return {
    isLocked,
    getPendingIndices,
    getConfirmedIndices,
    getLastResult,
    revealAfterConfirm,
    isMultiCorrectQuestion,
    toggleIndex,
    confirmPending,
    resetAll,
  };
}
