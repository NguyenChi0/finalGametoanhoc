import React, { useEffect, useMemo, useState } from "react";
import { API_ORIGIN } from "../../api";
import { getCorrectIndices, normalizeSelectedIndices } from "../lib/questionScoring";

function staticAssetUrl(path) {
  if (path == null || String(path).trim() === "") return "";
  const s = String(path).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const origin = API_ORIGIN.replace(/\/$/, "");
  return s.startsWith("/") ? `${origin}${s}` : `${origin}/${s}`;
}

/**
 * Chọn đáp án trắc nghiệm — một hoặc nhiều đáp án đúng.
 *
 * @param {object} props
 * @param {Array} props.answers - Danh sách đáp án (đã shuffle).
 * @param {number|number[]} [props.value] - Chỉ số đã chọn.
 * @param {(indices: number[]) => void} props.onConfirm
 * @param {string} [props.classNamePrefix]
 */
export default function QuestionAnswerPicker({
  answers,
  value,
  onConfirm,
  classNamePrefix = "q-picker",
}) {
  const options = Array.isArray(answers) ? answers : [];
  const correctIndices = useMemo(() => getCorrectIndices(options), [options]);
  const isMulti = correctIndices.length > 1;

  const [selected, setSelected] = useState(() => normalizeSelectedIndices(value));

  useEffect(() => {
    setSelected(normalizeSelectedIndices(value));
  }, [value, options]);

  const toggle = (idx) => {
    if (isMulti) {
      setSelected((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b)
      );
    } else {
      setSelected([idx]);
    }
  };

  const prefix = classNamePrefix;

  return (
    <div className={prefix}>
      {isMulti ? (
        <p className={`${prefix}__multi-hint`}>
          Câu này có {correctIndices.length} đáp án đúng — chọn tất cả rồi bấm Xác nhận.
        </p>
      ) : null}
      <div className={`${prefix}__list`} role="group" aria-label="Chọn đáp án">
        {options.map((a, idx) => {
          const isSelected = selected.includes(idx);
          const label = a.text != null && String(a.text).trim() !== "" ? String(a.text).trim() : "";
          return (
            <button
              key={a.id ?? idx}
              type="button"
              className={`${prefix}__option${isSelected ? ` ${prefix}__option--selected` : ""}`}
              onClick={() => toggle(idx)}
              aria-pressed={isSelected}
            >
              {label || (a.image ? "Xem hình" : `Đáp án ${idx + 1}`)}
              {a.image ? (
                <img
                  src={staticAssetUrl(a.image)}
                  alt=""
                  style={{ maxHeight: 48, maxWidth: 80, objectFit: "contain" }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`${prefix}__confirm`}
        disabled={selected.length === 0}
        onClick={() => onConfirm?.(selected)}
      >
        Xác nhận
      </button>
    </div>
  );
}
