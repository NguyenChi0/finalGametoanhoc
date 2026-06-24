// src/components/games/game2.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import { publicUrl } from "../../lib/publicUrl";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { prepareSessionQuestions } from "../lib/lessonQuestions";
import GameMcqConfirmBar from "./GameMcqConfirmBar";
import {
  getMcqAnswerVisualState,
  useGameMcqSelection,
} from "../lib/useGameMcqSelection";
import game2Background from "../../assets/game-images/game2/game2-background.png";
import game2Farmer from "../../assets/game-images/game2/game2-farmer.png";
import game2Fly from "../../assets/game-images/game2/game2-fly.gif";
import game2Bat from "../../assets/game-images/game2/bat.png";
import game2BackIcon from "../../assets/game-images/back.png";
import game2MusicOnIcon from "../../assets/game-images/music_on.png";
import game2MusicOffIcon from "../../assets/game-images/music-off.png";
import game2SoundOnIcon from "../../assets/game-images/sound_on.png";
import game2SoundOffIcon from "../../assets/game-images/sound-off.png";
import game2RestartIcon from "../../assets/game-images/restart.png";

const FLY_HIT_RADIUS = 96;
const BAT_HOTSPOT_X = 0.82;
const BAT_HOTSPOT_Y = 0.88;
const BAT_REST_ROTATE = 28;
const BAT_SWING_ROTATE = -12;
const BAT_SWING_MS = 220;
const ADVANCE_DELAY_MS = 1000;
const FLY_FALL_MAX_PX = 140;
const FLY_FALL_GRAVITY = 0.65;
const FLY_RISE_SPEED = 5;

function flyLabelStyle(vis, answered) {
  if (!answered) {
    return {
      background: "rgba(255, 255, 255, 0.2)",
      color: "#111",
      fontWeight: 600,
    };
  }
  if (vis.tone === "correct" || vis.tone === "missed") {
    return {
      background: "rgba(46, 204, 113, 0.95)",
      color: "#fff",
      fontWeight: 700,
      boxShadow: "0 0 0 2px #fff",
    };
  }
  if (vis.tone === "wrong") {
    return {
      background: "rgba(231, 76, 60, 0.95)",
      color: "#fff",
      fontWeight: 700,
    };
  }
  return {
    background: "rgba(255, 255, 255, 0.2)",
    color: "#666",
    opacity: 0.55,
  };
}

function flyAnswerLabelStyle(text, labelStyle) {
  const content = text || "";
  const isLong = content.length > 10;
  return {
    position: "absolute",
    top: "100%",
    marginTop: 6,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: isLong ? 16 : 20,
    textAlign: "center",
    lineHeight: 1.3,
    ...(isLong
      ? {
          whiteSpace: "normal",
          wordBreak: "break-word",
          maxWidth: 200,
          minWidth: 72,
        }
      : {
          whiteSpace: "nowrap",
        }),
    ...labelStyle,
  };
}

