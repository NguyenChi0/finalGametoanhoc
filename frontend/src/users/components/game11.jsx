// src/components/games/Game1.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
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
  const [locked, setLocked] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  
  // Quái vật
  const [monsterX, setMonsterX] = useState(null);
  const [monsterShape, setMonsterShape] = useState("circle");
  const [monsterColor, setMonsterColor] = useState("#e74c3c");
  const [isAlive, setIsAlive] = useState(true);
  const [exploding, setExploding] = useState(false);
  const [bulletProgress, setBulletProgress] = useState(null);
  
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);
  const containerRef = useRef(null);
  const moveIntervalRef = useRef(null);

  const gameQuestions = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );
  const currentQuestion = gameQuestions[current];

  const shapes = ["circle", "square", "triangle"];
  const colors = ["#e74c3c", "#f39c12", "#2ecc71", "#3498db", "#9b59b6", "#1abc9c"];
  
  const spawnMonster = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    setMonsterX(containerWidth - 80);
    setMonsterShape(shapes[current % shapes.length]);
    setMonsterColor(colors[current % colors.length]);
    setIsAlive(true);
    setExploding(false);
    setBulletProgress(null);
  };

  useEffect(() => {
    if (!showResult && current < gameQuestions.length) {
      spawnMonster();
    }
  }, [current, showResult]);

  useEffect(() => {
    if (showResult || !isAlive || monsterX === null) return;
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = setInterval(() => {
      setMonsterX(prev => {
        if (prev === null) return prev;
        if (prev <= 80) return prev;
        return prev - 2.8;
      });
    }, 30);
    return () => clearInterval(moveIntervalRef.current);
  }, [showResult, isAlive, monsterX]);

  const saveScore = async () => {
    if (!user?.id) return;
    try {
      const res = await api.post("/score/increment", { userId: user.id, delta: correctCount });
      if (res.data?.success) {
        const raw = localStorage.getItem("user");
        const existing = raw ? JSON.parse(raw) : {};
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
      console.error("Lỗi cộng điểm:", err);
    }
  };

  const playSound = (isCorrect) => {
    const sound = isCorrect ? correctSoundRef.current : wrongSoundRef.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.log("Lỗi phát âm thanh:", e));
    }
  };

  const handleAnswer = (answer, idx) => {
    if (locked || showResult || !isAlive) return;
    setLocked(true);
    setSelected(idx);
    const isCorrect = !!answer.correct;
    playSound(isCorrect);

    const proceedToNext = () => {
      const isLast = current + 1 >= gameQuestions.length;
      if (!isLast) {
        setCurrent(c => c + 1);
        setSelected(null);
        setLocked(false);
      } else {
        setShowResult(true);
        saveScore();
        onLessonComplete?.(correctCount);
      }
    };

    if (isCorrect) {
      setCorrectCount(c => c + 1);
      setBulletProgress(0);
      let startTime = null;
      const duration = 300;
      const animateBullet = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / duration);
        setBulletProgress(progress);
        if (progress < 1) {
          requestAnimationFrame(animateBullet);
        } else {
          setBulletProgress(null);
          setExploding(true);
          setTimeout(() => {
            setIsAlive(false);
            proceedToNext();
          }, 200);
        }
      };
      requestAnimationFrame(animateBullet);
    } else {
      setExploding(true);
      setTimeout(() => {
        setIsAlive(false);
        proceedToNext();
      }, 200);
    }
  };

  const resetGame = () => {
    setShuffleSeed((s) => s + 1);
    setCurrent(0);
    setSelected(null);
    setLocked(false);
    setShowResult(false);
    setCorrectCount(0);
    setMonsterX(null);
    setIsAlive(true);
    setExploding(false);
    setBulletProgress(null);
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
  };

  if (!gameQuestions.length) {
    return <div style={{ textAlign: "center", marginTop: 100, color: "white" }}>Không có câu hỏi nào!</div>;
  }

  if (showResult) {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={correctCount}
        totalQuestions={gameQuestions.length}
        onReplay={resetGame}
        height="70vh"
      />
    );
  }

  // --- MÀN HÌNH CHƠI CHÍNH ---
  const progressPercent = Math.round((current / gameQuestions.length) * 100);
  const monsterY = 80;

  let bulletX = null, bulletY = null;
  if (bulletProgress !== null && monsterX !== null && isAlive) {
    const startX = 70;
    const endX = monsterX + 35;
    bulletX = startX + (endX - startX) * bulletProgress;
    bulletY = monsterY + 25;
  }

  const getShapeStyle = (shape) => {
    switch (shape) {
      case "circle": return { borderRadius: "50%" };
      case "square": return { borderRadius: "0" };
      case "triangle": return { clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)", borderRadius: "0" };
      default: return { borderRadius: "50%" };
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "70vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "clamp(10px, 2vw, 20px)",
        boxSizing: "border-box",
        background: "linear-gradient(145deg, #0b3b2f, #07261d)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          background: "#1a472a",
          borderRadius: "28px",
          overflow: "hidden",
          boxShadow: "0 20px 35px rgba(0,0,0,0.4)",
        }}
      >
        {/* Chiến trường */}
        <div
          ref={containerRef}
          style={{
            position: "relative",
            background: "linear-gradient(145deg, #2c5e2e, #1e3a1e)",
            height: "200px",
            borderBottom: "4px solid #d4af37",
            overflow: "hidden",
          }}
        >
          {/* Thành trì */}
          <div
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "80px",
              height: "100px",
              background: "#b87333",
              borderRadius: "12px 12px 0 0",
              boxShadow: "0 0 0 4px #d4af37, inset 0 0 0 3px #8b5a2b",
              textAlign: "center",
              lineHeight: "100px",
              fontSize: "44px",
              zIndex: 2,
            }}
          >
            🏰
          </div>

          {/* Đạn */}
          {bulletX !== null && (
            <div
              style={{
                position: "absolute",
                left: bulletX,
                top: bulletY,
                width: "14px",
                height: "14px",
                backgroundColor: "#ffdd44",
                borderRadius: "50%",
                boxShadow: "0 0 12px #ffaa00",
                zIndex: 10,
              }}
            />
          )}

          {/* Quái vật */}
          {isAlive && monsterX !== null && (
            <div
              style={{
                position: "absolute",
                left: Math.max(monsterX, 10),
                top: monsterY,
                width: "80px",
                height: "80px",
                backgroundColor: monsterColor,
                ...getShapeStyle(monsterShape),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "44px",
                fontWeight: "bold",
                color: "white",
                textShadow: "2px 2px 0 black",
                transition: "all 0.1s linear",
                opacity: exploding ? 0 : 1,
                transform: exploding ? "scale(1.6)" : "scale(1)",
                filter: exploding ? "brightness(2) drop-shadow(0 0 12px orange)" : "none",
                zIndex: 5,
              }}
            >
              {monsterShape === "circle" && "👹"}
              {monsterShape === "square" && "👾"}
              {monsterShape === "triangle" && "👻"}
            </div>
          )}
        </div>

        {/* Phần câu hỏi & đáp án */}
        <div style={{ background: "#0b2f1f", padding: "clamp(16px, 4vw, 28px)", color: "white" }}>
          <div
            style={{
              marginBottom: "20px",
              fontSize: "clamp(1.1rem, 4vw, 1.4rem)",
              fontWeight: "bold",
              textAlign: "center",
              wordBreak: "break-word",
            }}
          >
            Câu {current + 1}/{gameQuestions.length}: {currentQuestion.question_text}
          </div>

          {currentQuestion.question_image && (
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <GameQuestionImageZoom
                src={questionImageUrl(currentQuestion.question_image) || undefined}
                alt="minh họa"
                onThumbError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                thumbStyle={{
                  maxWidth: "100%",
                  maxHeight: "120px",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  borderRadius: "12px",
                  border: "1px solid gold",
                  margin: "0 auto",
                }}
              />
            </div>
          )}

          {/* Đáp án - chia 2 cột cố định, mỗi hàng 2 đáp án */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",  // luôn 2 cột
              gap: "clamp(12px, 2vw, 18px)",
              marginBottom: "24px",
            }}
          >
            {currentQuestion.answers.map((ans, i) => {
              let bg = "linear-gradient(135deg, #2c3e50, #1a2632)";
              let border = "#7f8c8d";
              if (selected !== null) {
                const isSelected = selected === i;
                if (isSelected && ans.correct) {
                  bg = "linear-gradient(135deg, #2ecc71, #27ae60)";
                  border = "#f1c40f";
                } else if (isSelected && !ans.correct) {
                  bg = "linear-gradient(135deg, #e74c3c, #c0392b)";
                  border = "#e74c3c";
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(ans, i)}
                  disabled={locked}
                  style={{
                    background: bg,
                    border: `2px solid ${border}`,
                    borderRadius: "16px",
                    padding: "clamp(12px, 2.5vw, 18px)",
                    fontSize: "clamp(0.85rem, 2.8vw, 1rem)",
                    fontWeight: "bold",
                    color: "white",
                    cursor: locked ? "default" : "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    transition: "0.2s",
                  }}
                >
                  <span style={{ fontWeight: "bold", minWidth: "32px", fontSize: "1.1em" }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {ans.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <audio ref={correctSoundRef} src={`${publicUrl}/game-noises/dung.mp3`} preload="auto" />
      <audio ref={wrongSoundRef} src={`${publicUrl}/game-noises/wrong.mp3`} preload="auto" />
    </div>
  );
}