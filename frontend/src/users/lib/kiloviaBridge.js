/**
 * Gửi kết quả bài chơi (lesson result) về Kilovia khi user chơi từ Kilovia.
 * Token Kilovia ký HS512, gửi kèm trong header Authorization.
 *
 * Kilovia có thể gửi token qua:
 * - URL: ?kilovia_token=...&ma_tre_em=...
 * - postMessage: { type: 'KILOVIA_CHILD_TOKEN', childToken }
 */

const KILOVIA_CONTEXT_KEY = "kilovia_context_v1";

const KILOVIA_API_BASE =
  (import.meta.env.VITE_KILOVIA_API_BASE_URL || "https://kilovia.com/api_kilovia/api").replace(
    /\/$/,
    ""
  );

/** Giải mã payload JWT (không verify, chỉ đọc). Kilovia có thể gửi ma_tre_em trong payload. */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/** Lưu context Kilovia (token + childCode) từ postMessage để dùng khi chơi và gửi kết quả. */
export function setKiloviaContextFromMessage(childToken, explicitMaTreEm) {
  const payload = decodeJwtPayload(childToken);
  const fromJwt =
    payload && (payload.ma_tre_em ?? payload.maTreEm ?? payload.sub ?? payload.childId);
  const childCode = explicitMaTreEm || fromJwt || null;
  const context = { token: childToken, childCode };
  try {
    sessionStorage.setItem(KILOVIA_CONTEXT_KEY, JSON.stringify(context));
  } catch (e) {
    console.warn("[Kilovia] Không lưu được context:", e);
  }
  return context;
}

/** Đọc context Kilovia đã lưu (từ postMessage hoặc URL). */
export function getKiloviaContext() {
  try {
    const raw = sessionStorage.getItem(KILOVIA_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Gửi kết quả lên Kilovia: POST /lesson-results/add
 * @param {Object} params
 * @param {string} params.token - JWT từ Kilovia (HS512)
 * @param {string} [params.maTreEm] - Mã trẻ em (từ Kilovia) để Kilovia ghép kết quả
 * @param {number} params.score - Điểm (số câu đúng)
 * @param {string} params.startAt - ISO string
 * @param {string} params.endAt - ISO string
 */
export async function sendLessonResultToKilovia({
  token,
  maTreEm,
  score,
  startAt,
  endAt,
}) {
  if (!token) {
    console.warn("[Kilovia] Thiếu token Kilovia, bỏ qua gửi kết quả. maTreEm =", maTreEm);
    return null;
  }
  const url = `${KILOVIA_API_BASE.replace(/\/$/, "")}/lesson-results/add`;
  const body = {
    lessonName: "Game Toán Học",
    score: Number(score) || 0,
    startAt,
    endAt,
    lessonType: "game",
  };
  if (maTreEm) body.maTreEm = maTreEm;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("[Kilovia] lesson-results/add lỗi:", res.status, text);
      if (res.status === 401 || res.status === 403) {
        try {
          window.alert(
            "Phiên Kilovia đã hết hạn, vui lòng quay lại Kilovia và mở lại trò chơi để tiếp tục."
          );
        } catch (_) {
          // ignore alert failures
        }
      }
      return null;
    }
    return res.json();
  } catch (err) {
    console.warn("[Kilovia] Gửi kết quả thất bại:", err);
    return null;
  }
}
