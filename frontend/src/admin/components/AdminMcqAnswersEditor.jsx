import React from "react";

const MAX_ANSWERS = 4;
const LABELS = ["A", "B", "C", "D", "E", "F"];

/** Form mặc định: 1 ô đúng (A) + 3 ô sai (B/C/D). */
export function createEmptyMcqForm() {
  return {
    correctTexts: [""],
    wrongTexts: ["", "", ""],
  };
}

function normalizeForm(input) {
  if (!input || typeof input !== "object") return createEmptyMcqForm();
  const correctTexts = Array.isArray(input.correctTexts)
    ? input.correctTexts.map((t) => String(t ?? ""))
    : [""];
  const wrongTexts = Array.isArray(input.wrongTexts)
    ? input.wrongTexts.map((t) => String(t ?? ""))
    : ["", "", ""];
  return {
    correctTexts: correctTexts.length > 0 ? correctTexts : [""],
    wrongTexts: wrongTexts.length > 0 ? wrongTexts : [""],
  };
}

/**
 * Chuyển dữ liệu API / draft → form editor.
 * @param {Array|object} source - `answers[]` API, `{ correctTexts, wrongTexts }`, hoặc mảng chuỗi.
 * @param {number|number[]} [fallbackIndices] - Chỉ số đúng khi `source` là mảng chuỗi.
 */
export function answersToMcqForm(source, fallbackIndices) {
  if (source && typeof source === "object" && !Array.isArray(source)) {
    if (source.correctTexts != null || source.wrongTexts != null) {
      return normalizeForm(source);
    }
  }

  if (Array.isArray(source) && source.length > 0) {
    if (typeof source[0] === "object" && source[0] != null) {
      const correctTexts = [];
      const wrongTexts = [];
      for (const a of source) {
        const t = a.text != null ? String(a.text) : "";
        if (a.correct) correctTexts.push(t);
        else wrongTexts.push(t);
      }
      return normalizeForm({
        correctTexts: correctTexts.length > 0 ? correctTexts : [""],
        wrongTexts: wrongTexts.length > 0 ? wrongTexts : ["", "", ""],
      });
    }

    if (typeof source[0] === "string") {
      const indices = Array.isArray(fallbackIndices)
        ? fallbackIndices.map((n) => Number(n)).filter((n) => Number.isInteger(n))
        : [Number(fallbackIndices ?? 0)].filter((n) => Number.isInteger(n));
      const correctTexts = [];
      const wrongTexts = [];
      source.forEach((text, i) => {
        const t = String(text ?? "");
        if (indices.includes(i)) correctTexts.push(t);
        else wrongTexts.push(t);
      });
      return normalizeForm({
        correctTexts: correctTexts.length > 0 ? correctTexts : [""],
        wrongTexts: wrongTexts.length > 0 ? wrongTexts : ["", "", ""],
      });
    }
  }

  return createEmptyMcqForm();
}

/**
 * Form → payload API: mảng đáp án + chỉ số đúng (có thể nhiều).
 * Thứ tự: các đáp án đúng trước, sau đó các đáp án sai.
 */
export function mcqFormToApiPayload(form) {
  const { correctTexts, wrongTexts } = normalizeForm(form);
  const correct = correctTexts.map((t) => String(t ?? "").trim()).filter(Boolean);
  const wrong = wrongTexts.map((t) => String(t ?? "").trim()).filter(Boolean);

  if (correct.length === 0) {
    return { error: "Cần ít nhất một đáp án đúng (ô màu xanh)." };
  }

  const answers = [...correct, ...wrong];
  if (answers.length < 2) {
    return { error: "Cần tối thiểu 2 đáp án (đúng + sai)." };
  }
  if (answers.length > MAX_ANSWERS) {
    return { error: `Tối đa ${MAX_ANSWERS} đáp án.` };
  }

  const correct_indices = correct.map((_, i) => i);
  return {
    answers,
    correct_indices,
    correct_index: correct_indices[0],
  };
}

function totalSlots(form) {
  const f = normalizeForm(form);
  return f.correctTexts.length + f.wrongTexts.length;
}

