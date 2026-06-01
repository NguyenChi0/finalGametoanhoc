/**
 * Chấm điểm câu hỏi trắc nghiệm — hỗ trợ một hoặc nhiều đáp án đúng (đúng hoàn toàn).
 */

/**
 * @param {Array<{ correct?: boolean }>} answers
 * @returns {number[]}
 */
export function getCorrectIndices(answers) {
  if (!Array.isArray(answers)) return [];
  return answers.map((a, i) => (a?.correct ? i : -1)).filter((i) => i >= 0);
}

/**
 * @param {Array} answers
 * @returns {boolean}
 */
export function isMultiCorrect(answers) {
  return getCorrectIndices(answers).length > 1;
}

/**
 * @param {number|number[]|Set<number>|null|undefined} value
 * @returns {number[]}
 */
export function normalizeSelected(value) {
  if (value == null) return [];
  if (value instanceof Set) return [...value].sort((a, b) => a - b);
  if (Array.isArray(value)) {
    return [...new Set(value.map((x) => Number(x)).filter((n) => Number.isInteger(n)))].sort(
      (a, b) => a - b
    );
  }
  const n = Number(value);
  return Number.isInteger(n) ? [n] : [];
}

/**
 * Đúng hoàn toàn: khớp đủ tập đáp án đúng, không thừa không thiếu.
 *
 * @param {number|number[]|Set<number>} selectedIndices
 * @param {Array<{ correct?: boolean }>} answers
 * @returns {boolean}
 */
export function isAnswerSetFullyCorrect(selectedIndices, answers) {
  const correct = getCorrectIndices(answers);
  const selected = normalizeSelected(selectedIndices);
  if (correct.length !== selected.length) return false;
  for (let i = 0; i < correct.length; i += 1) {
    if (correct[i] !== selected[i]) return false;
  }
  return true;
}

/**
 * Chấm một lần chọn (single hoặc đã xác nhận multi).
 *
 * @param {number|number[]|Set<number>} selectedIndices
 * @param {Array<{ correct?: boolean }>} answers
 * @returns {boolean}
 */
export function isSelectionCorrect(selectedIndices, answers) {
  if (isMultiCorrect(answers)) {
    return isAnswerSetFullyCorrect(selectedIndices, answers);
  }
  const selected = normalizeSelected(selectedIndices);
  if (selected.length !== 1) return false;
  return !!answers[selected[0]]?.correct;
}
