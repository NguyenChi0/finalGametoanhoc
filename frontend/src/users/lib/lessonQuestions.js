/**
 * Chuẩn bị danh sách câu hỏi cho một phiên chơi: xáo trộn thứ tự câu/đáp án,
 * giới hạn số câu mỗi lượt (trừ chế độ ôn tập).
 */

/** Số câu tối đa mỗi lượt chơi bài học thường (không áp dụng ôn tập). */
export const MAX_QUESTIONS_PER_SESSION = 15;

/**
 * Xáo trộn mảng (Fisher–Yates), không mutate mảng gốc.
 *
 * @param {Array} arr - Mảng đầu vào.
 * @returns {Array} Bản sao đã shuffle.
 */
export function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Chuẩn bị câu hỏi cho một lượt chơi game thường.
 *
 * Luồng:
 * - Shuffle toàn bộ `questions`.
 * - Lấy tối đa `max` câu (mặc định 15).
 * - Với mỗi câu: shuffle mảng `answers`.
 *
 * @param {Array} questions - Câu hỏi từ payload/API.
 * @param {number} [max=MAX_QUESTIONS_PER_SESSION] - Giới hạn số câu.
 * @returns {Array} Danh sách câu đã xáo, mỗi câu có `answers` đã xáo.
 */
export function prepareSessionQuestions(
  questions,
  max = MAX_QUESTIONS_PER_SESSION
) {
  const shuffled = shuffleArray(Array.isArray(questions) ? questions : []);
  return shuffled.slice(0, Math.min(max, shuffled.length)).map((q) => ({
    ...q,
    answers: shuffleArray(q.answers || []),
  }));
}

/**
 * Chuẩn bị câu hỏi cho phiên ôn tập (nhiều bài gộp).
 *
 * Luồng:
 * - Không giới hạn 15 câu.
 * - Shuffle câu + shuffle đáp án từng câu (giống `prepareSessionQuestions`).
 *
 * @param {Array} questions - Toàn bộ câu ôn tập.
 * @returns {Array} Câu hỏi đã xáo.
 */
export function prepareReviewQuestions(questions) {
  const list = Array.isArray(questions) ? questions : [];
  return shuffleArray(list).map((q) => ({
    ...q,
    answers: shuffleArray(q.answers || []),
  }));
}
