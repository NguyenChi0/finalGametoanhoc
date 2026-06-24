import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { prepareSessionQuestions } from "../lib/lessonQuestions";
import game9BackIcon from "../../assets/game-images/back.png";
import game9MusicOnIcon from "../../assets/game-images/music_on.png";
import game9MusicOffIcon from "../../assets/game-images/music-off.png";
import game9SoundOnIcon from "../../assets/game-images/sound_on.png";
import game9SoundOffIcon from "../../assets/game-images/sound-off.png";
import game9RestartIcon from "../../assets/game-images/restart.png";

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

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatterHousePositions(answers, canvasW, canvasH, minDistPx, questionId, rabbitPos, houseRadius) {
  const rng = mulberry32(hashSeed(String(questionId)));
  const margin = houseRadius + 24;
  const positions = [];

  for (let i = 0; i < answers.length; i += 1) {
    let placed = null;
    for (let attempt = 0; attempt < 150; attempt += 1) {
      const x = margin + rng() * (canvasW - margin * 2);
      const y = margin + rng() * (canvasH * 0.82 - margin);
      const farFromRabbit =
        Math.hypot(x - rabbitPos.x, y - rabbitPos.y) >= minDistPx + houseRadius;
      const farFromOthers = positions.every(
        (p) => Math.hypot(x - p.x, y - p.y) >= minDistPx
      );
      if (farFromRabbit && farFromOthers) {
        placed = { x, y };
        break;
      }
    }
    if (!placed) {
      const angle = (i / Math.max(answers.length, 1)) * Math.PI * 2 + rng() * 0.4;
      const r = Math.min(canvasW, canvasH) * (0.28 + rng() * 0.12);
      placed = {
        x: canvasW / 2 + Math.cos(angle) * r,
        y: canvasH * 0.38 + Math.sin(angle) * r * 0.55,
      };
    }
    positions.push(placed);
  }

  return answers.map((answer, i) => ({
    id: i,
    x: positions[i].x,
    y: positions[i].y,
    answer,
  }));
}

