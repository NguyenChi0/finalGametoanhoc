/**
 * Module cộng điểm khi hoàn thành bài học.
 * Dùng bởi các component game (`game1`…`game11`) thay vì gọi API trực tiếp trong UI.
 */
import api from "../../api";

/**
 * Tính tổng điểm gửi lên server sau một lượt chơi.
 *
 * Luồng:
 * - Ôn tập (`payload.reviewMode`) → chỉ cộng số câu đúng, không bonus vật phẩm.
 * - Chơi bài thường → `correctCount` + `itemEffects.lessonBonusPerComplete` (nếu có).
 *
 * @param {number} correctCount - Số câu trả lời đúng trong lượt.
 * @param {object} [payload] - Payload phiên chơi (có `reviewMode`, `itemEffects`).
 * @returns {number} Delta điểm gửi `POST /score/increment`.
 */
export function getScoreDelta(correctCount, payload) {
  const correct = Number(correctCount) || 0;
  if (payload?.reviewMode) return correct;
  const bonus = Number(payload?.itemEffects?.lessonBonusPerComplete) || 0;
  return correct + bonus;
}

/**
 * Đồng bộ điểm mới từ response API vào `localStorage` (key `user`).
 *
 * Luồng:
 * - Nếu `data.success` không true → thoát, không đổi storage.
 * - Nếu chưa có `user` trong localStorage → thoát.
 * - Parse JSON user → gán `score`, `week_score` từ server → `setItem` lại.
 * - Lỗi parse/ghi → log cảnh báo, không throw.
 *
 * @param {{ success?: boolean, score?: number, week_score?: number }} [data] - Body trả về từ `/score/increment`.
 * @returns {void}
 */
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

/**
 * Gọi API cộng điểm hoàn thành bài và cập nhật localStorage.
 *
 * Luồng:
 * - Không có `userId` → return `null`.
 * - `getScoreDelta` ≤ 0 → return `null` (không gọi API).
 * - POST `/score/increment` với `{ userId, delta }`.
 * - Thành công → `applyScoreResponseToStorage(resp.data)` → return `resp.data`.
 * - Lỗi mạng/API → log, return `null`.
 *
 * @param {number|string} userId - ID người chơi.
 * @param {number} correctCount - Số câu đúng (chưa gồm bonus).
 * @param {object} [payload] - Payload phiên (bonus item, reviewMode).
 * @returns {Promise<object|null>} Data response khi thành công, else `null`.
 */
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
