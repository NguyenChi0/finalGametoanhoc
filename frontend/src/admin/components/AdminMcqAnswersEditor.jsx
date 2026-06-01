import React from "react";

export const MAX_CORRECT_SLOTS = 4;
export const MAX_WRONG_SLOTS = 7;
export const MAX_TOTAL_ANSWERS = MAX_CORRECT_SLOTS + MAX_WRONG_SLOTS;
const DEFAULT_WRONG_SLOTS = 3;

function correctBadgeLabel(index) {
  if (index === 0) return "A";
  return `A${index + 1}`;
}

function wrongBadgeLabel(index) {
  return String.fromCharCode(66 + index);
}

function trimFilled(list) {
  return (Array.isArray(list) ? list : [])
    .map((t) => String(t ?? "").trim())
    .filter(Boolean);
}

function normalizeForm(value) {
  if (value?.correctTexts != null && value?.wrongTexts != null) {
    const correctTexts =
      Array.isArray(value.correctTexts) && value.correctTexts.length > 0
        ? [...value.correctTexts]
        : [""];
    let wrongTexts = Array.isArray(value.wrongTexts) ? [...value.wrongTexts] : [];
    while (wrongTexts.length < DEFAULT_WRONG_SLOTS) {
      wrongTexts.push("");
    }
    return { correctTexts, wrongTexts };
  }
  return createEmptyMcqForm();
}

/**
 * Editor đáp án theo mockup: hàng A (ô nhỏ, đúng), B/C/D (ô dài, sai).
 *
 * @param {{ correctTexts: string[], wrongTexts: string[] }} value
 * @param {(form: { correctTexts: string[], wrongTexts: string[] }) => void} onChange
 */
