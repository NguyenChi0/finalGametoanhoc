// src/components/games/game9.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import api, { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { prepareSessionQuestions } from "../lib/lessonQuestions";

export default function Game1({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];

  const [selected, setSelected] = useState({});
  const [userScore, setUserScore] = useState(payload?.user?.score ?? null);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameState, setGameState] = useState('playing'); // 'playing', 'finished'
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const finishSentRef = useRef(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Refs for audio
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    correctSoundRef.current = new Audio(`${publicUrl}/game-noises/dung.mp3`);
    wrongSoundRef.current = new Audio(`${publicUrl}/game-noises/sai.mp3`);
  }, []);

  const qs = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );

  const currentQuestion = qs[currentQuestionIndex];

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

  function handleAnswerSelected(qId, isCorrect) {
    if (selected[qId] !== undefined) return;

    // Phát âm thanh
    if (isCorrect) {
      correctSoundRef.current.play().catch(e => console.warn("Lỗi phát âm thanh:", e));
      setCorrectAnswers(prev => prev + 1);
    } else {
      wrongSoundRef.current.play().catch(e => console.warn("Lỗi phát âm thanh:", e));
    }

    setSelected((prev) => ({ ...prev, [qId]: isCorrect }));

    // Chuyển câu hỏi sau 2 giây hoặc kết thúc game
    setTimeout(() => {
      if (currentQuestionIndex < qs.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setGameState('finished');
      }
    }, 2000);
  }

  function startGame() {
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setSelected({});
    setCorrectAnswers(0);
  }

  function restartGame() {
    setShuffleSeed((s) => s + 1);
    startGame();
  }

  // Khi game kết thúc lần đầu tiên, cộng tổng điểm một lần
  useEffect(() => {
    if (gameState === 'finished' && !finishSentRef.current && correctAnswers > 0) {
      finishSentRef.current = true;
      const userId =
        payload?.user?.id ||
        (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

      if (!userId) return;

      incrementScoreOnServer(userId, correctAnswers).then((data) => {
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
      onLessonComplete?.(correctAnswers);
    }
  }, [gameState, correctAnswers, payload]);

  if (gameState === "finished") {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={correctAnswers}
        totalQuestions={qs.length}
        onReplay={restartGame}
        height="70vh"
      />
    );
  }

  // Màn hình chơi game
  if (!currentQuestion) {
    return <div>Đang tải câu hỏi...</div>;
  }

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        minHeight: "70vh",
        boxSizing: "border-box",
        height: "100%",
        padding: "4px 6px",
        gap: "6px",
        backgroundColor: "#e8e8e8",
        flexWrap: "wrap",
        alignItems: "stretch",
      }}
    >
      {/* Câu hỏi — hẹp hơn để dành diện tích cho vùng thỏ */}
      <div
        style={{
          flex: "0 1 38%",
          minWidth: "min(100%, 220px)",
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "4px 6px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: "clamp(0.9rem, 2.2vw, 1.05rem)",
            color: "#555",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Câu hỏi {currentQuestionIndex + 1}/{qs.length}
        </div>
        <div
          style={{
            fontWeight: 700,
            marginBottom: 8,
            fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)",
            color: "#1a1a1a",
            lineHeight: 1.4,
          }}
        >
          {currentQuestion.question_text}
        </div>
        {currentQuestion.question_image && (
          <GameQuestionImageZoom
            src={questionImageUrl(currentQuestion.question_image) || undefined}
            alt="Câu hỏi"
            thumbStyle={{
              maxWidth: "100%",
              maxHeight: "min(38vh, 260px)",
              display: "block",
              marginTop: 4,
              borderRadius: 4,
            }}
          />
        )}
      </div>

      {/* Vùng chơi / đáp án — rộng hơn, padding tối thiểu */}
      <div
        style={{
          flex: "1 1 58%",
          minWidth: "min(100%, 260px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 0,
          boxSizing: "border-box",
        }}
      >
        <RabbitGame
          key={currentQuestion.id}
          question={currentQuestion}
          onAnswerSelected={(isCorrect) =>
            handleAnswerSelected(currentQuestion.id, isCorrect)
          }
          isAnswered={selected[currentQuestion.id] !== undefined}
          isCorrect={selected[currentQuestion.id]}
        />
      </div>
    </div>
  );
}

/** Rộng hơn 400px, cao giữ 500px như gốc — chỉ scale ngang */
const GAME9_CANVAS_W = 560;
const GAME9_CANVAS_H = 500;
const GAME9_SX = GAME9_CANVAS_W / 400;
const GAME9_SY = GAME9_CANVAS_H / 500;

function game9CanvasCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

