/** Màu nền thẻ khi chưa có ảnh preview */
export const GAME_CARD_COLORS = [
  "#C4B5FD",
  "#A78BFA",
  "#F9A8D4",
  "#FBCFE8",
  "#93C5FD",
  "#6EE7B7",
  "#FDE68A",
  "#FDA4AF",
  "#BAE6FD",
  "#DDD6FE",
  "#FECDD3",
];

/** Ảnh xem trước carousel — `frontend/public/game-preview-images/` */
function gamePreviewImage(id) {
  return `game-preview-images/${id}.png`;
}

/** Danh sách giao diện game — dùng chung pre-game + gamepage */
export const GAME_OPTIONS = [
  { id: "game1", label: "Cổ điển", color: GAME_CARD_COLORS[0], previewImage: gamePreviewImage("game1") },
  { id: "game2", label: "Diệt ruồi", color: GAME_CARD_COLORS[1], previewImage: gamePreviewImage("game2") },
  { id: "game3", label: "Ai là triệu phú", color: GAME_CARD_COLORS[2], previewImage: gamePreviewImage("game3") },
  { id: "game4", label: "Vượt chướng ngại vật", color: GAME_CARD_COLORS[3], previewImage: gamePreviewImage("game4") },
  { id: "game5", label: "Finding Dory", color: GAME_CARD_COLORS[4], previewImage: gamePreviewImage("game5") },
  { id: "game6", label: "Chém hoa quả", color: GAME_CARD_COLORS[5], previewImage: gamePreviewImage("game6") },
  { id: "game7", label: "Nhà thám hiểm tài ba", color: GAME_CARD_COLORS[6], previewImage: gamePreviewImage("game7") },
  { id: "game8", label: "Bài kiểm tra", color: GAME_CARD_COLORS[7], previewImage: gamePreviewImage("game8") },
  { id: "game9", label: "Dẫn thỏ về hang", color: GAME_CARD_COLORS[8], previewImage: gamePreviewImage("game9") },
  { id: "game10", label: "Bắn bóng bay ", color: GAME_CARD_COLORS[9], previewImage: gamePreviewImage("game10") },
  { id: "game11", label: "Đố vui nhanh tay", color: GAME_CARD_COLORS[10], previewImage: gamePreviewImage("game11") },
];

export const GAME_LABELS = Object.fromEntries(
  GAME_OPTIONS.map((o) => [o.id, o.label])
);
