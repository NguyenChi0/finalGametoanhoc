import React from "react";
import { getCorrectIndices } from "../lib/questionScoring";

export default function GameMcqConfirmBar({
  answers,
  pendingIndices,
  disabled,
  onConfirm,
  showHint = true,
  style,
}) {
  const correctCount = getCorrectIndices(answers).length;
  if (correctCount <= 1) return null;

  const pendingLen = Array.isArray(pendingIndices) ? pendingIndices.length : 0;

  return (
    <div style={{ textAlign: "center", marginTop: 12, marginBottom: 8, ...style }}>
      {showHint && (
        <p
          style={{
            margin: "0 0 10px",
            fontSize: "clamp(0.85rem, 2.5vw, 0.95rem)",
            color: "#546e7a",
          }}
        >
          Câu này có {correctCount} đáp án đúng — chọn tất cả rồi bấm Xác nhận.
        </p>
      )}
      <button
        type="button"
        disabled={disabled || pendingLen === 0}
        onClick={onConfirm}
        style={{
          padding: "10px 28px",
          borderRadius: 24,
          border: "none",
          background:
            disabled || pendingLen === 0
              ? "#b0bec5"
              : "linear-gradient(135deg, #ff9800, #f57c00)",
          color: "#fff",
          fontWeight: 700,
          fontSize: "1rem",
          cursor: disabled || pendingLen === 0 ? "default" : "pointer",
        }}
      >
        Xác nhận
      </button>
    </div>
  );
}
