// Game 10: bắn bóng bay bằng súng cao su — kéo dây để ngắm & bắn
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import GameHintButton from "./GameHintButton";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { useLessonHints } from "../lib/useLessonHints";
import { prepareSessionQuestions, getAnswerLabel } from "../lib/lessonQuestions";
import { useGameMcqSelection } from "../lib/useGameMcqSelection";
import game10BackIcon from "../../assets/game-images/back.png";
import game10RestartIcon from "../../assets/game-images/restart.png";
import game10MusicOnIcon from "../../assets/game-images/music_on.png";
import game10MusicOffIcon from "../../assets/game-images/music-off.png";
import game10SoundOnIcon from "../../assets/game-images/sound_on.png";
import game10SoundOffIcon from "../../assets/game-images/sound-off.png";
import game10CoinIcon from "../../assets/game-images/coin.png";
import game10Balloon1 from "../../assets/game-images/game10/ballon1.png";
import game10Balloon4 from "../../assets/game-images/game10/ballon4.png";
import game10Balloon2 from "../../assets/game-images/game10/balloon2.png";
import game10Balloon3 from "../../assets/game-images/game10/balloon3.png";
import game10Dart from "../../assets/game-images/game10/dart.png";
import game10ExplodeFx from "../../assets/game-images/game10/explode.png";
import game10PopFx from "../../assets/game-images/game10/pop.png";
import game10Background from "../../assets/game-images/game10/background.png";
import game10Clouds from "../../assets/game-images/game10/clouds.png";
import game10ShootSfx from "../../assets/game-images/game10/shoot.mp3";
import game10PopSfx from "../../assets/game-images/game10/pop.mp3";
import game10BoomSfx from "../../assets/game-images/game10/boom.mp3";
import game10LoadSfx from "../../assets/game-images/game10/bulletLoad.mp3";

const BALLOON_IMGS = [game10Balloon1, game10Balloon4, game10Balloon2, game10Balloon3];

const MIN_PULL = 32;
const MAX_PULL = 150;
const POWER = 0.26;
const GRAVITY = 0.18;
const HORIZONTAL_BOOST = 1.2;
const PROJECTILE_R = 14;

