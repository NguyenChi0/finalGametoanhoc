// src/components/games/game7.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Game1({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];

  const [selected, setSelected] = useState({});
  const [userScore, setUserScore] = useState(payload?.user?.score ?? null);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
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
    // Tính khoảng cách đều nhau giữa các cửa
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
    const animationDuration = 300; // ms
    
    const animate = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      
      const progress = Math.min((timestamp - lastTimestamp) / animationDuration, 1);
      
      setCurrentPosition(prev => {
        const diff = targetPosition - prev;
        if (Math.abs(diff) < 0.1) return targetPosition;
        
        // Easing function để di chuyển mượt mà
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

  // Xử lý sự kiện bàn phím với bước di chuyển 5px
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showResult) return;

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
        // Tìm cửa gần nhất để chọn
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
  }, [currentPosition, showResult, currentQuestion, doorPositions]);

  // Gọi API cộng điểm gộp một lần
  async function incrementScoreOnServer(userId, delta = 1) {
    try {
      const resp = await api.post("/score/increment", { userId, delta });
      return resp.data;
    } catch (e) {
      console.warn("Lỗi gọi API cộng điểm:", e);
      return null;
    }
  }

  function handleGameOver() {
    setShowResult(true);
  }

  function choose(qId, ansIdx) {
    if (selected[qId] !== undefined) return;
    setSelected((prev) => ({ ...prev, [qId]: ansIdx }));

    const q = qs.find((x) => x.id === qId);
    const a = q?.answers?.[ansIdx];
    
    if (a && a.correct) {
      setCorrectCount((prev) => prev + 1);
    }
    handleGameOver();
  }

  function nextQuestion() {
    setShowResult(false);
    setCurrentPosition(0);
    setTargetPosition(0);
    setCurrentQuestionIndex((prev) => prev + 1);
  }

  // Khi hết câu hỏi lần đầu tiên, cộng tổng điểm một lần
  useEffect(() => {
    if (!currentQuestion && qs.length > 0 && !finishSentRef.current && correctCount > 0) {
      finishSentRef.current = true;
      const userId =
        payload?.user?.id ||
        (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

      if (!userId) return;

      incrementScoreOnServer(userId, correctCount).then((data) => {
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
      });
      onLessonComplete?.(correctCount);
    }
  }, [currentQuestion, qs.length, correctCount, payload]);

  if (!currentQuestion) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "20px",
        background: "#000",
        color: "white",
        minHeight: "100vh"
      }}>
        <h2>Hoàn thành cuộc phiêu lưu!</h2>
        {userScore !== null && (
          <p>
            Điểm tổng: <b style={{ color: "#ffd700" }}>{userScore}</b> | 
            Điểm tuần: <b style={{ color: "#ffd700" }}>{weekScore}</b>
          </p>
        )}
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

        {/* Khu vực game - TỔNG HỢP TẤT CẢ VÀO MỘT FRAME */}
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
            <p style={{ 
              margin: 0, 
              fontSize: "12px",
              color: "#fff",
              maxWidth: "200px"
            }}>
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

          {/* Câu hỏi - HIỂN THỊ TRONG CÙNG FRAME */}
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
            <div style={{
              color: "#fff",
              fontSize: "14px",
              
              fontWeight: "bold"
            }}>
              Câu {currentQuestionIndex + 1}/{qs.length}
            </div>
            
            {/* Hiển thị ảnh câu hỏi */}
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
            
            {/* Hiển thị text câu hỏi */}
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

          {/* Các cánh cửa - vị trí động dựa trên số lượng câu trả lời */}
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
                  {/* Cánh cửa */}
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
                  
                  {/* Hiển thị đáp án trên cửa */}
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
            {/* Đuốc với hiệu ứng lửa GIF */}
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

            {/* Nhân vật */}
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

          {/* Hướng dẫn đơn giản */}
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
              <p style={{ 
                marginBottom: "15px", 
                fontSize: "14px",
                lineHeight: "1.4"
              }}>
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