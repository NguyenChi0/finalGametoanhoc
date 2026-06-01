import { useCallback, useEffect, useState } from "react";
import { isMultiCorrect, normalizeSelected } from "./questionScoring";

/**
 * Trạng thái chọn đáp án MCQ trong game: single (click ngay) hoặc multi (toggle + confirm).
 *
 * @param {Array} answers - Đáp án câu hiện tại.
 * @param {(indices: number[]) => void} onConfirm - Gọi khi đã chọn xong (single hoặc sau Xác nhận).
 * @returns {object}
 */
export function useMultiMcqSelection(answers, onConfirm) {
  const multi = isMultiCorrect(answers);
  const [pending, setPending] = useState(() => new Set());

  useEffect(() => {
    setPending(new Set());
  }, [answers]);

  const onOptionClick = useCallback(
    (idx) => {
      if (!multi) {
        onConfirm?.([idx]);
        return;
      }
      setPending((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
    },
    [multi, onConfirm]
  );

  const confirmMulti = useCallback(() => {
    if (!multi || pending.size === 0) return;
    onConfirm?.([...pending].sort((a, b) => a - b));
  }, [multi, pending, onConfirm]);

  const isOptionSelected = useCallback(
    (idx) => {
      if (!multi) return false;
      return pending.has(idx);
    },
    [multi, pending]
  );

  return {
    multi,
    onOptionClick,
    confirmMulti,
    isOptionSelected,
    canConfirmMulti: multi && pending.size > 0,
  };
}

/** Hiển thị selected sau khi chốt (single index hoặc mảng). */
export function isDisplaySelected(idx, selected) {
  const norm = normalizeSelected(selected);
  return norm.includes(idx);
}