export default function AdminMcqAnswersEditor({ value, onChange }) {
  const form = normalizeForm(value);

  const updateCorrect = (index, text) => {
    const next = form.correctTexts.slice();
    next[index] = text;
    onChange({ ...form, correctTexts: next });
  };

  const updateWrong = (index, text) => {
    const next = form.wrongTexts.slice();
    next[index] = text;
    onChange({ ...form, wrongTexts: next });
  };

  const addCorrect = () => {
    if (totalSlots(form) >= MAX_ANSWERS) return;
    onChange({ ...form, correctTexts: [...form.correctTexts, ""] });
  };

  const addWrong = () => {
    if (totalSlots(form) >= MAX_ANSWERS) return;
    onChange({ ...form, wrongTexts: [...form.wrongTexts, ""] });
  };

  const removeCorrect = (index) => {
    if (form.correctTexts.length <= 1) return;
    const next = form.correctTexts.filter((_, i) => i !== index);
    onChange({ ...form, correctTexts: next });
  };

  const removeWrong = (index) => {
    if (form.wrongTexts.length <= 1) return;
    const next = form.wrongTexts.filter((_, i) => i !== index);
    onChange({ ...form, wrongTexts: next });
  };

  const canAdd = totalSlots(form) < MAX_ANSWERS;
  let labelOffset = 0;

  return (
    <div style={styles.wrap}>
      <p style={styles.hint}>
        Đáp án đúng (có thể nhiều hơn một). Tối đa {MAX_ANSWERS} đáp án / câu.
      </p>

      <div style={styles.group}>
        <h3 style={styles.groupTitle}>Đáp án đúng</h3>
        {form.correctTexts.map((text, i) => {
          const label = LABELS[labelOffset + i] || String(labelOffset + i + 1);
          return (
            <div key={`c-${i}`} style={styles.row}>
              <span style={styles.badgeOk} title="Đáp án đúng">
                {label}
              </span>
              <input
                type="text"
                value={text}
                onChange={(e) => updateCorrect(i, e.target.value)}
                style={styles.input}
                placeholder={`Đáp án đúng ${label}`}
              />
              {form.correctTexts.length > 1 ? (
                <button
                  type="button"
                  style={styles.btnRemove}
                  onClick={() => removeCorrect(i)}
                  aria-label={`Xóa đáp án đúng ${label}`}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
        {canAdd ? (
          <button type="button" style={styles.btnAdd} onClick={addCorrect}>
            + Thêm đáp án đúng
          </button>
        ) : null}
      </div>

      {(() => {
        labelOffset = form.correctTexts.length;
        return (
          <div style={styles.group}>
            <h3 style={styles.groupTitle}>Đáp án sai</h3>
            {form.wrongTexts.map((text, i) => {
              const label = LABELS[labelOffset + i] || String(labelOffset + i + 1);
              return (
                <div key={`w-${i}`} style={styles.row}>
                  <span style={styles.badgeNo} title="Đáp án sai">
                    {label}
                  </span>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => updateWrong(i, e.target.value)}
                    style={styles.input}
                    placeholder={`Đáp án sai ${label}`}
                  />
                  {form.wrongTexts.length > 1 ? (
                    <button
                      type="button"
                      style={styles.btnRemove}
                      onClick={() => removeWrong(i)}
                      aria-label={`Xóa đáp án sai ${label}`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })}
            {canAdd ? (
              <button type="button" style={styles.btnAdd} onClick={addWrong}>
                + Thêm đáp án sai
              </button>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 20 },
  hint: {
    margin: 0,
    fontSize: "0.88rem",
    color: "#57606a",
    lineHeight: 1.45,
  },
  group: { display: "flex", flexDirection: "column", gap: 10 },
  groupTitle: {
    margin: 0,
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  badgeOk: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 28,
    borderRadius: 8,
    background: "#ecfdf5",
    border: "1px solid #86efac",
    color: "#14532d",
    fontWeight: 700,
    fontSize: "0.85rem",
    flexShrink: 0,
  },
  badgeNo: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 28,
    borderRadius: 8,
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    color: "#57606a",
    fontWeight: 700,
    fontSize: "0.85rem",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    fontFamily: "inherit",
  },
  btnAdd: {
    alignSelf: "flex-start",
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px dashed #2d5a76",
    background: "#fff",
    color: "#2d5a76",
    fontWeight: 600,
    fontSize: "0.88rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnRemove: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#57606a",
    fontSize: "1.2rem",
    lineHeight: 1,
    cursor: "pointer",
    flexShrink: 0,
  },
};
