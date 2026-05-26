export const EFFECT_TYPE_LABELS = {
  0: "Trang trí",
  1: "Cộng điểm hoàn thành bài",
  2: "Hint (bỏ 2 đáp án sai)",
};

export function normalizeEffectType(value) {
  const n = Number(value);
  return n === 1 || n === 2 ? n : 0;
}

/** Mô tả ngắn cho shop / admin list */
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

export function formatItemEffectSummary(item) {
  const type = normalizeEffectType(item?.effect_type);
  if (type === 0) return "—";
  const label = EFFECT_TYPE_LABELS[type] || String(type);
  const detail = formatItemEffectDescription(item);
  return detail ? `${label}: ${detail}` : label;
}

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
