import React from "react";

/**
 * Nút gợi ý MCQ — ẩn 2 đáp án sai (pool theo phiên).
 */
export default function GameHintButton({ hintsRemaining, disabled, onUse, style }) {
  if (hintsRemaining <= 0 && disabled) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onUse}
      style={{
        margin: "0 0 12px",
        padding: "8px 16px",
        borderRadius: 999,
        border: "2px solid #3282b8",
        background: disabled ? "#e8eef2" : "#e3f4fc",
        color: disabled ? "#90a4ae" : "#0f4c75",
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      Gợi ý (còn {hintsRemaining})
    </button>
  );
}
