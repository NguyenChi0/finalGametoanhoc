// src/components/games/Game1.jsx
import React, { useState, useMemo, useRef } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Game1({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];
  const user = payload?.user;
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [userScore, setUserScore] = useState(user?.score ?? 0);
  const [weekScore, setWeekScore] = useState(user?.week_score ?? 0);
  const [locked, setLocked] = useState(false);
  const [background, setBackground] = useState("game1-asker.png");
  const [showMenu, setShowMenu] = useState(true);
  const [correctCount, setCorrectCount] = useState(0);

  // Refs cho âm thanh
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);

  // hàm shuffle (Fisher-Yates)
  const shuffleArray = (arr) => {
    const a = arr ? arr.slice() : [];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Chuẩn bị câu hỏi: tối đa 15 câu, nếu chủ đề ít hơn thì dùng hết
  const preparedQuestions = useMemo(() => {
    const total = (questions || []).length;
    const limit = Math.min(15, total);
    return (questions || []).slice(0, limit).map(q => ({
      ...q,
      // nếu q.answers không tồn tại thì dùng []
      answers: shuffleArray(q.answers || [])
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]); // chỉ chạy lại khi questions thay đổi

  const gameQuestions = preparedQuestions;
  const currentQuestion = gameQuestions[current];

  async function incrementScore(userId, delta = 1) {
    try {
      const res = await api.post("/score/increment", { userId, delta });
      if (res.data?.success) {
        setUserScore(res.data.score);
        setWeekScore(res.data.week_score);

        const raw = localStorage.getItem("user");
        const existing = raw ? JSON.parse(raw) : (user ? { ...user } : {});
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...existing,
            score: res.data.score,
            week_score: res.data.week_score,
          })
        );
      }
    } catch (err) {
      console.error("API cộng điểm lỗi:", err);
    }
  }

  // Hàm phát âm thanh
  const playSound = (isCorrect) => {
    if (isCorrect) {
      if (correctSoundRef.current) {
        correctSoundRef.current.currentTime = 0;
        correctSoundRef.current.play().catch(e => console.log("Lỗi phát âm thanh:", e));
      }
    } else {
      if (wrongSoundRef.current) {
        wrongSoundRef.current.currentTime = 0;
        wrongSoundRef.current.play().catch(e => console.log("Lỗi phát âm thanh:", e));
      }
    }
  };

  // xử lý trả lời: giờ nhận (answer, index)
  function handleAnswer(answer, idx) {
    if (locked) return;
    setLocked(true);
    setSelected(idx);

    const isCorrect = !!answer.correct;
    const isLast = current + 1 >= gameQuestions.length;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    // Phát âm thanh
    playSound(isCorrect);

    if (isCorrect) {
      setBackground("game1-winner.png");
    } else {
      setBackground("game1-loser.png");
    }

    setCorrectCount(newCorrectCount);

    setTimeout(() => {
      if (!isLast) {
        setCurrent((c) => c + 1);
        setSelected(null);
        setLocked(false);
        setBackground("game1-asker.png");
      } else {
        setShowResult(true);
        setBackground(isCorrect ? "game1-winner.png" : "game1-loser.png");

        if (user?.id && newCorrectCount > 0) {
          incrementScore(user.id, newCorrectCount);
        }
        onLessonComplete?.(newCorrectCount);
      }
    }, 2000);
  }

  function resetGame() {
    setCurrent(0);
    setSelected(null);
    setShowResult(false);
    setLocked(false);
    setBackground("game1-asker.png");
    setShowMenu(true);
    setCorrectCount(0);
  }

  if (!gameQuestions.length) {
    return (
      <div style={{ textAlign: "center", marginTop: 100, color: "white" }}>
        Không có câu hỏi nào!
      </div>
    );
  }

  const getImageSrc = (imgPath) => {
    if (!imgPath) return null;
    if (/^https?:\/\//i.test(imgPath)) return imgPath;
    if (imgPath.startsWith("/")) return imgPath;
    if (imgPath.startsWith("game-images/")) return `/${imgPath}`;
    return `${publicUrl}/game-images/${imgPath}`;
  };


  const getQuestionImageSrc = (imgPath) => {
    if (!imgPath) return null;
    // Nếu đã là link http thì trả về nguyên bản
    if (/^https?:\/\//i.test(imgPath)) return imgPath;
    // Nếu là đường dẫn tương đối từ DB, thêm /gametoanhoc
    return `/gametoanhoc/${imgPath}`; // imgPath bắt đầu với /hh1-cauhoi/...
  };

  /** Vỏ khu chơi — đồng bộ template với game 2 (desktop): full chiều ngang, cao 70vh */
  const gameShellStyle = {
    width: "100%",
    maxWidth: "100%",
    height: "70vh",
    minHeight: "70vh",
    position: "relative",
    boxSizing: "border-box",
    overflow: "hidden",
  };
  /** @deprecated dùng `gameShellStyle`; giữ alias để tương thích nếu chunk HMR còn tham chiếu tên cũ */
  // eslint-disable-next-line no-unused-vars -- alias chỉ để tránh ReferenceError từ hot-reload cũ
  const gameContainerStyle = gameShellStyle;

  // Khung kết quả: lấp đầy vỏ 70vh
  const resultBackgroundStyle = {
    width: "100%",
    height: "100%",
    minHeight: "100%",
    backgroundColor: "#005fbeff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    textAlign: "center",
    padding: "clamp(16px, 2.5vw, 28px)",
    borderRadius: "12px",
    border: "3px solidrgb(0, 195, 255)",
    boxSizing: "border-box",
  };

  // tính phần trăm tiến độ (số câu đã hoàn thành / tổng số câu)
  const progressPercent = Math.round(
    (Math.min(current, gameQuestions.length - 1) / gameQuestions.length) * 100
  );

  // Menu bắt đầu
  if (showMenu) {
    return (
      <div style={gameShellStyle}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #005fbeff, #003d7aff)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
            textAlign: "center",
            padding: "clamp(24px, 4vw, 48px) clamp(16px, 3vw, 32px)",
            borderRadius: "12px",
            border: "3px solidrgb(0, 204, 255)",
            position: "relative",
            overflow: "auto",
            boxSizing: "border-box",
          }}
        >
            {/* Hiệu ứng nền */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${publicUrl}/game-images/game1-asker.png)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.15,
              zIndex: 0
            }}></div>

            {/* Nội dung menu */}
            <div style={{
              position: "relative",
              zIndex: 1,
              maxWidth: "min(720px, 100%)",
              width: "100%"
            }}>
              {/* Tiêu đề */}
              <h1 style={{
                fontSize: "2em",
                fontWeight: "bold",
                color: "#FFD700",
                marginBottom: "20px",
                textShadow: "3px 3px 6px rgba(0,0,0,0.5)",
                lineHeight: "1.2"
              }}>
                🗻Đường Lên Đỉnh Olympia🗻
              </h1>

              {/* Mô tả */}
              <p style={{
                fontSize: "1.2em",
                color: "#ffffff",
                marginBottom: "40px",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                lineHeight: "1.5"
              }}>
                Cố gắng trả lời đúng tất cả các câu hỏi để trở thành nhà leo núi xuất sắc nhé!
              </p>

              {/* Nút Start */}
              <button
                onClick={() => setShowMenu(false)}
                style={{
                  background: "linear-gradient(135deg, #4CAF50, #45a049)",
                  color: "white",
                  padding: "18px 50px",
                  border: "3px solidrgb(0, 217, 255)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "1.5em",
                  fontWeight: "bold",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
                  transition: "all 0.3s ease",
                  textTransform: "uppercase"
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = "scale(1.05)";
                  e.target.style.boxShadow = "0 8px 25px rgba(0,0,0,0.4)";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "scale(1)";
                  e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
                }}
              >
                🎮 Start Game
              </button>

              {/* Thông tin bổ sung */}
              <div style={{
                marginTop: "30px",
                fontSize: "0.9em",
                color: "#b3d9ff",
                textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
              }}>
                <p>📝 Tổng số câu hỏi: {gameQuestions.length}</p>
                
              </div>
            </div>
          </div>
      </div>
    );
  }

  if (showResult) {
    const totalQuestions = gameQuestions.length;
    const isPerfect = correctCount === totalQuestions;

    return (
      <div style={gameShellStyle}>
        <div style={resultBackgroundStyle}>
            <div
              style={{
                background: "rgba(78, 150, 221, 0.9)",
                padding: "clamp(20px, 3vw, 36px)",
                borderRadius: 12,
                width: "100%",
                maxWidth: "min(960px, 96%)",
                boxSizing: "border-box",
              }}
            >
              <h2
                style={{
                  color: isPerfect ? "#FFD700" : "#4ecdc4",
                  fontSize: "2em",
                  marginBottom: "20px",
                }}
              >
                {isPerfect ? "🎉 CHÚC MỪNG!" : "✅ HOÀN THÀNH BÀI LÀM"}
              </h2>

              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "1.2em", marginBottom: "10px" }}>
                  Bạn trả lời đúng {correctCount} / {totalQuestions} câu hỏi.
                </p>
                <p style={{ fontSize: "1.1em", color: "#FFD700" }}>
                  Hoàn thành: <b>100%</b>
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={resetGame}
                  style={{
                    background: "linear-gradient(135deg, #4CAF50, #45a049)",
                    color: "white",
                    padding: "12px 24px",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: "1em",
                    fontWeight: "bold",
                  }}
                >
                  🔄 Chơi Lại
                </button>
                <button
                  onClick={() => (window.location.href = "/gametoanhoc")}
                  style={{
                    background: "linear-gradient(135deg, #2196F3, #1976D2)",
                    color: "white",
                    padding: "12px 24px",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: "1em",
                    fontWeight: "bold",
                  }}
                >
                  🏠 Về Trang Chủ
                </button>
              </div>
            </div>
        </div>

        {/* Âm thanh */}
        <audio
          ref={correctSoundRef}
          src={`${publicUrl}/game-noises/dung.mp3`}
          preload="auto"
        />
        <audio
          ref={wrongSoundRef}
          src={`${publicUrl}/game-noises/wrong.mp3`}
          preload="auto"
        />
      </div>
    );
  }

  const questionImageSrc = getQuestionImageSrc(currentQuestion.question_image);

  return (
    <div style={{ ...gameShellStyle, display: "flex", flexDirection: "column" }}>
        <style>{`
          .game1-answers-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 15px;
          }
          @media (max-width: 600px) {
            .game1-answers-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
        {/* Audio */}
        <audio
          ref={correctSoundRef}
          src={`${publicUrl}/game-noises/dung.mp3`}
          preload="auto"
        />
        <audio
          ref={wrongSoundRef}
          src={`${publicUrl}/game-noises/wrong.mp3`}
          preload="auto"
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            flex: 1,
            minHeight: 0,
            backgroundColor: "#002f5eff",
            color: "white",
            padding: "clamp(16px, 2.5vw, 32px)",
            borderRadius: "12px",
            border: "3px solid #1e88e5",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          {/* Phần câu hỏi với background */}
          <div style={{
            flex: 1,
            backgroundImage: `url(${publicUrl}/game-images/${background})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
            backgroundSize: "cover",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "3px solidrgb(0, 195, 255)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            position: "relative",
            color: "black"
          }}>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: "10px",
              zIndex: 1
            }}></div>

            {/* Khi đã chọn đáp án (ảnh đúng/sai): không đè text/ảnh câu hỏi lên nhân vật nền */}
            {!locked && (
            <div style={{ 
              position: "relative", 
              zIndex: 2,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}>
              <div style={{ 
                color: "white", 
                fontSize: "1.3em",
                fontWeight: "bold",
                marginBottom: questionImageSrc ? "10px" : "0",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                padding: "0 10px"
              }}>
                {currentQuestion.question_text}
              </div>

              {questionImageSrc && (
                <img
                  src={questionImageSrc}
                  alt="Minh họa câu hỏi"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/gametoanhoc/hh1-cauhoi/placeholder.png";
                  }}
                  style={{
                    maxWidth: "70%",
                    maxHeight: "150px",
                    borderRadius: "8px",
                    border: "2px solid #1e88e5",
                    objectFit: "contain"
                  }}
                />
              )}
            </div>
            )}
          </div>

          {/* Đáp án: desktop 2 cột; mobile 1 đáp án / hàng */}
          <div className="game1-answers-grid">
            {currentQuestion.answers.map((ans, i) => {
              const chosen = selected === i;
              let bg = "linear-gradient(135deg, rgba(54, 150, 230, 0.8), rgba(24, 122, 221, 0.8))";
              let borderColor = "#1e88e5";
              if (selected !== null) {
                if (chosen && ans.correct) {
                  bg = "linear-gradient(135deg, #4CAF50, #45a049)";
                  borderColor = "#4CAF50";
                } else if (chosen && !ans.correct) {
                  bg = "linear-gradient(135deg, #dc3545, #c82333)";
                  borderColor = "#dc3545";
                } else if (ans.correct) {
                  // hiển thị đáp án đúng cho người chơi biết
                  bg = "linear-gradient(135deg, #4CAF50, #45a049)";
                  borderColor = "#4CAF50";
                } else {
                  bg = "linear-gradient(135deg, rgba(44, 62, 80, 0.8), rgba(52, 73, 94, 0.8))";
                  borderColor = "#7aacdfff";
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(ans, i)}
                  disabled={locked}
                  style={{
                    background: bg,
                    color: "white",
                    border: `3px solid ${borderColor}`,
                    borderRadius: "8px",
                    padding: "12px 10px",
                    fontSize: "14px",
                    cursor: locked ? "default" : "pointer",
                    fontWeight: "bold",
                    minHeight: "60px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    transition: "all 0.3s ease"
                  }}
                >
                  <span style={{
                    marginRight: "10px",
                    fontSize: "1.1em",
                    minWidth: "25px",
                    textAlign: "center"
                  }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {ans.text}
                </button>
              );
            })}
          </div>

          {/* Thanh phần trăm tiến độ */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontSize: "0.95em", marginBottom: "8px", color: "white" }}>
              Tiến độ: <b>{progressPercent}%</b> ({current}/{gameQuestions.length})
            </div>
            <div style={{ background: "rgba(255,255,255,0.12)", height: "14px", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: "linear-gradient(90deg,#FFD700,#FFA000)" }} />
            </div>
          </div>
        </div>
    </div>
  );
}