export default function Game9({ payload, onLessonComplete }) {
  const navigate = useNavigate();
  const questions = payload?.questions || [];

  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameScreen, setGameScreen] = useState("playing");
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answerByQ, setAnswerByQ] = useState({});
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const finishSentRef = useRef(false);
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const timersRef = useRef([]);

  const qs = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );

  const currentQuestion = qs[currentQuestionIndex];

  useEffect(() => {
    correctSoundRef.current = new Audio(`${publicUrl}/game-noises/dung.mp3`);
    wrongSoundRef.current = new Audio(`${publicUrl}/game-noises/sai.mp3`);
    backgroundMusicRef.current = new Audio(`${publicUrl}/music/nhac2.mp3`);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.6;
    backgroundMusicRef.current.play().catch(() => {});

    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (!backgroundMusicRef.current) return;
    if (musicEnabled && gameScreen === "playing") {
      backgroundMusicRef.current.play().catch(() => {});
    } else {
      backgroundMusicRef.current.pause();
    }
  }, [musicEnabled, gameScreen]);

  useEffect(() => {
    if (gameScreen === "finished") return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [gameScreen]);

  function playCorrectSound() {
    if (soundEnabled && correctSoundRef.current) {
      correctSoundRef.current.currentTime = 0;
      correctSoundRef.current.play().catch(() => {});
    }
  }

  function playWrongSound() {
    if (soundEnabled && wrongSoundRef.current) {
      wrongSoundRef.current.currentTime = 0;
      wrongSoundRef.current.play().catch(() => {});
    }
  }

  function proceedRabbit(ok) {
    if (ok) {
      playCorrectSound();
      setCorrectAnswers((prev) => prev + 1);
    } else {
      playWrongSound();
    }

    const t = window.setTimeout(() => {
      if (currentQuestionIndex < qs.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        setGameScreen("finished");
      }
    }, 2000);
    timersRef.current.push(t);
  }

  function handleHouseReached(qId, houseIndex) {
    const q = qs.find((x) => x.id === qId);
    if (!q || answerByQ[qId]?.locked) return;

    const answer = q.answers?.[houseIndex];
    const ok = !!answer?.correct;

    setAnswerByQ((prev) => ({
      ...prev,
      [qId]: { locked: true, isCorrect: ok },
    }));
    proceedRabbit(ok);
  }

  function startGame() {
    setGameScreen("playing");
    setCurrentQuestionIndex(0);
    setAnswerByQ({});
    setCorrectAnswers(0);
    finishSentRef.current = false;
  }

  function restartGame() {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    setShuffleSeed((s) => s + 1);
    setUserScore(payload?.user?.score ?? 0);
    setWeekScore(payload?.user?.week_score ?? 0);
    startGame();
    if (musicEnabled && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(() => {});
    }
  }

  function toggleMusic() {
    setMusicEnabled((prev) => !prev);
  }

  function toggleSound() {
    setSoundEnabled((prev) => !prev);
  }

  function stopControlPointer(e) {
    e.stopPropagation();
  }

  function handleComeback() {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
    navigate("/lessons", { replace: true });
  }

  useEffect(() => {
    if (gameScreen !== "finished" || finishSentRef.current || correctAnswers <= 0) return;
    finishSentRef.current = true;
    const userId =
      payload?.user?.id ||
      (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

    if (!userId) {
      onLessonComplete?.(correctAnswers);
      return;
    }

    incrementLessonScore(userId, correctAnswers, payload).then((data) => {
      if (data?.success) {
        setUserScore(data.score);
        setWeekScore(data.week_score ?? 0);
      }
    });
    onLessonComplete?.(correctAnswers);
  }, [gameScreen, correctAnswers, payload, onLessonComplete]);

  if (!qs.length) {
    return (
      <div style={{ padding: 20, textAlign: "center", fontSize: 18 }}>
        Không có câu hỏi nào
      </div>
    );
  }

  if (gameScreen === "finished") {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={correctAnswers}
        totalQuestions={qs.length}
        onReplay={restartGame}
        onHome={handleComeback}
        homeLabel="Về bài học"
        fullBleed
      />
    );
  }

  if (!currentQuestion) {
    return <div style={{ padding: 20, textAlign: "center" }}>Đang tải câu hỏi...</div>;
  }

  const qLocked = answerByQ[currentQuestion.id]?.locked;
  const qCorrect = answerByQ[currentQuestion.id]?.isCorrect;

  return (
    <div className="game9-play">
      <style>{`
        .game9-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          background: url(${publicUrl}/game-images/game9-background.png) center / cover no-repeat;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
        }
        .game9-row {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: clamp(4px, 0.6vw, 8px);
          padding: clamp(4px, 0.5vh, 6px) clamp(6px, 0.8vw, 10px);
          box-sizing: border-box;
        }
        .game9-col-q {
          flex: 0 0 42%;
          max-width: 42%;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: clamp(6px, 1vh, 10px);
          padding: clamp(4px, 0.8vw, 8px);
          box-sizing: border-box;
          overflow: hidden;
        }
        .game9-col-play {
          flex: 0 0 58%;
          max-width: 58%;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 0;
          box-sizing: border-box;
        }
        .game9-controls-rail {
          position: absolute;
          right: clamp(6px, 1vw, 14px);
          top: 50%;
          transform: translateY(-50%);
          z-index: 30;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(6px, 1.2vh, 10px);
          pointer-events: none;
        }
        .game9-controls-rail .game9-control-btn {
          pointer-events: auto;
        }
        .game9-control-btn {
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          line-height: 0;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }
        .game9-control-btn:hover { transform: scale(1.06); }
        .game9-control-btn:active { transform: scale(0.96); }
        .game9-control-btn img {
          display: block;
          width: clamp(28px, 5.5vw, 44px);
          height: auto;
          pointer-events: none;
        }
        .game9-question-badge {
          font-weight: 800;
          font-size: clamp(0.85rem, 2vw, 1rem);
          color: #1b4332;
          text-transform: lowercase;
          text-shadow: 0 1px 2px rgba(255,255,255,0.85);
          flex-shrink: 0;
        }
        .game9-question-text {
          font-size: clamp(0.95rem, 2.4vw, 1.25rem);
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.45;
          text-shadow: 0 1px 3px rgba(255,255,255,0.9);
          overflow-y: auto;
          max-height: min(38vh, 320px);
        }
        .game9-question-image {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          max-height: min(32vh, 260px);
          overflow: hidden;
        }
        .game9-question-image button {
          background: transparent;
          border: none;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }
        .game9-question-image img {
          display: block;
          max-width: 100%;
          max-height: min(32vh, 260px);
          object-fit: contain;
        }
        .game9-hint {
          flex-shrink: 0;
          font-size: clamp(0.72rem, 1.6vw, 0.85rem);
          color: #2d6a4f;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(255,255,255,0.85);
        }
        .game9-canvas-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game9-canvas-inner canvas {
          display: block;
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          cursor: pointer;
        }
        .game9-feedback {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,0.75);
          color: #fff;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: clamp(0.85rem, 2vw, 1rem);
          font-weight: 700;
          max-width: 92%;
          text-align: center;
          z-index: 5;
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .game9-row {
            flex-wrap: wrap;
            align-content: stretch;
            overflow-y: auto;
          }
          .game9-col-q {
            flex: 0 0 100%;
            max-width: 100%;
            order: 1;
          }
          .game9-col-play {
            flex: 0 0 100%;
            max-width: 100%;
            order: 2;
            min-height: 42vh;
          }
          .game9-controls-rail {
            top: auto;
            bottom: clamp(8px, 2vh, 16px);
            right: clamp(8px, 2vw, 14px);
            transform: none;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: flex-end;
            max-width: 55%;
          }
          .game9-control-btn img {
            width: clamp(32px, 8vw, 42px);
          }
        }
      `}</style>

      <div className="game9-row">
        <div className="game9-col-q">
          <span className="game9-question-badge">
            câu {currentQuestionIndex + 1}/{qs.length}
          </span>
          <div className="game9-question-text">{currentQuestion.question_text}</div>
          {currentQuestion.question_image ? (
            <div className="game9-question-image">
              <GameQuestionImageZoom
                src={questionImageUrl(currentQuestion.question_image) || undefined}
                thumbStyle={{
                  maxWidth: "100%",
                  maxHeight: "min(32vh, 260px)",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          ) : null}
          <div className="game9-hint">Vẽ đường từ thỏ đến một ngôi nhà đúng</div>
        </div>

        <div className="game9-col-play">
          <RabbitGame
            key={currentQuestion.id}
            question={currentQuestion}
            onHouseReached={(houseIndex) =>
              handleHouseReached(currentQuestion.id, houseIndex)
            }
            isAnswered={!!qLocked}
            isCorrect={!!qCorrect}
          />
        </div>
      </div>

      <div className="game9-controls-rail">
        <button
          type="button"
          className="game9-control-btn"
          onPointerDown={stopControlPointer}
          onClick={handleComeback}
          aria-label="Quay lại"
        >
          <img src={game9BackIcon} alt="" />
        </button>
        <button
          type="button"
          className="game9-control-btn"
          onPointerDown={stopControlPointer}
          onClick={toggleMusic}
          aria-label={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}
        >
          <img src={musicEnabled ? game9MusicOnIcon : game9MusicOffIcon} alt="" />
        </button>
        <button
          type="button"
          className="game9-control-btn"
          onPointerDown={stopControlPointer}
          onClick={toggleSound}
          aria-label={soundEnabled ? "Tắt tiếng" : "Bật tiếng"}
        >
          <img src={soundEnabled ? game9SoundOnIcon : game9SoundOffIcon} alt="" />
        </button>
        <button
          type="button"
          className="game9-control-btn"
          onPointerDown={stopControlPointer}
          onClick={restartGame}
          aria-label="Chơi lại"
        >
          <img src={game9RestartIcon} alt="" />
        </button>
      </div>
    </div>
  );
}

function RabbitGame({ question, onHouseReached, isAnswered, isCorrect }) {
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

  const [rabbitImages, setRabbitImages] = useState([]);
  const [standingImage, setStandingImage] = useState(null);
  const [houseImage, setHouseImage] = useState(null);

  useEffect(() => {
    const standingImg = new Image();
    standingImg.src = `${publicUrl}/game-images/game9-standing.png`;
    standingImg.onload = () => setStandingImage(standingImg);

    const jumpingFrames = [];
    const framePromises = [];
    for (let i = 1; i <= 4; i += 1) {
      const img = new Image();
      const promise = new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      img.src = `${publicUrl}/game-images/game9-jumping${i}.png`;
      jumpingFrames.push(img);
      framePromises.push(promise);
    }
    Promise.all(framePromises).then(() => setRabbitImages(jumpingFrames));

    const houseImg = new Image();
    houseImg.src = `${publicUrl}/game-images/game9-hang.png`;
    houseImg.onload = () => setHouseImage(houseImg);
  }, []);

  const answers = (question.answers || []).filter(
    (a) => a !== undefined && a !== null
  );

  const rabbitSize = Math.round(50 * ((GAME9_SX + GAME9_SY) / 2));
  const houseHitboxSize = Math.round(30 * ((GAME9_SX + GAME9_SY) / 2));
  const houseDisplaySize = Math.round(80 * ((GAME9_SX + GAME9_SY) / 2));
  const rabbitStart = useMemo(
    () => ({ x: 200 * GAME9_SX, y: 400 * GAME9_SY }),
    []
  );

  const [minHouseDist, setMinHouseDist] = useState(() =>
    Math.round(window.innerHeight * 0.1 * (GAME9_CANVAS_H / 500))
  );

  useEffect(() => {
    const updateMinDist = () => {
      const canvas = canvasRef.current;
      const vh10 = window.innerHeight * 0.1;
      if (!canvas) {
        setMinHouseDist(Math.round(vh10 * (GAME9_CANVAS_H / 500)));
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const dist =
        rect.height > 0 ? (vh10 / rect.height) * GAME9_CANVAS_H : vh10;
      setMinHouseDist(dist);
    };
    updateMinDist();
    window.addEventListener("resize", updateMinDist);
    const canvas = canvasRef.current;
    const ro = canvas ? new ResizeObserver(updateMinDist) : null;
    if (canvas && ro) ro.observe(canvas);
    return () => {
      window.removeEventListener("resize", updateMinDist);
      ro?.disconnect();
    };
  }, [question.id]);

  const houses = useMemo(
    () =>
      scatterHousePositions(
        answers,
        GAME9_CANVAS_W,
        GAME9_CANVAS_H,
        minHouseDist,
        question.id,
        rabbitStart,
        houseDisplaySize / 2
      ),
    [answers, question.id, minHouseDist, rabbitStart, houseDisplaySize]
  );

  const resetGame = useCallback(() => {
    setPath([]);
    setRabbitPosition({ x: rabbitStart.x, y: rabbitStart.y });
    setIsMoving(false);
    setIsDrawing(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [rabbitStart]);

  useEffect(() => {
    let animationInterval;
    if (isMoving && rabbitImages.length > 0) {
      animationInterval = setInterval(() => {
        setCurrentRabbitFrame((prev) => (prev + 1) % rabbitImages.length);
      }, 200);
    } else {
      setCurrentRabbitFrame(0);
    }
    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, [isMoving, rabbitImages.length]);

  useEffect(() => {
    resetGame();
  }, [question, resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (path.length > 1) {
      ctx.strokeStyle = "#52c0f7ff";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i += 1) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }

    houses.forEach((house) => {
      if (!house.answer) return;
      if (houseImage) {
        ctx.drawImage(
          houseImage,
          house.x - houseDisplaySize / 2,
          house.y - houseDisplaySize / 2,
          houseDisplaySize,
          houseDisplaySize
        );
      } else {
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(
          house.x - houseDisplaySize / 2,
          house.y - houseDisplaySize / 2,
          houseDisplaySize,
          houseDisplaySize
        );
      }

      ctx.fillStyle = "#ffffffff";
      ctx.font = `bold ${Math.round(25 * ((GAME9_SX + GAME9_SY) / 2))}px Arial`;
      ctx.textAlign = "center";

      const labelPad = Math.round(15 * ((GAME9_SX + GAME9_SY) / 2));
      if (house.answer.text) {
        const text =
          house.answer.text.length > 15
            ? `${house.answer.text.substring(0, 15)}...`
            : house.answer.text;
        ctx.fillText(text, house.x, house.y + houseDisplaySize / 2 + labelPad);
      } else if (house.answer.image) {
        const bx = Math.round(30 * ((GAME9_SX + GAME9_SY) / 2));
        ctx.fillStyle = "#ddd";
        ctx.fillRect(
          house.x - bx,
          house.y + houseDisplaySize / 2 + 5,
          bx * 2,
          Math.round(30 * ((GAME9_SX + GAME9_SY) / 2))
        );
        ctx.fillStyle = "#666";
        ctx.fillText(
          "[Hình ảnh]",
          house.x,
          house.y + houseDisplaySize / 2 + labelPad + 10
        );
      }
    });

    let currentRabbitImage = standingImage;
    if (isMoving && rabbitImages.length > 0) {
      currentRabbitImage = rabbitImages[currentRabbitFrame];
    }

    if (currentRabbitImage) {
      ctx.drawImage(
        currentRabbitImage,
        rabbitPosition.x - rabbitSize / 2,
        rabbitPosition.y - rabbitSize / 2,
        rabbitSize,
        rabbitSize
      );
    } else {
      ctx.fillStyle = "#FFF";
      ctx.beginPath();
      ctx.arc(rabbitPosition.x, rabbitPosition.y, rabbitSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🐰", rabbitPosition.x, rabbitPosition.y + 5);
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
    houseDisplaySize,
    rabbitSize,
  ]);

  const handleMouseDown = (e) => {
    if (isAnswered || isMoving) return;
    const canvas = canvasRef.current;
    const { x, y } = game9CanvasCoords(e, canvas);
    const distance = Math.sqrt(
      (x - rabbitPosition.x) ** 2 + (y - rabbitPosition.y) ** 2
    );
    if (distance <= rabbitSize / 2) {
      setIsDrawing(true);
      setPath([{ x: rabbitPosition.x, y: rabbitPosition.y }]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || isAnswered || isMoving) return;
    const canvas = canvasRef.current;
    const { x, y } = game9CanvasCoords(e, canvas);
    setPath((prev) => [...prev, { x, y }]);
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
      if (now - lastTime >= delay) {
        if (currentIndex < totalPoints) {
          setRabbitPosition(path[currentIndex]);
          currentIndex += 1;
          lastTime = now;

          const currentPos = path[currentIndex];
          if (currentPos) {
            const currentHouse = houses.find((house) => {
              const distance = Math.sqrt(
                (currentPos.x - house.x) ** 2 + (currentPos.y - house.y) ** 2
              );
              return distance < rabbitSize / 2 + houseHitboxSize / 2;
            });

            if (currentHouse) {
              setRabbitPosition({ x: currentHouse.x, y: currentHouse.y });
              onHouseReached(currentHouse.id);
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

  return (
    <div className="game9-canvas-inner">
      <canvas
        ref={canvasRef}
        width={GAME9_CANVAS_W}
        height={GAME9_CANVAS_H}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {isAnswered && (
        <div className="game9-feedback">
          {isCorrect
            ? "🎉 Thỏ đã về nhà an toàn"
            : "❌ Ôi không, thỏ đã bị sói ăn thịt"}
        </div>
      )}
    </div>
  );
}
