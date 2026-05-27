/**
 * Logic hiệu ứng vật phẩm: loại effect (trang trí / bonus điểm / hint),
 * mô tả UI, validate form admin, dedupe khi mua trùng, tổng hợp loadout.
 */

/** Nhãn hiển thị theo `effect_type` trong DB (0, 1, 2). */
export const EFFECT_TYPE_LABELS = {
  0: "Trang trí",
  1: "Cộng điểm hoàn thành bài",
  2: "Hint (bỏ 2 đáp án sai)",
};

/**
 * Chuẩn hóa `effect_type` về 0, 1 hoặc 2; giá trị lạ → 0 (trang trí).
 *
 * @param {*} value - Giá trị từ API/form.
 * @returns {0|1|2}
 */
export function normalizeEffectType(value) {
  const n = Number(value);
  return n === 1 || n === 2 ? n : 0;
}

/**
 * Mô tả ngắn một dòng cho shop / thẻ item (chỉ khi có hiệu ứng gameplay).
 *
 * Luồng:
 * - type 1 và `lesson_bonus_points` > 0 → "+N điểm khi hoàn thành bài".
 * - type 2 và `hint_questions` > 0 → "N câu có gợi ý mỗi lần chơi".
 * - Còn lại → chuỗi rỗng.
 *
 * @param {object} item - Bản ghi item từ API.
 * @returns {string}
 */
export function formatItemEffectDescription(item) {
  const type = normalizeEffectType(item?.effect_type);
  if (type === 1) {
    const pts = Number(item?.lesson_bonus_points) || 0;
    if (pts > 0) return `+${pts} điểm khi hoàn thành bài`;
  }
  if (type === 2) {
    const n = Number(item?.hint_questions) || 0;
    if (n > 0) return `${n} câu có gợi ý mỗi lần chơi`;
  }
  return "";
}

/**
 * Tóm tắt loại + chi tiết cho bảng admin (cột "Chức năng").
 *
 * @param {object} item - Bản ghi item.
 * @returns {string} Ví dụ "Cộng điểm hoàn thành bài: +50 điểm…" hoặc "—".
 */
export function formatItemEffectSummary(item) {
  const type = normalizeEffectType(item?.effect_type);
  if (type === 0) return "—";
  const label = EFFECT_TYPE_LABELS[type] || String(type);
  const detail = formatItemEffectDescription(item);
  return detail ? `${label}: ${detail}` : label;
}

/**
 * Validate bộ 3 field effect trên form admin (client-side, trước khi gửi API).
 *
 * Luồng theo type:
 * - 0: bonus và hint phải = 0.
 * - 1: bonus > 0, hint = 0.
 * - 2: hint > 0, bonus = 0.
 * - Hợp lệ → `null`; lỗi → message tiếng Việt.
 *
 * @param {*} effectType
 * @param {*} lessonBonus
 * @param {*} hintQuestions
 * @returns {string|null} Lỗi hoặc `null` nếu OK.
 */
export function validateItemEffectsClient(effectType, lessonBonus, hintQuestions) {
  const type = normalizeEffectType(effectType);
  const bonus = Math.floor(Number(lessonBonus) || 0);
  const hints = Math.floor(Number(hintQuestions) || 0);

  if (type === 0) {
    if (bonus !== 0 || hints !== 0) {
      return "Vật phẩm trang trí: không được nhập điểm thưởng hoặc số hint.";
    }
    return null;
  }
  if (type === 1) {
    if (bonus <= 0) return "Cần nhập điểm thưởng > 0.";
    if (hints !== 0) return "Loại cộng điểm: số hint phải bằng 0.";
    return null;
  }
  if (type === 2) {
    if (hints <= 0) return "Cần nhập số câu hint > 0.";
    if (bonus !== 0) return "Loại hint: điểm thưởng phải bằng 0.";
    return null;
  }
  return "Loại chức năng không hợp lệ.";
}

/**
 * Gộp danh sách item theo `id` — mua cùng item nhiều lần chỉ giữ một bản ghi.
 *
 * @param {Array} items - Danh sách từ `GET /my-items`.
 * @returns {Array} Mỗi `item.id` xuất hiện tối đa một lần.
 */
export function dedupeItemsById(items) {
  const list = Array.isArray(items) ? items : [];
  const byId = new Map();
  for (const item of list) {
    const id = Number(item?.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (!byId.has(id)) byId.set(id, item);
  }
  return [...byId.values()];
}

/**
 * Cộng tổng bonus điểm và số hint từ các item đã chọn (preview popup loadout).
 *
 * Luồng:
 * - Dedupe theo `id` trước khi cộng.
 * - type 1 → cộng `lesson_bonus_points`; type 2 → cộng `hint_questions`.
 *
 * @param {Array} items - Item user tick chọn (tối đa 3).
 * @returns {{ lessonBonusPerComplete: number, hintQuestionsPerLesson: number }}
 */
export function aggregateItemEffectsFromItems(items) {
  const list = dedupeItemsById(items);
  let lessonBonusPerComplete = 0;
  let hintQuestionsPerLesson = 0;
  for (const item of list) {
    const type = normalizeEffectType(item?.effect_type);
    if (type === 1) {
      lessonBonusPerComplete += Number(item?.lesson_bonus_points) || 0;
    } else if (type === 2) {
      hintQuestionsPerLesson += Number(item?.hint_questions) || 0;
    }
  }
  return { lessonBonusPerComplete, hintQuestionsPerLesson };
}

/**
 * Chuỗi preview hiệu ứng trong footer `ItemLoadoutModal`.
 *
 * @param {Array} items - Item đang được chọn.
 * @returns {string} Mô tả ghép bằng " · " hoặc thông báo không có hiệu ứng.
 */
export function formatLoadoutPreviewSummary(items) {
  const { lessonBonusPerComplete, hintQuestionsPerLesson } =
    aggregateItemEffectsFromItems(items);
  const parts = [];
  if (lessonBonusPerComplete > 0) {
    parts.push(`+${lessonBonusPerComplete} điểm khi hoàn thành bài`);
  }
  if (hintQuestionsPerLesson > 0) {
    parts.push(`${hintQuestionsPerLesson} câu có gợi ý`);
  }
  if (parts.length === 0) return "Không có hiệu ứng từ vật phẩm đã chọn.";
  return parts.join(" · ");
}

/**
 * Build object 3 field effect gửi API admin create/update item.
 *
 * Luồng: chuẩn hóa type → zero hóa field không dùng theo rule từng loại.
 *
 * @param {*} effectType
 * @param {*} lessonBonus
 * @param {*} hintQuestions
 * @returns {{ effect_type: number, lesson_bonus_points: number, hint_questions: number }}
 */
export function buildItemEffectPayload(effectType, lessonBonus, hintQuestions) {
  const type = normalizeEffectType(effectType);
  const bonus = Math.floor(Number(lessonBonus) || 0);
  const hints = Math.floor(Number(hintQuestions) || 0);
  if (type === 1) {
    return { effect_type: 1, lesson_bonus_points: bonus, hint_questions: 0 };
  }
  if (type === 2) {
    return { effect_type: 2, lesson_bonus_points: 0, hint_questions: hints };
  }
  return { effect_type: 0, lesson_bonus_points: 0, hint_questions: 0 };
}
