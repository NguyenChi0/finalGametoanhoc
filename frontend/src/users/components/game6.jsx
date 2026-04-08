// src/components/games/game6.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Game1({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [fruits, setFruits] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [isSlicing, setIsSlicing] = useState(false);
  const [slicePath, setSlicePath] = useState([]);
  const gameContainerRef = useRef(null);
  const animationRef = useRef(null);
  /** Mỗi câu chỉ chấp nhận một lần chém (đúng hoặc sai). */
  const questionAnsweredRef = useRef(false);

  const isPlaying = gameStarted && !gameEnded;

  const fruitImages = [
    `${publicUrl}/game-images/game6-fruit1.png`,
    `${publicUrl}/game-images/game6-fruit2.png`,
    `${publicUrl}/game-images/game6-fruit3.png`,
    `${publicUrl}/game-images/game6-fruit4.png`,
  ];

  const qs = useMemo(() => {
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    return questions.map((q) => {
      const answers = Array.isArray(q.answers) ? shuffle(q.answers) : [];
      return { ...q, answers };
    });
  }, [questions]);

  const currentQuestion = qs[currentQuestionIndex];

  useEffect(() => {
    const s = new Audio(`${publicUrl}/game-noises/chem.mp3`);
    s.volume = 0.8;
    s.load();
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const updateFruits = () => {
      const rect = gameContainerRef.current?.getBoundingClientRect();

      setFruits((prev) =>
        prev.map((fruit) => {
          if (fruit.hit) return fruit;
          if (!rect) return fruit;

          const pad = (fruit.hitRadius ?? 56) + 6;
          let newX = fruit.x + fruit.vx;
          let newY = fruit.y + fruit.vy;
          let { vx, vy } = fruit;

          if (newX <= pad) {
            newX = pad;
            vx = Math.abs(vx) || 0.5;
          } else if (newX >= rect.width - pad) {
            newX = rect.width - pad;
            vx = -Math.abs(vx) || -0.5;
          }
          if (newY <= pad) {
            newY = pad;
            vy = Math.abs(vy) || 0.5;
          } else if (newY >= rect.height - pad) {
            newY = rect.height - pad;
            vy = -Math.abs(vy) || -0.5;
          }

          return {
            ...fruit,
            x: newX,
            y: newY,
            vx,
            vy,
          };
        })
      );

      animationRef.current = requestAnimationFrame(updateFruits);
    };

    animationRef.current = requestAnimationFrame(updateFruits);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!currentQuestion || !isPlaying) return;

    const rect = gameContainerRef.current?.getBoundingClientRect();
    const containerW = rect?.width ?? 520;
    const containerH = rect?.height ?? 400;

    const newFruits = currentQuestion.answers.map((answer, index) => {
      const imgSize = Math.min(76, Math.max(48, Math.floor(containerW / 9)));
      const textLen = (answer.text || "").length;
      const hitRadius = Math.min(
        168,
        Math.max(52, imgSize * 0.52 + Math.min(96, 12 + textLen * 2))
      );
      const pad = hitRadius + 12;
      const spanX = Math.max(1, containerW - pad * 2);
      const spanY = Math.max(1, containerH - pad * 2);
      const x = pad + Math.random() * spanX;
      const y = pad + Math.random() * spanY;
      const speed = 0.65 + Math.random() * 1.35;
      const angle = Math.random() * Math.PI * 2;

      return {
        id: index,
        answer,
        imgSize,
        hitRadius,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hit: false,
        sliced: false,
      };
    });

    setFruits(newFruits);
    setSlicePath([]);
    questionAnsweredRef.current = false;
  }, [currentQuestionIndex, isPlaying, currentQuestion]);

  async function incrementScoreOnServer(userId, delta = 1) {
    try {
      const resp = await api.post("/score/increment", { userId, delta });
      return resp.data;
    } catch (e) {
      console.warn("Lỗi gọi API cộng điểm:", e);
      return null;
    }
  }

  function finishLesson(newCorrectCount) {
    const userId =
      payload?.user?.id ||
      (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

    if (!userId) {
      console.warn("Người dùng chưa login — không thể cộng điểm trên server.");
      setGameStarted(false);
      setGameEnded(true);
      onLessonComplete?.(newCorrectCount);
      return;
    }

    if (newCorrectCount > 0) {
      incrementScoreOnServer(userId, newCorrectCount)
        .then((data) => {
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
        })
        .finally(() => {
          setGameStarted(false);
          setGameEnded(true);
        });
      onLessonComplete?.(newCorrectCount);
      return;
    }

    setGameStarted(false);
    setGameEnded(true);
    onLessonComplete?.(newCorrectCount);
  }

  function checkSliceCollision(slicePoints, fruit) {
    if (fruit.hit) return false;

    for (let i = 1; i < slicePoints.length; i++) {
      const prev = slicePoints[i - 1];
      const curr = slicePoints[i];

      const distance = pointToLineDistance(
        fruit.x,
        fruit.y,
        prev.x,
        prev.y,
        curr.x,
        curr.y
      );

      if (distance <= (fruit.hitRadius ?? 56)) {
        return true;
      }
    }
    return false;
  }

  function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleMouseDown(e) {
    if (!isPlaying) return;

    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSlicing(true);
    setSlicePath([{ x, y }]);
  }

  function handleMouseMove(e) {
    if (!isSlicing || !isPlaying) return;

    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSlicePath = [...slicePath, { x, y }];
    setSlicePath(newSlicePath);

    fruits.forEach((fruit) => {
      if (checkSliceCollision(newSlicePath, fruit)) {
        handleFruitHit(fruit.id);
      }
    });
  }

  function handleMouseUp() {
    setIsSlicing(false);
    setTimeout(() => setSlicePath([]), 300);
  }

  function handleFruitHit(fruitId) {
    const fruit = fruits.find((f) => f.id === fruitId);
    if (!fruit || fruit.hit || questionAnsweredRef.current) return;

    questionAnsweredRef.current = true;

    setFruits((prev) =>
      prev.map((f) => (f.id === fruitId ? { ...f, hit: true, sliced: true } : f))
    );

    const isCorrect = fruit.answer.correct;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    setCorrectCount(newCorrectCount);

    if (isCorrect) {
      const chopSound = new Audio(`${publicUrl}/game-noises/chem.mp3`);
      chopSound.currentTime = 0;
      chopSound.volume = 0.8;
      chopSound.play().catch((err) => console.warn("Không phát được âm thanh:", err));
    } else {
      const wrongSound = new Audio(`${publicUrl}/game-noises/wrong.mp3`);
      wrongSound.currentTime = 0;
      wrongSound.volume = 0.8;
      wrongSound.play().catch(() => {});
    }

    const delayMs = 1000;
    setTimeout(() => {
      if (currentQuestionIndex < qs.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        finishLesson(newCorrectCount);
      }
    }, delayMs);
  }

  function startGame() {
    setGameStarted(true);
    setGameEnded(false);
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setFruits([]);
    setSlicePath([]);
    setIsSlicing(false);
  }

  function restartGame() {
    startGame();
  }

  function goHome() {
    window.location.href = "/gametoanhoc";
  }

  const questionImage =
    currentQuestion?.image ||
    currentQuestion?.question_image ||
    currentQuestion?.question_img ||
    currentQuestion?.questionImage ||
    null;

  const questionImgSrc =
    questionImage &&
    (questionImage.startsWith("http")
      ? questionImage
      : `http://210.245.52.119/gametoanhoc${questionImage}`);

  if (!gameStarted && !gameEnded) {
    if (qs.length === 0) {
      return (
        <div style={{ padding: 24, textAlign: "center", color: "#37474f" }}>
          Không có câu hỏi nào.
        </div>
      );
    }

    return (
      <div
        className="game6-start-root"
        style={{
          width: "100%",
          minHeight: "70vh",
          padding: "clamp(10px, 3vw, 24px)",
          boxSizing: "border-box",
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <style>{`
          .game6-start-card {
            width: 100%;
            max-width: min(600px, calc(100vw - 24px));
            box-sizing: border-box;
            background: white;
            padding: clamp(16px, 5vw, 36px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .game6-start-title {
            margin: 0 0 clamp(12px, 3vw, 20px);
            color: #2c3e50;
            font-size: clamp(1.1rem, 4.2vw, 1.65rem);
            line-height: 1.25;
            word-wrap: break-word;
          }
          .game6-start-rules {
            background: #ecf0f1;
            padding: clamp(12px, 3.5vw, 20px);
            border-radius: 12px;
            margin: 0 auto clamp(14px, 3vw, 20px);
            text-align: left;
          }
          .game6-start-rules h3 {
            margin: 0 0 8px;
            color: #34495e;
            font-size: clamp(0.95rem, 3.4vw, 1.1rem);
          }
          .game6-start-rules ul {
            margin: 0;
            padding-left: 1.15rem;
            line-height: 1.65;
            font-size: clamp(0.8rem, 2.8vw, 0.95rem);
          }
          .game6-start-btn {
            width: 100%;
            max-width: 320px;
            padding: clamp(12px, 3vw, 16px) clamp(20px, 5vw, 40px);
            font-size: clamp(0.95rem, 3.5vw, 1.15rem);
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s;
            box-sizing: border-box;
          }
        `}</style>
        <div className="game6-start-card">
          <h2 className="game6-start-title">🍎 Trắc nghiệm 🍊</h2>

          <div className="game6-start-rules">
            <h3>📜 Cách chơi:</h3>
            <ul>
              <li>Đọc câu hỏi bên cạnh vùng chơi</li>
              <li>Giữ chuột và kéo để chém vào quả có đáp án đúng</li>
              <li>Chém sai vẫn chuyển câu tiếp; làm hết bài mới tính điểm</li>
              <li>
                Chủ đề gồm <b>{qs.length}</b> câu hỏi
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="game6-start-btn"
            onClick={startGame}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            🎮 Bắt đầu chơi
          </button>
        </div>
      </div>
    );
  }

  if (gameEnded) {
    return (
      <div
        className="game6-end-root"
        style={{
          width: "100%",
          minHeight: "70vh",
          padding: "clamp(10px, 3vw, 24px)",
          boxSizing: "border-box",
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <style>{`
          .game6-end-card {
            width: 100%;
            max-width: min(600px, calc(100vw - 24px));
            box-sizing: border-box;
          }
          .game6-end-title {
            margin: 0 0 clamp(12px, 3vw, 20px);
            color: #2c3e50;
            font-size: clamp(1.15rem, 4.5vw, 1.75rem);
            line-height: 1.25;
            word-wrap: break-word;
          }
          .game6-end-score {
            margin: 0 0 clamp(16px, 4vw, 28px);
            font-size: clamp(0.95rem, 3.8vw, 1.35rem);
            line-height: 1.35;
            font-weight: bold;
            word-wrap: break-word;
            padding: 0 2px;
          }
          .game6-end-actions {
            display: flex;
            gap: clamp(10px, 2.5vw, 16px);
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
          }
          .game6-end-actions button {
            box-sizing: border-box;
            padding: clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 28px);
            font-size: clamp(0.9rem, 3.2vw, 1.05rem);
            font-weight: 700;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s;
            flex: 1 1 auto;
            min-width: min(100%, 140px);
            max-width: 100%;
          }
          @media (max-width: 480px) {
            .game6-end-actions {
              flex-direction: column;
              align-items: stretch;
            }
            .game6-end-actions button {
              min-width: 0;
              width: 100%;
            }
          }
        `}</style>
        <div
          className="game6-end-card"
          style={{
            background: "white",
            padding: "clamp(16px, 5vw, 36px)",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <h2 className="game6-end-title">🏆 Kết thúc game! 🏆</h2>

          <div
            className="game6-end-score"
            style={{
              background: "linear-gradient(135deg, #ffd89b 0%, #19547b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Bạn đã trả lời đúng: {correctCount}/{qs.length} câu hỏi
          </div>

          <div className="game6-end-actions">
            <button
              type="button"
              onClick={restartGame}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              🔄 Chơi lại
            </button>

            <button
              type="button"
              onClick={goHome}
              style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              🏠 Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div style={{ padding: 20 }}>Không có câu hỏi nào!</div>;
  }

  return (
    <div
      style={{
        background: "#e8e8e8",
        width: "100%",
        padding: "clamp(8px, 2vw, 16px)",
        boxSizing: "border-box",
        color: "#1a1a1a",
        userSelect: "none",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          gap: "clamp(8px, 2vw, 14px)",
          flexWrap: "wrap",
          alignItems: "stretch",
          minHeight: "70vh",
        }}
      >
        <div
          style={{
            flex: "0 1 380px",
            minWidth: "min(100%, 240px)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              padding: "clamp(12px, 3vw, 18px)",
              borderRadius: 12,
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)",
                marginBottom: 12,
                textAlign: "center",
                fontWeight: 600,
                color: "#37474f",
              }}
            >
              Câu hỏi: <strong>{currentQuestionIndex + 1}</strong> / {qs.length}
            </div>

            <div
              style={{
                fontSize: "clamp(0.95rem, 2.4vw, 1.15rem)",
                fontWeight: 700,
                color: "#1a1a1a",
                textAlign: "center",
                lineHeight: 1.45,
              }}
            >
              {questionImgSrc ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={questionImgSrc}
                    alt="question"
                    style={{
                      width: "100%",
                      maxHeight: "min(220px, 38vh)",
                      objectFit: "contain",
                      borderRadius: 8,
                    }}
                  />
                  <div style={{ height: 10 }} />
                  <div style={{ textAlign: "center" }}>
                    {currentQuestion.question_text}
                  </div>
                </div>
              ) : (
                <div>{currentQuestion.question_text}</div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: "1 1 400px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: "70vh",
          }}
        >
          <div
            ref={gameContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "100%",
              minHeight: "70vh",
              aspectRatio: "12 / 9",
              background: `url(${publicUrl}/game-images/game6-background.png) no-repeat center center`,
              backgroundSize: "cover",
              borderRadius: 12,
              overflow: "auto",
              border: "2px solid rgba(0,0,0,0.08)",
              cursor: isSlicing ? "crosshair" : "default",
              flex: 1,
            }}
          >
            {slicePath.length > 1 && (
              <svg
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 20,
                }}
              >
                <path
                  d={`M ${slicePath.map((p) => `${p.x},${p.y}`).join(" L ")}`}
                  stroke="#008cffff"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {fruits.map((fruit) => {
              const fruitImage = fruitImages[fruit.id % fruitImages.length];
              const imgSize = fruit.imgSize ?? 56;
              return (
                <div
                  key={fruit.id}
                  style={{
                    position: "absolute",
                    left: `${fruit.x}px`,
                    top: `${fruit.y}px`,
                    transform: fruit.hit
                      ? "translate(-50%, -50%) scale(1.25) rotate(180deg)"
                      : "translate(-50%, -50%)",
                    maxWidth: "min(92%, 300px)",
                    width: "max-content",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    transition: fruit.hit ? "all 0.3s ease" : "none",
                    opacity: fruit.hit ? 0 : 1,
                    pointerEvents: "none",
                    boxSizing: "border-box",
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      width: imgSize,
                      height: imgSize,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: Math.max(8, imgSize * 0.14),
                      background: "rgba(255,255,255,0.06)",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={fruitImage}
                      alt="fruit"
                      style={{
                        width: "88%",
                        height: "88%",
                        objectFit: "contain",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      maxWidth: "min(92vw, 300px)",
                      textAlign: "center",
                      fontSize: Math.max(11, Math.min(15, Math.floor(imgSize / 4.2))),
                      fontWeight: 700,
                      color: "white",
                      textShadow: "1px 1px 3px rgba(0,0,0,0.85)",
                      lineHeight: 1.35,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                      whiteSpace: "normal",
                      padding: "0 4px",
                      boxSizing: "border-box",
                      pointerEvents: "none",
                    }}
                  >
                    {fruit.answer.text}
                  </div>
                </div>
              );
            })}

            {fruits.filter((f) => f.hit).map((fruit) => {
              const r = fruit.hitRadius ?? 56;
              return (
                <div
                  key={`effect-${fruit.id}`}
                  style={{
                    position: "absolute",
                    left: `${fruit.x - r}px`,
                    top: `${fruit.y - r}px`,
                    width: `${r * 2}px`,
                    height: `${r * 2}px`,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, #FFD700 0%, transparent 70%)",
                    animation: "explode 0.5s ease-out forwards",
                    pointerEvents: "none",
                    zIndex: 15,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes explode {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(2);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
}
