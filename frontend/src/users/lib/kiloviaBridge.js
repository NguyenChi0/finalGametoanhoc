/**
 * Tích hợp Kilovia: nhận token từ iframe/URL, lưu context, gửi kết quả bài chơi
 * về API Kilovia khi user mở game từ nền tảng Kilovia.
 *
 * Token có thể đến từ:
 * - URL: `?kilovia_token=...&ma_tre_em=...`
 * - postMessage: `{ type: 'KILOVIA_CHILD_TOKEN', childToken }`
 */

const KILOVIA_CONTEXT_KEY = "kilovia_context_v1";

const KILOVIA_API_BASE =
  (import.meta.env.VITE_KILOVIA_API_BASE_URL || "https://kilovia.com/api_kilovia/api").replace(
    /\/$/,
    ""
  );

/**
 * Giải mã phần payload JWT (base64) — không verify chữ ký, chỉ đọc claim.
 *
 * Luồng:
 * - Token không đúng format 3 phần → `null`.
 * - Parse JSON payload → trả object (có thể chứa `ma_tre_em`, `sub`, …).
 *
 * @param {string} token - JWT Kilovia.
 * @returns {object|null}
 */
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

/**
 * Lưu context Kilovia sau postMessage từ parent frame.
 *
 * Luồng:
 * - Decode JWT lấy mã trẻ (`ma_tre_em` / `sub` / …) nếu không truyền `explicitMaTreEm`.
 * - Ghi `{ token, childCode }` vào sessionStorage.
 * - Return context vừa lưu (dùng ngay nếu cần).
 *
 * @param {string} childToken - JWT từ Kilovia.
 * @param {string} [explicitMaTreEm] - Mã trẻ em ưu tiên hơn claim JWT.
 * @returns {{ token: string, childCode: string|null }}
 */
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

/**
 * Đọc context Kilovia đã lưu (sau postMessage hoặc thiết lập thủ công).
 *
 * @returns {{ token: string, childCode: string|null }|null}
 */
export function getKiloviaContext() {
  try {
    const raw = sessionStorage.getItem(KILOVIA_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Gửi kết quả lượt chơi lên Kilovia: `POST .../lesson-results/add`.
 *
 * Luồng:
 * - Không có `token` → log, return `null`.
 * - Body: tên bài, điểm, thời gian bắt đầu/kết thúc, `lessonType: game`, optional `maTreEm`.
 * - Header `Authorization: Bearer <token>`.
 * - HTTP không OK → log; 401/403 → alert hết phiên → return `null`.
 * - Thành công → parse JSON response.
 *
 * @param {object} params
 * @param {string} params.token - JWT Kilovia.
 * @param {string} [params.maTreEm] - Mã trẻ em.
 * @param {number} params.score - Điểm (thường = số câu đúng).
 * @param {string} params.startAt - ISO thời điểm bắt đầu.
 * @param {string} params.endAt - ISO thời điểm kết thúc.
 * @returns {Promise<object|null>} Response JSON hoặc `null`.
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