// Component game đưa thỏ về hang
function RabbitGame({ question, onAnswerSelected, isAnswered, isCorrect }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [path, setPath] = useState([]);
  const [rabbitPosition, setRabbitPosition] = useState({
    x: 200 * GAME9_SX,
    y: 400 * GAME9_SY,
  });
  const [isMoving, setIsMoving] = useState(false);
  const animationRef = useRef(null);
  const [currentRabbitFrame, setCurrentRabbitFrame] = useState(0);

  // Load images
  const [rabbitImages, setRabbitImages] = useState([]);
  const [standingImage, setStandingImage] = useState(null);
  const [houseImage, setHouseImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);

  useEffect(() => {
    // Load standing image
    const standingImg = new Image();
    standingImg.src = `${publicUrl}/game-images/game9-standing.png`;
    standingImg.onload = () => setStandingImage(standingImg);

    // Load jumping animation frames
    const jumpingFrames = [];
    const framePromises = [];
    
    for (let i = 1; i <= 4; i++) {
      const img = new Image();
      const promise = new Promise((resolve) => {
        img.onload = resolve;
      });
      img.src = `${publicUrl}/game-images/game9-jumping${i}.png`;
      jumpingFrames.push(img);
      framePromises.push(promise);
    }
    
    Promise.all(framePromises).then(() => {
      setRabbitImages(jumpingFrames);
    });

    // Load other images
    const houseImg = new Image();
    houseImg.src = `${publicUrl}/game-images/game9-hang.png`;
    houseImg.onload = () => setHouseImage(houseImg);

    const bgImg = new Image();
    bgImg.src = `${publicUrl}/game-images/game9-background.png`;
    bgImg.onload = () => setBackgroundImage(bgImg);
  }, []);

  const houses = (question.answers || [])
    .filter((a) => a !== undefined && a !== null)
    .slice(0, 4)
    .map((answer, i) => {
      const positions = [
        { x: 100 * GAME9_SX, y: 100 * GAME9_SY },
        { x: 300 * GAME9_SX, y: 100 * GAME9_SY },
        { x: 100 * GAME9_SX, y: 300 * GAME9_SY },
        { x: 300 * GAME9_SX, y: 300 * GAME9_SY },
      ];
      return { id: i, ...positions[i], answer };
    });

  const rabbitSize = Math.round(50 * ((GAME9_SX + GAME9_SY) / 2));
  const houseHitboxSize = Math.round(30 * ((GAME9_SX + GAME9_SY) / 2));
  const houseDisplaySize = Math.round(80 * ((GAME9_SX + GAME9_SY) / 2));

  // Animation loop for jumping
  useEffect(() => {
    let animationInterval;
    
    if (isMoving && rabbitImages.length > 0) {
      animationInterval = setInterval(() => {
        setCurrentRabbitFrame(prev => (prev + 1) % rabbitImages.length);
      }, 200);
    } else {
      setCurrentRabbitFrame(0);
    }
    
    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, [isMoving, rabbitImages.length]);

  // Reset game khi câu hỏi thay đổi
  useEffect(() => {
    resetGame();
  }, [question]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ background nếu đã load
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }
    
    // Vẽ đường đi
    if (path.length > 1) {
      ctx.strokeStyle = '#52c0f7ff';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }

    // Vẽ các ngôi nhà VỚI KÍCH THƯỚC HIỂN THỊ LỚN
    houses.forEach((house) => {
      if (!house.answer) return;
      if (houseImage) {
        // Sử dụng houseDisplaySize cho hiển thị (lớn hơn)
        ctx.drawImage(
          houseImage, 
          house.x - houseDisplaySize/2, 
          house.y - houseDisplaySize/2, 
          houseDisplaySize, 
          houseDisplaySize
        );
      } else {
        // Fallback nếu ảnh chưa load
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(
          house.x - houseDisplaySize/2, 
          house.y - houseDisplaySize/2, 
          houseDisplaySize, 
          houseDisplaySize
        );
      }
      
      // Hiển thị nội dung đáp án - điều chỉnh vị trí cho phù hợp với kích thước mới
      ctx.fillStyle = '#ffffffff';
      ctx.font = `bold ${Math.round(25 * ((GAME9_SX + GAME9_SY) / 2))}px Arial`;
      ctx.textAlign = 'center';
      
      const labelPad = Math.round(15 * ((GAME9_SX + GAME9_SY) / 2));
      if (house.answer.text) {
        const text = house.answer.text.length > 15 ? 
          house.answer.text.substring(0, 15) + '...' : house.answer.text;
        ctx.fillText(text, house.x, house.y + houseDisplaySize / 2 + labelPad);
      } else if (house.answer.image) {
        const bx = Math.round(30 * ((GAME9_SX + GAME9_SY) / 2));
        ctx.fillStyle = '#ddd';
        ctx.fillRect(house.x - bx, house.y + houseDisplaySize / 2 + 5, bx * 2, Math.round(30 * ((GAME9_SX + GAME9_SY) / 2)));
        ctx.fillStyle = '#666';
        ctx.fillText('[Hình ảnh]', house.x, house.y + houseDisplaySize / 2 + labelPad + 10);
      }
    });

    // Vẽ con thỏ với hoạt ảnh
    let currentRabbitImage = standingImage;
    
    if (isMoving && rabbitImages.length > 0) {
      currentRabbitImage = rabbitImages[currentRabbitFrame];
    }
    
    if (currentRabbitImage) {
      ctx.drawImage(
        currentRabbitImage, 
        rabbitPosition.x - rabbitSize/2, 
        rabbitPosition.y - rabbitSize/2, 
        rabbitSize, 
        rabbitSize
      );
    } else {
      // Fallback nếu ảnh chưa load
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(rabbitPosition.x, rabbitPosition.y, rabbitSize/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🐰', rabbitPosition.x, rabbitPosition.y + 5);
    }

  }, [
    path, 
    rabbitPosition, 
    houses, 
    isMoving, 
    currentRabbitFrame, 
    rabbitImages, 
    standingImage, 
    houseImage, 
    backgroundImage,
    houseDisplaySize // Thêm dependency
  ]);

  const handleMouseDown = (e) => {
    if (isAnswered || isMoving) return;

    const canvas = canvasRef.current;
    const { x, y } = game9CanvasCoords(e, canvas);

    // Kiểm tra nếu bắt đầu từ con thỏ
    const distance = Math.sqrt((x - rabbitPosition.x) ** 2 + (y - rabbitPosition.y) ** 2);
    if (distance <= rabbitSize / 2) {
      setIsDrawing(true);
      setPath([{ x: rabbitPosition.x, y: rabbitPosition.y }]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || isAnswered || isMoving) return;

    const canvas = canvasRef.current;
    const { x, y } = game9CanvasCoords(e, canvas);

    setPath(prev => [...prev, { x, y }]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || isAnswered || isMoving) return;
    setIsDrawing(false);
    
    if (path.length > 10) {
      moveRabbitAlongPath();
    } else {
      setPath([]);
    }
  };

  const moveRabbitAlongPath = () => {
    setIsMoving(true);
    let currentIndex = 0;
    const totalPoints = path.length;
    const delay = 200;
    let lastTime = Date.now();

    const move = () => {
      const now = Date.now();
      
      // Chỉ di chuyển khi đã đủ thời gian delay
      if (now - lastTime >= delay) {
        if (currentIndex < totalPoints) {
          setRabbitPosition(path[currentIndex]);
          currentIndex++;
          lastTime = now;
          
          // Kiểm tra va chạm với các ngôi nhà - SỬ DỤNG houseHitboxSize cho va chạm
          const currentPos = path[currentIndex];
          if (currentPos) {
            const currentHouse = houses.find(house => {
              const distance = Math.sqrt(
                (currentPos.x - house.x) ** 2 + 
                (currentPos.y - house.y) ** 2
              );
              // QUAN TRỌNG: Sử dụng houseHitboxSize (nhỏ) cho va chạm
              return distance < (rabbitSize/2 + houseHitboxSize/2);
            });

            if (currentHouse) {
              // Thỏ về nhà
              setRabbitPosition({ x: currentHouse.x, y: currentHouse.y });
              onAnswerSelected(currentHouse.answer.correct);
              cancelAnimationFrame(animationRef.current);
              setIsMoving(false);
              return;
            }
          }
        } else {
          setIsMoving(false);
          setPath([]);
          return;
        }
      }
      
      animationRef.current = requestAnimationFrame(move);
    };

    animationRef.current = requestAnimationFrame(move);
  };

  const resetGame = () => {
    setPath([]);
    setRabbitPosition({ x: 200 * GAME9_SX, y: 400 * GAME9_SY });
    setIsMoving(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  return (
    <div style={{ textAlign: "center", width: "100%", maxWidth: "100%" }}>
      <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
        <canvas
          ref={canvasRef}
          width={GAME9_CANVAS_W}
          height={GAME9_CANVAS_H}
          style={{
            display: "block",
            width: "100%",
            maxWidth: GAME9_CANVAS_W,
            height: "auto",
            aspectRatio: `${GAME9_CANVAS_W} / ${GAME9_CANVAS_H}`,
            borderRadius: 6,
            cursor: isDrawing ? "crosshair" : "pointer",
            verticalAlign: "top",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        {isAnswered && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "12px 16px",
            borderRadius: 8,
            fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)",
            fontWeight: "bold",
            maxWidth: "90%",
          }}>
            {isCorrect ? '🎉 Thỏ đã về nhà an toàn' : '❌ Ôi không thỏ đã bị sói ăn thịt'}
          </div>
        )}
      </div>
      
      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          onClick={resetGame}
          disabled={isMoving || isAnswered}
          style={{
            padding: "6px 12px",
            background: "#41d0f8",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontSize: "0.9rem",
            cursor: isMoving || isAnswered ? "not-allowed" : "pointer",
          }}
        >
          Vẽ Lại Đường
        </button>

        <div style={{ marginTop: 4, fontSize: "0.8rem", color: "#555" }}>
          📝 Vẽ đường để thỏ về đúng nhà
        </div>
      </div>
    </div>
  );
}