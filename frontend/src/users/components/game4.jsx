import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { prepareSessionQuestions, getAnswerLabel } from "../lib/lessonQuestions";
import game4BackIcon from "../../assets/game-images/back.png";
import game4MusicOnIcon from "../../assets/game-images/music_on.png";
import game4MusicOffIcon from "../../assets/game-images/music-off.png";
import game4SoundOnIcon from "../../assets/game-images/sound_on.png";
import game4SoundOffIcon from "../../assets/game-images/sound-off.png";
import game4RestartIcon from "../../assets/game-images/restart.png";
import game4Run1 from "../../assets/game-images/game4/run1.png";
import game4Run2 from "../../assets/game-images/game4/run2.png";
import game4Run3 from "../../assets/game-images/game4/run3.png";
import game4Run4 from "../../assets/game-images/game4/run4.png";
import game4Run5 from "../../assets/game-images/game4/run5.png";
import game4Run6 from "../../assets/game-images/game4/run6.png";
import game4Run7 from "../../assets/game-images/game4/run7.png";
import game4Run8 from "../../assets/game-images/game4/run8.png";
import game4Jump from "../../assets/game-images/game4/jump.png";
import game4Fall from "../../assets/game-images/game4/fall.png";
import game4Barrier from "../../assets/game-images/game4/barrier.png";

const RUN_FRAMES = [
  game4Run1,
  game4Run2,
  game4Run3,
  game4Run4,
  game4Run5,
  game4Run6,
  game4Run7,
  game4Run8,
];

const speedSettings = { 1: 0.5, 2: 1.4, 3: 1.95 };
const RUN_FRAME_MS = { 1: 110, 2: 80, 3: 55 };
const JUMP_MS = { 1: 1500, 2: 800, 3: 500 };

function barrierWidthPx(roadWidth) {
  return Math.min(100, roadWidth * 0.12);
}

function laneAnswerTextStyle(text) {
  const content = text || "";
  const isLong = content.length > 10;
  return {
    fontSize: isLong ? 14 : 16,
    lineHeight: 1.3,
    ...(isLong
      ? { whiteSpace: "normal", wordBreak: "break-word" }
      : { whiteSpace: "nowrap" }),
  };
}

function isLaneChoiceCorrect(laneIdx, answers) {
  return !!answers?.[laneIdx]?.correct;
}

