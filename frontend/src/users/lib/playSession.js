export const SESSION_KEY = "game_play_state_v1";
export const PREGAME_SESSION_KEY = "game_pregame_state_v1";

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
