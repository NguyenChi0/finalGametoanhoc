// src/components/games/Game1.jsx
import React, { useState, useMemo, useRef } from "react";
import api, { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { prepareSessionQuestions } from "../lib/lessonQuestions";

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
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Refs cho âm thanh
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);

  const gameQuestions = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );
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
    setShuffleSeed((s) => s + 1);
    setCurrent(0);
    setSelected(null);
    setShowResult(false);
    setLocked(false);
    setBackground("game1-asker.png");
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

  if (showResult) {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={correctCount}
        totalQuestions={gameQuestions.length}
        onReplay={resetGame}
        shellStyle={gameShellStyle}
      />
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