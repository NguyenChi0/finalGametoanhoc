/**
 * Đáp án câu hỏi: lưu một cột JSON `answers_json`, API vẫn trả mảng `answers[]`.
 */

const MAX_CORRECT_ANSWERS = 3;
const MAX_WRONG_ANSWERS = 3;
const MAX_ANSWERS = MAX_CORRECT_ANSWERS + MAX_WRONG_ANSWERS;

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

/** Đọc từ cột JSON (mysql2 trả object/array hoặc string). */
function parseAnswersJsonColumn(raw) {
  if (raw == null || raw === '') return null;
  let data = raw;
  if (Buffer.isBuffer(raw)) {
    try {
      data = JSON.parse(raw.toString('utf8'));
    } catch {
      return null;
    }
  } else if (typeof raw === 'string') {
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

/** Đọc từ 8 cột cũ — chỉ dùng trong script migrate (DB chưa có answers_json). */
function buildAnswersFromLegacyColumns(row) {
  const slots = [
    { id: 'a0', text: row.answercorrect_text, image: row.answercorrect_image },
    { id: 'a1', text: row.answer2_text, image: row.answer2_image },
    { id: 'a2', text: row.answer3_text, image: row.answer3_image },
    { id: 'a3', text: row.answer4_text, image: row.answer4_image },
  ];

  const correctSet = new Set([0]);
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
 * @param {object} row - Một dòng `questions` (cần `answers_json`).
 * @returns {Array<{id,text,image,correct}>}
 */
function buildAnswers(row) {
  return parseAnswersJsonColumn(row?.answers_json) || [];
}

function answerItemToText(x) {
  if (x == null) return '';
  if (typeof x === 'string') return x.trim();
  if (typeof x === 'object' && x.text != null) return String(x.text).trim();
  return String(x).trim();
}

/**
 * Admin payload → JSON lưu DB.
 * Chấp nhận: mảng chuỗi + correct_indices, hoặc mảng { text, correct?, image? }.
 * Giới hạn: tối đa 3 đúng + 3 sai (không phải “tối đa 4 đáp án” chung).
 */
function answersTextsToJson(answers, correctIndicesRaw, correctIndexFallback) {
  const all = Array.isArray(answers) ? answers : [];
  if (all.length === 0) {
    throw new Error('Cần tối thiểu 2 đáp án');
  }

  const hasObjectItems =
    all.length > 0 && typeof all[0] === 'object' && all[0] != null && !Array.isArray(all[0]);

  if (hasObjectItems) {
    const indices = parseCorrectIndices(correctIndicesRaw, correctIndexFallback);
    const payload = [];
    all.forEach((item, i) => {
      const text = answerItemToText(item);
      const image =
        item.image != null && String(item.image).trim() !== '' ? String(item.image).trim() : null;
      if (!text && !image) return;
      const correct =
        typeof item.correct === 'boolean' ? item.correct : indices.includes(i);
      payload.push({
        id: item.id != null ? String(item.id) : `a${payload.length}`,
        text: text || null,
        image,
        correct,
      });
    });
    if (payload.length < 2) {
      throw new Error('Cần tối thiểu 2 đáp án');
    }
    const correctCount = payload.filter((p) => p.correct).length;
    const wrongCount = payload.length - correctCount;
    if (correctCount === 0) {
      throw new Error('Cần ít nhất một đáp án đúng');
    }
    if (correctCount > MAX_CORRECT_ANSWERS) {
      throw new Error(`Tối đa ${MAX_CORRECT_ANSWERS} đáp án đúng`);
    }
    if (wrongCount > MAX_WRONG_ANSWERS) {
      throw new Error(`Tối đa ${MAX_WRONG_ANSWERS} đáp án sai`);
    }
    return JSON.stringify(payload);
  }

  const texts = all.map((x) => answerItemToText(x)).filter((x) => x !== '');
  if (texts.length < 2) {
    throw new Error('Cần tối thiểu 2 đáp án');
  }
  const indices = parseCorrectIndices(correctIndicesRaw, correctIndexFallback).filter(
    (i) => i >= 0 && i < texts.length
  );
  if (indices.length === 0) {
    throw new Error('Đáp án đúng không hợp lệ');
  }
  if (indices.length > MAX_CORRECT_ANSWERS) {
    throw new Error(`Tối đa ${MAX_CORRECT_ANSWERS} đáp án đúng`);
  }
  const correctSet = new Set(indices);
  const wrongCount = texts.filter((_, i) => !correctSet.has(i)).length;
  if (wrongCount > MAX_WRONG_ANSWERS) {
    throw new Error(`Tối đa ${MAX_WRONG_ANSWERS} đáp án sai`);
  }
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
  MAX_CORRECT_ANSWERS,
  MAX_WRONG_ANSWERS,
  buildAnswers,
  buildAnswersFromLegacyColumns,
  parseAnswersJsonColumn,
  answersTextsToJson,
  parseCorrectIndices,
};
