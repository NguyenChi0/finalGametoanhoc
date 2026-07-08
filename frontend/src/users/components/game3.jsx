import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import GameHintButton from "./GameHintButton";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { useLessonHints } from "../lib/useLessonHints";
import { prepareSessionQuestions } from "../lib/lessonQuestions";
import {
  getMcqAnswerVisualState,
  useGameMcqSelection,
} from "../lib/useGameMcqSelection";
import phihanhgiaImg from "../../assets/game-images/game3/phihanhgia.png";
import itemImg from "../../assets/game-images/game3/item.png";
import platform1Img from "../../assets/game-images/game3/platform1.png";
import platform2Img from "../../assets/game-images/game3/platform2.png";

const GAME_W = 800;
const GAME_H = 600;
const PLAYER_SIZE = 40;
const PLAYER_START = { x: 50, y: 500 };
const GRAVITY = 0.1;
const FLY_FORCE = -0.2;
const MOVE_SPEED = 5;
const JAR_RADIUS = 22;
const JAR_PICK_MS = 2000;
const ADVANCE_MS = 2000;

const PLATFORMS = [
  { x: 0, y: 550, w: 800, h: 50, type: 1 },
  { x: 100, y: 450, w: 200, h: 20, type: 2 },
  { x: 450, y: 350, w: 200, h: 20, type: 1 },
  { x: 150, y: 250, w: 200, h: 20, type: 2 },
  { x: 500, y: 150, w: 200, h: 20, type: 1 },
  { x: 300, y: 50, w: 150, h: 20, type: 2 },
];

/** Chỉ chỉnh ảnh platform (không đụng hitbox PLATFORMS). dy âm = đẩy ảnh lên. */
const PLATFORM_VISUAL = { dx: -22, dy: -65, dw: 72, dh: 48 };

/** Vị trí lọ (đáp án) — tối đa 4, map theo số đáp án. */
const JAR_SLOT_POOL = [
  { x: 200, y: 220 },
  { x: 300, y: 220 },
  { x: 550, y: 120 },
  { x: 650, y: 120 },
  { x: 150, y: 420 },
  { x: 250, y: 420 },
  { x: 500, y: 320 },
  { x: 600, y: 320 },
];

const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  left: `${((i * 37 + 11) % 100).toFixed(1)}%`,
  top: `${((i * 53 + 7) % 92).toFixed(1)}%`,
  size: 1 + (i % 3),
  delay: `${((i % 12) * 0.28).toFixed(2)}s`,
}));

function pctX(px) {
  return `${(px / GAME_W) * 100}%`;
}

function pctY(px) {
  return `${(px / GAME_H) * 100}%`;
}

function pctW(px) {
  return `${(px / GAME_W) * 100}%`;
}