export default function AdminMcqAnswersEditor({ value, onChange }) {
  const form = normalizeForm(value);
  const { correctTexts, wrongTexts } = form;

  function emit(next) {
    onChange?.(normalizeForm(next));
  }

  function setCorrectAt(index, text) {
    const next = [...correctTexts];
    next[index] = text;
    emit({ correctTexts: next, wrongTexts });
  }

  function setWrongAt(index, text) {
    const next = [...wrongTexts];
    next[index] = text;
    emit({ correctTexts, wrongTexts: next });
  }

  function addCorrectSlot() {
    if (correctTexts.length >= MAX_CORRECT_SLOTS) return;
    emit({ correctTexts: [...correctTexts, ""], wrongTexts });
  }

  function removeCorrectSlot(index) {
    if (correctTexts.length <= 1) return;
    emit({
      correctTexts: correctTexts.filter((_, i) => i !== index),
      wrongTexts,
    });
  }

  function addWrongSlot() {
    if (wrongTexts.length >= MAX_WRONG_SLOTS) return;
    emit({ correctTexts, wrongTexts: [...wrongTexts, ""] });
  }

  function removeWrongSlot(index) {
    if (wrongTexts.length <= DEFAULT_WRONG_SLOTS) return;
    emit({
      correctTexts,
      wrongTexts: wrongTexts.filter((_, i) => i !== index),
    });
  }

  const canAddCorrect = correctTexts.length < MAX_CORRECT_SLOTS;
  const canAddWrong = wrongTexts.length < MAX_WRONG_SLOTS;

  const correctGridCols = Math.min(correctTexts.length, MAX_CORRECT_SLOTS);
  const wrongGridCols =
    wrongTexts.length > DEFAULT_WRONG_SLOTS
      ? Math.min(wrongTexts.length, MAX_WRONG_SLOTS)
      : DEFAULT_WRONG_SLOTS;

  return (
    <div className="admin-mcq-answers">
      <style>{`
        .admin-mcq-answers {
          margin-top: 4px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .admin-mcq-answers__block {
          margin-bottom: 28px;
          width: 100%;
        }
        .admin-mcq-answers__block-title {
          margin: 0 0 12px;
          font-size: 1rem;
          font-weight: 700;
          color: #1f2328;
        }
        .admin-mcq-answers__grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
          align-items: stretch;
        }
        .admin-mcq-answers__grid--wrong {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .admin-mcq-answers__grid--wrong-many {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
        .admin-mcq-answers__cell {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #d0d7de;
          background: #fff;
          box-sizing: border-box;
        }
        .admin-mcq-answers__cell--correct {
          border-color: #96d9a8;
          background: linear-gradient(180deg, #f6ffed 0%, #fff 100%);
        }
        .admin-mcq-answers__cell-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          min-height: 32px;
        }
        .admin-mcq-answers__badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          padding: 0 10px;
          border-radius: 8px;
          background: #f6f8fa;
          border: 1px solid #d0d7de;
          font-weight: 700;
          font-size: 0.95rem;
          color: #24292f;
          flex-shrink: 0;
          box-sizing: border-box;
        }
        .admin-mcq-answers__cell--correct .admin-mcq-answers__badge {
          background: #dafbe1;
          border-color: #2da44e;
          color: #1a7f37;
        }
        .admin-mcq-answers__input {
          width: 100%;
          min-width: 0;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #d0d7de;
          font-size: 0.95rem;
          font-family: inherit;
          box-sizing: border-box;
        }
        .admin-mcq-answers__cell--correct .admin-mcq-answers__input {
          border-color: #96d9a8;
          background: #fff;
        }
        .admin-mcq-answers__input:focus {
          outline: none;
          border-color: #0969da;
          box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
        }
        .admin-mcq-answers__cell--correct .admin-mcq-answers__input:focus {
          border-color: #2da44e;
          box-shadow: 0 0 0 3px rgba(45, 164, 78, 0.2);
        }
        .admin-mcq-answers__remove {
          border: none;
          background: transparent;
          color: #cf222e;
          font-size: 1.2rem;
          line-height: 1;
          padding: 2px 6px;
          border-radius: 6px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .admin-mcq-answers__remove:hover {
          background: #ffebe9;
        }
        .admin-mcq-answers__head-spacer {
          width: 28px;
          flex-shrink: 0;
        }
        .admin-mcq-answers__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 12px;
          width: 100%;
        }
        .admin-mcq-answers__add {
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px dashed #0969da;
          background: #f6f8fa;
          color: #0969da;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          font-family: inherit;
        }
        .admin-mcq-answers__add--correct {
          border-color: #2da44e;
          color: #1a7f37;
          background: #f6ffed;
        }
        .admin-mcq-answers__add--correct:hover:not(:disabled) {
          background: #dafbe1;
        }
        .admin-mcq-answers__add:hover:not(:disabled) {
          background: #ddf4ff;
        }
        .admin-mcq-answers__add:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        @media (max-width: 900px) {
          .admin-mcq-answers__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .admin-mcq-answers__grid--wrong {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 520px) {
          .admin-mcq-answers__grid,
          .admin-mcq-answers__grid--wrong,
          .admin-mcq-answers__grid--wrong-many {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="admin-mcq-answers__block">
        <h3 className="admin-mcq-answers__block-title">Đáp án đúng</h3>
        <div
          className="admin-mcq-answers__grid"
          style={{
            gridTemplateColumns: `repeat(${correctGridCols}, minmax(0, 1fr))`,
          }}
        >
          {correctTexts.map((text, index) => (
            <div
              key={`c-${index}`}
              className="admin-mcq-answers__cell admin-mcq-answers__cell--correct"
            >
              <div className="admin-mcq-answers__cell-head">
                <span className="admin-mcq-answers__badge">{correctBadgeLabel(index)}</span>
                {correctTexts.length > 1 ? (
                  <button
                    type="button"
                    className="admin-mcq-answers__remove"
                    title="Xóa ô đúng"
                    onClick={() => removeCorrectSlot(index)}
                    aria-label={`Xóa ${correctBadgeLabel(index)}`}
                  >
                    ×
                  </button>
                ) : (
                  <span className="admin-mcq-answers__head-spacer" aria-hidden />
                )}
              </div>
              <input
                type="text"
                className="admin-mcq-answers__input"
                value={text}
                placeholder={index === 0 ? "A (đúng)…" : "Đúng…"}
                onChange={(e) => setCorrectAt(index, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="admin-mcq-answers__actions">
          <button
            type="button"
            className="admin-mcq-answers__add admin-mcq-answers__add--correct"
            disabled={!canAddCorrect}
            onClick={addCorrectSlot}
          >
            + Thêm đáp án đúng
          </button>
        </div>
      </div>

      <div className="admin-mcq-answers__block">
        <h3 className="admin-mcq-answers__block-title">Đáp án sai</h3>
        <div
          className="admin-mcq-answers__grid admin-mcq-answers__grid--wrong"
          style={{
            gridTemplateColumns: `repeat(${wrongGridCols}, minmax(0, 1fr))`,
          }}
        >
          {wrongTexts.map((text, index) => (
            <div key={`w-${index}`} className="admin-mcq-answers__cell">
              <div className="admin-mcq-answers__cell-head">
                <span className="admin-mcq-answers__badge">{wrongBadgeLabel(index)}</span>
                {index >= DEFAULT_WRONG_SLOTS ? (
                  <button
                    type="button"
                    className="admin-mcq-answers__remove"
                    title="Xóa đáp án sai"
                    onClick={() => removeWrongSlot(index)}
                    aria-label={`Xóa ${wrongBadgeLabel(index)}`}
                  >
                    ×
                  </button>
                ) : (
                  <span className="admin-mcq-answers__head-spacer" aria-hidden />
                )}
              </div>
              <input
                type="text"
                className="admin-mcq-answers__input"
                value={text}
                placeholder={`${wrongBadgeLabel(index)} (sai)…`}
                onChange={(e) => setWrongAt(index, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="admin-mcq-answers__actions">
          <button
            type="button"
            className="admin-mcq-answers__add"
            disabled={!canAddWrong}
            onClick={addWrongSlot}
          >
            + Thêm đáp án sai
          </button>
        </div>
      </div>
    </div>
  );
}

export function createEmptyMcqForm() {
  return {
    correctTexts: [""],
    wrongTexts: ["", "", ""],
  };
}

/** Form → payload API (answers + correct_indices). */
export function mcqFormToApiPayload(form) {
  const { correctTexts, wrongTexts } = normalizeForm(form);
  const correctFilled = trimFilled(correctTexts);
  const wrongFilled = trimFilled(wrongTexts);

  if (correctFilled.length === 0) {
    return { error: "Cần ít nhất một đáp án đúng (ô A)." };
  }
  if (correctFilled.length > MAX_CORRECT_SLOTS) {
    return { error: `Tối đa ${MAX_CORRECT_SLOTS} đáp án đúng.` };
  }
  if (wrongFilled.length > MAX_WRONG_SLOTS) {
    return { error: `Tối đa ${MAX_WRONG_SLOTS} đáp án sai.` };
  }
  const answers = [...correctFilled, ...wrongFilled];
  if (answers.length < 2) {
    return { error: "Cần ít nhất 2 đáp án có nội dung (ví dụ A + B)." };
  }
  if (answers.length > MAX_TOTAL_ANSWERS) {
    return {
      error: `Tối đa ${MAX_CORRECT_SLOTS} đúng + ${MAX_WRONG_SLOTS} sai (${MAX_TOTAL_ANSWERS} đáp án).`,
    };
  }

  return {
    answers,
    correct_indices: correctFilled.map((_, i) => i),
  };
}

/** API / draft → form. */
export function answersToMcqForm(parts, correctIndices = [0]) {
  if (parts?.correctTexts != null && parts?.wrongTexts != null) {
    return normalizeForm(parts);
  }

  if (Array.isArray(parts) && parts.length > 0 && typeof parts[0] === "object" && "text" in parts[0]) {
    const correct = parts.filter((a) => a.correct).map((a) => a.text ?? "");
    const wrong = parts.filter((a) => !a.correct).map((a) => a.text ?? "");
    return normalizeForm({
      correctTexts: correct.length > 0 ? correct : [""],
      wrongTexts: wrong,
    });
  }

  if (Array.isArray(parts) && parts.length > 0 && typeof parts[0] === "string") {
    const set = new Set(
      Array.isArray(correctIndices) ? correctIndices : [correctIndices]
    );
    const correct = [];
    const wrong = [];
    parts.forEach((text, i) => {
      const t = text ?? "";
      if (set.has(i)) correct.push(t);
      else wrong.push(t);
    });
    return normalizeForm({
      correctTexts: correct.length > 0 ? correct : [""],
      wrongTexts: wrong,
    });
  }

  if (Array.isArray(parts) && parts.length > 0 && typeof parts[0] === "object" && "correct" in parts[0]) {
    return answersToMcqForm(
      parts.map((r) => ({ text: r.text ?? "", correct: !!r.correct }))
    );
  }

  return createEmptyMcqForm();
}

/** @deprecated — dùng createEmptyMcqForm */
export function createEmptyRows() {
  return createEmptyMcqForm();
}

/** @deprecated — dùng mcqFormToApiPayload */
export function mcqRowsToApiPayload(rows) {
  if (rows?.correctTexts != null) {
    return mcqFormToApiPayload(rows);
  }
  if (Array.isArray(rows)) {
    return mcqFormToApiPayload(answersToMcqForm(rows));
  }
  return mcqFormToApiPayload(rows);
}

/** @deprecated — dùng answersToMcqForm */
export function answersToMcqRows(parts, correctIndices) {
  const form = answersToMcqForm(parts, correctIndices);
  const correctFilled = trimFilled(form.correctTexts);
  const wrongFilled = trimFilled(form.wrongTexts);
  return [
    ...form.correctTexts.map((text, i) => ({
      text,
      correct: i < correctFilled.length && String(text).trim() !== "",
    })),
    ...form.wrongTexts.map((text) => ({ text, correct: false })),
  ];
}
