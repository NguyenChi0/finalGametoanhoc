// src/components/games/Game1.jsx
import React, { useState, useMemo, useRef } from "react";
import api, { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";

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



  /** Vỏ khu chơi: đủ cao theo nội dung (không cắt đáp án); min-height giữ tỷ lệ đẹp */
  const GAME1_SHELL_MIN_H = "clamp(480px, 78vh, 920px)";
  const gameShellStyle = {
    width: "100%",
    maxWidth: "100%",
    minHeight: GAME1_SHELL_MIN_H,
    height: "auto",
    position: "relative",
    boxSizing: "border-box",
    overflow: "visible",
  };
  /** @deprecated dùng `gameShellStyle`; giữ alias để tương thích nếu chunk HMR còn tham chiếu tên cũ */
  // eslint-disable-next-line no-unused-vars -- alias chỉ để tránh ReferenceError từ hot-reload cũ
  const gameContainerStyle = gameShellStyle;

  // Khung kết quả: lấp đầy vỏ game
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

  // Menu bắt đầu
  if (showMenu) {
    return (
      <div style={{ ...gameShellStyle, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            width: "100%",
            minHeight: GAME1_SHELL_MIN_H,
            flex: 1,
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
      <div className="game1-result-shell" style={gameShellStyle}>
        <style>{`
          .game1-result-shell {
            min-height: min(92vh, 920px) !important;
          }
          .game1-result-shell .game1-result-bg {
            padding: clamp(20px, 3.5vw, 40px) !important;
          }
          @media (min-width: 768px) {
            .game1-result-shell .game1-result-card {
              max-width: min(1120px, 98%) !important;
              padding: clamp(40px, 4.5vw, 64px) !important;
              border-radius: 18px !important;
            }
            .game1-result-shell .game1-result-title {
              font-size: clamp(2.15rem, 3.4vw, 2.85rem) !important;
              margin-bottom: clamp(22px, 3vw, 32px) !important;
            }
            .game1-result-shell .game1-result-body {
              margin-bottom: clamp(22px, 3vw, 36px) !important;
            }
            .game1-result-shell .game1-result-body p:first-child {
              font-size: clamp(1.35rem, 2.2vw, 1.6rem) !important;
            }
            .game1-result-shell .game1-result-body p:last-child {
              font-size: clamp(1.2rem, 2vw, 1.45rem) !important;
            }
            .game1-result-shell .game1-result-actions {
              gap: clamp(18px, 2.5vw, 28px) !important;
            }
            .game1-result-shell .game1-result-actions button {
              font-size: clamp(1.1rem, 1.6vw, 1.25rem) !important;
              padding: clamp(16px, 2vw, 22px) clamp(28px, 4vw, 44px) !important;
              min-height: 56px !important;
              border-radius: 12px !important;
            }
          }
          @media (max-width: 767px) {
            .game1-result-shell {
              min-height: min(94vh, 900px) !important;
            }
            .game1-result-shell .game1-result-bg {
              padding: clamp(12px, 4vw, 24px) !important;
            }
            .game1-result-shell .game1-result-card {
              padding: clamp(36px, 9vw, 56px) !important;
              max-width: 100% !important;
              width: 100% !important;
              border-radius: 16px !important;
            }
            .game1-result-shell .game1-result-title {
              font-size: clamp(2.05rem, 8.5vw, 2.85rem) !important;
              margin-bottom: clamp(20px, 5vw, 30px) !important;
              line-height: 1.2 !important;
            }
            .game1-result-shell .game1-result-body {
              margin-bottom: clamp(22px, 6vw, 36px) !important;
            }
            .game1-result-shell .game1-result-body p {
              font-size: clamp(1.25rem, 5.2vw, 1.5rem) !important;
              margin-bottom: clamp(10px, 3vw, 14px) !important;
            }
            .game1-result-shell .game1-result-body p:last-child {
              font-size: clamp(1.15rem, 4.8vw, 1.4rem) !important;
            }
            .game1-result-shell .game1-result-actions {
              gap: clamp(14px, 4vw, 22px) !important;
            }
            .game1-result-shell .game1-result-actions button {
              font-size: clamp(1.12rem, 4.8vw, 1.35rem) !important;
              padding: clamp(16px, 4.5vw, 22px) clamp(26px, 7vw, 40px) !important;
              min-height: 58px !important;
              border-radius: 12px !important;
            }
          }
        `}</style>
        <div className="game1-result-bg" style={resultBackgroundStyle}>
            <div
              className="game1-result-card"
              style={{
                background: "rgba(78, 150, 221, 0.9)",
                padding: "clamp(32px, 4vw, 52px)",
                borderRadius: 16,
                width: "100%",
                maxWidth: "min(1120px, 98%)",
                boxSizing: "border-box",
              }}
            >
              <h2
                className="game1-result-title"
                style={{
                  color: isPerfect ? "#FFD700" : "#4ecdc4",
                  fontSize: "clamp(1.9rem, 4vw, 2.6rem)",
                  marginBottom: "24px",
                }}
              >
                {isPerfect ? "🎉 CHÚC MỪNG!" : "✅ HOÀN THÀNH BÀI LÀM"}
              </h2>

              <div className="game1-result-body" style={{ marginBottom: "24px" }}>
                <p style={{ fontSize: "1.35em", marginBottom: "12px" }}>
                  Bạn trả lời đúng {correctCount} / {totalQuestions} câu hỏi.
                </p>
                <p style={{ fontSize: "1.25em", color: "#FFD700" }}>
                  Hoàn thành: <b>100%</b>
                </p>
              </div>

              <div
                className="game1-result-actions"
                style={{
                  display: "flex",
                  gap: "18px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="game1-result-btn"
                  onClick={resetGame}
                  style={{
                    background: "linear-gradient(135deg, #4CAF50, #45a049)",
                    color: "white",
                    padding: "14px 28px",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: "1.08em",
                    fontWeight: "bold",
                  }}
                >
                  🔄 Chơi Lại
                </button>
                <button
                  type="button"
                  className="game1-result-btn"
                  onClick={() => (window.location.href = "/gametoanhoc")}
                  style={{
                    background: "linear-gradient(135deg, #2196F3, #1976D2)",
                    color: "white",
                    padding: "14px 28px",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: "1.08em",
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

  const questionImageSrc = currentQuestion.question_image
    ? questionImageUrl(currentQuestion.question_image) || null
    : null;

  return (
    <div style={{ ...gameShellStyle, display: "flex", flexDirection: "column" }}>
        <style>{`
          .game1-question-col {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .game1-question-text {
            overflow-wrap: anywhere;
            word-break: break-word;
            hyphens: auto;
          }
          .game1-answers-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 15px;
            flex-shrink: 0;
          }
          @media (max-width: 600px) {
            .game1-answers-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 767px) {
            .game1-question-wrap {
              flex: 0 0 auto !important;
              min-height: auto !important;
              overflow-x: hidden !important;
              overflow-y: visible !important;
            }
            /* Phản hồi đúng/sai: không còn text trong flow — cần chiều cao lớn để ảnh thắng/thua rõ */
            .game1-question-wrap.game1-question-wrap--feedback {
              min-height: min(58vh, 520px) !important;
            }
            .game1-question-text {
              font-size: clamp(0.95rem, 4.2vw, 1.15rem) !important;
              line-height: 1.45 !important;
            }
          }
          @media (min-width: 768px) {
            .game1-question-wrap {
              flex: 1 1 auto !important;
              min-height: 38vh !important;
            }
            .game1-shell-inner {
              padding-left: clamp(12px, 1.2vw, 20px) !important;
              padding-right: clamp(12px, 1.2vw, 20px) !important;
            }
            .game1-question-wrap {
              padding-left: clamp(10px, 1.2vw, 18px) !important;
              padding-right: clamp(10px, 1.2vw, 18px) !important;
              padding-top: 20px !important;
              padding-bottom: 20px !important;
            }
            .game1-question-img {
              max-width: 100% !important;
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
          className="game1-shell-inner"
          style={{
            width: "100%",
            flex: "1 1 auto",
            minHeight: 0,
            backgroundColor: "#002f5eff",
            color: "white",
            padding: "clamp(16px, 2.5vw, 32px)",
            paddingBottom: "clamp(18px, 2.8vw, 36px)",
            borderRadius: "12px",
            border: "3px solid #1e88e5",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              marginBottom: 12,
              fontSize: "0.95em",
              color: "white",
              textAlign: "center",
            }}
          >
            Câu : <b>{current + 1}/{gameQuestions.length}</b>
          </div>

          {/* Phần câu hỏi: nền scene + lớp tối bán trong (không blur) */}
          <div
            className={`game1-question-wrap${locked ? " game1-question-wrap--feedback" : ""}`}
            style={{
            flex: "0 1 auto",
            flexShrink: 0,
            minHeight: "38vh",
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
            color: "black",
            overflowX: "hidden",
            overflowY: "visible",
            isolation: "isolate",
          }}>
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                backgroundImage: `url(${publicUrl}/game-images/${background})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
                backgroundSize: "cover",
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                borderRadius: "10px",
                background:
                  "linear-gradient(180deg, rgba(2, 14, 34, 0.52) 0%, rgba(1, 10, 28, 0.68) 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Chữ + ảnh trên lớp phủ (full chiều ngang ô) */}
            {!locked && (
            <div
              className="game1-question-col"
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                maxWidth: "100%",
                marginLeft: "auto",
                marginRight: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              <div
                className="game1-question-text"
                style={{
                color: "white",
                fontSize: "1.3em",
                fontWeight: "bold",
                marginBottom: questionImageSrc ? "10px" : "0",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                padding: "0 8px",
                width: "100%",
                maxWidth: "100%",
                textAlign: "center",
              }}
              >
                {currentQuestion.question_text}
              </div>

              {questionImageSrc && (
                <GameQuestionImageZoom
                  src={questionImageSrc}
                  thumbClassName="game1-question-img"
                  onThumbError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = "none";
                  }}
                  thumbStyle={{
                    maxHeight: "min(50vh, 300px)",
                    objectFit: "contain",
                    backgroundColor: "white",
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
        </div>
    </div>
  );
}