export const SESSION_KEY = "game_play_state_v1";
export const PREGAME_SESSION_KEY = "game_pregame_state_v1";
export const LAST_LESSON_KEY = "lesson_last_selection_v1";

function isValidLastLessonSelection(data) {
  return (
    data &&
    typeof data === "object" &&
    data.gradeId != null &&
    data.typeId != null &&
    data.lessonId != null
  );
}

/** Lưu bài học vừa chọn (localStorage — sống sau khi tắt trình duyệt). */
export function persistLastLessonSelection({
  gradeId,
  typeId,
  lessonId,
  gradeName = null,
  typeName = null,
  lessonName = null,
}) {
  if (gradeId == null || typeId == null || lessonId == null) return;
  try {
    localStorage.setItem(
      LAST_LESSON_KEY,
      JSON.stringify({
        gradeId,
        typeId,
        lessonId,
        gradeName,
        typeName,
        lessonName,
        ts: Date.now(),
      })
    );
  } catch (e) {
    console.warn("Không lưu được bài học gần nhất:", e);
  }
}

export function readLastLessonSelection() {
  try {
    const raw = localStorage.getItem(LAST_LESSON_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidLastLessonSelection(parsed) ? parsed : null;
  } catch (e) {
    console.warn("Lỗi đọc bài học gần nhất:", e);
    return null;
  }
}

export function persistPlayState(gameId, payload) {
  try {
    const saved = { gameId, payload, ts: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(saved));
  } catch (e) {
    console.warn("Không lưu được state chơi:", e);
  }
}

export function persistPregamePayload(payload) {
  try {
    sessionStorage.setItem(
      PREGAME_SESSION_KEY,
      JSON.stringify({ payload, ts: Date.now() })
    );
  } catch (e) {
    console.warn("Không lưu được state chuẩn bị:", e);
  }
}

export function readPregamePayload() {
  try {
    const raw = sessionStorage.getItem(PREGAME_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.payload ? parsed.payload : null;
  } catch (e) {
    console.warn("Lỗi đọc pregame session:", e);
    return null;
  }
}
