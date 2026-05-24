import { getLessons, getQuestions, questionImageUrl } from "../../api";

function sortBySortOrder(rows) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  list.sort((a, b) => {
    const sa = Number(a.sort_order) || 0;
    const sb = Number(b.sort_order) || 0;
    if (sa !== sb) return sa - sb;
    return Number(a.id) - Number(b.id);
  });
  return list;
}

function resolveQuestionMedia(q) {
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

function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Bài kế trong cùng chủ đề (sort_order), null nếu đang là bài cuối.
 */
export async function findNextLessonInType(typeId, currentLessonId) {
  const tid = typeId;
  if (tid == null || currentLessonId == null) return null;
  const rows = await getLessons(tid);
  const sorted = sortBySortOrder(rows);
  const idx = sorted.findIndex((l) => String(l.id) === String(currentLessonId));
  if (idx < 0 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1];
}

/**
 * Tạo payload pregame cho bài kế; null nếu không còn bài trong chủ đề.
 * @throws {Error} khi không tải được câu hỏi hoặc bài trống
 */
export async function buildNextLessonPregamePayload(currentPayload) {
  if (!currentPayload?.grade?.id || !currentPayload?.type?.id || !currentPayload?.lesson?.id) {
    return null;
  }

  const gradeId = currentPayload.grade.id;
  const typeId = currentPayload.type.id;
  const lessonId = currentPayload.lesson.id;

  const nextLesson = await findNextLessonInType(typeId, lessonId);
  if (!nextLesson) return null;

  const res = await getQuestions({
    grade_id: gradeId,
    type_id: typeId,
    lesson_id: nextLesson.id,
    randomize: true,
  });
  const questions = res?.data ?? res;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Bài tiếp theo chưa có câu hỏi.");
  }

  const shuffledQuestions = shuffleArray(questions.map(resolveQuestionMedia));

  const rawUser = localStorage.getItem("user");
  const currentUser = rawUser ? JSON.parse(rawUser) : currentPayload.user ?? null;

  const typeName = currentPayload.type?.name ?? null;
  const lessonName = nextLesson.name ?? null;

  const payload = {
    grade: { id: gradeId },
    type: {
      id: typeId,
      name: typeName,
      image: currentPayload.type?.image ?? null,
    },
    lesson: {
      id: nextLesson.id,
      name: lessonName,
      image: nextLesson.image ?? null,
      description: nextLesson.description ?? null,
    },
    questions: shuffledQuestions,
    user: currentUser,
    ...(currentPayload.kilovia ? { kilovia: currentPayload.kilovia } : {}),
  };

  return payload;
}
