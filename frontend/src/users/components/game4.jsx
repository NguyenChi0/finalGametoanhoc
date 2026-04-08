import React, { useMemo, useState, useEffect, useRef } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Game1({ payload, onBackToHome, onLessonComplete }) {
  const questions = payload?.questions || [];
  
  const [selected, setSelected] = useState({});
  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [correctCount, setCorrectCount] = useState(0);

  // Game states
  const [gameScreen, setGameScreen] = useState("menu"); // menu, playing, finished, crashed
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [playerLane, setPlayerLane] = useState(1);
  const [gameState, setGameState] = useState("running");
  const [obstaclePosition, setObstaclePosition] = useState(800);
  const [isJumping, setIsJumping] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(2); // 1: slow, 2: medium, 3: fast
  const animationRef = useRef();
  const hasScoredRef = useRef(false);
  const jumpSoundRef = useRef(null);
  const backgroundMusicRef = useRef(null);

  // Speed settings
  const speedSettings = {
    1: 0.5,  // Slow
    2: 1.4,  // Medium
    3: 1.95  // Fast
  };

  const currentSpeed = speedSettings[gameSpeed];

  // Shuffle câu trả lời, giới hạn tối đa 15 câu hỏi mỗi bài
  const qs = useMemo(() => {
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    const total = (questions || []).length;
    const limit = Math.min(15, total);

    return (questions || []).slice(0, limit).map((q) => {
      const answers = Array.isArray(q.answers) ? shuffle(q.answers) : [];
      return { ...q, answers };
    });
  }, [questions]);

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

  // Reset hasScored khi chuyển câu hỏi
  useEffect(() => {
    hasScoredRef.current = false;
  }, [currentQuestion]);

  // Kết thúc game và cộng điểm một lần
  const finishGameWithScore = (totalCorrect) => {
    const userId =
      payload?.user?.id ||
      (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

    if (!userId || totalCorrect <= 0) {
      setGameState("finished");
      setGameScreen("finished");
      onLessonComplete?.(totalCorrect);
      return;
    }

    incrementScoreOnServer(userId, totalCorrect).then((data) => {
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
      setGameState("finished");
      setGameScreen("finished");
    });
    onLessonComplete?.(totalCorrect);
  };

  // Khởi tạo âm thanh
  useEffect(() => {
    jumpSoundRef.current = new Audio(`${publicUrl}/game-noises/jump.mp3`);
    
    backgroundMusicRef.current = new Audio(`${publicUrl}/music/nhac5.mp3`);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.7;
    
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  // Bắt đầu game
  function startGame() {
    setGameScreen("playing");
    setCurrentQuestion(0);
    setPlayerLane(1);
    setObstaclePosition(800);
    setGameState("running");
    setSelected({});
    hasScoredRef.current = false;
    setCorrectCount(0);
    setUserScore(payload?.user?.score ?? 0);
    setWeekScore(payload?.user?.week_score ?? 0);
    setGameSpeed(2);
    
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(e => console.log("Autoplay prevented:", e));
    }
  }

  // Restart game
  function restartGame() {
    setGameScreen("playing");
    setCurrentQuestion(0);
    setPlayerLane(1);
    setObstaclePosition(800);
    setGameState("running");
    setSelected({});
    hasScoredRef.current = false;
    setCorrectCount(0);
    setUserScore(payload?.user?.score ?? 0);
    setWeekScore(payload?.user?.week_score ?? 0);
    setGameSpeed(2);
  }

  // Back to menu
  function backToMenu() {
    setGameScreen("menu");
    setGameState("running");
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
  }

  // Animation loop
  useEffect(() => {
    if (gameState !== "running" || gameScreen !== "playing") return;

    const animate = () => {
      setObstaclePosition(prev => {
        const newPos = prev - currentSpeed;
        
        if (newPos <= 120 && newPos >= 60) {
          const currentQ = qs[currentQuestion];
          const correctLane = currentQ?.answers.findIndex(a => a.correct);
          
          if (playerLane === correctLane) {
            if (!isJumping && !hasScoredRef.current) {
              hasScoredRef.current = true;
              setIsJumping(true);
              if (jumpSoundRef.current) {
                jumpSoundRef.current.currentTime = 0;
                jumpSoundRef.current.play().catch(() => {});
              }

              setSelected(prev => ({ ...prev, [currentQ.id]: playerLane }));

              const newCorrectCount = correctCount + 1;
              setCorrectCount(newCorrectCount);

              setTimeout(() => {
                setIsJumping(false);
                
                if (currentQuestion < qs.length - 1) {
                  setCurrentQuestion(prev => prev + 1);
                  setObstaclePosition(800);
                } else {
                  finishGameWithScore(newCorrectCount);
                }
              }, 2000);
            }
            return newPos;
          } else if (newPos <= 100 && !isJumping) {
            setGameState("crashed");
            setSelected(prev => ({ ...prev, [currentQ.id]: playerLane }));
            return newPos;
          }
        }
        
        if (newPos < -100) {
          return 800;
        }
        
        return newPos;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, gameScreen, playerLane, isJumping, currentQuestion, qs, payload, currentSpeed]);

  // Di chuyển nhân vật
  function moveLane(newLane) {
    if (gameState === "crashed" || gameState === "finished") return;
    if (newLane >= 0 && newLane < qs[currentQuestion]?.answers.length) {
      setPlayerLane(newLane);
    }
  }

  // Thay đổi tốc độ game
  function changeSpeed(newSpeed) {
    if (gameState === "running") {
      setGameSpeed(newSpeed);
    }
  }

  // Xử lý phím
  useEffect(() => {
    const handleKey = (e) => {
      if (gameScreen === "playing" && gameState === "running") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") moveLane(playerLane - 1);
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") moveLane(playerLane + 1);
        if (e.key === "a" || e.key === "A") moveLane(0);
        if (e.key === "b" || e.key === "B") moveLane(1);
        if (e.key === "c" || e.key === "C") moveLane(2);
        if (e.key === "d" || e.key === "D") moveLane(3);
        
        if (e.key === "1") changeSpeed(1);
        if (e.key === "2") changeSpeed(2);
        if (e.key === "3") changeSpeed(3);
      }
      
      if ((e.key === "r" || e.key === "R") && (gameState === "crashed" || gameScreen === "finished")) {
        restartGame();
      }
    };
    
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameScreen, gameState, playerLane, qs, currentQuestion, payload]);

  // Tự động chuyển câu hỏi khi va chạm sau 2 giây
  useEffect(() => {
    if (gameState === "crashed" && gameScreen === "playing") {
      const timer = setTimeout(() => {
        if (currentQuestion < qs.length - 1) {
          setCurrentQuestion(prev => prev + 1);
          setObstaclePosition(800);
          setGameState("running");
          setPlayerLane(1);
          hasScoredRef.current = false;
        } else {
          // Kết thúc sau câu cuối cùng: cộng tổng điểm một lần
          finishGameWithScore(correctCount);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState, gameScreen, currentQuestion, qs.length]);

  if (!qs.length) {
    return <div style={{ padding: 20, textAlign: "center", fontSize: 18 }}>Không có câu hỏi nào</div>;
  }

  const currentQ = qs[currentQuestion];
  const laneHeight = 90;
  const laneLabels = ['A', 'B', 'C', 'D'];

  // Menu Screen
  if (gameScreen === "menu") {
    return (
      <div style={{ 
        width: "100%", 
        height: "80vh", 
        background: "linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
      }}>
        <div style={{ 
          background: "#fff", 
          padding: "60px 80px", 
          borderRadius: 24, 
          textAlign: "center", 
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: 600
        }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🏃‍♂️</div>
          <h1 style={{ 
            fontSize: 48, 
            fontWeight: "bold", 
            color: "#2c3e50", 
            marginBottom: 16,
            textShadow: "2px 2px 4px rgba(0,0,0,0.1)"
          }}>
            Vượt Chướng Ngại Vật
          </h1>
          <p style={{ 
            fontSize: 20, 
            color: "#666", 
            marginBottom: 40,
            lineHeight: 1.6
          }}>
            Hãy chọn làn đường đúng nhất nhé!
          </p>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={startGame}
              style={{
                padding: "18px 48px",
                fontSize: 22,
                fontWeight: "bold",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
                transition: "all 0.3s ease",
                transform: "scale(1)"
              }}
              onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.target.style.transform = "scale(1)"}
            >
              🎮 Bắt Đầu Chơi
            </button>
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                style={{
                  padding: "18px 48px",
                  fontSize: 22,
                  fontWeight: "bold",
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(245, 87, 108, 0.4)",
                  transition: "all 0.3s ease",
                  transform: "scale(1)"
                }}
                onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.target.style.transform = "scale(1)"}
              >
                🏠 Trang Chủ
              </button>
            )}
          </div>
          <div style={{ 
            marginTop: 40, 
            padding: 20, 
            background: "#f8f9fa", 
            borderRadius: 12,
            fontSize: 16,
            color: "#555"
          }}>
            <p style={{ margin: "8px 0" }}>⌨️ <strong>W/S</strong> hoặc <strong>A/B/C/D</strong>: Di chuyển</p>
            <p style={{ margin: "8px 0" }}>🔢 <strong>1/2/3</strong>: Thay đổi tốc độ</p>
          </div>
        </div>
      </div>
    );
  }

  // Finish Screen
  if (gameScreen === "finished") {
    return (
      <div style={{ 
        width: "100%", 
        height: "80vh", 
        background: "linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
      }}>
        <div style={{ 
          background: "#fff", 
          padding: "60px 80px", 
          borderRadius: 24, 
          textAlign: "center", 
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: 600
        }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
          <h1 style={{ 
            fontSize: 42, 
            fontWeight: "bold", 
            color: "#22c55e", 
            marginBottom: 16
          }}>
            Chúc Mừng!
          </h1>
          <p style={{ 
            fontSize: 20, 
            color: "#666", 
            marginBottom: 40,
            lineHeight: 1.6
          }}>
            Bạn đã hoàn thành cuộc thi
          </p>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={restartGame}
              style={{
                padding: "18px 48px",
                fontSize: 22,
                fontWeight: "bold",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
                transition: "all 0.3s ease"
              }}
            >
              🔄 Chơi Lại
            </button>
            <button
              onClick={backToMenu}
              style={{
                padding: "18px 48px",
                fontSize: 22,
                fontWeight: "bold",
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(79, 172, 254, 0.4)",
                transition: "all 0.3s ease"
              }}
            >
              📋 Menu
            </button>
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                style={{
                  padding: "18px 48px",
                  fontSize: 22,
                  fontWeight: "bold",
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(245, 87, 108, 0.4)",
                  transition: "all 0.3s ease"
                }}
              >
                🏠 Trang Chủ
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Playing Screen
  return (
    <div style={{ width: "100%", height: "80vh", background: "linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)", overflow: "hidden", position: "relative" }}>
      
      {/* Speed indicator */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10, background: "rgba(255,255,255,0.95)", padding: "12px 20px", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>Tốc độ</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3].map(speed => (
            <button
              key={speed}
              onClick={() => changeSpeed(speed)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "none",
                background: gameSpeed === speed ? "#3b82f6" : "#e5e7eb",
                color: gameSpeed === speed ? "white" : "#6b7280",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: 14
              }}
            >
              {speed === 1 ? "Chậm" : speed === 3 ? "Nhanh" : "Trung Bình"}
            </button>
          ))}
        </div>
      </div>

      {/* Question display */}
      {gameState === "running" && (
        <div style={{ 
          position: "absolute", 
          top: 20, 
          right: 20,
          background: "rgba(255,255,255,0.98)",
          padding: "20px 32px",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          maxWidth: 400,
          textAlign: "center",
          zIndex: 10
        }}>
          <div style={{ fontSize: 14, color: "#3b82f6", fontWeight: "bold", marginBottom: 8 }}>CÂU HỎI</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#2c3e50", lineHeight: 1.4 }}>
            {currentQ.question_text}
          </div>
          {currentQ.question_image && (
  <img
    src={
      currentQ.question_image.startsWith("http")
        ? currentQ.question_image
        : `http://210.245.52.119/gametoanhoc${currentQ.question_image}`
    }
    alt=""
    style={{
      maxWidth: "100%",
      maxHeight: 150,
      display: "block",
      margin: "16px auto 0",
      borderRadius: 8
    }}
  />
)}

        </div>
      )}

      {/* Game canvas */}
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        
        {/* Road background */}
        <div style={{ position: "absolute", width: "100%", height: laneHeight * 4, background: "#2d3748", top: "50%", transform: "translateY(-50%)" }} />
        
        {/* Road container */}
        <div style={{ position: "relative", width: 800, height: laneHeight * 4, overflow: "visible" }}>
          
          {/* Lane dividers */}
          {[1, 2, 3].map(i => (
            <div key={i} style={{ position: "absolute", top: i * laneHeight, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.6)", zIndex: 1 }} />
          ))}

          {/* Lane labels */}
          {currentQ.answers.map((ans, idx) => (
            <div
              key={`label-${idx}`}
              onClick={() => moveLane(idx)}
              style={{
                position: "absolute",
                left: 20,
                top: idx * laneHeight + 10,
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: "bold",
                cursor: gameState === "running" ? "pointer" : "default",
                zIndex: 4,
                border: "2px solid rgba(255,255,255,0.3)",
                transition: "all 0.3s ease",
                minWidth: 120
              }}
            >
              {laneLabels[idx]}. {ans.text || (ans.image ? <img src={ans.image} alt="" style={{ maxHeight: 30, verticalAlign: "middle" }} /> : "—")}
            </div>
          ))}

          {/* Player character */}
          <div style={{ 
            position: "absolute", 
            left: 140, 
            top: playerLane * laneHeight,
            width: 70, 
            height: 70, 
            transition: "top 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 5,
            transform: isJumping ? "translateY(-40px) scale(1.1)" : "translateY(0) scale(1)",
            filter: isJumping ? "drop-shadow(0 12px 8px rgba(0,0,0,0.4))" : "drop-shadow(0 4px 4px rgba(0,0,0,0.2))",
          }}>
            <img 
              src={isJumping 
                ? `${publicUrl}/game-images/game4-jumper.png`
                : `${publicUrl}/game-images/game4-runner.gif`
              }
              alt="Runner" 
              style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "contain"
              }} 
            />
          </div>

          {/* Obstacles */}
          {(gameState === "running" || gameState === "crashed") && currentQ.answers.map((ans, idx) => {
            const distance = obstaclePosition;
            const opacity = Math.min(1, Math.max(0.3, (800 - distance) / 400));
            
            return (
              <div
                key={ans.id || idx}
                style={{
                  position: "absolute",
                  left: obstaclePosition,
                  top: idx * laneHeight,
                  width: 100,
                  height: laneHeight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 3,
                  opacity: opacity
                }}
              >
                <img 
                  src={`${publicUrl}/game-images/game4-barrier.png`}
                  alt="Barrier" 
                  style={{ 
                    width: "100%", 
                    height: "100%", 
                    objectFit: "contain"
                  }} 
                />
              </div>
            );
          })}

          {/* Success effect */}
          {isJumping && (
            <div style={{
              position: "absolute",
              left: 140,
              top: playerLane * laneHeight - 20,
              fontSize: 32,
              animation: "successFloat 0.8s ease-out",
              zIndex: 10,
              pointerEvents: "none"
            }}>
              ✨
            </div>
          )}
        </div>
      </div>

      {/* Crash screen */}
      {gameState === "crashed" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(239, 68, 68, 0.15)", backdropFilter: "blur(10px)", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: 50, borderRadius: 24, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxWidth: 400 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💥</div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#ef4444", marginBottom: 12 }}>Ôi không bạn bị ngã rồi</div>
            <div style={{ fontSize: 14, color: "#666", marginTop: 16 }}>Tiếp tục nào...</div>
          </div>
        </div>
      )}

      {/* Controls instructions */}
      <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center", color: "#4b5563", fontSize: 14, zIndex: 10 }}>
        <div>Điều khiển: <kbd style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", margin: "0 4px" }}>W</kbd>/<kbd style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", margin: "0 4px" }}>S</kbd> hoặc <kbd style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", margin: "0 4px" }}>A</kbd>/<kbd style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", margin: "0 4px" }}>B</kbd>/<kbd style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", margin: "0 4px" }}>C</kbd>/<kbd style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", margin: "0 4px" }}>D</kbd> để di chuyển | 
        Tốc độ: <kbd style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", margin: "0 4px" }}>1</kbd>/<kbd style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", margin: "0 4px" }}>2</kbd>/<kbd style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", margin: "0 4px" }}>3</kbd></div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes successFloat {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-50px) scale(1.5); opacity: 0; }
        }
        kbd {
          font-family: monospace;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}