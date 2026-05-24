export const MAX_QUESTIONS_PER_SESSION = 15;

export function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle câu → lấy tối đa max → shuffle đáp án từng câu */
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

/** Ôn tập gộp nhiều bài — không giới hạn 15 câu. */
export function prepareReviewQuestions(questions) {
  const list = Array.isArray(questions) ? questions : [];
  return shuffleArray(list).map((q) => ({
    ...q,
    answers: shuffleArray(q.answers || []),
  }));
}
