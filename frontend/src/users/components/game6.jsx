// src/components/games/game6.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { prepareSessionQuestions } from "../lib/lessonQuestions";
import game6BackgroundGame from "../../assets/game-images/game6/backgroundGame.png";
import game6BackgroundQues from "../../assets/game-images/game6/backgroundQues.png";
import game6BackIcon from "../../assets/game-images/back.png";
import game6CoinIcon from "../../assets/game-images/coin.png";
import game6MusicOnIcon from "../../assets/game-images/music_on.png";
import game6MusicOffIcon from "../../assets/game-images/music-off.png";
import game6SoundOnIcon from "../../assets/game-images/sound_on.png";
import game6SoundOffIcon from "../../assets/game-images/sound-off.png";
import game6RestartIcon from "../../assets/game-images/restart.png";

const FRUIT_JUICE_COLORS = ["#FF8C42", "#E63946", "#9B59B6", "#F4D03F"];
const CORRECT_ADVANCE_MS = 1000;

function createJuiceDroplets(sliceAngle) {
  return Array.from({ length: 14 + Math.floor(Math.random() * 6) }, (_, i) => ({
    id: i,
    angle: sliceAngle + (Math.random() - 0.5) * 1.4,
    speed: 35 + Math.random() * 75,
    size: 4 + Math.random() * 10,
    delay: Math.random() * 0.1,
  }));
}

function getSliceAngle(slicePath) {
  if (!slicePath || slicePath.length < 2) return Math.random() * Math.PI * 2;
  const last = slicePath[slicePath.length - 1];
  const prev = slicePath[slicePath.length - 2];
  return Math.atan2(last.y - prev.y, last.x - prev.x);
}

function buildSliceData(slicePath, fruitId) {
  const sliceAngle = getSliceAngle(slicePath);
  return {
    sliceAngle,
    juiceColor: FRUIT_JUICE_COLORS[fruitId % FRUIT_JUICE_COLORS.length],
    droplets: createJuiceDroplets(sliceAngle),
  };
}