function balloonImg(i) {
  return BALLOON_IMGS[i % BALLOON_IMGS.length];
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function clampPull(len) {
  return Math.max(MIN_PULL, Math.min(MAX_PULL, len));
}

function getSlingshotGeometry(w, h) {
  const s = Math.min(w, h);
  const foot = { x: w * 0.84, y: h * 0.84 };
  const neck = { x: w * 0.84, y: h * 0.735 };
  const leftTip = { x: neck.x - s * 0.058, y: neck.y - s * 0.1 };
  const rightTip = { x: neck.x + s * 0.052, y: neck.y - s * 0.092 };
  const rest = { x: neck.x - s * 0.01, y: neck.y - s * 0.042 };
  return {
    foot,
    neck,
    leftTip,
    rightTip,
    rest,
    hitRadius: s * 0.12,
  };
}

function slingshotBodyPath(g, s) {
  const bw = s * 0.026;
  const nw = s * 0.013;
  const { foot, neck, leftTip, rightTip } = g;
  return [
    `M ${foot.x - bw} ${foot.y}`,
    `L ${foot.x + bw} ${foot.y}`,
    `L ${neck.x + nw} ${neck.y + nw * 0.35}`,
    `L ${rightTip.x} ${rightTip.y}`,
    `L ${neck.x} ${neck.y - nw * 0.45}`,
    `L ${leftTip.x} ${leftTip.y}`,
    `L ${neck.x - nw} ${neck.y + nw * 0.35}`,
    "Z",
  ].join(" ");
}

function clampPouchDrag(rest, point, maxPull) {
  const dx = point.x - rest.x;
  const dy = point.y - rest.y;
  const len = Math.hypot(dx, dy);
  if (len <= maxPull || len === 0) return point;
  return {
    x: rest.x + (dx / len) * maxPull,
    y: rest.y + (dy / len) * maxPull,
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

export default function Game10({ payload, onLessonComplete }) {
  const navigate = useNavigate();
  const questions = payload?.questions || [];

  const mcq = useGameMcqSelection();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scorePops, setScorePops] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | aiming | flying | hit | wrong
  const [drag, setDrag] = useState(null);
  const [projectile, setProjectile] = useState(null);
  const [hitEffect, setHitEffect] = useState(null);
  const [arenaSize, setArenaSize] = useState({ w: 800, h: 500 });

  const arenaRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const scorePopIdRef = useRef(0);
  const animRef = useRef(null);
  const projectileRef = useRef(null);
  const balloonRectsRef = useRef([]);
  const timersRef = useRef([]);
  const gameEndedRef = useRef(false);
  const shootSoundRef = useRef(null);
  const popSoundRef = useRef(null);
  const boomSoundRef = useRef(null);
  const loadSoundRef = useRef(null);

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
  const answers = currentQuestion?.answers || [];
  const hiddenIndices = getHiddenIndices(currentQuestion?.id);
  const visibleAnswers = answers
    .map((a, i) => ({ a, i }))
    .filter(({ i }) => !hiddenIndices.has(i));
  const balloonColumnClass =
    visibleAnswers.length >= 6
      ? "game10-balloon-column game10-balloon-column--compact"
      : visibleAnswers.length >= 4
        ? "game10-balloon-column game10-balloon-column--medium"
        : "game10-balloon-column";

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    gameEndedRef.current = gameEnded;
  }, [gameEnded]);

  useEffect(() => {
    shootSoundRef.current = new Audio(game10ShootSfx);
    popSoundRef.current = new Audio(game10PopSfx);
    boomSoundRef.current = new Audio(game10BoomSfx);
    loadSoundRef.current = new Audio(game10LoadSfx);
    backgroundMusicRef.current = new Audio(`${publicUrl}/music/nhac6.mp3`);
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

  function playSfx(ref) {
    if (!soundEnabled || !ref.current) return;
    ref.current.currentTime = 0;
    ref.current.play().catch(() => {});
  }

  function spawnScorePop() {
    const id = scorePopIdRef.current + 1;
    scorePopIdRef.current = id;
    setScorePops((prev) => [...prev, id]);
    const t = setTimeout(() => {
      setScorePops((prev) => prev.filter((popId) => popId !== id));
    }, 900);
    timersRef.current.push(t);
  }

  function addPoint() {
    setUserScore((s) => s + 1);
    spawnScorePop();
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

  useEffect(() => {
    setPhase("idle");
    setDrag(null);
    setProjectile(null);
    setHitEffect(null);
    projectileRef.current = null;
  }, [currentQuestionIndex]);

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return undefined;
    const update = () =>
      setArenaSize({ w: el.clientWidth || 800, h: el.clientHeight || 500 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentQuestionIndex, gameEnded]);

  useEffect(() => {
    if (gameEnded) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [gameEnded]);

  function getArenaPoint(clientX, clientY) {
    const arena = arenaRef.current;
    if (!arena) return { x: 0, y: 0, w: 1, h: 1 };
    const r = arena.getBoundingClientRect();
    return {
      x: clientX - r.left,
      y: clientY - r.top,
      w: r.width,
      h: r.height,
    };
  }

  function getSlingshotPx(w, h) {
    return getSlingshotGeometry(w, h).rest;
  }

  function refreshBalloonRects() {
    const arena = arenaRef.current;
    if (!arena) return;
    const ar = arena.getBoundingClientRect();
    balloonRectsRef.current = visibleAnswers.map((_, vi) => {
      const el = arena.querySelector(`[data-balloon-vi="${vi}"]`);
      if (!el) return null;
      const br = el.getBoundingClientRect();
      return {
        vi,
        ansIdx: visibleAnswers[vi].i,
        left: br.left - ar.left,
        top: br.top - ar.top,
        right: br.right - ar.left,
        bottom: br.bottom - ar.top,
      };
    }).filter(Boolean);
  }

  function finishGame(totalCorrect) {
    if (gameEndedRef.current) return;
    clearTimers();
    setGameEnded(true);
    onLessonComplete?.(totalCorrect);

    const userId = getUserId(payload);
    if (userId && totalCorrect > 0) {
      incrementLessonScore(userId, totalCorrect, payload).then((data) => {
        if (data?.success) {
          setUserScore(data.score);
        }
      });
    }
  }

  function goToNextQuestion(totalCorrect, questionIndex) {
    if (gameEndedRef.current) return;
    const idx = questionIndex ?? currentQuestionIndex;
    if (idx < qs.length - 1) {
      setCurrentQuestionIndex(idx + 1);
      return;
    }
    finishGame(totalCorrect);
  }

  function continueAfterWrong() {
    setHitEffect(null);
    setPhase("idle");
    const qIndex = currentQuestionIndex;
    setCorrectCount((score) => {
      goToNextQuestion(score, qIndex);
      return score;
    });
  }

  function resolveHit(ansIdx, vi) {
    const cq = qs[currentQuestionIndex];
    if (!cq || mcq.isLocked(cq.id)) return;

    const a = cq.answers[ansIdx];
    const isCorrect = !!a?.correct;

    setHitEffect({ vi, kind: isCorrect ? "pop" : "explode" });
    setPhase(isCorrect ? "hit" : "wrong");
    playSfx(isCorrect ? popSoundRef : boomSoundRef);

    if (!isCorrect) return;

    const isMultiCorrect = mcq.isMultiCorrectQuestion(cq.answers);
    if (!isMultiCorrect) {
      mcq.toggleIndex(cq.id, cq.answers, ansIdx);
    }

    let nextScore = 0;
    setCorrectCount((prev) => {
      nextScore = prev + 1;
      return nextScore;
    });
    addPoint();

    const qIndex = currentQuestionIndex;
    const t = setTimeout(() => {
      if (gameEndedRef.current) return;
      setHitEffect(null);
      setPhase("idle");
      goToNextQuestion(nextScore, qIndex);
    }, 1000);
    timersRef.current.push(t);
  }

  function fireProjectile(vx, vy) {
    const arena = arenaRef.current;
    if (!arena) return;
    const { width: w, height: h } = arena.getBoundingClientRect();
    const anchor = getSlingshotPx(w, h);
    refreshBalloonRects();

    const p = { x: anchor.x, y: anchor.y, vx, vy };
    projectileRef.current = p;
    setProjectile(p);
    setPhase("flying");

    const step = () => {
      const cur = projectileRef.current;
      if (!cur) return;

      cur.vy += GRAVITY;
      cur.x += cur.vx;
      cur.y += cur.vy;

      let hit = false;
      for (const b of balloonRectsRef.current) {
        const cx = (b.left + b.right) / 2;
        const cy = (b.top + b.bottom) / 2;
        const rx = (b.right - b.left) / 2;
        const ry = (b.bottom - b.top) / 2;
        if (
          Math.abs(cur.x - cx) < rx + PROJECTILE_R &&
          Math.abs(cur.y - cy) < ry + PROJECTILE_R
        ) {
          hit = true;
          projectileRef.current = null;
          setProjectile(null);
          resolveHit(b.ansIdx, b.vi);
          break;
        }
      }

      if (hit) return;

      if (cur.y > h + 40 || cur.x < -40 || cur.x > w + 40) {
        projectileRef.current = null;
        setProjectile(null);
        setPhase("idle");
        return;
      }

      setProjectile({ ...cur });
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
  }

  function onPointerDown(e) {
    if (gameEnded || phase === "flying" || phase === "hit" || phase === "wrong") return;
    const cq = qs[currentQuestionIndex];
    if (!cq || mcq.isLocked(cq.id)) return;
    const pt = getArenaPoint(e.clientX, e.clientY);
    const sling = getSlingshotGeometry(pt.w, pt.h);
    if (
      dist(pt.x, pt.y, sling.rest.x, sling.rest.y) > sling.hitRadius &&
      dist(pt.x, pt.y, sling.neck.x, sling.neck.y) > sling.hitRadius &&
      dist(pt.x, pt.y, sling.foot.x, sling.foot.y) > sling.hitRadius * 1.1
    ) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(clampPouchDrag(sling.rest, { x: pt.x, y: pt.y }, MAX_PULL));
    setPhase("aiming");
    playSfx(loadSoundRef);
  }

  function onPointerMove(e) {
    if (!drag || phase !== "aiming") return;
    const pt = getArenaPoint(e.clientX, e.clientY);
    const arena = arenaRef.current;
    if (!arena) return;
    const { width: w, height: h } = arena.getBoundingClientRect();
    const { rest } = getSlingshotGeometry(w, h);
    setDrag(clampPouchDrag(rest, { x: pt.x, y: pt.y }, MAX_PULL));
  }

  function onPointerUp(e) {
    if (phase !== "aiming" || !drag) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    const arena = arenaRef.current;
    if (!arena) return;
    const { width: w, height: h } = arena.getBoundingClientRect();
    const anchor = getSlingshotPx(w, h);
    const pull = dist(drag.x, drag.y, anchor.x, anchor.y);

    setDrag(null);

    if (pull < MIN_PULL) {
      setPhase("idle");
      return;
    }

    const len = clampPull(pull);
    const nx = (anchor.x - drag.x) / pull;
    const ny = (anchor.y - drag.y) / pull;
    const vx = nx * len * POWER * HORIZONTAL_BOOST;
    const vy = ny * len * POWER;

    playSfx(shootSoundRef);
    fireProjectile(vx, vy);
  }

  function restartGame() {
    clearTimers();
    setShuffleSeed((s) => s + 1);
    setGameEnded(false);
    setCurrentQuestionIndex(0);
    mcq.resetAll();
    setCorrectCount(0);
    setUserScore(payload?.user?.score ?? 0);
    setScorePops([]);
    setPhase("idle");
    resetHints();
    if (musicEnabled && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(() => {});
    }
  }

  function handleComeback() {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
    navigate("/lessons", { replace: true });
  }

  if (qs.length === 0) {
    return <div style={{ padding: 20, textAlign: "center" }}>Không có câu hỏi</div>;
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
    return (
      <div style={{ padding: 20, textAlign: "center" }}>Không có câu hỏi nào!</div>
    );
  }

  const canAim =
    !mcq.isLocked(currentQuestion.id) &&
    phase !== "wrong" &&
    (phase === "idle" || phase === "aiming");

  const slingshot = getSlingshotGeometry(arenaSize.w, arenaSize.h);
  const pouchPos =
    phase === "aiming" && drag ? drag : slingshot.rest;
  const showPouchDart = phase !== "flying";
  const bandPull = dist(pouchPos.x, pouchPos.y, slingshot.rest.x, slingshot.rest.y);
  const bandTension = Math.min(1, bandPull / MAX_PULL);

  return (
    <div className="game10-play">
      <style>{`
        .game10-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          font-family: inherit;
          user-select: none;
          touch-action: none;
        }
        .game10-bg {
          position: absolute;
          inset: 0;
          background-image: url(${game10Background});
          background-repeat: no-repeat;
          background-position: center center;
          background-size: cover;
          pointer-events: none;
          z-index: 0;
        }
        .game10-clouds {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }
        .game10-clouds-track {
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          width: 200%;
          height: 52%;
          animation: game10-clouds-drift 52s linear infinite;
        }
        .game10-clouds-track img {
          flex: 0 0 50%;
          width: 50%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          opacity: 0.9;
        }
        @keyframes game10-clouds-drift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .game10-top-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          padding: 2px clamp(6px, 1.2vw, 10px) 0;
          box-sizing: border-box;
          pointer-events: none;
        }
        .game10-top-bar > * {
          pointer-events: auto;
        }
        .game10-hud {
          position: relative;
          z-index: 1;
        }
        .game10-hud-controls {
          display: flex;
          align-items: flex-start;
          flex-wrap: nowrap;
          gap: clamp(4px, 1vw, 6px);
        }
        .game10-hud-btn {
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          line-height: 0;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
        }
        .game10-hud-btn img {
          display: block;
          width: clamp(36px, 7vw, 48px);
          height: clamp(36px, 7vw, 48px);
          object-fit: contain;
        }
        .game10-question-block {
          position: absolute;
          top: 2px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 0;
          width: min(640px, 88%);
          max-width: calc(100% - clamp(240px, 32vw, 300px));
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
          pointer-events: auto;
        }
        .game10-question-panel {
          width: 100%;
          padding: 6px 12px;
          border-radius: 14px 14px 0 0;
          background: rgba(255,255,255,0.92);
          border: 2px solid rgba(126, 87, 194, 0.35);
          border-bottom: none;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          box-sizing: border-box;
        }
        .game10-question-panel--solo {
          border-bottom: 2px solid rgba(126, 87, 194, 0.35);
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        .game10-question-text {
          margin: 0;
          font-size: clamp(0.9rem, 2.4vw, 1.1rem);
          font-weight: 700;
          color: #37474f;
          line-height: 1.35;
          text-align: left;
        }
        .game10-question-image-wrap {
          width: 100%;
          padding: 8px 12px 10px;
          border-radius: 0 0 14px 14px;
          background: #fff;
          border: 2px solid rgba(126, 87, 194, 0.35);
          border-top: 1px solid rgba(126, 87, 194, 0.15);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game10-question-image-wrap img {
          display: block;
          max-width: 100%;
          max-height: min(22vh, 160px);
          margin: 0 auto;
          object-fit: contain;
        }
        .game10-score-wrap {
          position: relative;
          display: flex;
          align-items: center;
          align-self: flex-start;
          flex-shrink: 0;
          margin-left: 2px;
        }
        .game10-stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          height: clamp(36px, 7vw, 48px);
          box-sizing: border-box;
          padding: 0 12px 0 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          border: 2px solid #7e57c2;
          font-weight: 800;
          font-size: clamp(0.85rem, 2.1vw, 1rem);
          color: #5e35b1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          min-width: 72px;
          justify-content: center;
          line-height: 1;
        }
        .game10-stat-pill img.coin {
          width: clamp(30px, 6vw, 40px);
          height: clamp(30px, 6vw, 40px);
          object-fit: contain;
          flex-shrink: 0;
        }
        .game10-score-pop {
          position: absolute;
          left: calc(100% + 4px);
          top: 50%;
          color: #2e7d32;
          font-weight: 800;
          font-size: clamp(0.85rem, 2.2vw, 1.05rem);
          text-shadow: 0 1px 2px rgba(255,255,255,0.8);
          animation: game10-pop-rise 0.9s ease-out forwards;
          pointer-events: none;
          white-space: nowrap;
        }
        @keyframes game10-pop-rise {
          0% { opacity: 0; transform: translateY(-50%) scale(0.5); }
          15% { opacity: 1; transform: translateY(-50%) scale(1.15); }
          50% { opacity: 1; transform: translateY(-90%) scale(1); }
          100% { opacity: 0; transform: translateY(-140%) scale(0.95); }
        }
        .game10-arena {
          position: absolute;
          inset: 0;
          z-index: 10;
        }
        .game10-balloon-column {
          position: absolute;
          left: clamp(6px, 2.5vw, 18px);
          top: clamp(110px, 18vh, 150px);
          bottom: clamp(44px, 9vh, 68px);
          width: clamp(92px, 21vw, 128px);
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
          align-items: center;
          z-index: 12;
          pointer-events: none;
        }
        .game10-balloon-column--medium .game10-balloon {
          width: clamp(58px, 12vw, 76px);
          height: clamp(70px, 14vw, 92px);
        }
        .game10-balloon-column--medium .game10-balloon-label {
          font-size: clamp(0.72rem, 1.8vw, 0.88rem);
        }
        .game10-balloon-column--compact .game10-balloon {
          width: clamp(50px, 10vw, 66px);
          height: clamp(62px, 12vw, 80px);
        }
        .game10-balloon-column--compact .game10-balloon-label {
          font-size: clamp(0.65rem, 1.6vw, 0.78rem);
          margin-top: 4px;
        }
        .game10-balloon {
          position: relative;
          flex: 0 0 auto;
          width: clamp(64px, 14vw, 88px);
          height: clamp(78px, 16vw, 104px);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
        }
        .game10-balloon img.bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }
        .game10-balloon-label {
          position: relative;
          z-index: 1;
          font-weight: 800;
          font-size: clamp(0.85rem, 2.2vw, 1.05rem);
          color: #fff;
          text-shadow: 0 1px 4px rgba(0,0,0,0.65);
          text-align: center;
          padding: 0 6px;
          margin-top: 8px;
          max-width: 100%;
          line-height: 1.2;
        }
        .game10-balloon-label img {
          max-height: 40px;
          max-width: 100%;
          object-fit: contain;
        }
        .game10-balloon--selected {
          filter: drop-shadow(0 0 8px #ffd54f);
        }
        .game10-hit-fx {
          position: absolute;
          inset: -8px;
          width: calc(100% + 16px);
          height: calc(100% + 16px);
          object-fit: contain;
          z-index: 3;
          pointer-events: none;
        }
        .game10-trajectory {
          position: absolute;
          inset: 0;
          z-index: 14;
          pointer-events: none;
          overflow: visible;
        }
        .game10-slingshot-layer {
          position: absolute;
          inset: 0;
          z-index: 15;
          pointer-events: none;
          overflow: visible;
        }
        .game10-rubber-band {
          stroke-linecap: round;
        }
        .game10-rubber-band--left,
        .game10-rubber-band--right {
          stroke: #7a2e28;
        }
        .game10-slingshot-body {
          fill: #6d4c41;
          stroke: #4e342e;
          stroke-width: 2;
          stroke-linejoin: round;
          filter: drop-shadow(1px 3px 3px rgba(0,0,0,0.28));
        }
        .game10-slingshot-body-shine {
          fill: none;
          stroke: rgba(255,255,255,0.22);
          stroke-width: 2.5;
          stroke-linecap: round;
        }
        .game10-pouch {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 16;
          width: clamp(44px, 9vw, 58px);
          height: clamp(44px, 9vw, 58px);
          cursor: grab;
          pointer-events: auto;
        }
        .game10-pouch:active { cursor: grabbing; }
        .game10-pouch-leather {
          position: absolute;
          inset: 0;
          border-radius: 50% 50% 42% 42%;
          background: linear-gradient(180deg, #a1887f 0%, #6d4c41 100%);
          border: 2px solid #4e342e;
          box-shadow: inset 0 -3px 6px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.25);
        }
        .game10-pouch img {
          position: absolute;
          left: 50%;
          top: 36%;
          width: 68%;
          height: 68%;
          transform: translate(-50%, -50%);
          object-fit: contain;
          pointer-events: none;
        }
        .game10-projectile {
          position: absolute;
          width: clamp(34px, 7vw, 46px);
          height: clamp(34px, 7vw, 46px);
          transform: translate(-50%, -50%);
          z-index: 16;
          pointer-events: none;
        }
        .game10-projectile img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: none;
        }
        .game10-aim-preview {
          stroke: rgba(255,255,255,0.35);
          stroke-width: 2;
          stroke-dasharray: 6 5;
          fill: none;
        }
        .game10-hint-wrap {
          position: absolute;
          bottom: clamp(10px, 2vh, 16px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 22;
        }
        .game10-aim-hint {
          position: absolute;
          bottom: clamp(10px, 2vh, 16px);
          right: clamp(10px, 2vw, 16px);
          z-index: 22;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(0,0,0,0.45);
          color: #fff;
          font-size: clamp(0.72rem, 1.8vw, 0.85rem);
          font-weight: 600;
        }
        .game10-continue-wrap {
          position: absolute;
          bottom: clamp(12px, 2.5vh, 20px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 40;
        }
        .game10-continue-btn {
          padding: 12px 32px;
          border: none;
          border-radius: 24px;
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: #fff;
          font-weight: 700;
          font-size: clamp(0.9rem, 2.2vw, 1rem);
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }
        .game10-continue-btn:hover {
          filter: brightness(1.05);
        }
        @media (max-width: 640px) {
          .game10-question-block {
            position: relative;
            top: auto;
            left: auto;
            transform: none;
            width: min(94%, 640px);
            max-width: 100%;
            margin: 4px auto 0;
          }
          .game10-balloon-column {
            top: clamp(100px, 17vh, 140px);
            width: clamp(80px, 24vw, 108px);
          }
          .game10-question-panel {
            padding: 5px 8px;
          }
          .game10-question-text {
            font-size: clamp(0.85rem, 2.2vw, 1rem);
          }
          .game10-question-image-wrap {
            padding: 6px 8px 8px;
          }
          .game10-question-image-wrap img {
            max-height: min(14vh, 110px);
          }
        }
      `}</style>

      <div className="game10-bg" aria-hidden />
      <div className="game10-clouds" aria-hidden>
        <div className="game10-clouds-track">
          <img src={game10Clouds} alt="" draggable={false} />
          <img src={game10Clouds} alt="" draggable={false} />
        </div>
      </div>

      <div className="game10-top-bar">
        <div className="game10-hud">
          <div className="game10-hud-controls">
            <button
              type="button"
              className="game10-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={handleComeback}
              aria-label="Quay lại"
            >
              <img src={game10BackIcon} alt="" />
            </button>
            <button
              type="button"
              className="game10-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={toggleMusic}
              aria-label={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}
            >
              <img src={musicEnabled ? game10MusicOnIcon : game10MusicOffIcon} alt="" />
            </button>
            <button
              type="button"
              className="game10-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={toggleSound}
              aria-label={soundEnabled ? "Tắt tiếng" : "Bật tiếng"}
            >
              <img src={soundEnabled ? game10SoundOnIcon : game10SoundOffIcon} alt="" />
            </button>
            <button
              type="button"
              className="game10-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={restartGame}
              aria-label="Chơi lại"
            >
              <img src={game10RestartIcon} alt="" />
            </button>
            <div className="game10-score-wrap">
              <div className="game10-stat-pill" title="Thành tích">
                <img className="coin" src={game10CoinIcon} alt="" />
                {userScore}
              </div>
              {scorePops.map((id) => (
                <span key={id} className="game10-score-pop">
                  +1
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="game10-question-block">
          <div
            className={`game10-question-panel${currentQuestion.question_image ? "" : " game10-question-panel--solo"}`}
          >
            <p className="game10-question-text">{currentQuestion.question_text}</p>
          </div>

          {currentQuestion.question_image && (
            <div className="game10-question-image-wrap">
              <GameQuestionImageZoom
                src={questionImageUrl(currentQuestion.question_image) || undefined}
                thumbStyle={{
                  maxWidth: "100%",
                  maxHeight: "min(22vh, 160px)",
                  display: "block",
                  margin: "0 auto",
                  objectFit: "contain",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {hasHintFeature && (
        <div className="game10-hint-wrap">
          <GameHintButton
            hintsRemaining={hintsRemaining}
            disabled={
              mcq.isLocked(currentQuestion.id) ||
              phase === "flying" ||
              phase === "hit" ||
              phase === "wrong" ||
              !canUseHint(currentQuestion.id, currentQuestion.answers)
            }
            onUse={() => applyHint(currentQuestion.id, currentQuestion.answers)}
          />
        </div>
      )}

      {canAim && (
        <div className="game10-aim-hint">Kéo dây cao su để ngắm &amp; bắn</div>
      )}

      {phase === "wrong" && (
        <div className="game10-continue-wrap">
          <button type="button" className="game10-continue-btn" onClick={continueAfterWrong}>
            Tiếp tục
          </button>
        </div>
      )}

      <div
        ref={arenaRef}
        className="game10-arena"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {visibleAnswers.length > 0 && (
          <div className={balloonColumnClass}>
            {visibleAnswers.map(({ a, i: ansIdx }, vi) => {
              const showFx =
                hitEffect &&
                hitEffect.vi === vi &&
                (hitEffect.kind === "pop" || hitEffect.kind === "explode");
              const fxSrc = hitEffect?.kind === "explode" ? game10ExplodeFx : game10PopFx;

              return (
                <div
                  key={`balloon-${ansIdx}`}
                  data-balloon-vi={vi}
                  className="game10-balloon"
                >
                  {!showFx && (
                    <>
                      <img className="bg" src={balloonImg(ansIdx)} alt="" draggable={false} />
                      <span className="game10-balloon-label">
                        {getAnswerLabel(ansIdx)}.{" "}
                        {a.text ||
                          (a.image ? (
                            <img src={questionImageUrl(a.image) || undefined} alt="" />
                          ) : (
                            "—"
                          ))}
                      </span>
                    </>
                  )}
                  {showFx && <img className="game10-hit-fx" src={fxSrc} alt="" draggable={false} />}
                </div>
              );
            })}
          </div>
        )}

        <div className="game10-trajectory">
          {phase === "aiming" && drag && (
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <line
                className="game10-aim-preview"
                x1={slingshot.rest.x}
                y1={slingshot.rest.y}
                x2={slingshot.rest.x + (slingshot.rest.x - drag.x) * 1.6}
                y2={slingshot.rest.y + (slingshot.rest.y - drag.y) * 1.6}
              />
            </svg>
          )}
        </div>

        <div className="game10-slingshot-layer">
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path
              className="game10-slingshot-body"
              d={slingshotBodyPath(slingshot, Math.min(arenaSize.w, arenaSize.h))}
            />
            <path
              className="game10-slingshot-body-shine"
              d={`M ${slingshot.foot.x} ${slingshot.foot.y - 4} L ${slingshot.neck.x} ${slingshot.neck.y - 6}`}
            />
            <line
              className="game10-rubber-band game10-rubber-band--left"
              x1={slingshot.leftTip.x}
              y1={slingshot.leftTip.y}
              x2={pouchPos.x}
              y2={pouchPos.y}
              strokeWidth={3.5 + bandTension * 2.5}
            />
            <line
              className="game10-rubber-band game10-rubber-band--right"
              x1={slingshot.rightTip.x}
              y1={slingshot.rightTip.y}
              x2={pouchPos.x}
              y2={pouchPos.y}
              strokeWidth={3.5 + bandTension * 2.5}
            />
          </svg>

          {showPouchDart && (
            <div
              className="game10-pouch"
              style={{ left: pouchPos.x, top: pouchPos.y }}
            >
              <div className="game10-pouch-leather" />
              <img src={game10Dart} alt="" draggable={false} />
            </div>
          )}
        </div>

        {projectile && (
          <div
            className="game10-projectile"
            style={{ left: projectile.x, top: projectile.y }}
          >
            <img src={game10Dart} alt="" draggable={false} />
          </div>
        )}
      </div>
    </div>
  );
}