function pctH(px) {
  return `${(px / GAME_H) * 100}%`;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function displayAnswerText(text) {
  return String(text ?? "").replace(/^[A-Da-d]\.\s*/, "");
}

function jarPickRadius(playerSize) {
  return playerSize / 2 + JAR_RADIUS;
}

function findNearestJar(player, jarLayout, hiddenIndices) {
  const radius = jarPickRadius(player.size);
  let nearest = null;
  let nearestDist = radius;
  for (const jar of jarLayout) {
    if (hiddenIndices.has(jar.answerIndex)) continue;
    const d = dist(player.x, player.y, jar.x, jar.y);
    if (d <= nearestDist) {
      nearestDist = d;
      nearest = jar;
    }
  }
  return nearest;
}

function platformVisualBox(p) {
  const visW = p.w + PLATFORM_VISUAL.dw;
  const visH = p.h + PLATFORM_VISUAL.dh;
  return {
    left: pctX(p.x + PLATFORM_VISUAL.dx),
    top: pctY(p.y + PLATFORM_VISUAL.dy),
    width: pctW(visW),
    height: pctH(visH),
  };
}

function resolvePlatformCollisions(player, platforms) {
  const half = player.size / 2;
  const oldX = player.x;
  const oldY = player.y;

  player.x += player.vx;
  player.y += player.vy;

  for (const p of platforms) {
    if (
      player.x + half > p.x &&
      player.x - half < p.x + p.w &&
      player.y + half > p.y &&
      player.y - half < p.y + p.h
    ) {
      if (oldY + half <= p.y && player.vy > 0) {
        player.y = p.y - half;
        player.vy = 0;
      } else if (oldY - half >= p.y + p.h && player.vy < 0) {
        player.y = p.y + p.h + half;
        player.vy = 0;
      } else if (oldX + half <= p.x && player.vx > 0) {
        player.x = p.x - half;
        player.vx = 0;
      } else if (oldX - half >= p.x + p.w && player.vx < 0) {
        player.x = p.x + p.w + half;
        player.vx = 0;
      }
    }
  }

  if (player.x - half < 0) {
    player.x = half;
    player.vx = 0;
  }
  if (player.x + half > GAME_W) {
    player.x = GAME_W - half;
    player.vx = 0;
  }
  if (player.y - half < 0) {
    player.y = half;
    player.vy = 0;
  }
  if (player.y + half > GAME_H) {
    player.y = GAME_H - half;
    player.vy = 0;
  }
}

export default function Game3({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];
  const user = payload?.user;
  const [current, setCurrent] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [locked, setLocked] = useState(false);
  const [levelTransition, setLevelTransition] = useState(false);
  const [playerPos, setPlayerPos] = useState(PLAYER_START);
  const [isFlying, setIsFlying] = useState(false);
  const mcq = useGameMcqSelection();
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [reviewState, setReviewState] = useState(null);
  const [chargingJar, setChargingJar] = useState(null);
  const [chargeProgress, setChargeProgress] = useState(0);

  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);
  const jumpSoundRef = useRef(null);
  const playerRef = useRef({
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    size: PLAYER_SIZE,
    vx: 0,
    vy: 0,
  });
  const moveRef = useRef({ left: false, right: false });
  const lockedRef = useRef(false);
  const rafRef = useRef(null);
  const flyingRef = useRef(false);
  const jarTouchLockRef = useRef(false);
  const nearJarRef = useRef(null);
  const nearSinceRef = useRef(null);
  const chargeUiTickRef = useRef(0);
  const pickJarRef = useRef(null);

  const {
    hintsRemaining,
    hasHintFeature,
    canUseHint,
    applyHint,
    getHiddenIndices,
    resetHints,
  } = useLessonHints(payload);

  const gameQuestions = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );
  const currentQuestion = gameQuestions[current];
  const totalQuestions = gameQuestions.length;

  const jarLayout = useMemo(() => {
    if (!currentQuestion?.answers) return [];
    const slots = JAR_SLOT_POOL.slice(0, currentQuestion.answers.length);
    return currentQuestion.answers.map((ans, i) => ({
      answerIndex: i,
      answer: ans,
      x: slots[i]?.x ?? 200 + i * 120,
      y: slots[i]?.y ?? 420,
    }));
  }, [currentQuestion]);

  const resetPlayer = useCallback(() => {
    playerRef.current = {
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      size: PLAYER_SIZE,
      vx: 0,
      vy: 0,
    };
    setPlayerPos({ ...PLAYER_START });
    setIsFlying(false);
    flyingRef.current = false;
  }, []);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    resetPlayer();
    jarTouchLockRef.current = false;
    nearJarRef.current = null;
    nearSinceRef.current = null;
    setChargingJar(null);
    setChargeProgress(0);
    setReviewState(null);
  }, [current, shuffleSeed, resetPlayer]);

  useEffect(() => {
    if (showResult) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showResult]);

  const playSound = useCallback((isCorrect) => {
    const ref = isCorrect ? correctSoundRef : wrongSoundRef;
    if (ref.current) {
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    }
  }, []);

  const finishLesson = useCallback(
    (newCorrectCount) => {
      setShowResult(true);
      if (user?.id && newCorrectCount > 0) {
        incrementLessonScore(user.id, newCorrectCount, payload).catch(() => {});
      }
      onLessonComplete?.(newCorrectCount);
    },
    [user?.id, payload, onLessonComplete]
  );

  const advanceQuestion = useCallback(
    (isCorrect) => {
      const isLast = current + 1 >= totalQuestions;
      const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

      setReviewState(isCorrect ? "correct" : "wrong");

      if (!isLast) {
        if (isCorrect) setLevelTransition(true);
        setTimeout(() => {
          setCorrectCount(newCorrectCount);
          setCurrent((c) => c + 1);
          setLocked(false);
          lockedRef.current = false;
          setLevelTransition(false);
          setReviewState(null);
          jarTouchLockRef.current = false;
          resetPlayer();
        }, ADVANCE_MS);
        return;
      }

      setCorrectCount(newCorrectCount);
      finishLesson(newCorrectCount);
    },
    [current, totalQuestions, correctCount, finishLesson, resetPlayer]
  );

  const finishAnswer = useCallback(
    (isCorrect) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      jarTouchLockRef.current = true;
      setLocked(true);
      playSound(isCorrect);
      advanceQuestion(isCorrect);
    },
    [playSound, advanceQuestion]
  );

  const pickJar = useCallback(
    (answerIndex) => {
      if (lockedRef.current || !currentQuestion) return;
      if (jarTouchLockRef.current) return;

      const qId = currentQuestion.id;
      if (mcq.isLocked(qId)) return;

      jarTouchLockRef.current = true;
      nearJarRef.current = null;
      nearSinceRef.current = null;
      setChargingJar(null);
      setChargeProgress(0);

      const answers = currentQuestion.answers;
      const isCorrect = !!answers[answerIndex]?.correct;
      mcq.confirmSelection(qId, answers, [answerIndex]);
      finishAnswer(isCorrect);
    },
    [currentQuestion, mcq, finishAnswer]
  );

  pickJarRef.current = pickJar;

  const handleJarClick = useCallback(
    (answerIndex) => {
      pickJar(answerIndex);
    },
    [pickJar]
  );

  useEffect(() => {
    const tick = () => {
      if (!lockedRef.current) {
        const player = playerRef.current;
        const move = moveRef.current;

        if (flyingRef.current) {
          player.vy += FLY_FORCE;
          if (jumpSoundRef.current && player.vy < -0.05) {
            /* jetpack continuous — no spam */
          }
        } else {
          player.vy += GRAVITY;
        }

        if (move.left) player.vx = -MOVE_SPEED;
        else if (move.right) player.vx = MOVE_SPEED;
        else player.vx *= 0.8;

        resolvePlatformCollisions(player, PLATFORMS);

        const hidden = getHiddenIndices(currentQuestion?.id);
        const nearest = findNearestJar(player, jarLayout, hidden);
        const now = performance.now();

        if (nearest && !jarTouchLockRef.current) {
          if (nearJarRef.current !== nearest.answerIndex) {
            nearJarRef.current = nearest.answerIndex;
            nearSinceRef.current = now;
          }
          const elapsed = now - (nearSinceRef.current ?? now);
          const progress = Math.min(1, elapsed / JAR_PICK_MS);
          if (now - chargeUiTickRef.current > 50) {
            chargeUiTickRef.current = now;
            setChargingJar(nearest.answerIndex);
            setChargeProgress(progress);
          }
          if (elapsed >= JAR_PICK_MS) {
            pickJarRef.current?.(nearest.answerIndex);
          }
        } else if (nearJarRef.current !== null) {
          nearJarRef.current = null;
          nearSinceRef.current = null;
          setChargingJar(null);
          setChargeProgress(0);
        }

        setPlayerPos({ x: player.x, y: player.y });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [jarLayout, currentQuestion?.id, getHiddenIndices]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "ArrowLeft") moveRef.current.left = true;
      if (e.code === "ArrowRight") moveRef.current.right = true;
      if (e.code === "Space") {
        e.preventDefault();
        flyingRef.current = true;
        setIsFlying(true);
      }
      if (e.code === "Enter" && nearJarRef.current !== null) {
        e.preventDefault();
        pickJarRef.current?.(nearJarRef.current);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "ArrowLeft") moveRef.current.left = false;
      if (e.code === "ArrowRight") moveRef.current.right = false;
      if (e.code === "Space") {
        flyingRef.current = false;
        setIsFlying(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function resetGame() {
    setShuffleSeed((s) => s + 1);
    setCurrent(0);
    setShowResult(false);
    setLocked(false);
    lockedRef.current = false;
    setLevelTransition(false);
    setReviewState(null);
    jarTouchLockRef.current = false;
    nearJarRef.current = null;
    nearSinceRef.current = null;
    setChargingJar(null);
    setChargeProgress(0);
    setCorrectCount(0);
    mcq.resetAll();
    resetHints();
    resetPlayer();
  }

  const gameShellStyle = {
    width: "100%",
    maxWidth: "100%",
    height: "calc(100vh - var(--navbar-height, 76px))",
    position: "relative",
    boxSizing: "border-box",
  };

  if (!gameQuestions.length) {
    return (
      <div style={{ textAlign: "center", marginTop: 100, color: "white" }}>
        Không có câu hỏi nào!
      </div>
    );
  }

  if (showResult) {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={correctCount}
        totalQuestions={totalQuestions}
        onReplay={resetGame}
        shellStyle={gameShellStyle}
        fullBleed
      />
    );
  }

  const questionImageSrc = currentQuestion.question_image
    ? questionImageUrl(currentQuestion.question_image) || null
    : null;

  const qId = currentQuestion.id;

  return (
    <div className="game3-play">
      <style>{`
        .game3-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          background: #0a1847;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          font-family: inherit;
        }

        .game3-quiz {
          flex: 0 0 40%;
          width: 40%;
          max-width: 40%;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #1e3c72 0%, #152a52 100%);
          border-right: 3px solid rgba(74, 144, 226, 0.45);
          overflow: hidden;
          box-sizing: border-box;
        }

        .game3-scene-wrap {
          flex: 0 0 60%;
          width: 60%;
          max-width: 60%;
          min-width: 0;
          height: 100%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          box-sizing: border-box;
        }

        .game3-question-section {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: clamp(10px, 1.5vh, 14px) clamp(10px, 1.2vw, 14px);
          box-sizing: border-box;
          overflow-y: auto;
        }

        .game3-question-block {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .game3-question-panel {
          flex-shrink: 0;
          width: 100%;
          padding: 10px 14px;
          border-radius: 14px 14px 0 0;
          background: rgba(245, 240, 225, 0.97);
          border: 2px solid rgba(74, 144, 226, 0.55);
          border-bottom: none;
          box-sizing: border-box;
        }
        .game3-question-panel--solo {
          border-bottom: 2px solid rgba(74, 144, 226, 0.55);
          border-radius: 14px;
        }

        .game3-question-head {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .game3-question-index {
          flex-shrink: 0;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(74, 144, 226, 0.15);
          border: 1px solid rgba(74, 144, 226, 0.45);
          color: #1565c0;
          font-size: clamp(0.72rem, 2vw, 0.82rem);
          font-weight: 800;
          line-height: 1.3;
          white-space: nowrap;
        }

        .game3-question-text {
          margin: 0;
          flex: 1;
          min-width: 0;
          font-size: clamp(0.95rem, 2.5vw, 1.15rem);
          font-weight: 700;
          color: #1a2370;
          line-height: 1.45;
          text-align: left;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .game3-question-image-wrap {
          flex: 1;
          min-height: clamp(100px, 22vh, 220px);
          width: 100%;
          padding: 8px 12px 10px;
          border-radius: 0 0 14px 14px;
          background: #fff;
          border: 2px solid rgba(74, 144, 226, 0.45);
          border-top: 1px solid rgba(74, 144, 226, 0.2);
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .game3-question-image-wrap > button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .game3-question-image-wrap img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .game3-hint-wrap {
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          margin: 8px auto 0;
        }
        .game3-hint-wrap button {
          background: rgba(0, 0, 0, 0.35) !important;
          border: 2px solid rgba(74, 144, 226, 0.7) !important;
          color: #fff !important;
        }

        .game3-actions {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: clamp(8px, 1.5vh, 12px) clamp(12px, 2vw, 16px) clamp(10px, 2vh, 14px);
        }

        .game3-quiz-tip {
          flex-shrink: 0;
          padding: 0 clamp(12px, 2vw, 16px) clamp(10px, 2vh, 14px);
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.65);
          text-align: center;
          line-height: 1.35;
        }

        .game3-arena {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }

        .game3-stars {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }
        .game3-star {
          position: absolute;
          border-radius: 50%;
          background: #fff;
          animation: game3-twinkle 2.4s ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }
        @keyframes game3-twinkle {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }

        .game3-platform {
          position: absolute;
          z-index: 2;
          pointer-events: none;
          object-fit: fill;
          object-position: left top;
          image-rendering: pixelated;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
        }

        .game3-player {
          position: absolute;
          z-index: 5;
          transform: translate(-50%, -100%);
          pointer-events: none;
        }
        .game3-player img {
          width: clamp(36px, 5.5vw, 52px);
          height: auto;
          display: block;
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.45));
        }
        .game3-player--fly img {
          filter: drop-shadow(0 0 8px rgba(100, 200, 255, 0.7));
        }

        .game3-jar {
          position: absolute;
          z-index: 4;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          max-width: 24%;
          isolation: isolate;
        }
        .game3-jar:disabled { cursor: default; }
        .game3-jar__img {
          width: clamp(38px, 6.5vw, 56px);
          height: auto;
          display: block;
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
          animation: game3-jar-float 2s ease-in-out infinite;
        }
        @keyframes game3-jar-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .game3-jar__label {
          font-size: clamp(0.65rem, 1.8vw, 0.82rem);
          font-weight: 800;
          color: #fff;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
          text-align: center;
          line-height: 1.2;
          overflow-wrap: anywhere;
          word-break: break-word;
          max-width: 100%;
        }
        .game3-jar--selected .game3-jar__img {
          filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.95));
        }
        .game3-jar--correct .game3-jar__img {
          filter: drop-shadow(0 0 12px rgba(102, 187, 106, 0.95));
        }
        .game3-jar--wrong .game3-jar__img {
          filter: drop-shadow(0 0 12px rgba(239, 83, 80, 0.95));
        }
        .game3-jar--dim { opacity: 0.35; }
        .game3-jar--charging .game3-jar__ring {
          opacity: 1;
        }
        .game3-jar__ring {
          position: absolute;
          inset: -6px -10px auto -10px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.25);
          opacity: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .game3-jar__ring-fill {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #ffd700, #ff9800);
          border-radius: inherit;
          transition: width 0.05s linear;
        }

        .game3-hud {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 20;
          display: flex;
          gap: 6px;
        }
        .game3-hud__item {
          background: rgba(0, 0, 0, 0.55);
          padding: 5px 9px;
          border-radius: 8px;
          border: 1px solid rgba(74, 144, 226, 0.7);
          color: #fff;
          font-size: clamp(10px, 1.8vw, 12px);
          font-weight: bold;
        }

        .game3-mobile-controls {
          position: absolute;
          bottom: 12px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: clamp(16px, 4vw, 28px);
          z-index: 25;
          padding: 0 12px;
        }
        .game3-mobile-controls button {
          background: rgba(0, 0, 0, 0.6);
          border: 2px solid #4a90e2;
          color: white;
          font-size: clamp(20px, 5vw, 28px);
          padding: 12px 20px;
          border-radius: 14px;
          cursor: pointer;
          touch-action: manipulation;
          user-select: none;
        }
        .game3-mobile-controls button:active {
          transform: scale(0.92);
          background: rgba(74, 144, 226, 0.85);
        }
        @media (min-width: 900px) {
          .game3-mobile-controls { display: none; }
        }

        .game3-instructions {
          position: absolute;
          bottom: 10px;
          left: 10px;
          z-index: 6;
          color: rgba(255, 255, 255, 0.65);
          font-size: 11px;
          pointer-events: none;
          line-height: 1.35;
        }
        @media (max-width: 899px) {
          .game3-instructions { display: none; }
        }

        .game3-overlay {
          position: absolute;
          inset: 0;
          z-index: 40;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.78);
          color: #fff;
          text-align: center;
          padding: 16px;
        }
        .game3-overlay__title {
          font-size: clamp(1.2rem, 4.5vw, 1.8rem);
          font-weight: 900;
          margin: 0 0 8px;
          color: #ffeb3b;
        }
        .game3-overlay__title--wrong { color: #ff8a80; }
        .game3-overlay--light {
          background: rgba(0, 0, 0, 0.35);
          align-items: flex-start;
          padding-top: 16%;
        }
        .game3-overlay__sub {
          margin: 0;
          font-size: clamp(0.9rem, 2.8vw, 1.05rem);
          color: #eee;
        }

        @media (max-width: 768px) {
          .game3-play {
            flex-direction: column;
          }
          .game3-quiz {
            flex: 0 0 40%;
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 40%;
            border-right: none;
            border-bottom: 3px solid rgba(74, 144, 226, 0.45);
          }
          .game3-scene-wrap {
            flex: 1 1 60%;
            width: 100%;
            max-width: 100%;
            min-height: 0;
          }
        }
      `}</style>

      <audio ref={correctSoundRef} src={`${publicUrl}/game-noises/dung.mp3`} preload="auto" />
      <audio ref={wrongSoundRef} src={`${publicUrl}/game-noises/wrong.mp3`} preload="auto" />
      <audio ref={jumpSoundRef} src={`${publicUrl}/game-noises/jump.mp3`} preload="auto" />

      <div className="game3-quiz">
        <div className="game3-question-section">
          <div className="game3-question-block">
            <div
              className={`game3-question-panel${
                questionImageSrc ? "" : " game3-question-panel--solo"
              }`}
            >
              <div className="game3-question-head">
                <span className="game3-question-index">
                  Câu {current + 1}/{totalQuestions}
                </span>
                <p className="game3-question-text">{currentQuestion.question_text}</p>
              </div>
            </div>
            {questionImageSrc && (
              <div className="game3-question-image-wrap">
                <GameQuestionImageZoom
                  src={questionImageSrc}
                  onThumbError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = "none";
                  }}
                  thumbStyle={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            )}
          </div>

          {hasHintFeature && (
            <div className="game3-hint-wrap">
              <GameHintButton
                hintsRemaining={hintsRemaining}
                disabled={locked || !canUseHint(qId, currentQuestion.answers)}
                onUse={() => applyHint(qId, currentQuestion.answers)}
                style={{ margin: 0 }}
              />
            </div>
          )}
        </div>

        <p className="game3-quiz-tip">
          Đứng cạnh lọ 2 giây hoặc bấm Enter để nhặt · Click lọ nhặt ngay
        </p>
      </div>

      <div className="game3-scene-wrap">
        <div className="game3-arena">
          <div className="game3-stars" aria-hidden>
            {STARS.map((s) => (
              <span
                key={s.id}
                className="game3-star"
                style={{
                  left: s.left,
                  top: s.top,
                  width: s.size,
                  height: s.size,
                  "--delay": s.delay,
                }}
              />
            ))}
          </div>

          {PLATFORMS.map((p, i) => (
            <img
              key={i}
              className="game3-platform"
              src={p.type === 1 ? platform1Img : platform2Img}
              alt=""
              draggable={false}
              style={platformVisualBox(p)}
              aria-hidden
            />
          ))}

          {jarLayout.map((jar) => {
            if (getHiddenIndices(qId).has(jar.answerIndex)) return null;

            const pending = mcq.getPendingIndices(qId);
            const confirmed = mcq.getConfirmedIndices(qId);
            const vis = getMcqAnswerVisualState(
              pending,
              confirmed,
              jar.answerIndex,
              jar.answer
            );

            let stateClass = "";
            if (!vis.locked && chargingJar === jar.answerIndex) {
              stateClass = "game3-jar--charging";
            }
            if (!vis.locked && vis.isSelected) {
              stateClass = `${stateClass} game3-jar--selected`.trim();
            } else if (vis.locked) {
              if (vis.tone === "correct" || vis.tone === "missed") {
                stateClass = "game3-jar--correct";
              } else if (vis.tone === "wrong") {
                stateClass = "game3-jar--wrong";
              } else {
                stateClass = "game3-jar--dim";
              }
            }

            return (
              <button
                key={jar.answerIndex}
                type="button"
                className={`game3-jar ${stateClass}`}
                style={{ left: pctX(jar.x), top: pctY(jar.y) }}
                onClick={() => handleJarClick(jar.answerIndex)}
                disabled={locked}
                title={displayAnswerText(jar.answer.text)}
              >
                <span className="game3-jar__ring" aria-hidden>
                  <span
                    className="game3-jar__ring-fill"
                    style={{
                      width: `${chargingJar === jar.answerIndex ? chargeProgress * 100 : 0}%`,
                    }}
                  />
                </span>
                <img className="game3-jar__img" src={itemImg} alt="" draggable={false} />
                <span className="game3-jar__label">
                  {displayAnswerText(jar.answer.text)}
                </span>
              </button>
            );
          })}

          <div
            className={`game3-player${isFlying ? " game3-player--fly" : ""}`}
            style={{ left: pctX(playerPos.x), top: pctY(playerPos.y) }}
            aria-hidden
          >
            <img src={phihanhgiaImg} alt="" draggable={false} />
          </div>

          <div className="game3-hud">
            <div className="game3-hud__item">🏆 {correctCount}/{totalQuestions}</div>
            <div className="game3-hud__item">🚀 {current + 1}</div>
          </div>

          <div className="game3-instructions">
            ⬅️ ➡️ Di chuyển · SPACE Bay · Cạnh lọ 2s / Enter nhặt
          </div>

          <div className="game3-mobile-controls">
            <button
              type="button"
              aria-label="Trái"
              onTouchStart={() => { moveRef.current.left = true; }}
              onTouchEnd={() => { moveRef.current.left = false; }}
              onMouseDown={() => { moveRef.current.left = true; }}
              onMouseUp={() => { moveRef.current.left = false; }}
              onMouseLeave={() => { moveRef.current.left = false; }}
            >
              ⬅️
            </button>
            <button
              type="button"
              aria-label="Bay"
              onTouchStart={() => { flyingRef.current = true; setIsFlying(true); }}
              onTouchEnd={() => { flyingRef.current = false; setIsFlying(false); }}
              onMouseDown={() => { flyingRef.current = true; setIsFlying(true); }}
              onMouseUp={() => { flyingRef.current = false; setIsFlying(false); }}
              onMouseLeave={() => { flyingRef.current = false; setIsFlying(false); }}
            >
              🚀
            </button>
            <button
              type="button"
              aria-label="Phải"
              onTouchStart={() => { moveRef.current.right = true; }}
              onTouchEnd={() => { moveRef.current.right = false; }}
              onMouseDown={() => { moveRef.current.right = true; }}
              onMouseUp={() => { moveRef.current.right = false; }}
              onMouseLeave={() => { moveRef.current.right = false; }}
            >
              ➡️
            </button>
          </div>

          {levelTransition && (
            <div className="game3-overlay">
              <h2 className="game3-overlay__title">🎉 Nhặt đúng lọ! 🎉</h2>
              <p className="game3-overlay__sub">Chuẩn bị câu tiếp theo...</p>
            </div>
          )}

          {reviewState === "wrong" && !levelTransition && (
            <div className="game3-overlay game3-overlay--light">
              <h2 className="game3-overlay__title game3-overlay__title--wrong">Sai rồi!</h2>
              <p className="game3-overlay__sub">Xem đáp án đúng rồi sang câu tiếp...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
