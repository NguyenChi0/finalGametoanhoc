/**
 * Chuẩn bị danh sách câu hỏi cho một phiên chơi.
 */
import { questionImageUrl } from "../../api";

export const MAX_QUESTIONS_PER_SESSION = 15;

const ANSWER_LABELS = ["A", "B", "C", "D", "E", "F"];

export function getAnswerLabel(index) {
  return ANSWER_LABELS[index] ?? String(index + 1);
}

export function normalizePlayQuestion(q) {
  if (!q || typeof q !== "object") return q;
  return {
    ...q,
    question_image: q.question_image
      ? questionImageUrl(q.question_image) || q.question_image
      : q.question_image,
    answers: Array.isArray(q.answers)
      ? q.answers.map((a) =>
          !a || typeof a !== "object"
            ? a
            : {
                ...a,
                image: a.image ? questionImageUrl(a.image) || a.image : a.image,
              }
        )
      : q.answers,
  };
}

export const withResolvedQuestionMedia = normalizePlayQuestion;

function answerHasContent(a) {
  if (!a || typeof a !== "object") return false;
  const text = a.text != null ? String(a.text).trim() : "";
  const image = a.image != null ? String(a.image).trim() : "";
  return text !== "" || image !== "";
}

export function isPlayableQuestion(q) {
  if (!q || typeof q !== "object") return false;
  const answers = Array.isArray(q.answers) ? q.answers : [];
  if (answers.length < 2) return false;
  if (!answers.every(answerHasContent)) return false;
  return answers.some((a) => a && a.correct === true);
}

export function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function prepareOneQuestion(q) {
  const normalized = normalizePlayQuestion(q);
  return {
    ...normalized,
    answers: shuffleArray(normalized.answers || []),
  };
}

export function prepareSessionQuestions(questions, max = MAX_QUESTIONS_PER_SESSION) {
  const playable = (Array.isArray(questions) ? questions : []).filter(isPlayableQuestion);
  const shuffled = shuffleArray(playable);
  return shuffled.slice(0, Math.min(max, shuffled.length)).map(prepareOneQuestion);
}

export function prepareReviewQuestions(questions) {
  const list = (Array.isArray(questions) ? questions : []).filter(isPlayableQuestion);
  return shuffleArray(list).map(prepareOneQuestion);
}
