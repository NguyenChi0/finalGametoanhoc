export const SESSION_KEY = "game_play_state_v1";
export const PREGAME_SESSION_KEY = "game_pregame_state_v1";
export const LAST_GAME_INTERFACE_KEY = "game_interface_last_v1";

const LEGACY_LAST_LESSON_KEY = "lesson_last_selection_v1";
if (typeof localStorage !== "undefined") {
  try {
    localStorage.removeItem(LEGACY_LAST_LESSON_KEY);
  } catch {
    /* ignore */
  }
}

/** Giao diện game lần chọn gần nhất (localStorage). */
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
