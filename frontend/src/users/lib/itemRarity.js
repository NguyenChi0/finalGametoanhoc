/**
 * Hiển thị cấp độ (rarity) vật phẩm `items.level` 1–6:
 * nhãn tiếng Việt, màu chữ, aura quanh ảnh PNG trong shop/loadout.
 */

/** Map level → tên hiển thị (Thường … Thần thoại). */
export const LEVEL_LABELS = {
  1: "Thường",
  2: "Hiếm",
  3: "Đặc biệt",
  4: "Sử thi",
  5: "Huyền thoại",
  6: "Thần thoại",
};

/**
 * Lấy nhãn cấp; level không hợp lệ → fallback "Thường" (1).
 *
 * @param {number|string} level - `items.level` từ DB.
 * @returns {string}
 */
export function levelLabel(level) {
  const n = Number(level);
  return LEVEL_LABELS[n] || LEVEL_LABELS[1];
}

/** Màu rgba cho drop-shadow aura theo cấp; level 1 = không aura (`null`). */
const LEVEL_AURA_COLORS = {
  1: null,
  2: "rgba(34, 197, 94, 0.95)",
  3: "rgba(14, 165, 233, 0.95)",
  4: "rgba(168, 85, 247, 0.95)",
  5: "rgba(234, 179, 8, 0.95)",
  6: "rgba(239, 68, 68, 0.95)",
};

/**
 * Màu aura (glow) quanh ảnh item — dùng trong `filter: drop-shadow(...)`.
 *
 * @param {number|string} level
 * @returns {string|null} Chuỗi màu CSS hoặc `null` (level 1).
 */
export function levelAuraColor(level) {
  const n = Number(level);
  const key = Number.isInteger(n) && n >= 1 && n <= 6 ? n : 1;
  return LEVEL_AURA_COLORS[key] ?? null;
}

/** Màu chữ nhãn cấp trên nền sáng (shop, admin). */
const LEVEL_LABEL_COLORS = {
  1: "#6b7099",
  2: "#16a34a",
  3: "#0284c7",
  4: "#7c3aed",
  5: "#ca8a04",
  6: "#dc2626",
};

/**
 * Màu chữ cho nhãn cấp độ.
 *
 * @param {number|string} level
 * @returns {string} Hex color.
 */
export function levelLabelColor(level) {
  const n = Number(level);
  const key = Number.isInteger(n) && n >= 1 && n <= 6 ? n : 1;
  return LEVEL_LABEL_COLORS[key] ?? LEVEL_LABEL_COLORS[1];
}

/**
 * Chuỗi CSS `filter` áp lên `<img>` item trong shop / loadout modal.
 *
 * Luồng:
 * - Level 1 → `"none"` (không glow).
 * - Level 2–6 → hai lớp `drop-shadow` cùng màu aura.
 *
 * @param {number|string} level
 * @returns {string} Giá trị cho style `filter`.
 */
export function levelItemAuraFilter(level) {
  const color = levelAuraColor(level);
  if (!color) return "none";
  return `drop-shadow(0 0 3px ${color}) drop-shadow(0 0 8px ${color})`;
}
