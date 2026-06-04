/**
 * Tìm bài học kế tiếp trong cùng chủ đề và build payload pre-game
 * cho nút "Bài tiếp" trên `LessonCompleteScreen`.
 */
import { getLessons, getQuestions, questionImageUrl } from "../../api";

/**
 * Sắp danh sách bài theo `sort_order` tăng dần; hòa thì theo `id`.
 *
 * @param {Array} rows - Danh sách lesson từ API.
 * @returns {Array} Bản sao đã sort.
 */
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

/**
 * Chuẩn hóa URL ảnh câu hỏi và đáp án (prefix origin API) trước khi đưa vào game.
 *
 * @param {object} q - Object câu hỏi từ API.
 * @returns {object} Câu hỏi với `question_image` và `answers[].image` đã resolve.
 */
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

/**
 * Xáo trộn mảng (dùng nội bộ khi build payload bài kế).
 *
 * @param {Array} arr
 * @returns {Array}
 */
function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Lấy bài học ngay sau bài hiện tại trong cùng `typeId` (theo thứ tự curriculum).
 *
 * Luồng:
 * - Gọi `getLessons(typeId)` → sort.
 * - Tìm index bài `currentLessonId`.
 * - Không tìm thấy hoặc đã là bài cuối → `null`.
 * - Ngược lại → return lesson kế tiếp.
 *
 * @param {number|string} typeId - ID chủ đề.
 * @param {number|string} currentLessonId - ID bài vừa hoàn thành.
 * @returns {Promise<object|null>} Row lesson kế hoặc `null`.
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
 * Tạo payload pre-game sẵn sàng navigate cho bài kế trong chủ đề.
 *
 * Luồng:
 * - Thiếu `grade` / `type` / `lesson` trên payload hiện tại → `null`.
 * - `findNextLessonInType` không có bài kế → `null`.
 * - `getQuestions` cho bài kế; rỗng → throw Error.
 * - Shuffle câu + resolve media; lấy `user` từ localStorage hoặc payload.
 * - Giữ `kilovia` nếu có (embed Kilovia).
 *
 * @param {object} currentPayload - Payload lượt chơi vừa xong.
 * @returns {Promise<object|null>} Payload pre-game mới hoặc `null`.
 * @throws {Error} Khi bài kế không có câu hỏi.
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
    scope: "play",
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
