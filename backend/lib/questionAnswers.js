/**
 * Đáp án câu hỏi: lưu một cột JSON `answers_json`, API vẫn trả mảng `answers[]`.
 */

const MAX_ANSWERS = 4;

function parseCorrectIndices(raw, fallbackIndex) {
  if (raw != null && raw !== '') {
    let arr = raw;
    if (typeof raw === 'string') {
      try {
        arr = JSON.parse(raw);
      } catch {
        arr = null;
      }
    }
    if (Array.isArray(arr) && arr.length > 0) {
      const indices = arr
        .map((n) => Number(n))
        .filter((n, i, list) => Number.isInteger(n) && n >= 0 && list.indexOf(n) === i);
      if (indices.length > 0) return indices;
    }
  }
  const ci = Number(fallbackIndex);
  if (Number.isInteger(ci) && ci >= 0) return [ci];
  return [0];
}

function normalizeAnswerEntry(a, index) {
  if (a == null || typeof a !== 'object') return null;
  const text = a.text != null && String(a.text).trim() !== '' ? String(a.text).trim() : null;
  const image = a.image != null && String(a.image).trim() !== '' ? String(a.image).trim() : null;
  if (!text && !image) return null;
  return {
    id: a.id != null ? String(a.id) : `a${index}`,
    text,
    image,
    correct: !!a.correct,
  };
}

/** Đọc từ cột JSON (ưu tiên). */
function parseAnswersJsonColumn(raw) {
  if (raw == null || raw === '') return null;
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  const out = [];
  data.forEach((item, i) => {
    const n = normalizeAnswerEntry(item, i);
    if (n) out.push(n);
  });
  return out.length > 0 ? out : null;
}

/** Đọc từ 8 cột cũ (dump w123.sql — đáp án đúng mặc định cột đầu). */
function buildAnswersFromLegacyColumns(row) {
  const slots = [
    { id: 'a0', text: row.answercorrect_text, image: row.answercorrect_image },
    { id: 'a1', text: row.answer2_text, image: row.answer2_image },
    { id: 'a2', text: row.answer3_text, image: row.answer3_image },
    { id: 'a3', text: row.answer4_text, image: row.answer4_image },
  ];

  let correctSet = new Set([0]);
  if (row.correct_indices_json) {
    try {
      const parsed = JSON.parse(row.correct_indices_json);
      if (Array.isArray(parsed) && parsed.length > 0) {
        correctSet = new Set(
          parsed.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0)
        );
      }
    } catch {
      /* mặc định [0] */
    }
  }

  const answers = [];
  slots.forEach((slot, idx) => {
    if (slot.text || slot.image) {
      answers.push({
        id: slot.id,
        text: slot.text || null,
        image: slot.image || null,
        correct: correctSet.has(idx),
      });
    }
  });
  return answers;
}

/**
 * @param {object} row - Một dòng `questions`.
 * @returns {Array<{id,text,image,correct}>}
 */
function buildAnswers(row) {
  const fromJson = parseAnswersJsonColumn(row.answers_json);
  if (fromJson) return fromJson;
  if (
    row.answercorrect_text != null ||
    row.answer2_text != null ||
    row.answercorrect_image != null ||
    row.answer2_image != null
  ) {
    return buildAnswersFromLegacyColumns(row);
  }
  return [];
}

/**
 * Chuỗi text + chỉ số đúng (admin API) → JSON lưu DB.
 */
function answersTextsToJson(answers, correctIndicesRaw, correctIndexFallback) {
  const all = Array.isArray(answers) ? answers : [];
  const texts = all
    .map((x) => (x != null ? String(x).trim() : ''))
    .filter((x) => x !== '');
  if (texts.length < 2) {
    throw new Error('Cần tối thiểu 2 đáp án');
  }
  if (texts.length > MAX_ANSWERS) {
    throw new Error(`Tối đa ${MAX_ANSWERS} đáp án`);
  }
  const indices = parseCorrectIndices(correctIndicesRaw, correctIndexFallback).filter(
    (i) => i >= 0 && i < texts.length
  );
  if (indices.length === 0) {
    throw new Error('Đáp án đúng không hợp lệ');
  }
  const correctSet = new Set(indices);
  const payload = texts.map((text, i) => ({
    id: `a${i}`,
    text,
    image: null,
    correct: correctSet.has(i),
  }));
  return JSON.stringify(payload);
}

module.exports = {
  MAX_ANSWERS,
  buildAnswers,
  buildAnswersFromLegacyColumns,
  answersTextsToJson,
  parseCorrectIndices,
};
