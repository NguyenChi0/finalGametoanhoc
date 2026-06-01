/**
 * Chuẩn hóa lựa chọn người dùng (một số hoặc mảng chỉ số).
 *
 * @param {number|number[]|null|undefined} value
 * @returns {number[]}
 */
export function normalizeSelectedIndices(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0)
      ),
    ];
  }
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? [n] : [];
}

/**
 * Chỉ số các đáp án đúng trong mảng `options` (sau shuffle).
 *
 * @param {Array<{ correct?: boolean }>} options
 * @returns {number[]}
 */
export function getCorrectIndices(options) {
  const opts = Array.isArray(options) ? options : [];
  return opts
    .map((a, i) => (a && a.correct ? i : -1))
    .filter((i) => i >= 0);
}

/**
 * Đúng hoàn toàn khi chọn đủ và chỉ các đáp án đúng.
 *
 * @param {number|number[]} selected
 * @param {Array<{ correct?: boolean }>} options
 * @returns {boolean}
 */
export function isAnswerSetFullyCorrect(selected, options) {
  const sel = new Set(normalizeSelectedIndices(selected));
  const correct = new Set(getCorrectIndices(options));
  if (sel.size !== correct.size) return false;
  for (const i of correct) {
    if (!sel.has(i)) return false;
  }
  return true;
}