export default function Game1({ payload, onLessonComplete }) {
  const navigate = useNavigate();
  const questions = payload?.questions || [];

  const mcq = useGameMcqSelection();
  const [userScore, setUserScore] = useState(payload?.user?.score ?? null);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
const fliesRef = useRef([]);
const [, forceRender] = useState(0); // chỉ để render

  const [showFarmer, setShowFarmer] = useState(true);
  const [showQuestionBox, setShowQuestionBox] = useState(true);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [batSwing, setBatSwing] = useState(false);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const gameAreaRef = useRef(null);
  const batRef = useRef(null);
  const hitFlyRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const hitSoundRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const batSwingTimerRef = useRef(null);

  function showGameContent() {
    setShowFarmer(true);
    setShowQuestionBox(true);
  }

  function stopControlPointer(e) {
    e.stopPropagation();
  }

  useEffect(() => {
    hitSoundRef.current = new Audio(`${publicUrl}/game-noises/dap.mp3`);
    backgroundMusicRef.current = new Audio(`${publicUrl}/music/nhac2.mp3`);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.5;
    backgroundMusicRef.current.play().catch(() => {});

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
      if (batSwingTimerRef.current) {
        window.clearTimeout(batSwingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!backgroundMusicRef.current) return;
    if (musicEnabled) {
      backgroundMusicRef.current.play().catch(() => {});
    } else {
      backgroundMusicRef.current.pause();
    }
  }, [musicEnabled]);

  function triggerBatSwing() {
    if (batSwingTimerRef.current) {
      window.clearTimeout(batSwingTimerRef.current);
    }
    setBatSwing(true);
    batSwingTimerRef.current = window.setTimeout(() => {
      batSwingTimerRef.current = null;
      setBatSwing(false);
    }, BAT_SWING_MS);
  }

  function toggleMusic() {
    setMusicEnabled((prev) => !prev);
  }

  function toggleSound() {
    setSoundEnabled((prev) => !prev);
  }

  function playHitSound() {
    if (soundEnabled && hitSoundRef.current) {
      hitSoundRef.current.currentTime = 0;
      hitSoundRef.current.play().catch(() => {});
    }
  }

  function handleComeback() {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
    navigate("/lessons", { replace: true });
  }

  const qs = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );

  const currentQuestion = qs[currentQuestionIndex];
  const questionLocked = currentQuestion ? mcq.isLocked(currentQuestion.id) : true;

  // Hiển thị ngay khi bắt đầu / chuyển câu / chơi lại
  useEffect(() => {
    if (!gameStarted) return;
    showGameContent();
  }, [gameStarted, currentQuestionIndex, shuffleSeed]);

  useEffect(() => {
    if (gameEnded) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [gameEnded]);

  function getFlyMargins(rect, fly) {
    if (!rect?.width || !rect?.height) {
      return { marginX: 10, marginY: 12 };
    }
    const halfW = ((fly.size / 2) / rect.width) * 100;
    const halfH = ((fly.size / 2) / rect.height) * 100;
    const labelPad = (36 / rect.height) * 100;
    return {
      marginX: halfW + 1.5,
      marginY: halfH + labelPad + 1.5,
    };
  }

  // Khởi tạo vị trí và hướng di chuyển cho các con ong
  useEffect(() => {
  if (!showQuestionBox || !currentQuestion) return;

  const rect = gameAreaRef.current?.getBoundingClientRect();
  const sampleFly = { size: 112 };
  const { marginX, marginY } = getFlyMargins(rect, sampleFly);
  const spanX = Math.max(10, 100 - marginX * 2);
  const spanY = Math.max(10, 100 - marginY * 2);

  fliesRef.current = currentQuestion.answers.map((answer, idx) => ({
    id: answer.id || idx,
    answer,
    answerIndex: idx,
    x: Math.random() * spanX + marginX,
    y: Math.random() * spanY + marginY,
    dx: (Math.random() - 0.5) * 0.6,
    dy: (Math.random() - 0.5) * 0.6,
    size: 112,
    falling: false,
    fallY: 0,
    fallVelocity: 0,
  }));

  forceRender(n => n + 1); // render 1 lần
}, [showQuestionBox, currentQuestionIndex]);


  // Di chuyển các con ruồi
  useEffect(() => {
  if (!showQuestionBox || !currentQuestion || questionLocked) return;

  let rafId;

  const move = () => {
    const rect = gameAreaRef.current?.getBoundingClientRect();

    fliesRef.current.forEach(fly => {
      if (fly.falling || fly.fallY > 0) {
        if (fly.falling) {
          fly.fallVelocity += FLY_FALL_GRAVITY;
          fly.fallY = Math.min(fly.fallY + fly.fallVelocity, FLY_FALL_MAX_PX);
          if (fly.fallY >= FLY_FALL_MAX_PX) {
            fly.fallVelocity = 0;
          }
        } else {
          fly.fallY = Math.max(0, fly.fallY - FLY_RISE_SPEED);
          fly.fallVelocity = 0;
        }
        return;
      }

      const { marginX, marginY } = getFlyMargins(rect, fly);

      fly.x += fly.dx;
      fly.y += fly.dy;

      if (fly.x <= marginX || fly.x >= 100 - marginX) fly.dx *= -1;
      if (fly.y <= marginY || fly.y >= 100 - marginY) fly.dy *= -1;

      fly.x = Math.max(marginX, Math.min(100 - marginX, fly.x));
      fly.y = Math.max(marginY, Math.min(100 - marginY, fly.y));
    });

    forceRender(n => n + 1);
    rafId = requestAnimationFrame(move);
  };

  rafId = requestAnimationFrame(move);
  return () => cancelAnimationFrame(rafId);
  }, [showQuestionBox, currentQuestion?.id, questionLocked]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  function finishGame(newCorrectCount) {
    const userId =
      payload?.user?.id ||
      (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

    if (!userId) {
      console.warn("Người dùng chưa login — không thể cộng điểm trên server.");
    } else if (newCorrectCount > 0) {
      incrementLessonScore(userId, newCorrectCount, payload).then((data) => {
        if (data?.success) {
          setUserScore(data.score);
          setWeekScore(data.week_score ?? 0);
        }
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

  function goToNextQuestion(newCorrectCount) {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setAwaitingContinue(false);

    if (currentQuestionIndex < qs.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return;
    }

    finishGame(newCorrectCount);
  }

  function afterAnswer(ok, newCorrectCount) {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    if (ok) {
      setAwaitingContinue(false);
      advanceTimerRef.current = window.setTimeout(() => {
        advanceTimerRef.current = null;
        goToNextQuestion(newCorrectCount);
      }, ADVANCE_DELAY_MS);
    } else {
      setAwaitingContinue(true);
    }
  }

  function hitFly(fly) {
    const qId = currentQuestion.id;
    if (mcq.isLocked(qId)) return;

    const isMulti = mcq.isMultiCorrectQuestion(currentQuestion.answers);
    const wasSelected = mcq.getPendingIndices(qId).includes(fly.answerIndex);
    const ok = mcq.toggleIndex(qId, currentQuestion.answers, fly.answerIndex);

    if (isMulti) {
      const target = fliesRef.current.find((f) => f.answerIndex === fly.answerIndex);
      if (target) {
        if (wasSelected) {
          target.falling = false;
        } else {
          target.falling = true;
          target.fallVelocity = 2.5;
        }
      }
      forceRender((n) => n + 1);
      return;
    }

    if (ok !== null) {
      const newCorrectCount = ok ? correctCount + 1 : correctCount;
      if (ok) setCorrectCount(newCorrectCount);
      afterAnswer(ok, newCorrectCount);
    }
  }
  hitFlyRef.current = hitFly;

  useEffect(() => {
    const el = gameAreaRef.current;
    if (!el || !showQuestionBox || questionLocked) return undefined;

    const placeBat = (x, y) => {
      if (!batRef.current) return;
      batRef.current.style.left = `${x}px`;
      batRef.current.style.top = `${y}px`;
    };

    placeBat(el.clientWidth / 2, el.clientHeight * 0.55);

    const syncBat = (e) => {
      const rect = el.getBoundingClientRect();
      placeBat(e.clientX - rect.left, e.clientY - rect.top);
    };

    const tryHitNearestFly = (e) => {
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      let nearest = null;
      let nearestDist = FLY_HIT_RADIUS;

      fliesRef.current.forEach((fly) => {
        const fx = (fly.x / 100) * rect.width;
        const fy = (fly.y / 100) * rect.height + (fly.fallY ?? 0);
        const dist = Math.hypot(px - fx, py - fy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = fly;
        }
      });

      if (nearest) hitFlyRef.current?.(nearest);
    };

    const onDown = (e) => {
      if (e.target.closest("button, a, input, textarea, select")) return;
      triggerBatSwing();
      playHitSound();
      tryHitNearestFly(e);
    };

    el.addEventListener("pointermove", syncBat);
    el.addEventListener("pointerdown", onDown);

    return () => {
      el.removeEventListener("pointermove", syncBat);
      el.removeEventListener("pointerdown", onDown);
    };
  }, [showQuestionBox, currentQuestionIndex, questionLocked, soundEnabled]);

  function confirmFlyAnswer() {
    const qId = currentQuestion.id;
    if (mcq.isLocked(qId)) return;
    const ok = mcq.confirmPending(qId, currentQuestion.answers);
    const newCorrectCount = ok ? correctCount + 1 : correctCount;
    if (ok) setCorrectCount(newCorrectCount);
    afterAnswer(ok, newCorrectCount);
  }

  function startGame() {
    setGameStarted(true);
    setGameEnded(false);
    mcq.resetAll();
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setAwaitingContinue(false);
  }

  function restartGame() {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (batSwingTimerRef.current) {
      window.clearTimeout(batSwingTimerRef.current);
      batSwingTimerRef.current = null;
    }
    setBatSwing(false);
    setShuffleSeed((s) => s + 1);
    setGameStarted(true);
    setGameEnded(false);
    mcq.resetAll();
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setAwaitingContinue(false);
    if (musicEnabled && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(() => {});
    }
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
    return <div style={{ padding: 20 }}>Không có câu hỏi nào!</div>;
  }

  const isAnswered = questionLocked;
  const answerOk = mcq.getLastResult(currentQuestion.id) === "correct";
  const showBatCursor = showQuestionBox && !isAnswered;
  const qId = currentQuestion.id;
  const pending = mcq.getPendingIndices(qId);
  const confirmed = mcq.getConfirmedIndices(qId);
  const correctAnswerLabels = currentQuestion.answers
    .filter((a) => a.correct)
    .map((a) => a.text || (a.image ? "Ảnh đáp án" : "—"))
    .join(", ");

  return (
    <div
      ref={gameAreaRef}
      className={showBatCursor ? "game2-play game2-play--bat" : "game2-play"}
    >
      <style>{`
        .game2-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          position: relative;
          overflow: hidden;
        }
        .game2-play--bat {
          cursor: none;
        }
        .game2-play--bat .game2-fly-hit {
          cursor: none;
        }
        .game2-play--bat .game2-question-image-wrap,
        .game2-play--bat .game2-question-image-wrap button {
          cursor: zoom-in;
        }
        .game2-bat-cursor {
          position: absolute;
          width: clamp(84px, 15vw, 132px);
          height: auto;
          pointer-events: none;
          z-index: 100;
          transform: translate(-${BAT_HOTSPOT_X * 100}%, -${BAT_HOTSPOT_Y * 100}%) rotate(${BAT_REST_ROTATE}deg);
          transform-origin: ${BAT_HOTSPOT_X * 100}% ${BAT_HOTSPOT_Y * 100}%;
          filter: drop-shadow(3px 6px 10px rgba(0, 0, 0, 0.42));
          will-change: left, top, transform;
        }
        .game2-bat-cursor--swing {
          animation: game2-bat-swing ${BAT_SWING_MS}ms ease-out;
        }
        @keyframes game2-bat-swing {
          0% {
            transform: translate(-${BAT_HOTSPOT_X * 100}%, -${BAT_HOTSPOT_Y * 100}%) rotate(${BAT_REST_ROTATE}deg);
          }
          35% {
            transform: translate(-${BAT_HOTSPOT_X * 100}%, -${BAT_HOTSPOT_Y * 100}%) rotate(${BAT_SWING_ROTATE}deg) scale(1.06);
          }
          100% {
            transform: translate(-${BAT_HOTSPOT_X * 100}%, -${BAT_HOTSPOT_Y * 100}%) rotate(${BAT_REST_ROTATE}deg);
          }
        }
        .game2-controls {
          position: absolute;
          top: clamp(8px, 2vh, 16px);
          right: clamp(8px, 2vw, 16px);
          z-index: 110;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .game2-control-btn {
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          line-height: 0;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }
        .game2-control-btn:hover {
          transform: scale(1.06);
        }
        .game2-control-btn:active {
          transform: scale(0.96);
        }
        .game2-control-btn img {
          display: block;
          width: clamp(40px, 9vw, 52px);
          height: auto;
          pointer-events: none;
        }
        .game2-fly-hit {
          pointer-events: none;
        }
        .game2-fly-hit--fallen {
          filter: saturate(0.88);
        }
        .game2-farmer {
          position: absolute;
          bottom: 15px;
          right: clamp(12px, 4vw, 50px);
          width: 25%;
          height: auto;
          z-index: 2;
          pointer-events: none;
        }
        .game2-question-panel {
          position: absolute;
          top: clamp(8px, 2vh, 20px);
          left: clamp(12px, 2vw, 24px);
          width: 33.333vw;
          max-width: calc(100% - clamp(180px, 22vw, 240px));
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: clamp(10px, 2vh, 16px);
          box-sizing: border-box;
        }
        .game2-question-header {
          display: flex;
          align-items: stretch;
          width: 100%;
          gap: 10px;
          padding: clamp(10px, 2vw, 14px);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.32);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-sizing: border-box;
        }
        .game2-question-badge {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: clamp(64px, 14vw, 80px);
          padding: clamp(6px, 1.5vw, 10px) clamp(8px, 2vw, 12px);
          border-radius: 10px;
          background: rgba(120, 144, 156, 0.88);
          color: #fff;
          font-weight: 700;
          line-height: 1.15;
          text-align: center;
        }
        .game2-question-badge-label {
          font-size: clamp(0.85rem, 2.2vw, 1rem);
        }
        .game2-question-badge-num {
          font-size: clamp(0.95rem, 2.4vw, 1.1rem);
          margin-top: 2px;
        }
        .game2-question-text {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          font-size: clamp(0.95rem, 2.6vw, 1.3rem);
          font-weight: 600;
          color: #1a1a1a;
          line-height: 1.35;
          text-align: left;
        }
        .game2-question-image-wrap {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          width: 100%;
          padding: 12px;
          background: #ffffff;
          border-radius: 8px;
          box-sizing: border-box;
        }
        .game2-question-image-wrap > button {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          margin: 0 auto;
        }
        .game2-question-image-wrap img {
          display: block;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .game2-controls {
            flex-direction: row;
            left: 50%;
            right: auto;
            transform: translateX(-50%);
            top: clamp(6px, 1.5vh, 10px);
            width: 90%;
            justify-content: center;
            gap: clamp(4px, 1.5vw, 8px);
          }
          .game2-control-btn {
            flex: 1;
            min-width: 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .game2-control-btn img {
            width: clamp(36px, 10vw, 48px);
          }
          .game2-question-panel {
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 90%;
            align-items: center;
            top: clamp(52px, 13vw, 60px);
          }
          .game2-question-header {
            width: 100%;
            flex-direction: row;
            gap: 8px;
          }
          .game2-question-image-wrap {
            width: 100%;
            justify-content: center;
          }
          .game2-question-image-wrap > button,
          .game2-question-image-wrap img {
            width: 100%;
            margin: 0 auto;
          }
          .game2-farmer {
            width: min(46vw, 200px);
            min-width: 130px;
            bottom: 8px;
            right: 6px;
          }
        }
        .game2-wrong-panel {
          position: absolute;
          left: 50%;
          bottom: clamp(12px, 3vh, 28px);
          transform: translateX(-50%);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          width: min(92%, 420px);
          box-sizing: border-box;
        }
        .game2-correct-answer-hint {
          margin: 0;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          color: #1b5e20;
          font-size: clamp(0.9rem, 2.5vw, 1.05rem);
          font-weight: 700;
          text-align: center;
          line-height: 1.4;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
        }
        .game2-continue-btn {
          padding: 12px 32px;
          min-width: 160px;
          border: none;
          border-radius: 999px;
          background: rgba(46, 204, 113, 0.95);
          color: #fff;
          font-size: clamp(0.95rem, 2.5vw, 1.05rem);
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
          transition: transform 0.15s ease;
        }
        .game2-continue-btn:hover {
          transform: scale(1.05);
        }
      `}</style>
      {/* Background chính */}
      <img
        src={game2Background}
        alt="background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0
        }}
      />

      <div className="game2-controls">
        <button
          type="button"
          className="game2-control-btn"
          onPointerDown={stopControlPointer}
          onClick={handleComeback}
          aria-label="Quay lại"
        >
          <img src={game2BackIcon} alt="" />
        </button>
        <button
          type="button"
          className="game2-control-btn"
          onPointerDown={stopControlPointer}
          onClick={toggleMusic}
          aria-label={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}
        >
          <img src={musicEnabled ? game2MusicOnIcon : game2MusicOffIcon} alt="" />
        </button>
        <button
          type="button"
          className="game2-control-btn"
          onPointerDown={stopControlPointer}
          onClick={toggleSound}
          aria-label={soundEnabled ? "Tắt tiếng" : "Bật tiếng"}
        >
          <img src={soundEnabled ? game2SoundOnIcon : game2SoundOffIcon} alt="" />
        </button>
        <button
          type="button"
          className="game2-control-btn"
          onPointerDown={stopControlPointer}
          onClick={restartGame}
          aria-label="Chơi lại"
        >
          <img src={game2RestartIcon} alt="" />
        </button>
      </div>

      {/* Người nông dân */}
      {showFarmer && (
        <img
          className="game2-farmer"
          src={game2Farmer}
          alt="farmer"
        />
      )}

      {/* Xác nhận câu nhiều đáp án */}
      {showQuestionBox && mcq.isMultiCorrectQuestion(currentQuestion.answers) && !mcq.isLocked(currentQuestion.id) && (
          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", zIndex: 20, width: "90%" }}>
            <GameMcqConfirmBar
              answers={currentQuestion.answers}
              pendingIndices={mcq.getPendingIndices(currentQuestion.id)}
              onConfirm={confirmFlyAnswer}
              showHint={false}
            />
          </div>
        )}
        {showQuestionBox && (
        <div className="game2-question-panel">
          <div className="game2-question-header">
            <div className="game2-question-badge">
              <span className="game2-question-badge-label">Câu</span>
              <span className="game2-question-badge-num">
                {currentQuestionIndex + 1}/{qs.length}
              </span>
            </div>
            <div className="game2-question-text">
              {currentQuestion.question_text}
            </div>
          </div>

          {currentQuestion.question_image && (
            <div className="game2-question-image-wrap">
              <GameQuestionImageZoom
                src={questionImageUrl(currentQuestion.question_image) || undefined}
                onThumbError={(e) => {
                  console.error(`Không thể tải ảnh: ${currentQuestion.question_image}`);
                  e.currentTarget.onerror = null;
                  e.currentTarget.style.display = "none";
                }}
                thumbStyle={{
                  maxWidth: "100%",
                  maxHeight: "min(28vh, 220px)",
                  objectFit: "contain",
                }}
              />
            </div>
          )}
        </div>
      )}

      {showBatCursor && (
        <img
          ref={batRef}
          src={game2Bat}
          alt=""
          aria-hidden
          className={`game2-bat-cursor${batSwing ? " game2-bat-cursor--swing" : ""}`}
        />
      )}

      {/* Các con ruồi */}
      {showQuestionBox && fliesRef.current.map((fly) => {
        const vis = getMcqAnswerVisualState(
          pending,
          confirmed,
          fly.answerIndex,
          fly.answer
        );
        const labelStyle = flyLabelStyle(vis, isAnswered);
        const fallProgress = Math.min((fly.fallY ?? 0) / FLY_FALL_MAX_PX, 1);
        const fallRotate = fallProgress * 85;
        const isKnockedDown = (fly.fallY ?? 0) > 4;

        return (
  <div
    key={fly.id}
    className={`game2-fly-hit${isKnockedDown ? " game2-fly-hit--fallen" : ""}`}
    style={{
      position: "absolute",
      left: `${fly.x}%`,
      top: `${fly.y}%`,
      width: fly.size,
      height: fly.size,
      transform: `translate(-50%, calc(-50% + ${fly.fallY ?? 0}px)) rotate(${fallRotate}deg)`,
      opacity: isAnswered && vis.tone === "neutral" ? 0.45 : 1,
      zIndex: isKnockedDown ? 3 : 4,
      transition: fly.falling ? "none" : "transform 0.08s linear",
      overflow: "visible",
    }}
  >
          <div style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}>
            {/* Ruồi bay */}
            <img
              src={game2Fly}
              alt="fly"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${isKnockedDown ? 0.92 : 1})`,
                width: "300%",
                height: "300%",
                objectFit: "contain",
                filter: isKnockedDown
                  ? "drop-shadow(1px 3px 2px rgba(0,0,0,0.35))"
                  : "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))",
                pointerEvents: "none",
                opacity: isAnswered && (vis.tone === "correct" || vis.tone === "missed") ? 1 : isAnswered ? 0.55 : 1,
              }}
            />
            
            {/* Câu trả lời */}
            <div style={flyAnswerLabelStyle(
              fly.answer.text || (fly.answer.image ? "🖼️" : "—"),
              labelStyle
            )}>
              {fly.answer.text || (fly.answer.image ? "🖼️" : "—")}
            </div>
          </div>
        </div>
        );
      })}

      {isAnswered && !answerOk && awaitingContinue && (
        <div className="game2-wrong-panel">
          <p className="game2-correct-answer-hint">
            Đáp án đúng: {correctAnswerLabels}
          </p>
          <button
            type="button"
            className="game2-continue-btn"
            onClick={() => goToNextQuestion(correctCount)}
          >
            Tiếp tục
          </button>
        </div>
      )}
    </div>
  );
}