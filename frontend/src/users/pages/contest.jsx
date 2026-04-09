import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { publicUrl } from "../../lib/publicUrl";

export default function Contest() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const pageBg = `${publicUrl}/component-images/home-background.png`;

  const bgFixedLayer = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    backgroundColor: "#b8e0f5",
    backgroundImage: `url(${pageBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    transform: "translateZ(0)",
    backfaceVisibility: "hidden",
  };

  const contests = [
    {
      id: 1,
      title: "Lớp 1",
      description: "Các bài toán đếm số, phép cộng trừ trong phạm vi 10, nhận biết hình tròn, hình vuông.",
      timeLimit: "30 phút",
      questions: 10,
    },
    {
      id: 2,
      title: "Lớp 2",
      description: "Phép cộng trừ có nhớ trong phạm vi 100, bảng cửu chương 2, 3, 4, 5, tính độ dài đường gấp khúc.",
      timeLimit: "40 phút",
      questions: 12,
    },
    {
      id: 3,
      title: "Lớp 3",
      description: "Phép nhân chia trong phạm vi 1000, tính chu vi hình chữ nhật, hình vuông, giải toán có lời văn.",
      timeLimit: "45 phút",
      questions: 15,
    },
    {
      id: 4,
      title: "Lớp 4",
      description: "Phân số, hỗn số, các phép tính với phân số, tính diện tích hình bình hành, hình thoi.",
      timeLimit: "50 phút",
      questions: 18,
    },
    {
      id: 5,
      title: "Lớp 5",
      description: "Số thập phân, tỉ số phần trăm, thể tích hình hộp chữ nhật, hình lập phương, toán chuyển động đều.",
      timeLimit: "60 phút",
      questions: 20,
    },
  ];

  const handleDoQuiz = (contestId) => {
    navigate(`/contest/${contestId}`);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={bgFixedLayer} aria-hidden />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 960,
          margin: "0 auto",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <main>
          <section style={{ padding: "28px 24px" }}>
            <h1 style={{ marginBottom: 14, color: "#0f4c75" }}>Cuộc thi Math Contest</h1>
            <p style={{ lineHeight: 1.75, color: "#263238", marginBottom: 24 }}>
              Chào mừng bạn đến với phần thi Contest! Tại đây bạn có thể tham gia các bài thi toán học.
              Chọn một đề thi bên dưới và bắt đầu thử thách.
            </p>

            <div style={{ marginBottom: 32 }}>
              <p style={{ margin: 0, fontWeight: 600, color: "#3282b8" }}>📌 Lưu ý:</p>
              <ul style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0, color: "#455a64" }}>
                <li>Đăng nhập để quản lý hồ sơ và truy cập đầy đủ tính năng.</li>
                <li>Mỗi bài thi chỉ được làm một lần, kết quả sẽ được cập nhật trong trang cá nhân.</li>
                <li>Hãy chuẩn bị tinh thần và kiểm tra kết nối mạng trước khi làm bài.</li>
              </ul>
            </div>

            <div className="contest-list">
              {contests.map((contest) => (
                <div key={contest.id} className="contest-card">
                  <div className="card-content">
                    <div className="card-info">
                      <h3>{contest.title}</h3>
                      <p>{contest.description}</p>
                      <div className="meta">
                        <span>⏱️ {contest.timeLimit}</span>
                        <span>📝 {contest.questions} câu hỏi</span>
                      </div>
                    </div>
                    <div className="card-button">
                      <button onClick={() => handleDoQuiz(contest.id)}>Làm bài</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <style>
              {`
                .contest-list {
                  display: flex;
                  flex-direction: column;
                  gap: 20px;
                }
                .contest-card {
                  border: 1px solid #e0e7ed;
                  border-radius: 16px;
                  padding: 18px 20px;
                  transition: all 0.2s;
                  background-color: #fefefe;
                }
                .card-content {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  gap: 16px;
                }
                .card-info {
                  flex: 1;
                }
                .card-info h3 {
                  margin: 0 0 6px 0;
                  color: #1e4663;
                }
                .card-info p {
                  margin: 0 0 10px 0;
                  color: #4a627a;
                  line-height: 1.5;
                }
                .meta {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 16px;
                  font-size: 14px;
                  color: #2c6e9e;
                }
                .card-button {
                  flex-shrink: 0;
                }
                .card-button button {
                  background-color: #0f4c75;
                  border: none;
                  border-radius: 40px;
                  padding: 10px 24px;
                  color: white;
                  font-weight: 600;
                  font-size: 15px;
                  cursor: pointer;
                  transition: background 0.2s;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                }
                .card-button button:hover {
                  background-color: #3282b8;
                }
                @media (max-width: 768px) {
                  .card-content {
                    flex-direction: column;
                    align-items: stretch;
                  }
                  .card-button {
                    margin-top: 12px;
                  }
                  .card-button button {
                    width: 100%;
                  }
                }
              `}
            </style>
          </section>
        </main>
      </div>
    </div>
  );
}