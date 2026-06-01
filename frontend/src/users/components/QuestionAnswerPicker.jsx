import React, { useEffect, useState } from "react";
import { questionImageUrl } from "../../api";
import {
  isMultiCorrect,
  normalizeSelected,
} from "../lib/questionScoring";

/**
 * Chọn đáp án: single (một click) hoặc multi (toggle + Xác nhận).
 */
export default function QuestionAnswerPicker({
  answers = [],
  value,
  onConfirm,
  disabled = false,
  hiddenIndices = null,
  renderPrefix,
  classNamePrefix = "q-answer-picker",
  confirmLabel = "Xác nhận",
  multiHint = "Chọn tất cả đáp án đúng",
}) {
  const multi = isMultiCorrect(answers);
  const hidden = hiddenIndices instanceof Set ? hiddenIndices : new Set(hiddenIndices || []);
  const [pending, setPending] = useState(() => new Set(normalizeSelected(value)));

  useEffect(() => {
    setPending(new Set(normalizeSelected(value)));
  }, [value, answers]);

  const confirmed = normalizeSelected(value);
  const locked = disabled || (!multi && confirmed.length > 0);

  function toggle(idx) {
    if (locked || hidden.has(idx)) return;
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
  }

  function handleConfirm() {
    if (!multi || locked) return;
    onConfirm?.([...pending].sort((a, b) => a - b));
  }

  const displaySelected = multi
    ? locked
      ? new Set(confirmed)
      : pending
    : new Set(confirmed.length ? confirmed : pending);

  return (
    <div className={classNamePrefix}>
      {multi && !locked ? (
        <p className={`${classNamePrefix}__multi-hint`}>{multiHint}</p>
      ) : null}
      <div className={`${classNamePrefix}__list`}>
        {answers.map((a, ai) => {
          if (hidden.has(ai)) return null;
          const isSelected = displaySelected.has(ai);
          const prefix =
            typeof renderPrefix === "function"
              ? renderPrefix(ai)
              : `${String.fromCharCode(65 + ai)}.`;
          return (
            <button
              key={a.id ?? ai}
              type="button"
              className={`${classNamePrefix}__option${
                isSelected ? ` ${classNamePrefix}__option--selected` : ""
              }${multi ? ` ${classNamePrefix}__option--multi` : ""}`}
              disabled={locked && !isSelected}
              onClick={() => toggle(ai)}
              aria-pressed={isSelected}
            >
              <span className={`${classNamePrefix}__prefix`}>{prefix}</span>
              <span className={`${classNamePrefix}__text`}>
                {a.text || (a.image ? "Xem hình" : "")}
              </span>
              {a.image ? (
                <img
                  src={questionImageUrl(a.image) || a.image}
                  alt=""
                  className={`${classNamePrefix}__img`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {multi && !locked ? (
        <button
          type="button"
          className={`${classNamePrefix}__confirm`}
          disabled={pending.size === 0}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </button>
      ) : null}
    </div>
  );
}
