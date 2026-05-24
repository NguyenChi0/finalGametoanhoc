import React from "react";
import { publicUrl } from "../../lib/publicUrl";

const COMPLETE_SRC = `${publicUrl}/component-images/complete-symbol.png`;

const SIZE_PX = {
  sm: 26,
  md: 44,
  lg: 52,
};

/**
 * Dấu hoàn thành chủ đề — ảnh complete-symbol.png.
 */
export default function TopicCompleteTick({ size = "md", className = "" }) {
  const px = SIZE_PX[size] ?? SIZE_PX.md;

  return (
    <span
      className={className}
      role="img"
      aria-label="Đã hoàn thành tất cả bài học trong chủ đề"
      title="Đã hoàn thành tất cả bài học"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
        flexShrink: 0,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <img
        src={COMPLETE_SRC}
        alt=""
        aria-hidden
        width={px}
        height={px}
        draggable={false}
        decoding="async"
        style={{
          display: "block",
          width: px,
          height: px,
          objectFit: "contain",
          filter: "drop-shadow(0 3px 6px rgba(22, 100, 50, 0.35))",
        }}
      />
    </span>
  );
}
