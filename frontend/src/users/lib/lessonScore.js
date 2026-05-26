import api from "../../api";

/** Điểm gửi server khi hoàn thành bài = đúng + bonus vật phẩm (không áp dụng ôn tập). */
export function getScoreDelta(correctCount, payload) {
  const correct = Number(correctCount) || 0;
  if (payload?.reviewMode) return correct;
  const bonus = Number(payload?.itemEffects?.lessonBonusPerComplete) || 0;
  return correct + bonus;
}

export function applyScoreResponseToStorage(data) {
  if (!data?.success) return;
  const raw = localStorage.getItem("user");
  if (!raw) return;
  try {
    const u = JSON.parse(raw);
    u.score = data.score;
    u.week_score = data.week_score;
    localStorage.setItem("user", JSON.stringify(u));
  } catch (err) {
    console.warn("Không cập nhật được user trong localStorage:", err);
  }
}

/** Cộng điểm hoàn thành bài (đúng + bonus item). Trả về response data hoặc null. */
export async function incrementLessonScore(userId, correctCount, payload) {
  if (!userId) return null;
  const delta = getScoreDelta(correctCount, payload);
  if (delta <= 0) return null;
  try {
    const resp = await api.post("/score/increment", { userId, delta });
    applyScoreResponseToStorage(resp.data);
    return resp.data;
  } catch (e) {
    console.warn("Lỗi gọi API cộng điểm:", e);
    return null;
  }
}
