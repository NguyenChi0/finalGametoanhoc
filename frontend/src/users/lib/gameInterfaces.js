/** Danh sách giao diện game — dùng chung pre-game + gamepage */
export const GAME_OPTIONS = [
  { id: "game1", label: "Đường lên đỉnh olympia" },
  { id: "game2", label: "Diệt ruồi" },
  { id: "game3", label: "Phi tiêu" },
  { id: "game4", label: "Vượt chướng ngại vật" },
  { id: "game5", label: "Finding Dory" },
  { id: "game6", label: "Chém hoa quả" },
  { id: "game7", label: "Nhà thám hiểm tài ba" },
  { id: "game8", label: "Bài kiểm tra" },
  { id: "game9", label: "Dẫn thỏ về hang" },
  { id: "game10", label: "Xạ thủ đỉnh cao" },
  { id: "game11", label: "Đố vui nhanh tay" },
];

export const GAME_LABELS = Object.fromEntries(
  GAME_OPTIONS.map((o) => [o.id, o.label])
);
