// src/components/games/game7.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import GameHintButton from "./GameHintButton";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { useLessonHints } from "../lib/useLessonHints";
import { prepareSessionQuestions } from "../lib/lessonQuestions";
import GameMcqConfirmBar from "./GameMcqConfirmBar";
import {
  useGameMcqSelection,
} from "../lib/useGameMcqSelection";
import { isAnswerSetFullyCorrect } from "../lib/questionScoring";

export default function Game7({ payload, onLessonComplete, onReturnHome }) {
  const navigate = useNavigate();
  const questions = payload?.questions || [];

  const [gameState, setGameState] = useState('playing'); // 'playing', 'finished'
  const mcq = useGameMcqSelection();
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
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const {
    hintsRemaining,
    hasHintFeature,
    canUseHint,
    applyHint,
    getHiddenIndices,
    resetHints,
  } = useLessonHints(payload);

  const qs = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );

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

  function applyChoiceResult(ok) {
    if (ok) setCorrectCount((prev) => prev + 1);
    setShowResult(true);
  }

  function choose(qId, ansIdx) {
    if (showResult) return;
    const q = qs.find((x) => x.id === qId);
    if (!q || mcq.isLocked(qId)) return;
    if (mcq.isMultiCorrectQuestion(q.answers)) {
      mcq.toggleIndex(qId, q.answers, ansIdx);
      return;
    }
    const ok = mcq.toggleIndex(qId, q.answers, ansIdx);
    if (ok !== null) applyChoiceResult(ok);
  }

  function confirmDoorAnswer() {
    if (showResult || !currentQuestion) return;
    const ok = mcq.confirmPending(currentQuestion.id, currentQuestion.answers);
    applyChoiceResult(ok);
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
      const data = await incrementLessonScore(userId, correctCount, payload);
      if (data?.success) {
        setUserScore(data.score);
        setWeekScore(data.week_score ?? 0);
      }
    }
    
    onLessonComplete?.(correctCount);
    setGameState('finished');
  }

  function startGame() {
    setGameState('playing');
    mcq.resetAll();
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setFinalScore(0);
    setShowResult(false);
    setCurrentPosition(0);
    setTargetPosition(0);
    finishSentRef.current = false;
    resetHints();
  }

  function restartGame() {
    setShuffleSeed((s) => s + 1);
    startGame();
  }

  function handleReturnHome() {
    if (onReturnHome) {
      onReturnHome();
    } else {
      navigate("/", { replace: true });
    }
  }

  if (gameState === "finished") {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={finalScore}
        totalQuestions={qs.length}
        onReplay={restartGame}
        onHome={handleReturnHome}
        height="75vh"
      />
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

  const qId = currentQuestion.id;
  const pendingDoors = mcq.getPendingIndices(qId);
  const confirmedDoors = mcq.getConfirmedIndices(qId) ?? [];
  const activeDoors = mcq.isLocked(qId) ? confirmedDoors : pendingDoors;
  const hiddenDoorIndices = getHiddenIndices(qId);
  const isCorrect = mcq.getLastResult(qId) === "correct";
  const doorMulti = mcq.isMultiCorrectQuestion(currentQuestion.answers);

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
            {hasHintFeature && (
              <GameHintButton
                hintsRemaining={hintsRemaining}
                disabled={
                  showResult ||
                  !canUseHint(currentQuestion.id, currentQuestion.answers)
                }
                onUse={() => applyHint(currentQuestion.id, currentQuestion.answers)}
                style={{ margin: "8px 0 0", fontSize: 12, padding: "6px 12px" }}
              />
            )}
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
              <GameQuestionImageZoom
                src={questionImageUrl(currentQuestion.question_image) || undefined}
                thumbStyle={{
                  maxWidth: "100%",
                  maxHeight: "150px",
                  display: "block",
                  margin: "0 auto 10px",
                  borderRadius: "8px",
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
            {doorMulti && !showResult && (
              <GameMcqConfirmBar
                answers={currentQuestion.answers}
                pendingIndices={pendingDoors}
                onConfirm={confirmDoorAnswer}
                style={{ marginTop: 8 }}
              />
            )}
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
              if (hiddenDoorIndices.has(index)) return null;
              const doorPosition = doorPositions[index];
              const isSelectedDoor = activeDoors.includes(index);
              
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
                        : (isSelectedDoor ? "drop-shadow(0 0 6px rgba(255,215,0,0.9))" : "none")
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