/**
 * Registry cấu hình 11 giao diện game (metadata UI, không phải logic câu hỏi).
 * Dùng ở `preGameSetUp` (carousel + modal hướng dẫn) và `gamepage` (tên header).
 */

/** Bảng màu nền thẻ carousel khi không dùng ảnh preview. */
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

/**
 * Đường ảnh preview tương đối trong `public/` (Vite serve static).
 *
 * @param {string} id - `game1` … `game11`.
 * @returns {string} Ví dụ `game-preview-images/game1.png`.
 */
function gamePreviewImage(id) {
  return `game-preview-images/${id}.png`;
}

/**
 * Danh sách đầy đủ giao diện chơi: `id` khớp route `/game/:gameId` và lazy import component.
 * Mỗi phần tử: `label`, `color`, `previewImage`, `guide` (nội dung nút `?`).
 */
export const GAME_OPTIONS = [
  {
    id: "game1",
    label: "Cổ điển",
    color: GAME_CARD_COLORS[0],
    previewImage: gamePreviewImage("game1"),
    guide:
      "Chế độ trắc nghiệm cổ điển: đọc câu hỏi, chọn một đáp án đúng. Phù hợp khi bạn muốn tập trung vào nội dung bài học mà không bị phân tâm bởi hiệu ứng game.",
  },
  {
    id: "game2",
    label: "Diệt ruồi",
    color: GAME_CARD_COLORS[1],
    previewImage: gamePreviewImage("game2"),
    guide:
      "Các đáp án xuất hiện như “ruồi” bay trên màn hình. Chạm đúng đáp án để ghi điểm — chọn nhầm sẽ mất lượt. Rèn phản xạ và tốc độ nhận biết đáp án đúng.",
  },
  {
    id: "game3",
    label: "Ai là triệu phú",
    color: GAME_CARD_COLORS[2],
    previewImage: gamePreviewImage("game3"),
    guide:
      "Trả lời lần lượt từng câu như gameshow. Mỗi câu đúng giúp bạn tiến xa hơn; sai thì kết thúc lượt chơi. Thích hợp để ôn tập theo từng bước.",
  },
  {
    id: "game4",
    label: "Vượt chướng ngại vật",
    color: GAME_CARD_COLORS[3],
    previewImage: gamePreviewImage("game4"),
    guide:
      "Vượt qua các chướng ngại bằng cách trả lời đúng câu hỏi. Mỗi màn là một thử thách — cần vừa chính xác vừa kiên trì để hoàn thành bài.",
  },
  {
    id: "game5",
    label: "Finding Dory",
    color: GAME_CARD_COLORS[4],
    previewImage: gamePreviewImage("game5"),
    guide:
      "Giao diện tìm kiếm và ghép đáp án theo chủ đề đại dương. Quan sát kỹ câu hỏi và chọn đáp án phù hợp trong không gian game sinh động.",
  },
  {
    id: "game6",
    label: "Chém hoa quả",
    color: GAME_CARD_COLORS[5],
    previewImage: gamePreviewImage("game6"),
    guide:
      "Đáp án hiện lên như trái cây bay — “chém” (chạm) đúng đáp án để ăn điểm. Tránh chọn nhầm; game khuyế khích phản xạ nhanh và tập trung.",
  },
  {
    id: "game7",
    label: "Nhà thám hiểm tài ba",
    color: GAME_CARD_COLORS[6],
    previewImage: gamePreviewImage("game7"),
    guide:
      "Hóa thân nhà thám hiểm, mỗi câu trả lời đúng giúp bạn tiến thêm trên hành trình. Phù hợp học sinh thích phiêu lưu và mục tiêu rõ ràng từng câu.",
  },
  {
    id: "game8",
    label: "Bài kiểm tra",
    color: GAME_CARD_COLORS[7],
    previewImage: gamePreviewImage("game8"),
    guide:
      "Giao diện giống bài kiểm tra: câu hỏi và đáp án gọn, ít hiệu ứng. Dùng khi muốn luyện tập nghiêm túc như trên lớp hoặc trước khi thi.",
  },
  {
    id: "game9",
    label: "Dẫn thỏ về hang",
    color: GAME_CARD_COLORS[8],
    previewImage: gamePreviewImage("game9"),
    guide:
      "Trả lời đúng để dẫn chú thỏ về hang an toàn. Mỗi câu đúng là một bước trên đường — game nhẹ nhàng, dễ theo dõi cho học sinh nhỏ.",
  },
  {
    id: "game10",
    label: "Bắn bóng bay",
    color: GAME_CARD_COLORS[9],
    previewImage: gamePreviewImage("game10"),
    guide:
      "Chọn đáp án bằng cách bắn trúng bóng bay mang phương án đúng. Kết hợp toán học với thao tác nhanh tay, tăng hứng thú khi ôn bài.",
  },
  {
    id: "game11",
    label: "Đố vui nhanh tay",
    color: GAME_CARD_COLORS[10],
    previewImage: gamePreviewImage("game11"),
    guide:
      "Câu hỏi ngắn, thời gian phản hồi nhanh. Ai trả lời đúng và nhanh sẽ ghi nhiều điểm hơn — thích hợp thi đấu nhẹ hoặc ôn gấp trước giờ học.",
  },
];

/**
 * Map nhanh `gameId` → tên hiển thị (sinh từ `GAME_OPTIONS`).
 * Dùng header trang game khi payload không có `game.name`.
 */
export const GAME_LABELS = Object.fromEntries(
  GAME_OPTIONS.map((o) => [o.id, o.label])
);