export default function Game4({ payload, onLessonComplete }) {
  const navigate = useNavigate();
  const questions = payload?.questions || [];

  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [gameScreen, setGameScreen] = useState("playing");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [playerLane, setPlayerLane] = useState(0);
  const [gameState, setGameState] = useState("running");
  const [obstaclePosition, setObstaclePosition] = useState(800);
  const [gameSpeed, setGameSpeed] = useState(2);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [runFrame, setRunFrame] = useState(0);
  const [roadWidth, setRoadWidth] = useState(800);

  const animationRef = useRef();
  const hasScoredRef = useRef(false);
  const jumpSoundRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const roadRef = useRef(null);
  const jumpTimerRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const correctAdvancePendingRef = useRef(false);
  const correctCountRef = useRef(0);

  const currentSpeed = speedSettings[gameSpeed];
  const isJumping = gameState === "jumping";
  const isWrong = gameState === "wrong";

  const qs = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );

  useEffect(() => {
    return () => {
      if (jumpTimerRef.current) window.clearTimeout(jumpTimerRef.current);
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  function clearResultTimers() {
    if (jumpTimerRef.current) {
      window.clearTimeout(jumpTimerRef.current);
      jumpTimerRef.current = null;
    }
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function resetObstaclePosition() {
    setObstaclePosition((roadRef.current?.clientWidth || 800) + 100);
  }

  function goToNextQuestion(scoreCount) {
    clearResultTimers();
    correctAdvancePendingRef.current = false;
    hasScoredRef.current = false;
    setGameState("running");
    if (currentQuestion < qs.length - 1) {
      setCurrentQuestion((p) => p + 1);
      resetObstaclePosition();
      setPlayerLane(0);
    } else {
      finishGameWithScore(scoreCount);
    }
  }

  function continueAfterWrong() {
    if (gameState !== "wrong") return;
    goToNextQuestion(correctCount);
  }

  function handleBarrierHit() {
    if (hasScoredRef.current || gameState !== "running") return;

    const answers = qs[currentQuestion]?.answers ?? [];
    const isCorrect = isLaneChoiceCorrect(playerLane, answers);
    hasScoredRef.current = true;

    if (isCorrect) {
      setGameState("jumping");
      playJumpSound();

      jumpTimerRef.current = window.setTimeout(() => {
        setGameState("running");
        jumpTimerRef.current = null;
      }, JUMP_MS[gameSpeed] ?? 800);

      setCorrectCount((prev) => {
        const newCount = prev + 1;
        correctCountRef.current = newCount;
        correctAdvancePendingRef.current = true;
        return newCount;
      });
      return;
    }

    setGameState("wrong");
  }

  useEffect(() => {
    jumpSoundRef.current = new Audio(`${publicUrl}/game-noises/jump.mp3`);
    backgroundMusicRef.current = new Audio(`${publicUrl}/music/nhac5.mp3`);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.6;
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
    if (musicEnabled) {
      backgroundMusicRef.current.play().catch(() => {});
    } else {
      backgroundMusicRef.current.pause();
    }
  }, [musicEnabled]);

  useEffect(() => {
    if (gameScreen === "finished") return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [gameScreen]);

  useEffect(() => {
    hasScoredRef.current = false;
    correctAdvancePendingRef.current = false;
    clearResultTimers();
    const q = qs[currentQuestion];
    setGameState("running");
    const laneCount = q?.answers?.length ?? 0;
    setPlayerLane((prev) => Math.min(prev, Math.max(0, laneCount - 1)));
    setRunFrame(0);
    setObstaclePosition((roadRef.current?.clientWidth || 800) + 100);
  }, [currentQuestion, qs]);

  useEffect(() => {
    const el = roadRef.current;
    if (!el) return undefined;
    const update = () => setRoadWidth(el.clientWidth || 800);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gameScreen, currentQuestion]);

  useEffect(() => {
    if (gameState !== "running" || isJumping || gameScreen !== "playing") return undefined;
    const id = window.setInterval(() => {
      setRunFrame((f) => (f + 1) % RUN_FRAMES.length);
    }, RUN_FRAME_MS[gameSpeed] ?? 80);
    return () => window.clearInterval(id);
  }, [gameState, isJumping, gameScreen, gameSpeed]);

  function playJumpSound() {
    if (soundEnabled && jumpSoundRef.current) {
      jumpSoundRef.current.currentTime = 0;
      jumpSoundRef.current.play().catch(() => {});
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

  function finishGameWithScore(totalCorrect) {
    const userId =
      payload?.user?.id ||
      (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

    if (!userId || totalCorrect <= 0) {
      setGameState("finished");
      setGameScreen("finished");
      onLessonComplete?.(totalCorrect);
      return;
    }

    incrementLessonScore(userId, totalCorrect, payload).then((data) => {
      if (data?.success) {
        setUserScore(data.score);
        setWeekScore(data.week_score ?? 0);
      }
      setGameState("finished");
      setGameScreen("finished");
    });
    onLessonComplete?.(totalCorrect);
  }

  function restartGame() {
    clearResultTimers();
    setShuffleSeed((s) => s + 1);
    setGameScreen("playing");
    setCurrentQuestion(0);
    setPlayerLane(0);
    setObstaclePosition((roadRef.current?.clientWidth || 800) + 100);
    setRunFrame(0);
    setGameState("running");
    hasScoredRef.current = false;
    correctAdvancePendingRef.current = false;
    setCorrectCount(0);
    correctCountRef.current = 0;
    setUserScore(payload?.user?.score ?? 0);
    setWeekScore(payload?.user?.week_score ?? 0);
    setGameSpeed(2);
    if (musicEnabled && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(() => {});
    }
  }

  function onLaneActivate(laneIdx) {
    if (gameState !== "running") return;
    const q = qs[currentQuestion];
    const laneCount = q?.answers?.length ?? 0;
    if (laneIdx < 0 || !q || laneIdx >= laneCount) return;
    setPlayerLane(laneIdx);
  }

  function changeSpeed(newSpeed) {
    if (gameScreen === "playing" && gameState === "running") {
      setGameSpeed(newSpeed);
    }
  }

  useEffect(() => {
    const shouldAnimate =
      gameScreen === "playing" && (gameState === "running" || gameState === "jumping");
    if (!shouldAnimate) return;

    const animate = () => {
      const hitNear = roadWidth * 0.15;
      const hitFar = roadWidth * 0.075;
      const barrierW = barrierWidthPx(roadWidth);

      setObstaclePosition((prev) => {
        const newPos = prev - currentSpeed;

        if (
          gameState === "running" &&
          newPos <= hitNear &&
          newPos >= hitFar &&
          !hasScoredRef.current
        ) {
          handleBarrierHit();
          return newPos;
        }

        if (correctAdvancePendingRef.current && newPos + barrierW < 0) {
          correctAdvancePendingRef.current = false;
          const score = correctCountRef.current;
          window.requestAnimationFrame(() => goToNextQuestion(score));
          return newPos;
        }

        if (newPos < -barrierW) {
          if (hasScoredRef.current) return newPos;
          return roadWidth + 100;
        }
        return newPos;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, gameScreen, playerLane, currentQuestion, qs, currentSpeed, roadWidth]);

  useEffect(() => {
    const handleKey = (e) => {
      if (gameScreen !== "playing") {
        if ((e.key === "r" || e.key === "R") && gameScreen === "finished") {
          restartGame();
        }
        return;
      }

      if (gameState === "wrong") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          continueAfterWrong();
        }
        return;
      }

      if (gameState !== "running") return;

      const q = qs[currentQuestion];
      const laneCount = q?.answers?.length ?? 0;

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        onLaneActivate(playerLane - 1);
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        onLaneActivate(playerLane + 1);
      }

      for (let i = 0; i < Math.min(laneCount, 6); i += 1) {
        const key = String.fromCharCode(97 + i);
        if (e.key === key || e.key === key.toUpperCase()) onLaneActivate(i);
      }

      if (e.key === "1") changeSpeed(1);
      if (e.key === "2") changeSpeed(2);
      if (e.key === "3") changeSpeed(3);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameScreen, gameState, playerLane, qs, currentQuestion]);

  if (!qs.length) {
    return <div style={{ padding: 20, textAlign: "center", fontSize: 18 }}>Không có câu hỏi nào</div>;
  }

  const currentQ = qs[currentQuestion];
  const displayLaneCount = currentQ.answers.length;
  const laneStepPct = 100 / displayLaneCount;
  const compactLaneText = displayLaneCount > 4;

  if (gameScreen === "finished") {
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

  return (
    <div className="game4-play">
      <style>{`
        .game4-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          background: linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%);
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .game4-controls {
          flex: 0 0 20%;
          max-width: 20%;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(6px, 1vh, 8px);
          box-sizing: border-box;
          padding: clamp(4px, 1vw, 8px);
        }
        .game4-control-btn {
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          line-height: 0;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }
        .game4-control-btn:hover { transform: scale(1.06); }
        .game4-control-btn:active { transform: scale(0.96); }
        .game4-control-btn img {
          display: block;
          width: clamp(32px, 7vw, 48px);
          height: auto;
          pointer-events: none;
        }
        .game4-speed-row {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .game4-speed-num {
          width: clamp(28px, 6vw, 40px);
          height: clamp(28px, 6vw, 40px);
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.85);
          background: rgba(255, 255, 255, 0.75);
          color: #37474f;
          font-weight: 800;
          font-size: clamp(0.85rem, 2vw, 1rem);
          cursor: pointer;
          line-height: 1;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .game4-speed-num:hover { transform: scale(1.05); }
        .game4-speed-num--active {
          background: #3b82f6;
          border-color: #2563eb;
          color: #fff;
        }
        .game4-top {
          flex: 0 0 50%;
          min-height: 0;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: clamp(8px, 1.2vw, 12px);
          padding: clamp(8px, 1.5vh, 14px) clamp(10px, 1.5vw, 16px);
          box-sizing: border-box;
        }
        .game4-top-text {
          flex: 0 0 40%;
          max-width: 40%;
          min-width: 0;
          min-height: 0;
          align-self: stretch;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-sizing: border-box;
        }
        .game4-top-image {
          flex: 0 0 40%;
          max-width: 40%;
          min-width: 0;
          min-height: 0;
          align-self: stretch;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: clamp(4px, 0.8vh, 8px);
        }
        .game4-question-text-box {
          flex: 1;
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          border-radius: 14px;
          background: rgba(186, 230, 253, 0.55);
          border: 2px solid rgba(125, 211, 252, 0.75);
          box-shadow: 0 4px 14px rgba(56, 189, 248, 0.18);
          box-sizing: border-box;
          overflow: hidden;
        }
        .game4-question-text-header {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(8px, 1.2vh, 12px) clamp(10px, 1.5vw, 14px);
          background: rgba(147, 210, 243, 0.65);
          border-bottom: 1px solid rgba(125, 211, 252, 0.5);
        }
        .game4-question-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: transparent;
          color: #0f172a;
          font-weight: 700;
          font-size: clamp(0.9rem, 2.2vw, 1.05rem);
          line-height: 1.2;
          white-space: nowrap;
          text-transform: lowercase;
        }
        .game4-question-text-body {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          padding: clamp(12px, 2vw, 18px) clamp(14px, 2.5vw, 20px);
          box-sizing: border-box;
          overflow-y: auto;
        }
        .game4-question-text {
          width: 100%;
          font-size: clamp(1rem, 2.8vw, 1.35rem);
          font-weight: 700;
          color: #0f172a;
          line-height: 1.4;
          text-align: left;
        }
        .game4-question-image-wrap {
          width: 100%;
          height: 88%;
          max-height: 88%;
          padding: clamp(10px, 1.5vw, 14px);
          background: #fff;
          border-radius: 8px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game4-question-image-wrap button {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game4-question-image-wrap img {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: auto !important;
          height: auto !important;
          object-fit: contain;
          margin: auto;
        }
        .game4-bottom {
          flex: 0 0 50%;
          min-height: 0;
          position: relative;
          z-index: 2;
          background: #2d3748;
          overflow: hidden;
        }
        .game4-bottom--elevated {
          overflow: visible;
          z-index: 40;
        }
        .game4-road {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .game4-runner-wrap {
          position: absolute;
          left: 16%;
          width: clamp(88px, 11vw, 108px);
          transition: top 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 5;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .game4-runner-wrap--jump {
          z-index: 60;
          transform: translateY(-38px);
        }
        .game4-runner-wrap--fall {
          z-index: 60;
        }
        .game4-lane {
          position: absolute;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          padding: 0 16px 0 clamp(108px, 22%, 155px);
          background: transparent;
          border: none;
          color: #f3f4f6;
          font-weight: 700;
          cursor: pointer;
          z-index: 4;
          box-sizing: border-box;
          text-align: left;
        }
        .game4-lane--active {
          color: #93c5fd;
          text-shadow: 0 0 10px rgba(147, 197, 253, 0.45);
        }
        .game4-lane--reveal-correct {
          background: rgba(34, 197, 94, 0.45);
          color: #fff;
          cursor: default;
        }
        .game4-lane--reveal-wrong {
          background: rgba(239, 68, 68, 0.5);
          color: #fff;
          cursor: default;
        }
        .game4-continue-wrap {
          position: absolute;
          bottom: clamp(10px, 2vh, 18px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 40;
        }
        .game4-continue-btn {
          padding: 12px 32px;
          border: none;
          border-radius: 24px;
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: #fff;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }
        .game4-continue-btn:hover {
          filter: brightness(1.05);
        }
        .game4-lane-answer-row {
          width: 100%;
          min-width: 0;
        }
        .game4-runner {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
        @media (max-width: 768px) {
          .game4-top {
            flex-wrap: wrap;
            padding: 8px;
          }
          .game4-top-text {
            flex: 0 0 100%;
            max-width: 100%;
            order: 1;
          }
          .game4-top-image {
            flex: 0 0 65%;
            max-width: 65%;
            order: 2;
            min-height: 100px;
          }
          .game4-controls {
            flex: 0 0 35%;
            max-width: 35%;
            order: 3;
            flex-direction: row;
            flex-wrap: wrap;
            align-content: center;
          }
          .game4-speed-row {
            width: 100%;
          }
          .game4-control-btn img {
            width: clamp(28px, 8vw, 40px);
          }
        }
      `}</style>

      <div className="game4-top">
        <div className="game4-top-text">
          <div className="game4-question-text-box">
            <div className="game4-question-text-header">
              <span className="game4-question-badge">
                câu {currentQuestion + 1}/{qs.length}
              </span>
            </div>
            <div className="game4-question-text-body">
              <div className="game4-question-text">{currentQ.question_text}</div>
            </div>
          </div>
        </div>

        <div className="game4-top-image">
          {currentQ.question_image ? (
            <div className="game4-question-image-wrap">
              <GameQuestionImageZoom
                src={questionImageUrl(currentQ.question_image) || undefined}
                thumbStyle={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  margin: "auto",
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="game4-controls">
          <button type="button" className="game4-control-btn" onPointerDown={stopControlPointer} onClick={handleComeback} aria-label="Quay lại">
            <img src={game4BackIcon} alt="" />
          </button>
          <button type="button" className="game4-control-btn" onPointerDown={stopControlPointer} onClick={toggleMusic} aria-label={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}>
            <img src={musicEnabled ? game4MusicOnIcon : game4MusicOffIcon} alt="" />
          </button>
          <button type="button" className="game4-control-btn" onPointerDown={stopControlPointer} onClick={toggleSound} aria-label={soundEnabled ? "Tắt tiếng" : "Bật tiếng"}>
            <img src={soundEnabled ? game4SoundOnIcon : game4SoundOffIcon} alt="" />
          </button>
          <button type="button" className="game4-control-btn" onPointerDown={stopControlPointer} onClick={restartGame} aria-label="Chơi lại">
            <img src={game4RestartIcon} alt="" />
          </button>
          <div className="game4-speed-row">
            {[1, 2, 3].map((speed) => (
              <button
                key={speed}
                type="button"
                className={`game4-speed-num${gameSpeed === speed ? " game4-speed-num--active" : ""}`}
                onPointerDown={stopControlPointer}
                onClick={() => changeSpeed(speed)}
                aria-label={`Tốc độ ${speed}`}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`game4-bottom${isJumping || isWrong ? " game4-bottom--elevated" : ""}`}>
        <div className="game4-road" ref={roadRef}>
          {Array.from({ length: Math.max(0, displayLaneCount - 1) }, (_, i) => i + 1).map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${i * laneStepPct}%`,
                left: 0,
                right: 0,
                height: 2,
                background: "rgba(255,255,255,0.6)",
                zIndex: 1,
              }}
            />
          ))}

          {currentQ.answers.map((ans, laneIdx) => {
            const active = playerLane === laneIdx && gameState === "running";
            const text = ans.text || (ans.image ? "🖼️" : "—");
            let revealClass = "";
            if (isWrong) {
              if (ans.correct) revealClass = " game4-lane--reveal-correct";
              else if (laneIdx === playerLane) revealClass = " game4-lane--reveal-wrong";
            }

            return (
              <div
                key={`lane-${laneIdx}`}
                role="button"
                tabIndex={isWrong ? -1 : 0}
                className={`game4-lane${active ? " game4-lane--active" : ""}${revealClass}`}
                style={{
                  top: `${laneIdx * laneStepPct}%`,
                  height: `${laneStepPct}%`,
                  pointerEvents: isWrong || isJumping ? "none" : "auto",
                }}
                onClick={() => onLaneActivate(laneIdx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onLaneActivate(laneIdx);
                }}
              >
                <div
                  className="game4-lane-answer-row"
                  style={{
                    ...laneAnswerTextStyle(text),
                    fontSize: compactLaneText ? 12 : undefined,
                  }}
                >
                  {getAnswerLabel(laneIdx)}.{" "}
                  {ans.text ||
                    (ans.image ? (
                      <img
                        src={questionImageUrl(ans.image) || undefined}
                        alt=""
                        style={{ maxHeight: 24, verticalAlign: "middle" }}
                      />
                    ) : (
                      "—"
                    ))}
                </div>
              </div>
            );
          })}

          <div
            className={`game4-runner-wrap${isJumping ? " game4-runner-wrap--jump" : ""}${isWrong ? " game4-runner-wrap--fall" : ""}`}
            style={{
              top: `${playerLane * laneStepPct}%`,
              height: `${laneStepPct}%`,
            }}
          >
            <img
              className="game4-runner"
              src={isWrong ? game4Fall : isJumping ? game4Jump : RUN_FRAMES[runFrame]}
              alt="Runner"
              style={{
                width: "auto",
                height: isWrong ? "88%" : "98%",
                maxHeight: isWrong ? 88 : 104,
                objectFit: "contain",
                objectPosition: "bottom center",
              }}
            />
          </div>

          {(gameState === "running" || gameState === "jumping" || gameState === "wrong") &&
            Array.from({ length: displayLaneCount }, (_, laneIdx) => (
              <div
                key={`barrier-${laneIdx}`}
                style={{
                  position: "absolute",
                  left: obstaclePosition,
                  top: `${laneIdx * laneStepPct}%`,
                  width: barrierWidthPx(roadWidth),
                  height: `${laneStepPct}%`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 3,
                }}
              >
                <img
                  src={game4Barrier}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
            ))}

        </div>

        {isWrong && (
          <div className="game4-continue-wrap">
            <button type="button" className="game4-continue-btn" onClick={continueAfterWrong}>
              Tiếp tục
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
