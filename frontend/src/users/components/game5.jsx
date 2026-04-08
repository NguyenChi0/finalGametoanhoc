// src/components/games/game5.jsx — Marlin & Nemo tìm Dory giữa đám cá (đáp án)
import React, { useMemo, useState, useEffect } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

const gameShellStyle = {
  width: "100%",
  height: "70vh",
  minHeight: "70vh",
  position: "relative",
  boxSizing: "border-box",
  overflow: "hidden",
};

const startEndRootStyle = {
  width: "100%",
  minHeight: "70vh",
  padding: "clamp(10px, 3vw, 24px)",
  boxSizing: "border-box",
  textAlign: "center",
  background: "linear-gradient(180deg, #0277bd 0%, #01579b 50%, #004d73 100%)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
};

const img = (name) =>
  `${publicUrl || ""}/game-images/${name}`;

function getQuestionImageSrc(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return path;
  return `${publicUrl}/${path}`;
}

export default function Game5({ payload, onLessonComplete }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState(payload?.questions || []);
  const [selected, setSelected] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  /** Phản hồi toàn màn: ảnh đúng/sai — không dùng lớp phủ xám trên thẻ cá */
  const [feedbackFlash, setFeedbackFlash] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const finishSentRef = React.useRef(false);

  const correctSound = new Audio(`${publicUrl}/game-noises/dung.mp3`);
  const wrongSound = new Audio(`${publicUrl}/game-noises/wrong.mp3`);

  const currentQuestion = useMemo(() => {
    if (!questions[currentQuestionIndex]) return null;

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const q = questions[currentQuestionIndex];
    const answers = Array.isArray(q.answers) ? shuffle(q.answers) : [];
    return { ...q, answers };
  }, [questions, currentQuestionIndex]);

  async function incrementScoreOnServer(userId, delta = 1) {
    try {
      const resp = await api.post("/score/increment", { userId, delta });
      return resp.data;
    } catch (e) {
      console.warn("Lỗi gọi API cộng điểm:", e);
      return null;
    }
  }

  function finishGameWithScore(totalCorrect) {
    const userId =
      payload?.user?.id ||
      (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

    if (!userId || totalCorrect <= 0) return;

    incrementScoreOnServer(userId, totalCorrect).then((data) => {
      if (data && data.success) {
        const raw = localStorage.getItem("user");
        if (raw) {
          try {
            const u = JSON.parse(raw);
            u.score = data.score;
            u.week_score = data.week_score;
            localStorage.setItem("user", JSON.stringify(u));
          } catch (err) {
            console.warn("Không cập nhật được user trong localStorage:", err);
          }
        }
      }
    });
  }

  async function fetchNextQuestion() {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const resp = await api.get(`/game/next-question?current=${currentQuestionIndex + 1}`);
      if (resp.data?.question) {
        setQuestions((prev) => [...prev, resp.data.question]);
      }
    } catch (e) {
      console.warn("Lỗi fetch câu hỏi tiếp theo:", e);
    } finally {
      setIsLoading(false);
    }
  }

  function choose(qId, ansIdx) {
    if (selected[qId] !== undefined) return;

    setSelected((prev) => ({ ...prev, [qId]: ansIdx }));

    const a = currentQuestion?.answers?.[ansIdx];

    if (a && a.correct) {
      correctSound.play().catch((e) => console.warn("Âm thanh:", e));
      setCorrectCount((prev) => prev + 1);
      setFeedbackFlash("correct");
      setTimeout(() => {
        setFeedbackFlash(null);
        setCurrentQuestionIndex((prev) => {
          const next = prev + 1;
          if (next >= questions.length - 2) fetchNextQuestion();
          return next;
        });
      }, 2000);
    } else {
      wrongSound.play().catch((e) => console.warn("Âm thanh:", e));
      setFeedbackFlash("wrong");
      setTimeout(() => {
        setFeedbackFlash(null);
        setCurrentQuestionIndex((prev) => {
          const next = prev + 1;
          if (next >= questions.length - 2) fetchNextQuestion();
          return next;
        });
      }, 1500);
    }
  }

  function resetGame() {
    setCurrentQuestionIndex(0);
    setQuestions(payload?.questions || []);
    setSelected({});
    setFeedbackFlash(null);
    setCorrectCount(0);
    finishSentRef.current = false;
  }

  useEffect(() => {
    if (questions.length === 0 && gameStarted) {
      fetchNextQuestion();
    }
  }, [gameStarted]);

  useEffect(() => {
    const noMoreQuestion = !questions[currentQuestionIndex];
    if (gameStarted && noMoreQuestion && !finishSentRef.current) {
      finishSentRef.current = true;
      if (correctCount > 0) {
        finishGameWithScore(correctCount);
      }
      onLessonComplete?.(correctCount);
    }
  }, [gameStarted, questions, currentQuestionIndex, correctCount]);

  const totalQuestions = questions.length;

  if (!gameStarted) {
    return (
      <div style={startEndRootStyle}>
        <style>{`
          .game5-start-card {
            width: 100%;
            max-width: min(640px, calc(100vw - 24px));
            box-sizing: border-box;
            background: rgba(255,255,255,0.96);
            padding: clamp(18px, 5vw, 40px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          }
          .game5-start-title {
            margin: 0 0 clamp(10px, 2vw, 16px);
            color: #01579b;
            font-size: clamp(1.1rem, 4vw, 1.65rem);
            line-height: 1.3;
          }
          .game5-start-story {
            text-align: left;
            font-size: clamp(0.88rem, 2.9vw, 1rem);
            color: #37474f;
            line-height: 1.6;
            margin-bottom: clamp(16px, 3vw, 22px);
          }
          .game5-start-btn {
            width: 100%;
            max-width: 320px;
            padding: clamp(12px, 3vw, 16px) clamp(20px, 5vw, 40px);
            font-size: clamp(0.95rem, 3.5vw, 1.1rem);
            font-weight: 700;
            background: linear-gradient(135deg, #29b6f6 0%, #0277bd 100%);
            color: white;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }
        `}</style>
        <div className="game5-start-card">
          <h2 className="game5-start-title">Finding Dory</h2>
          <div className="game5-start-story">
            <p style={{ marginTop: 0 }}>
              Cô bạn cá Dory hay quên đã lạc vào 1 đàn cá xanh. Hãy chọn đáp án đúng để đưa cá hề bố Martin và cá hề con Nemo về với cô bạn thân!
            </p>
          </div>
          <button
            type="button"
            className="game5-start-btn"
            onClick={() => setGameStarted(true)}
          >
            🎮 Bắt đầu
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    const n = questions.length;
    return (
      <div style={startEndRootStyle}>
        <div
          style={{
            width: "100%",
            maxWidth: "min(640px, calc(100vw - 24px))",
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.96)",
            padding: "clamp(18px, 5vw, 40px)",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <h2 style={{ color: "#01579b", margin: "0 0 16px" }}>🎉 Hoàn thành!</h2>
          <p style={{ fontSize: "clamp(0.95rem, 3vw, 1.1rem)", color: "#37474f", marginBottom: 20 }}>
            <b>{n}/{n}</b> câu
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={resetGame}
              style={{
                padding: "12px 24px",
                borderRadius: 999,
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: "linear-gradient(135deg, #29b6f6, #0277bd)",
                color: "white",
              }}
            >
              🔄 Chơi lại
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/gametoanhoc";
              }}
              style={{
                padding: "12px 24px",
                borderRadius: 999,
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: "linear-gradient(135deg, #26c6da, #00838f)",
                color: "white",
              }}
            >
              🏠 Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sel = selected[currentQuestion.id];
  const qImg = currentQuestion.question_image
    ? getQuestionImageSrc(currentQuestion.question_image)
    : null;

  return (
    <div style={gameShellStyle}>
      <style>{`
        /* Một nền duy nhất — hàng trên: tiến độ giữa trang; hàng dưới: 2 cột không vạch chia */
        .game5-play {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          min-height: 0;
          box-sizing: border-box;
          gap: 0;
          overflow: hidden;
          position: relative;
          background-color: #0277bd;
          background-image: url(${img("game5-background.png")});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .game5-play-row {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: row;
          width: 100%;
        }
        .game5-col-left {
          flex: 1 1 48%;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: transparent;
        }
        .game5-col-right {
          flex: 1 1 52%;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: transparent;
        }
        .game5-progress-bar {
          flex-shrink: 0;
          width: 100%;
          padding: clamp(6px, 1.2vw, 10px) 12px;
          text-align: center;
          font-weight: 800;
          font-size: clamp(0.9rem, 2.5vw, 1.1rem);
          color: #fff;
          text-shadow:
            0 0 8px rgba(0, 0, 0, 0.85),
            0 1px 3px rgba(0, 0, 0, 0.75);
          background: transparent;
        }
        .game5-left-inner {
          flex: 1;
          min-height: 0;
          padding: clamp(8px, 2vw, 16px);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          gap: 8px;
          overflow: hidden;
        }
        .game5-qbox {
          background: rgba(0, 55, 90, 0.58);
          border-radius: 10px;
          padding: clamp(8px, 1.8vw, 14px);
          color: #fff;
          font-size: clamp(0.75rem, 2vw, 0.95rem);
          line-height: 1.4;
          font-weight: 600;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          border: 1px solid rgba(255,255,255,0.25);
        }
        .game5-qimg {
          max-width: 100%;
          max-height: min(22vh, 160px);
          object-fit: contain;
          border-radius: 8px;
          align-self: center;
          border: 2px solid rgba(255,255,255,0.35);
        }
        .game5-right-inner {
          flex: 1;
          min-height: 0;
          padding: clamp(6px, 1.5vw, 12px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }
        .game5-suspects {
          display: flex;
          flex-wrap: wrap;
          gap: clamp(10px, 2vw, 18px);
          justify-content: center;
          align-content: center;
          align-items: flex-end;
          width: 100%;
          max-height: 100%;
          overflow: visible;
        }
        .game5-sbtn {
          width: clamp(118px, 22vw, 168px);
          height: clamp(142px, 28vw, 200px);
          border: none;
          outline: none;
          border-radius: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          box-shadow: none;
          padding: 0 2px 4px;
          cursor: pointer;
          transition: transform 0.15s, filter 0.15s;
          position: relative;
          overflow: visible;
          background-color: transparent;
          -webkit-tap-highlight-color: transparent;
          background-size: contain;
          background-position: center bottom;
          background-repeat: no-repeat;
        }
        .game5-sbtn:focus-visible {
          outline: 2px solid rgba(129, 212, 250, 0.9);
          outline-offset: 4px;
        }
        .game5-sbtn:disabled { cursor: default; }
        .game5-slabel {
          background: transparent;
          padding: 4px 6px 2px;
          border-radius: 0;
          width: 100%;
          max-width: 100%;
          color: #fff;
          font-weight: 800;
          font-size: clamp(0.92rem, 2.75vw, 1.22rem);
          text-align: center;
          box-sizing: border-box;
          line-height: 1.28;
          text-shadow:
            0 0 6px rgba(0, 0, 0, 0.95),
            0 1px 2px rgba(0, 0, 0, 0.9),
            0 2px 8px rgba(0, 0, 0, 0.7);
        }
        .game5-feedback-full {
          position: absolute;
          inset: 0;
          z-index: 100;
          pointer-events: none;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        @media (max-width: 700px) {
          .game5-play-row {
            flex-direction: column;
          }
          .game5-col-left {
            flex: 0 0 42%;
            max-height: 45%;
          }
          .game5-col-right {
            flex: 1 1 auto;
            min-height: 0;
          }
        }
      `}</style>

      {feedbackFlash && (
        <div
          className="game5-feedback-full"
          style={{
            backgroundImage: `url(${img(
              feedbackFlash === "correct" ? "game5-correct.png" : "game5-wrong.png"
            )})`,
          }}
          aria-hidden
        />
      )}

      <div className="game5-play">
        <div className="game5-progress-bar">
          Câu {currentQuestionIndex + 1}/{totalQuestions}
        </div>
        <div className="game5-play-row">
        <div className="game5-col-left">
          <div className="game5-left-inner">
            <div className="game5-qbox">Trả lời câu hỏi sau: {currentQuestion.question_text}</div>
            {qImg && (
              <img src={qImg} alt="" className="game5-qimg" />
            )}
          </div>
        </div>

        <div className="game5-col-right">
          <div className="game5-right-inner">
            <div className="game5-suspects">
              {currentQuestion.answers.map((a, ai) => {
                const fishCard = `url(${img("game5-answer.png")})`;

                return (
                  <button
                    key={a.id || ai}
                    type="button"
                    className="game5-sbtn"
                    onClick={() => choose(currentQuestion.id, ai)}
                    disabled={sel !== undefined || !!feedbackFlash}
                    style={{
                      backgroundImage: fishCard,
                    }}
                    onMouseEnter={(e) => {
                      if (sel === undefined && !feedbackFlash) {
                        e.currentTarget.style.transform = "scale(1.04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <div className="game5-slabel">
                      {a.text ||
                        (a.image ? (
                          <img
                            src={a.image}
                            alt=""
                            style={{ maxWidth: "min(96px, 26vw)" }}
                          />
                        ) : (
                          "—"
                        ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </div>

      {isLoading && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            color: "#e3f2fd",
            fontSize: 12,
            textShadow: "0 1px 2px #000",
          }}
        >
          Đang tải câu…
        </div>
      )}
    </div>
  );
}