function getUserId(payload) {
  if (payload?.user?.id) return payload.user.id;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

export default function Game6({ payload, onLessonComplete }) {
  const navigate = useNavigate();
  const questions = payload?.questions || [];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [fruits, setFruits] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scorePops, setScorePops] = useState([]);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isSlicing, setIsSlicing] = useState(false);
  const [slicePath, setSlicePath] = useState([]);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [slicedFruitId, setSlicedFruitId] = useState(null);
  const [lastWasCorrect, setLastWasCorrect] = useState(null);
  const gameContainerRef = useRef(null);
  const animationRef = useRef(null);
  const sliceSoundRef = useRef(null);
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const scorePopIdRef = useRef(0);
  const advanceTimerRef = useRef(null);

  const isPlaying = gameStarted && !gameEnded;

  const fruitImages = [
    `${publicUrl}/game-images/game6-fruit1.png`,
    `${publicUrl}/game-images/game6-fruit2.png`,
    `${publicUrl}/game-images/game6-fruit3.png`,
    `${publicUrl}/game-images/game6-fruit4.png`,
  ];

  const qs = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );

  const currentQuestion = qs[currentQuestionIndex];

  const stopControlPointer = (e) => e.stopPropagation();

  const playSliceSound = useCallback(() => {
    if (!soundEnabled || !sliceSoundRef.current) return;
    sliceSoundRef.current.currentTime = 0;
    sliceSoundRef.current.play().catch(() => {});
  }, [soundEnabled]);

  const playResultSound = useCallback(
    (isCorrect) => {
      if (!soundEnabled) return;
      const ref = isCorrect ? correctSoundRef.current : wrongSoundRef.current;
      if (!ref) return;
      ref.currentTime = 0;
      ref.play().catch(() => {});
    },
    [soundEnabled]
  );

  const spawnScorePop = useCallback(() => {
    const id = scorePopIdRef.current + 1;
    scorePopIdRef.current = id;
    setScorePops((prev) => [...prev, id]);
    setTimeout(() => {
      setScorePops((prev) => prev.filter((popId) => popId !== id));
    }, 900);
  }, []);

  const addPoint = useCallback(() => {
    setUserScore((s) => s + 1);
    spawnScorePop();
  }, [spawnScorePop]);

  useEffect(() => {
    sliceSoundRef.current = new Audio(`${publicUrl}/game-noises/chem.mp3`);
    sliceSoundRef.current.volume = 0.8;
    correctSoundRef.current = new Audio(`${publicUrl}/game-noises/dung.mp3`);
    wrongSoundRef.current = new Audio(`${publicUrl}/game-noises/sai.mp3`);
    backgroundMusicRef.current = new Audio(`${publicUrl}/music/nhac6.mp3`);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.5;
    backgroundMusicRef.current.play().catch(() => {});
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (!backgroundMusicRef.current) return;
    if (musicEnabled && isPlaying) {
      backgroundMusicRef.current.play().catch(() => {});
    } else {
      backgroundMusicRef.current.pause();
    }
  }, [musicEnabled, isPlaying]);

  useEffect(() => {
    if (gameEnded) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, [gameEnded]);

  useEffect(() => {
    if (!isPlaying || answerLocked) return;

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

          return { ...fruit, x: newX, y: newY, vx, vy };
        })
      );

      animationRef.current = requestAnimationFrame(updateFruits);
    };

    animationRef.current = requestAnimationFrame(updateFruits);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, answerLocked]);

  useEffect(() => {
    if (!currentQuestion || !isPlaying) return;

    setAwaitingContinue(false);
    setAnswerLocked(false);
    setSlicedFruitId(null);
    setLastWasCorrect(null);
    setIsSlicing(false);
    setSlicePath([]);
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    const rect = gameContainerRef.current?.getBoundingClientRect();
    const containerW = rect?.width ?? 520;
    const containerH = rect?.height ?? 400;

    const newFruits = currentQuestion.answers.map((answer, index) => {
      const baseSize = Math.min(76, Math.max(48, Math.floor(containerW / 9)));
      const imgSize = Math.round(baseSize * 1.3);
      const textLen = (answer.text || "").length;
      const hitRadius = Math.min(
        220,
        Math.max(68, imgSize * 0.52 + Math.min(96, 12 + textLen * 2))
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
  }, [currentQuestionIndex, isPlaying, currentQuestion]);

  function finishLesson(newCorrectCount) {
    const userId = getUserId(payload);

    if (!userId) {
      console.warn("Người dùng chưa login — không thể cộng điểm trên server.");
      setGameStarted(false);
      setGameEnded(true);
      onLessonComplete?.(newCorrectCount);
      return;
    }

    if (newCorrectCount > 0) {
      incrementLessonScore(userId, newCorrectCount, payload)
        .then((data) => {
          if (data?.success) setUserScore(data.score);
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
      if (distance <= (fruit.hitRadius ?? 56)) return true;
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

    let xx;
    let yy;
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
    if (!isPlaying || answerLocked) return;
    const rect = gameContainerRef.current.getBoundingClientRect();
    setIsSlicing(true);
    setSlicePath([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  }

  function handleMouseMove(e) {
    if (!isSlicing || !isPlaying || answerLocked) return;

    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newSlicePath = [...slicePath, { x, y }];
    setSlicePath(newSlicePath);

    fruits.forEach((fruit) => {
      if (checkSliceCollision(newSlicePath, fruit)) {
        handleFruitHit(fruit.id, newSlicePath);
      }
    });
  }

  function handleMouseUp() {
    setIsSlicing(false);
    setTimeout(() => setSlicePath([]), 300);
  }

  function goToNextQuestion(scoreCount) {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setAwaitingContinue(false);
    setAnswerLocked(false);
    setSlicedFruitId(null);
    setLastWasCorrect(null);
    setIsSlicing(false);
    setSlicePath([]);

    if (currentQuestionIndex < qs.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishLesson(scoreCount);
    }
  }

  function continueToNext() {
    if (!awaitingContinue) return;
    goToNextQuestion(correctCount);
  }

  function getFruitReviewTone(fruit) {
    if (!answerLocked || lastWasCorrect) return null;
    if (fruit.id === slicedFruitId) return lastWasCorrect ? "correct" : "wrong";
    if (fruit.answer?.correct) return "correct";
    return "dim";
  }

  function getFruitLabelReviewClass(fruit) {
    const tone = getFruitReviewTone(fruit);
    if (tone === "correct") return " game6-fruit-label--correct";
    if (tone === "wrong") return " game6-fruit-label--wrong";
    if (tone === "dim") return " game6-fruit-label--dim";
    return "";
  }

  function isSlicedAnswerCorrect(answers, fruitId) {
    return Boolean(answers[fruitId]?.correct);
  }

  function handleFruitHit(fruitId, pathOverride) {
    const fruit = fruits.find((f) => f.id === fruitId);
    if (!fruit || !currentQuestion || fruit.hit || answerLocked) return;

    setAnswerLocked(true);
    setSlicedFruitId(fruitId);
    playSliceSound();

    const activePath = pathOverride || slicePath;
    const sliceData = buildSliceData(activePath, fruitId);
    const isCorrect = isSlicedAnswerCorrect(currentQuestion.answers, fruitId);
    setLastWasCorrect(isCorrect);
    playResultSound(isCorrect);

    setFruits((prev) =>
      prev.map((f) =>
        f.id === fruitId ? { ...f, hit: true, sliced: true, ...sliceData } : f
      )
    );

    if (isCorrect) {
      const nextCount = correctCount + 1;
      setCorrectCount(nextCount);
      addPoint();
      advanceTimerRef.current = window.setTimeout(() => {
        advanceTimerRef.current = null;
        goToNextQuestion(nextCount);
      }, CORRECT_ADVANCE_MS);
    } else {
      setAwaitingContinue(true);
    }
  }

  function startGame() {
    setGameStarted(true);
    setGameEnded(false);
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setUserScore(payload?.user?.score ?? 0);
    setScorePops([]);
    setFruits([]);
    setSlicePath([]);
    setIsSlicing(false);
    setAwaitingContinue(false);
    setAnswerLocked(false);
    setSlicedFruitId(null);
    setLastWasCorrect(null);
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function restartGame() {
    setShuffleSeed((s) => s + 1);
    startGame();
  }

  function handleComeback() {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
    navigate("/lessons", { replace: true });
  }

  const questionImageRaw =
    currentQuestion?.image ||
    currentQuestion?.question_image ||
    currentQuestion?.question_img ||
    currentQuestion?.questionImage ||
    null;

  const questionImgSrc = questionImageRaw
    ? questionImageUrl(questionImageRaw) || null
    : null;

  const correctAnswerHint = useMemo(() => {
    if (!currentQuestion) return "";
    return currentQuestion.answers
      .map((a) => (a.correct ? a.text || "—" : null))
      .filter(Boolean)
      .join(", ");
  }, [currentQuestion]);

  if (qs.length === 0 && !gameEnded) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#ffd54f" }}>
        Không có câu hỏi nào.
      </div>
    );
  }

  if (gameEnded) {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={correctCount}
        totalQuestions={qs.length}
        onReplay={restartGame}
        onHome={handleComeback}
        homeLabel="Về bài học"
        fullBleed
      />
    );
  }

  if (!currentQuestion) {
    return <div style={{ padding: 20, color: "#ffd54f" }}>Không có câu hỏi nào!</div>;
  }

  return (
    <div className="game6-play">
      <style>{`
        .game6-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          background: #2a1810;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          color: #ffd54f;
          user-select: none;
        }
        .game6-quiz {
          flex: 0 0 40%;
          width: 40%;
          max-width: 40%;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: clamp(10px, 1.5vh, 16px) clamp(10px, 1.2vw, 14px);
          box-sizing: border-box;
          overflow-y: auto;
        }
        .game6-quiz-panel {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: url(${game6BackgroundQues}) center / 100% 100% no-repeat;
          padding: clamp(24px, 3.5vh, 36px) clamp(18px, 2.5vw, 28px);
          box-sizing: border-box;
        }
        .game6-question-badge {
          font-size: clamp(1.05rem, 2.5vw, 1.25rem);
          margin-top: 10%;
          margin-bottom: 12px;
          text-align: center;
          font-weight: 700;
          color: #ffd54f;
          text-shadow: 0 1px 4px rgba(0,0,0,0.85);
          flex-shrink: 0;
        }
        .game6-question-body {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          font-size: clamp(1.2rem, 3.2vw, 1.55rem);
          font-weight: 700;
          line-height: 1.5;
          text-align: center;
          overflow-y: auto;
          color: #ffd54f;
          text-shadow: 0 1px 4px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.35);
          padding-top: clamp(6px, 1vh, 10px);
        }
        .game6-question-image-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          margin-bottom: clamp(8px, 1.2vh, 12px);
        }
        .game6-question-image-card {
          display: inline-block;
          max-width: 100%;
          background: #ffffff;
          border-radius: 8px;
          line-height: 0;
          overflow: hidden;
        }
        .game6-question-image-card button {
          background: #ffffff;
          border-radius: 8px;
        }
        .game6-question-image-card img {
          display: block;
          max-width: 100%;
          max-height: min(32vh, 240px);
          object-fit: contain;
          border-radius: 8px;
        }
        .game6-arena-wrap {
          flex: 0 0 60%;
          width: 60%;
          max-width: 60%;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          box-sizing: border-box;
        }
        .game6-hud {
          position: absolute;
          top: clamp(4px, 1vh, 8px);
          left: clamp(6px, 1.2vw, 10px);
          z-index: 30;
          pointer-events: none;
        }
        .game6-hud-controls {
          display: flex;
          align-items: flex-start;
          flex-wrap: nowrap;
          gap: clamp(4px, 1vw, 6px);
          pointer-events: auto;
        }
        .game6-hud-btn {
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          line-height: 0;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));
        }
        .game6-hud-btn img {
          display: block;
          width: clamp(36px, 7vw, 48px);
          height: clamp(36px, 7vw, 48px);
          object-fit: contain;
        }
        .game6-score-wrap {
          position: relative;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          margin-left: 2px;
        }
        .game6-stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          height: clamp(36px, 7vw, 48px);
          box-sizing: border-box;
          padding: 0 12px 0 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          border: 2px solid #ff9800;
          font-weight: 800;
          font-size: clamp(0.85rem, 2.1vw, 1rem);
          color: #e65100;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          min-width: 72px;
          justify-content: center;
          line-height: 1;
        }
        .game6-stat-pill img.coin {
          width: clamp(30px, 6vw, 40px);
          height: clamp(30px, 6vw, 40px);
          object-fit: contain;
        }
        .game6-score-pop {
          position: absolute;
          left: calc(100% + 4px);
          top: 50%;
          color: #ffd54f;
          font-weight: 800;
          font-size: clamp(0.85rem, 2.2vw, 1.05rem);
          text-shadow: 0 1px 3px rgba(0,0,0,0.6);
          animation: game6-pop-rise 0.9s ease-out forwards;
          pointer-events: none;
          white-space: nowrap;
        }
        @keyframes game6-pop-rise {
          0% { opacity: 0; transform: translateY(-50%) scale(0.5); }
          15% { opacity: 1; transform: translateY(-50%) scale(1.15); }
          50% { opacity: 1; transform: translateY(-90%) scale(1); }
          100% { opacity: 0; transform: translateY(-140%) scale(0.95); }
        }
        .game6-arena {
          position: relative;
          flex: 1;
          min-height: 0;
          width: 100%;
          height: 100%;
          background: url(${game6BackgroundGame}) center / cover no-repeat;
          overflow: hidden;
          touch-action: none;
        }
        .game6-fruit {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
          box-sizing: border-box;
          z-index: 10;
        }
        .game6-fruit-img-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .game6-fruit-label {
          margin-top: 8px;
          max-width: min(92vw, 300px);
          text-align: center;
          font-weight: 700;
          font-size: clamp(0.95rem, 2.2vw, 1.15rem);
          color: #ffd54f;
          text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5);
          line-height: 1.35;
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: normal;
          padding: 0 4px;
          box-sizing: border-box;
        }
        .game6-slice-trail {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 20;
        }
        .game6-slice-trail path {
          filter: drop-shadow(0 0 6px rgba(255,255,255,0.95)) drop-shadow(0 0 12px rgba(255,213,79,0.6));
        }
        .game6-slice-effect {
          position: absolute;
          pointer-events: none;
          z-index: 18;
          transform: translate(-50%, -50%);
        }
        .game6-slice-halves {
          position: relative;
          transform: rotate(var(--slice-angle, 0deg));
        }
        .game6-half {
          position: absolute;
          left: 0;
          top: 0;
          object-fit: contain;
          pointer-events: none;
        }
        .game6-half--a {
          clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);
          animation: game6-half-fly-a 0.65s ease-out forwards;
        }
        .game6-half--b {
          clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%);
          animation: game6-half-fly-b 0.65s ease-out forwards;
        }
        @keyframes game6-half-fly-a {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-32px, -22px) rotate(-38deg); opacity: 0; }
        }
        @keyframes game6-half-fly-b {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(32px, 18px) rotate(42deg); opacity: 0; }
        }
        .game6-juice-drop {
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: game6-juice-fly 0.7s ease-out forwards;
          box-shadow: 0 0 4px rgba(255,255,255,0.35);
        }
        @keyframes game6-juice-fly {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          60% { opacity: 0.9; }
          100% {
            transform: translate(calc(-50% + var(--jx)), calc(-50% + var(--jy) + 28px)) scale(0.15);
            opacity: 0;
          }
        }
        .game6-juice-splash {
          position: absolute;
          left: 50%;
          top: 50%;
          width: var(--sw, 18px);
          height: var(--sh, 8px);
          border-radius: 50%;
          background: var(--juice-color, #ff8c42);
          opacity: 0.85;
          transform: translate(-50%, -50%) rotate(var(--sa, 0deg));
          animation: game6-splash-burst 0.55s ease-out forwards;
        }
        @keyframes game6-splash-burst {
          0% { transform: translate(-50%, -50%) rotate(var(--sa, 0deg)) scale(0.4); opacity: 0.9; }
          100% {
            transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) rotate(var(--sa, 0deg)) scale(1.6);
            opacity: 0;
          }
        }
        .game6-fruit-label--dim {
          opacity: 0.45;
        }
        .game6-fruit--dim {
          opacity: 0.55;
        }
        .game6-fruit-label--correct {
          background: rgba(34, 197, 94, 0.88);
          border-radius: 6px;
          padding: 3px 8px;
          color: #fff;
          text-shadow: none;
        }
        .game6-fruit-label--wrong {
          background: rgba(239, 68, 68, 0.88);
          border-radius: 6px;
          padding: 3px 8px;
          color: #fff;
          text-shadow: none;
        }
        .game6-actions {
          position: absolute;
          left: 50%;
          bottom: clamp(12px, 2.5vh, 20px);
          transform: translateX(-50%);
          z-index: 40;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          max-width: min(92%, 420px);
          padding: clamp(10px, 1.5vh, 14px) clamp(14px, 2vw, 18px);
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.58);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
          pointer-events: auto;
        }
        .game6-result-msg {
          margin: 0;
          font-size: clamp(1rem, 2.4vw, 1.15rem);
          font-weight: 800;
          text-align: center;
          text-shadow: 0 1px 4px rgba(0,0,0,0.85);
        }
        .game6-result-msg--ok { color: #a5d6a7; }
        .game6-result-msg--bad { color: #ffcdd2; }
        .game6-correct-hint {
          margin: 0;
          font-size: clamp(0.92rem, 2.2vw, 1.08rem);
          font-weight: 700;
          color: #ffd54f;
          text-align: center;
          line-height: 1.4;
          text-shadow: 0 1px 4px rgba(0,0,0,0.85);
        }
        .game6-continue-btn {
          padding: 12px 32px;
          min-width: 160px;
          border: none;
          border-radius: 24px;
          color: #fff;
          font-weight: 700;
          font-size: clamp(0.95rem, 2.5vw, 1.05rem);
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          background: linear-gradient(135deg, #ff9800, #f57c00);
        }
        .game6-continue-btn:hover {
          filter: brightness(1.05);
        }
        @media (max-width: 768px) {
          .game6-play { flex-direction: column; }
          .game6-quiz {
            flex: 0 0 40%;
            width: 100%;
            max-width: 100%;
            max-height: 40%;
          }
          .game6-arena-wrap {
            flex: 1 1 60%;
            width: 100%;
            max-width: 100%;
            min-height: 0;
          }
          .game6-hud-btn img {
            width: clamp(32px, 8vw, 42px);
            height: clamp(32px, 8vw, 42px);
          }
        }
      `}</style>

      <div className="game6-quiz">
        <div className="game6-quiz-panel">
          <div className="game6-question-badge">
            Câu hỏi: <strong>{currentQuestionIndex + 1}</strong> / {qs.length}
          </div>
          {questionImgSrc && (
            <div className="game6-question-image-wrap">
              <div className="game6-question-image-card">
                <GameQuestionImageZoom
                  src={questionImgSrc}
                  alt="question"
                  thumbStyle={{
                    maxWidth: "100%",
                    maxHeight: "min(32vh, 240px)",
                    objectFit: "contain",
                    borderRadius: 8,
                    display: "block",
                  }}
                />
              </div>
            </div>
          )}
          <div className="game6-question-body">
            <div>{currentQuestion.question_text}</div>
          </div>
        </div>
      </div>

      <div className="game6-arena-wrap">
        <div className="game6-hud">
          <div className="game6-hud-controls">
            <button
              type="button"
              className="game6-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={handleComeback}
              aria-label="Quay lại"
            >
              <img src={game6BackIcon} alt="" />
            </button>
            <button
              type="button"
              className="game6-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={() => setMusicEnabled((p) => !p)}
              aria-label={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}
            >
              <img src={musicEnabled ? game6MusicOnIcon : game6MusicOffIcon} alt="" />
            </button>
            <button
              type="button"
              className="game6-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={() => setSoundEnabled((p) => !p)}
              aria-label={soundEnabled ? "Tắt tiếng" : "Bật tiếng"}
            >
              <img src={soundEnabled ? game6SoundOnIcon : game6SoundOffIcon} alt="" />
            </button>
            <button
              type="button"
              className="game6-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={restartGame}
              aria-label="Chơi lại"
            >
              <img src={game6RestartIcon} alt="" />
            </button>
            <div className="game6-score-wrap">
              <div className="game6-stat-pill" title="Thành tích">
                <img className="coin" src={game6CoinIcon} alt="" />
                {userScore}
              </div>
              {scorePops.map((id) => (
                <span key={id} className="game6-score-pop">
                  +1
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          ref={gameContainerRef}
          className="game6-arena"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isSlicing && !answerLocked ? "crosshair" : "default" }}
        >
          {slicePath.length > 1 && (
            <svg className="game6-slice-trail">
              <path
                d={`M ${slicePath.map((p) => `${p.x},${p.y}`).join(" L ")}`}
                stroke="#ffffff"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {fruits.map((fruit) => {
            const fruitImage = fruitImages[fruit.id % fruitImages.length];
            const imgSize = fruit.imgSize ?? 56;
            const labelSize = Math.max(14, Math.min(19, Math.floor(imgSize / 3.2)));

            if (fruit.hit) {
              const juiceColor = fruit.juiceColor || FRUIT_JUICE_COLORS[fruit.id % 4];
              const sliceDeg = `${((fruit.sliceAngle ?? 0) * 180) / Math.PI}deg`;
              return (
                <div
                  key={`slice-${fruit.id}`}
                  className="game6-slice-effect"
                  style={{
                    left: `${fruit.x}px`,
                    top: `${fruit.y}px`,
                    "--slice-angle": sliceDeg,
                  }}
                >
                  <div
                    className="game6-slice-halves"
                    style={{ width: imgSize, height: imgSize, "--slice-angle": sliceDeg }}
                  >
                    <img
                      src={fruitImage}
                      alt=""
                      className="game6-half game6-half--a"
                      style={{ width: imgSize, height: imgSize }}
                      draggable={false}
                    />
                    <img
                      src={fruitImage}
                      alt=""
                      className="game6-half game6-half--b"
                      style={{ width: imgSize, height: imgSize }}
                      draggable={false}
                    />
                  </div>
                  {(fruit.droplets || []).map((d) => (
                    <span
                      key={d.id}
                      className="game6-juice-drop"
                      style={{
                        width: d.size,
                        height: d.size,
                        background: juiceColor,
                        animationDelay: `${d.delay}s`,
                        "--jx": `${Math.cos(d.angle) * d.speed}px`,
                        "--jy": `${Math.sin(d.angle) * d.speed}px`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3, 4].map((i) => {
                    const a = (fruit.sliceAngle ?? 0) + (i - 2) * 0.35;
                    const dist = 28 + i * 8;
                    return (
                      <span
                        key={`splash-${i}`}
                        className="game6-juice-splash"
                        style={{
                          "--juice-color": juiceColor,
                          "--sa": `${(a * 180) / Math.PI}deg`,
                          "--sx": `${Math.cos(a) * dist}px`,
                          "--sy": `${Math.sin(a) * dist}px`,
                          "--sw": `${14 + i * 3}px`,
                          "--sh": `${6 + i * 2}px`,
                          animationDelay: `${i * 0.04}s`,
                        }}
                      />
                    );
                  })}
                  <div
                    className={`game6-fruit-label${getFruitLabelReviewClass(fruit)}`}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: imgSize + 8,
                      transform: "translateX(-50%)",
                      fontSize: labelSize,
                      animation: "game6-half-fly-b 0.65s ease-out forwards",
                    }}
                  >
                    {fruit.answer.text}
                  </div>
                </div>
              );
            }

            const reviewTone = getFruitReviewTone(fruit);

            return (
              <div
                key={fruit.id}
                className={`game6-fruit${reviewTone === "dim" ? " game6-fruit--dim" : ""}`}
                style={{
                  left: `${fruit.x}px`,
                  top: `${fruit.y}px`,
                  transform: "translate(-50%, -50%)",
                  maxWidth: "min(92%, 300px)",
                  width: "max-content",
                }}
              >
                <div
                  className="game6-fruit-img-wrap"
                  style={{ width: imgSize, height: imgSize }}
                >
                  <img
                    src={fruitImage}
                    alt="fruit"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                    draggable={false}
                  />
                </div>
                <div className={`game6-fruit-label${getFruitLabelReviewClass(fruit)}`} style={{ fontSize: labelSize }}>
                  {fruit.answer.text}
                </div>
              </div>
            );
          })}
        </div>

        {awaitingContinue && (
          <div className="game6-actions">
            <p className="game6-result-msg game6-result-msg--bad">Chưa đúng!</p>
            {correctAnswerHint && (
              <p className="game6-correct-hint">Đáp án đúng: {correctAnswerHint}</p>
            )}
            <button
              type="button"
              className="game6-continue-btn"
              onPointerDown={stopControlPointer}
              onClick={continueToNext}
            >
              Tiếp tục
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
