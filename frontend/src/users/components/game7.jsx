// src/components/games/game7.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Game7({ payload, onLessonComplete, onReturnHome }) {
  const questions = payload?.questions || [];

  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'finished'
  const [selected, setSelected] = useState({});
  const [userScore, setUserScore] = useState(payload?.user?.score ?? null);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const gameAreaRef = useRef(null);
  const finishSentRef = useRef(false);

  // Shuffle câu trả lời
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

  // Tính toán vị trí các cửa
  const doorPositions = useMemo(() => {
    if (!currentQuestion || !currentQuestion.answers) return [];
    
    const answerCount = currentQuestion.answers.length;
    if (answerCount === 0) return [];
    
    const positions = [];
    const gap = 100 / (answerCount + 1);
    
    for (let i = 0; i < answerCount; i++) {
      positions.push(gap * (i + 1));
    }
    
    return positions;
  }, [currentQuestion]);

  // Animation di chuyển đồng bộ
  useEffect(() => {
    let animationId;
    let lastTimestamp = 0;
    const animationDuration = 300;
    
    const animate = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      
      const progress = Math.min((timestamp - lastTimestamp) / animationDuration, 1);
      
      setCurrentPosition(prev => {
        const diff = targetPosition - prev;
        if (Math.abs(diff) < 0.1) return targetPosition;
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        return prev + diff * easeOutQuart;
      });
      
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        lastTimestamp = 0;
      }
    };
    
    if (currentPosition !== targetPosition) {
      animationId = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [currentPosition, targetPosition]);

  // Xử lý sự kiện bàn phím chỉ khi đang chơi và chưa có kết quả
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (showResult) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        setTargetPosition((prev) => {
          const newPos = prev - 5;
          return newPos < 0 ? 0 : newPos;
        });
      } else if (e.key === "ArrowRight") {
        setTargetPosition((prev) => {
          const newPos = prev + 5;
          const maxPos = doorPositions.length > 0 ? Math.max(...doorPositions) : 100;
          return newPos > maxPos ? maxPos : newPos;
        });
      } else if (e.key === "Enter") {
        if (doorPositions.length > 0) {
          let closestIndex = 0;
          let minDistance = Math.abs(currentPosition - doorPositions[0]);
          
          for (let i = 1; i < doorPositions.length; i++) {
            const distance = Math.abs(currentPosition - doorPositions[i]);
            if (distance < minDistance) {
              minDistance = distance;
              closestIndex = i;
            }
          }
          choose(currentQuestion.id, closestIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, showResult, currentPosition, currentQuestion, doorPositions]);

  // Gọi API cộng điểm
  async function incrementScoreOnServer(userId, delta = 1) {
    try {
      const resp = await api.post("/score/increment", { userId, delta });
      return resp.data;
    } catch (e) {
      console.warn("Lỗi gọi API cộng điểm:", e);
      return null;
    }
  }

  function choose(qId, ansIdx) {
    if (selected[qId] !== undefined) return;
    setSelected((prev) => ({ ...prev, [qId]: ansIdx }));

    const q = qs.find((x) => x.id === qId);
    const a = q?.answers?.[ansIdx];
    
    if (a && a.correct) {
      setCorrectCount((prev) => prev + 1);
    }
    setShowResult(true);
  }

  function nextQuestion() {
    setShowResult(false);
    setCurrentPosition(0);
    setTargetPosition(0);
    
    if (currentQuestionIndex + 1 < qs.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Đã hết câu hỏi -> kết thúc game
      finishGame();
    }
  }

  async function finishGame() {
    setFinalScore(correctCount);
    
    const userId =
      payload?.user?.id ||
      (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);
    
    if (userId && correctCount > 0) {
      const data = await incrementScoreOnServer(userId, correctCount);
      if (data && data.success) {
        setUserScore(data.score);
        setWeekScore(data.week_score ?? 0);
        
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
    }
    
    onLessonComplete?.(correctCount);
    setGameState('finished');
  }

  function startGame() {
    setGameState('playing');
    setSelected({});
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setFinalScore(0);
    setShowResult(false);
    setCurrentPosition(0);
    setTargetPosition(0);
    finishSentRef.current = false;
  }

  function restartGame() {
    startGame();
  }

  function handleReturnHome() {
    if (onReturnHome) {
      onReturnHome();
    } else {
      window.location.href = "/gametoanhoc";
    }
  }

  // Màn hình Start (giống game2)
  if (gameState === 'start') {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          padding: "clamp(10px, 3vw, 24px)",
          boxSizing: "border-box",
          textAlign: "center",
          background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <style>{`
          .game7-start-card {
            width: 100%;
            max-width: min(600px, calc(100vw - 24px));
            box-sizing: border-box;
            background: white;
            padding: clamp(16px, 5vw, 36px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .game7-start-title {
            margin: 0 0 clamp(12px, 3vw, 20px);
            color: #2c3e50;
            font-size: clamp(1.1rem, 4.2vw, 1.65rem);
            line-height: 1.25;
            word-wrap: break-word;
          }
          .game7-start-scores {
            margin-bottom: clamp(12px, 3vw, 18px);
            font-size: clamp(0.85rem, 3.2vw, 1rem);
            line-height: 1.45;
            word-wrap: break-word;
          }
          .game7-start-rules {
            background: #ecf0f1;
            padding: clamp(12px, 3.5vw, 20px);
            border-radius: 12px;
            margin: 0 auto clamp(14px, 3vw, 20px);
            text-align: left;
          }
          .game7-start-rules h3 {
            margin: 0 0 8px;
            color: #34495e;
            font-size: clamp(0.95rem, 3.4vw, 1.1rem);
          }
          .game7-start-rules ul {
            margin: 0;
            padding-left: 1.15rem;
            line-height: 1.65;
            font-size: clamp(0.8rem, 2.8vw, 0.95rem);
          }
          .game7-start-btn {
            width: 100%;
            max-width: 320px;
            padding: clamp(12px, 3vw, 16px) clamp(20px, 5vw, 40px);
            font-size: clamp(0.95rem, 3.5vw, 1.15rem);
            font-weight: 700;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s;
            box-sizing: border-box;
          }
        `}</style>
        <div className="game7-start-card">
          <h2 className="game7-start-title">🚪 HÀNH TRÌNH QUA CÁNH CỬA 🚪</h2>

          {userScore !== null && (
            <div className="game7-start-scores">
              <span style={{ marginRight: "clamp(8px, 2vw, 16px)" }}>
                Điểm tổng: <b style={{ color: "#e74c3c" }}>{userScore}</b>
              </span>
              <span>
                Điểm tuần: <b style={{ color: "#3498db" }}>{weekScore}</b>
              </span>
            </div>
          )}

          <div className="game7-start-rules">
            <h3>📜 Cách chơi:</h3>
            <ul>
              <li>Di chuyển nhân vật bằng phím ← →</li>
              <li>Nhấn ENTER để chọn cánh cửa gần nhất</li>
              <li>Chọn đúng cánh cửa có đáp án đúng</li>
              <li>
                Bài gồm <b>{qs.length}</b> câu hỏi
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="game7-start-btn"
            onClick={startGame}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            🎮 Bắt đầu cuộc phiêu lưu
          </button>
        </div>
      </div>
    );
  }

  // Màn hình kết thúc
  if (gameState === 'finished') {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          padding: "clamp(10px, 3vw, 24px)",
          boxSizing: "border-box",
          textAlign: "center",
          background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <style>{`
          .game7-end-card {
            width: 100%;
            max-width: min(600px, calc(100vw - 24px));
            box-sizing: border-box;
          }
          .game7-end-title {
            margin: 0 0 clamp(12px, 3vw, 20px);
            color: #2c3e50;
            font-size: clamp(1.15rem, 4.5vw, 1.75rem);
            line-height: 1.25;
            word-wrap: break-word;
          }
          .game7-end-score {
            margin: 0 0 clamp(16px, 4vw, 28px);
            font-size: clamp(0.95rem, 3.8vw, 1.35rem);
            line-height: 1.35;
            font-weight: bold;
            word-wrap: break-word;
            padding: 0 2px;
          }
          .game7-end-actions {
            display: flex;
            gap: clamp(10px, 2.5vw, 16px);
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
          }
          .game7-end-actions button {
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
            .game7-end-actions {
              flex-direction: column;
              align-items: stretch;
            }
            .game7-end-actions button {
              min-width: 0;
              width: 100%;
            }
          }
        `}</style>
        <div
          className="game7-end-card"
          style={{
            background: "white",
            padding: "clamp(16px, 5vw, 36px)",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <h2 className="game7-end-title">🏆 Kết thúc hành trình! 🏆</h2>

          <div
            className="game7-end-score"
            style={{
              background: "linear-gradient(135deg, #ffd89b 0%, #19547b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Bạn đã trả lời đúng: {finalScore}/{qs.length} câu hỏi
          </div>

          <div className="game7-end-actions">
            <button
              type="button"
              onClick={restartGame}
              style={{
                background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
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
              onClick={handleReturnHome}
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

  // Giao diện khi đang chơi (giữ nguyên logic cũ)
  if (!currentQuestion) {
    // Fallback: nếu không có câu hỏi thì hiển thị kết thúc
    return (
      <div style={{ textAlign: "center", padding: "20px", background: "#000", color: "white", minHeight: "100vh" }}>
        <h2>Hoàn thành cuộc phiêu lưu!</h2>
        {userScore !== null && (
          <p>
            Điểm tổng: <b style={{ color: "#ffd700" }}>{userScore}</b> | 
            Điểm tuần: <b style={{ color: "#ffd700" }}>{weekScore}</b>
          </p>
        )}
        <button onClick={handleReturnHome}>Về trang chủ</button>
      </div>
    );
  }

  const selectedAnswerIndex = selected[currentQuestion.id];
  const isCorrect = selectedAnswerIndex !== undefined && 
    currentQuestion.answers[selectedAnswerIndex]?.correct;

  return (
    <div style={{ 
      background: 'white',
      backgroundSize: "cover",
      height: "100%",
      color: "white",
      overflow: "hidden"
    }}>
      <div style={{ 
        maxWidth: 800,
        margin: "0 auto", 
        padding: "10px",
        position: "relative"
      }}>
        <div 
          ref={gameAreaRef}
          style={{ 
            position: "relative", 
            height: "500px",
            backgroundImage: `url(${publicUrl}/game-images/game7-background.png)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderRadius: "12px",
            overflow: "hidden",
            border: "2px solid #222"
          }}
        >
          {/* Menu game */}
          <div style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "rgba(0,0,0,0.8)",
            padding: "10px 10px",
            borderRadius: "8px",
            border: "2px solid #8B4513",
            zIndex: 5
          }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#fff", maxWidth: "200px" }}>
              Hãy chọn cửa đúng
            </p>
          </div>

          {/* Điểm số */}
          {userScore !== null && (
            <div style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "rgba(0,0,0,0.8)",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "2px solid #8B4513",
              zIndex: 5,
              fontSize: "14px",
              textAlign: "center"
            }}>
              <div>💎 Điểm: <b style={{ color: "#ffd700" }}>{userScore}</b></div>
              <div>⭐ Tuần: <b style={{ color: "#ffd700" }}>{weekScore}</b></div>
            </div>
          )}

          {/* Câu hỏi */}
          <div style={{
            position: "absolute",
            top: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            background: "rgba(0,0,0,0.85)",
            padding: "15px",
            borderRadius: "8px",
            border: "2px solid #8B4513",
            zIndex: 3,
            textAlign: "center"
          }}>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}>
              Câu {currentQuestionIndex + 1}/{qs.length}
            </div>
            
            {currentQuestion.question_image && (
              <img
                src={
                  currentQuestion.question_image.startsWith("http")
                    ? currentQuestion.question_image
                    : `http://210.245.52.119/gametoanhoc${currentQuestion.question_image}`
                }
                alt=""
                style={{
                  maxWidth: "100%",
                  maxHeight: "150px",
                  display: "block",
                  margin: "0 auto 10px",
                  borderRadius: "8px"
                }}
              />
            )}
            
            <div style={{
              color: "#fff",
              fontSize: "18px",
              fontWeight: "bold",
              textShadow: "1px 1px 2px rgba(0,0,0,0.8)"
            }}>
              {currentQuestion.question_text}
            </div>
          </div>

          {/* Màn che tối với hiệu ứng ánh sáng hình tròn */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `
              radial-gradient(
                circle at ${currentPosition}% 50%,
                transparent 170px,
                rgba(0, 0, 0, 0.98) 250px
            )`,
            zIndex: 3,
            pointerEvents: "none"
          }}></div>

          {/* Các cánh cửa */}
          <div style={{
            position: "absolute",
            bottom: "80px",
            width: "100%",
            zIndex: 2
          }}>
            {currentQuestion.answers.map((answer, index) => {
              const doorPosition = doorPositions[index];
              const isSelectedDoor = selectedAnswerIndex === index;
              
              return (
                <div
                  key={index}
                  style={{
                    width: "130px",
                    height: "130px",
                    position: "absolute",
                    cursor: showResult ? "default" : "pointer",
                    transition: "filter 0.3s ease",
                    filter: isSelectedDoor ? "drop-shadow(0 0 8px rgba(255,215,0,0.8))" : "none",
                    left: `${doorPosition}%`,
                    top: "-150px",
                    transform: 'translateX(-50%)'
                  }}
                  onClick={() => !showResult && choose(currentQuestion.id, index)}
                >
                  <img
                    src={`${publicUrl}/game-images/game7-door.png`}
                    alt={`Cửa ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: showResult ? 
                        (answer.correct ? "hue-rotate(120deg) saturate(1.5)" : 
                         (isSelectedDoor && !answer.correct ? "hue-rotate(300deg) saturate(1.5)" : "none")) 
                        : "none"
                    }}
                  />
                  
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "50px",
                    height: "50px",
                    background: "rgba(255, 255, 255, 0.2)",
                    borderRadius: "5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "25px",
                    color: "#2d85ffff",
                    textShadow: "1px 1px 2px rgba(0,0,0,0.2)",
                    padding: "2px"
                  }}>
                    {answer.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nhân vật cầm đuốc */}
          <div style={{
            position: "absolute",
            bottom: "90px",
            left: `${currentPosition}%`,
            transform: "translateX(-50%)",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <div style={{
              position: "relative",
              width: "10px",
              height: "10px",
              marginBottom: "5px",
              zIndex: 2
            }}>
              <img
                src={`${publicUrl}/game-images/game7-fire.gif`}
                alt="Đuốc"
                style={{
                  width: "700%",
                  height: "700%",
                  objectFit: "contain"
                }}
              />
            </div>

            <img
              src={`${publicUrl}/game-images/game7-nv.png`}
              alt="Nhân vật"
              style={{
                width: "40px",
                height: "50px",
                objectFit: "contain",
                scale: "1.6",
                filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.5))"
              }}
            />
          </div>

          {/* Nền đất */}
          <div style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            width: "100%",
            height: "130px",
            background: `url(${publicUrl}/game-images/game7-platform.png) repeat-x`,
            backgroundSize: "auto 100%",
            opacity: 0.9
          }}></div>

          {/* Hướng dẫn */}
          <div style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#fff",
            fontSize: "12px",
            textAlign: "center",
            background: "rgba(0,0,0,0.7)",
            padding: "5px 12px",
            borderRadius: "15px",
            zIndex: 11,
            textShadow: "1px 1px 2px rgba(0,0,0,0.8)"
          }}>
            {!showResult ? 
              "← → di chuyển | ENTER chọn cửa" : 
              "Nhấn TIẾP TỤC để tiếp theo"}
          </div>

          {/* Popup kết quả */}
          {showResult && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: isCorrect ? "rgba(34, 139, 34, 0.95)" : "rgba(178, 34, 34, 0.95)",
              padding: "20px",
              borderRadius: "12px",
              border: `3px solid ${isCorrect ? "#32CD32" : "#DC143C"}`,
              textAlign: "center",
              zIndex: 20,
              width: "80%",
              maxWidth: "300px",
              boxShadow: "0 0 20px rgba(0,0,0,0.8)"
            }}>
              <h2 style={{ 
                color: "#FFD700", 
                marginBottom: "10px",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                fontSize: "20px"
              }}>
                {isCorrect ? "🎉 CHÍNH XÁC! 🎉" : "❌ SAI RỒI! ❌"}
              </h2>
              <p style={{ marginBottom: "15px", fontSize: "14px", lineHeight: "1.4" }}>
                {isCorrect 
                  ? "Bạn đã chọn đúng cánh cửa!" 
                  : "Cánh cửa này không đúng. Thử câu tiếp theo nhé!"}
              </p>
              <button
                onClick={nextQuestion}
                style={{
                  padding: "8px 20px",
                  background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                  color: "#8B4513",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => e.target.style.transform = "scale(1.05)"}
                onMouseOut={(e) => e.target.style.transform = "scale(1)"}
              >
                TIẾP TỤC →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}