import React from "react";
import { publicUrl } from "../../lib/publicUrl";

const STAR_SRC = `${publicUrl}/component-images/progress-point.png`;

const SIZE_PX = {
  xs: 18,
  sm: 28,
  md: 38,
  lg: 46,
};

function ProgressStar({ filled, sizePx }) {
  return (
    <img
      src={STAR_SRC}
      alt=""
      aria-hidden
      width={sizePx}
      height={sizePx}
      draggable={false}
      decoding="async"
      style={{
        display: "block",
        width: sizePx,
        height: sizePx,
        objectFit: "contain",
        flexShrink: 0,
        filter: filled
          ? "drop-shadow(0 2px 4px rgba(120, 72, 8, 0.42)) drop-shadow(0 0 6px rgba(255, 210, 80, 0.28))"
          : "grayscale(0.9) brightness(1.1) opacity(0.36)",
      }}
    />
  );
}

/**
 * Hiển thị 0–3 sao (không hiện số câu) — dùng ảnh progress-point.png.
 */
export default function LessonStarRating({ stars = 0, size = "sm", className = "" }) {
  const n = Math.max(0, Math.min(3, Math.floor(Number(stars) || 0)));
  if (n <= 0) return null;

  const sizePx = SIZE_PX[size] ?? SIZE_PX.sm;
  const label = `${n} trên 3 sao`;

  return (
    <span
      className={`lesson-star-rating lesson-star-rating--${size}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: size === "lg" ? 5 : size === "md" ? 5 : size === "sm" ? 4 : 2,
        lineHeight: 0,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {[1, 2, 3].map((i) => (
        <ProgressStar key={i} filled={i <= n} sizePx={sizePx} />
      ))}
    </span>
  );
}
