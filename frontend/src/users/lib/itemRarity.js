/** Cấp độ vật phẩm (items.level 1–6) */
export const LEVEL_LABELS = {
  1: "Thường",
  2: "Hiếm",
  3: "Đặc biệt",
  4: "Sử thi",
  5: "Huyền thoại",
  6: "Thần thoại",
};

export function levelLabel(level) {
  const n = Number(level);
  return LEVEL_LABELS[n] || LEVEL_LABELS[1];
}

/** Màu aura (drop-shadow) theo cấp — ảnh PNG không nền, glow bám sát hình. */
const LEVEL_AURA_COLORS = {
  1: null,
  2: "rgba(34, 197, 94, 0.95)",
  3: "rgba(14, 165, 233, 0.95)",
  4: "rgba(168, 85, 247, 0.95)",
  5: "rgba(234, 179, 8, 0.95)",
  6: "rgba(239, 68, 68, 0.95)",
};

export function levelAuraColor(level) {
  const n = Number(level);
  const key = Number.isInteger(n) && n >= 1 && n <= 6 ? n : 1;
  return LEVEL_AURA_COLORS[key] ?? null;
}

/** Màu chữ nhãn cấp — cùng tông với aura ảnh, dễ đọc trên nền sáng. */
const LEVEL_LABEL_COLORS = {
  1: "#6b7099",
  2: "#16a34a",
  3: "#0284c7",
  4: "#7c3aed",
  5: "#ca8a04",
  6: "#dc2626",
};

export function levelLabelColor(level) {
  const n = Number(level);
  const key = Number.isInteger(n) && n >= 1 && n <= 6 ? n : 1;
  return LEVEL_LABEL_COLORS[key] ?? LEVEL_LABEL_COLORS[1];
}

/** CSS filter drop-shadow — level 1 không aura. */
export function levelItemAuraFilter(level) {
  const color = levelAuraColor(level);
  if (!color) return "none";
  return `drop-shadow(0 0 3px ${color}) drop-shadow(0 0 8px ${color})`;
}
