/**
 * Lưu / đọc state phiên chơi qua `sessionStorage` và `localStorage`.
 * Giúp reload trang, quay lại pre-game, hoặc khôi phục carousel game không mất payload.
 */

/** Key sessionStorage: payload đang chơi + `gameId` (dùng ở `gamepage`). */
export const SESSION_KEY = "game_play_state_v1";

/** Key sessionStorage: payload màn pre-game (trước khi bấm Chơi). */
export const PREGAME_SESSION_KEY = "game_pregame_state_v1";

/** Key sessionStorage: payload phiên ôn tập. */
export const REVIEW_SESSION_KEY = "lesson_review_session_v1";

/** Key sessionStorage: vật phẩm đã chọn cho phiên đăng nhập hiện tại. */
export const ITEM_LOADOUT_SESSION_KEY = "item_loadout_session_v1";

/** Key localStorage: game interface (game1…game11) user chọn lần gần nhất. */
export const LAST_GAME_INTERFACE_KEY = "game_interface_last_v1";

const LEGACY_LAST_LESSON_KEY = "lesson_last_selection_v1";
if (typeof localStorage !== "undefined") {
  try {
    localStorage.removeItem(LEGACY_LAST_LESSON_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Đọc `gameId` giao diện game đã chọn lần trước (localStorage).
 *
 * Luồng:
 * - Không có dữ liệu / parse lỗi → `null`.
 * - `gameId` không hợp lệ → `null`.
 * - Nếu truyền `validIds` → chỉ trả id nằm trong danh sách hợp lệ.
 *
 * @param {string[]} [validIds] - Danh sách id cho phép (vd. `game1`…`game11`).
 * @returns {string|null} `gameId` hoặc `null`.
 */
export function readLastGameInterface(validIds) {
  const allowed = Array.isArray(validIds) ? new Set(validIds) : null;
  try {
    const raw = localStorage.getItem(LAST_GAME_INTERFACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.gameId;
    if (typeof id !== "string" || !id) return null;
    if (allowed && !allowed.has(id)) return null;
    return id;
  } catch (e) {
    console.warn("Lỗi đọc giao diện game gần nhất:", e);
    return null;
  }
}

/**
 * Lưu game interface user vừa chọn (carousel pre-game).
 *
 * @param {string} gameId - Ví dụ `game1`, `game3`.
 * @returns {void}
 */
export function persistLastGameInterface(gameId) {
  if (!gameId || typeof gameId !== "string") return;
  try {
    localStorage.setItem(
      LAST_GAME_INTERFACE_KEY,
      JSON.stringify({ gameId, ts: Date.now() })
    );
  } catch (e) {
    console.warn("Không lưu được giao diện game gần nhất:", e);
  }
}

/**
 * Lưu payload + gameId khi bắt đầu vào trang game (F5 vẫn khôi phục được).
 *
 * @param {string} gameId - Route param game.
 * @param {object} payload - Payload đầy đủ (questions, user, itemEffects, …).
 * @returns {void}
 */
export function persistPlayState(gameId, payload) {
  try {
    const saved = { gameId, payload, ts: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(saved));
  } catch (e) {
    console.warn("Không lưu được state chơi:", e);
  }
}

/**
 * Lưu payload màn pre-game (lessonPage → preGameSetUp).
 *
 * @param {object} payload - Payload chuẩn bị chơi.
 * @returns {void}
 */
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

/**
 * Đọc payload pre-game đã lưu (khi user refresh hoặc quay lại không qua `location.state`).
 *
 * @returns {object|null} Payload hoặc `null`.
 */
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

/**
 * Lưu payload phiên ôn tập (`reviewMode`, batch câu hỏi).
 *
 * @param {object} payload - Payload ôn tập.
 * @returns {void}
 */
export function persistReviewSession(payload) {
  try {
    sessionStorage.setItem(
      REVIEW_SESSION_KEY,
      JSON.stringify({ payload, ts: Date.now() })
    );
  } catch (e) {
    console.warn("Không lưu được phiên ôn tập:", e);
  }
}

/**
 * Đọc payload phiên ôn tập đã lưu.
 *
 * @returns {object|null} Payload hoặc `null`.
 */
export function readReviewSession() {
  try {
    const raw = sessionStorage.getItem(REVIEW_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.payload ? parsed.payload : null;
  } catch (e) {
    console.warn("Lỗi đọc phiên ôn tập:", e);
    return null;
  }
}

function normalizeItemLoadoutIds(selectedItemIds) {
  if (!Array.isArray(selectedItemIds)) return [];
  return selectedItemIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
    .slice(0, 3);
}

function readItemLoadoutRecord() {
  try {
    const raw = sessionStorage.getItem(ITEM_LOADOUT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.userId == null) return null;
    return parsed;
  } catch (e) {
    console.warn("Lỗi đọc loadout vật phẩm:", e);
    return null;
  }
}

/**
 * Lưu vật phẩm đã chọn cho phiên hiện tại (sessionStorage).
 *
 * @param {number|string} userId
 * @param {number[]} selectedItemIds - Tối đa 3 id.
 */
export function persistItemLoadout(userId, selectedItemIds) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return;
  try {
    sessionStorage.setItem(
      ITEM_LOADOUT_SESSION_KEY,
      JSON.stringify({
        userId: uid,
        selectedItemIds: normalizeItemLoadoutIds(selectedItemIds),
        confirmedAt: Date.now(),
      })
    );
  } catch (e) {
    console.warn("Không lưu được loadout vật phẩm:", e);
  }
}

/**
 * Đọc ids vật phẩm đã chọn nếu cùng user.
 *
 * @param {number|string} userId
 * @returns {number[]|null} `null` nếu chưa xác nhận hoặc user khác.
 */
export function readItemLoadout(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return null;
  const record = readItemLoadoutRecord();
  if (!record || Number(record.userId) !== uid) return null;
  return normalizeItemLoadoutIds(record.selectedItemIds);
}

/**
 * User đã xác nhận chọn vật phẩm ít nhất một lần trong phiên này.
 *
 * @param {number|string} userId
 * @returns {boolean}
 */
export function hasConfirmedItemLoadout(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return false;
  const record = readItemLoadoutRecord();
  return Boolean(record && Number(record.userId) === uid && record.confirmedAt);
}

/** Xóa loadout vật phẩm (đăng nhập mới / đăng xuất). */
export function clearItemLoadout() {
  try {
    sessionStorage.removeItem(ITEM_LOADOUT_SESSION_KEY);
  } catch (e) {
    console.warn("Không xóa được loadout vật phẩm:", e);
  }
}
