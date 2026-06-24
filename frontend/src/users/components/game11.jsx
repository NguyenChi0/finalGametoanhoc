// Game 11: Bảo vệ thành trì — học 40% | game 60% (chia ngang)
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import GameHintButton from "./GameHintButton";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { useLessonHints } from "../lib/useLessonHints";
import { prepareSessionQuestions, getAnswerLabel } from "../lib/lessonQuestions";
import { getCorrectIndices } from "../lib/questionScoring";
import {
  getMcqAnswerVisualState,
  useGameMcqSelection,
} from "../lib/useGameMcqSelection";
import game11Castle from "../../assets/game-images/game11/castle.png";
import game11Background from "../../assets/game-images/game11/backgroundgame.png";
import game11Monster1 from "../../assets/game-images/game11/monster1.png";
import game11Monster2 from "../../assets/game-images/game11/monster2.png";
import game11Monster3 from "../../assets/game-images/game11/monster3.png";
import game11Bullet from "../../assets/game-images/game11/bullet.gif";
import game11Smoke from "../../assets/game-images/game11/smoke.gif";
import game11BackIcon from "../../assets/game-images/back.png";
import game11MusicOnIcon from "../../assets/game-images/music_on.png";
import game11MusicOffIcon from "../../assets/game-images/music-off.png";
import game11SoundOnIcon from "../../assets/game-images/sound_on.png";
import game11SoundOffIcon from "../../assets/game-images/sound-off.png";
import game11RestartIcon from "../../assets/game-images/restart.png";
import game11CoinIcon from "../../assets/game-images/coin.png";

const MONSTER_SPRITES = [game11Monster1, game11Monster2, game11Monster3];
const MONSTER_MOVE_MS = 55;
const MONSTER_MOVE_STEP = 0.6;
const BULLET_TRAVEL_MS = 520;
const SMOKE_DURATION_MS = 780;
const BULLET_ROTATE_DEG = -90;
const CASTLE_FLASH_MS = 480;

const CASTLE_BOTTOM_PCT = 18;
const QUIZ_QUESTION_HEIGHT_PCT = 45;

function getArenaMetrics(w, h) {
  const castleW = Math.min(260, w * 0.36);
  const castleH = Math.min(300, h * 0.58);
  const monsterSize = Math.min(96, w * 0.12);
  const centerY = h * (1 - CASTLE_BOTTOM_PCT / 100) - castleH * 0.42;
  return {
    castleW,
    castleH,
    monsterSize,
    bulletSize: Math.min(56, w * 0.075),
    centerY,
    castleWallX: castleW - monsterSize * 0.12,
  };
}

function laneAnswerTextStyle(text) {
  const content = text || "";
  const isLong = content.length > 10;
  return {
    fontSize: isLong ? 20 : 24,
    lineHeight: 1.35,
    ...(isLong
      ? { whiteSpace: "normal", wordBreak: "break-word" }
      : { whiteSpace: "nowrap" }),
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

export default function Game11({ payload, onLessonComplete }) {
  const navigate = useNavigate();
  const questions = payload?.questions || [];

  const [current, setCurrent] = useState(0);
  const [locked, setLocked] = useState(false);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const mcq = useGameMcqSelection();
  const [gameScreen, setGameScreen] = useState("playing");
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [scorePops, setScorePops] = useState([]);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const {
    hintsRemaining,
    hasHintFeature,
    canUseHint,
    applyHint,
    getHiddenIndices,
    resetHints,
  } = useLessonHints(payload);

  const [monsterX, setMonsterX] = useState(null);
  const [monsterVariant, setMonsterVariant] = useState(0);
  const [isAlive, setIsAlive] = useState(true);
  const [showSmoke, setShowSmoke] = useState(false);
  const [smokePos, setSmokePos] = useState(null);
  const [bulletProgress, setBulletProgress] = useState(null);
  const [arenaSize, setArenaSize] = useState({ w: 800, h: 400 });
  const [castleFlash, setCastleFlash] = useState(false);
  const [forceRevealWrong, setForceRevealWrong] = useState(false);

  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const arenaRef = useRef(null);
  const moveIntervalRef = useRef(null);
  const scorePopIdRef = useRef(0);
  const finishedRef = useRef(false);
  const castleHitTriggeredRef = useRef(false);

  const gameQuestions = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );
  const currentQuestion = gameQuestions[current];

  const stopControlPointer = (e) => e.stopPropagation();

  const spawnMonster = useCallback(() => {
    if (!arenaRef.current) return;
    const w = arenaRef.current.clientWidth;
    setMonsterX(w - 80);
    setMonsterVariant(current % MONSTER_SPRITES.length);
    setIsAlive(true);
    setShowSmoke(false);
    setSmokePos(null);
    setBulletProgress(null);
    setCastleFlash(false);
    setForceRevealWrong(false);
    castleHitTriggeredRef.current = false;
  }, [current]);

  useEffect(() => {
    if (gameScreen !== "playing" || current >= gameQuestions.length) return;
    spawnMonster();
    setAwaitingContinue(false);
    setLocked(false);
  }, [current, gameScreen, gameQuestions.length, spawnMonster]);

  useEffect(() => {
    finishedRef.current = gameScreen === "finished";
  }, [gameScreen]);

  useEffect(() => {
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
    if (musicEnabled) {
      backgroundMusicRef.current.play().catch(() => {});
    } else {
      backgroundMusicRef.current.pause();
    }
  }, [musicEnabled]);

  useEffect(() => {
    if (gameScreen !== "playing") return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [gameScreen]);

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return undefined;
    const update = () =>
      setArenaSize({ w: el.clientWidth || 800, h: el.clientHeight || 400 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gameScreen, current]);

  function spawnScorePop() {
    const id = scorePopIdRef.current + 1;
    scorePopIdRef.current = id;
    setScorePops((prev) => [...prev, id]);
    const t = setTimeout(() => {
      setScorePops((prev) => prev.filter((popId) => popId !== id));
    }, 900);
    return t;
  }

  const playSound = (isCorrect) => {
    if (!soundEnabled) return;
    const sound = isCorrect ? correctSoundRef.current : wrongSoundRef.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  };

  const triggerCastleFlash = useCallback(() => {
    setCastleFlash(true);
    window.setTimeout(() => setCastleFlash(false), CASTLE_FLASH_MS);
  }, []);

  const handleCastleHit = useCallback(() => {
    if (castleHitTriggeredRef.current || locked || !isAlive) return;
    castleHitTriggeredRef.current = true;
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    setLocked(true);
    setForceRevealWrong(true);
    triggerCastleFlash();
    playSound(false);
    setAwaitingContinue(true);
  }, [locked, isAlive, soundEnabled, triggerCastleFlash]);

  useEffect(() => {
    if (gameScreen !== "playing" || !isAlive || monsterX === null || locked) return;
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = setInterval(() => {
      const el = arenaRef.current;
      if (!el) return;
      const { castleWallX } = getArenaMetrics(el.clientWidth, el.clientHeight);

      setMonsterX((prev) => {
        if (prev === null) return prev;
        const next = prev - MONSTER_MOVE_STEP;
        if (next <= castleWallX) {
          window.setTimeout(() => handleCastleHit(), 0);
          return castleWallX;
        }
        return next;
      });
    }, MONSTER_MOVE_MS);
    return () => clearInterval(moveIntervalRef.current);
  }, [gameScreen, isAlive, monsterX, locked, handleCastleHit]);

  function finishGame(totalCorrect) {
    if (finishedRef.current) return;
    setGameScreen("finished");
    onLessonComplete?.(totalCorrect);

    const userId = getUserId(payload);
    if (userId && totalCorrect > 0) {
      incrementLessonScore(userId, totalCorrect, payload).then((data) => {
        if (data?.success) setUserScore(data.score);
      });
    }
  }

  const proceedToNext = (finalCorrectCount) => {
    setAwaitingContinue(false);
    if (current + 1 >= gameQuestions.length) {
      finishGame(finalCorrectCount);
    } else {
      setCurrent((c) => c + 1);
      setLocked(false);
    }
  };

  const runGameFeedback = (isCorrect, newCount) => {
    const onMonsterHit = (hitX, hitY) => {
      setSmokePos({ x: hitX, y: hitY });
      setShowSmoke(true);
      setIsAlive(false);
      setTimeout(() => {
        setShowSmoke(false);
        setSmokePos(null);
        if (isCorrect) {
          proceedToNext(newCount);
        } else {
          setAwaitingContinue(true);
        }
      }, SMOKE_DURATION_MS);
    };

    if (isCorrect) {
      setBulletProgress(0);
      let startTime = null;
      const animateBullet = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min(1, (timestamp - startTime) / BULLET_TRAVEL_MS);
        setBulletProgress(progress);
        if (progress < 1) {
          requestAnimationFrame(animateBullet);
        } else {
          setBulletProgress(null);
          const el = arenaRef.current;
          const w = el?.clientWidth || arenaSize.w;
          const h = el?.clientHeight || arenaSize.h;
          const { monsterSize, centerY, castleW } = getArenaMetrics(w, h);
          const mx = monsterX ?? castleW;
          onMonsterHit(mx + monsterSize * 0.5, centerY);
        }
      };
      requestAnimationFrame(animateBullet);
    } else {
      setAwaitingContinue(true);
    }
  };

  const finishAnswer = (isCorrect) => {
    if (locked || gameScreen !== "playing" || !isAlive) return;
    setLocked(true);
    playSound(isCorrect);
    if (!isCorrect) {
      triggerCastleFlash();
    }
    const newCount = isCorrect ? correctCount + 1 : correctCount;
    if (isCorrect) {
      setCorrectCount(newCount);
      setUserScore((s) => s + 1);
      spawnScorePop();
    }
    runGameFeedback(isCorrect, newCount);
  };

  const onLaneActivate = (idx) => {
    if (locked || awaitingContinue || !currentQuestion) return;
    const qId = currentQuestion.id;
    if (mcq.isLocked(qId)) return;
    if (getHiddenIndices(qId).has(idx)) return;

    if (mcq.isMultiCorrectQuestion(currentQuestion.answers)) {
      mcq.toggleIndex(qId, currentQuestion.answers, idx);
      return;
    }

    const ok = mcq.toggleIndex(qId, currentQuestion.answers, idx);
    if (ok !== null) {
      finishAnswer(ok);
    }
  };

  const confirmAnswer = () => {
    if (locked || !currentQuestion || awaitingContinue) return;
    const qId = currentQuestion.id;
    if (mcq.isLocked(qId)) return;
    if (!mcq.isMultiCorrectQuestion(currentQuestion.answers)) return;

    const ok = mcq.confirmPending(qId, currentQuestion.answers);
    finishAnswer(ok);
  };

  const continueAfterWrong = () => {
    if (!awaitingContinue) return;
    proceedToNext(correctCount);
  };

  const handleComeback = () => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
    navigate("/lessons", { replace: true });
  };

  const resetGame = () => {
    setShuffleSeed((s) => s + 1);
    setCurrent(0);
    mcq.resetAll();
    setLocked(false);
    setAwaitingContinue(false);
    setGameScreen("playing");
    setCorrectCount(0);
    setUserScore(payload?.user?.score ?? 0);
    setScorePops([]);
    setMonsterX(null);
    setIsAlive(true);
    setShowSmoke(false);
    setSmokePos(null);
    setBulletProgress(null);
    setCastleFlash(false);
    setForceRevealWrong(false);
    castleHitTriggeredRef.current = false;
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    resetHints();
    if (musicEnabled && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(() => {});
    }
  };

  if (!gameQuestions.length) {
    return <div style={{ padding: 20, textAlign: "center" }}>Không có câu hỏi nào!</div>;
  }

  if (gameScreen === "finished") {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={correctCount}
        totalQuestions={gameQuestions.length}
        onReplay={resetGame}
        onHome={handleComeback}
        homeLabel="Về bài học"
        fullBleed
      />
    );
  }

  if (!currentQuestion) {
    return <div style={{ padding: 20, textAlign: "center" }}>Không có câu hỏi nào!</div>;
  }

  const isMulti = mcq.isMultiCorrectQuestion(currentQuestion.answers);
  const qId = currentQuestion.id;
  const pending = mcq.getPendingIndices(qId);
  const confirmed = mcq.getConfirmedIndices(qId);
  const qLocked = mcq.isLocked(qId) || locked;
  const visibleAnswers = currentQuestion.answers
    .map((a, i) => ({ a, i }))
    .filter(({ i }) => !getHiddenIndices(qId).has(i));
  const compactAnswerText = visibleAnswers.length > 4;
  const requiredCorrectCount = getCorrectIndices(currentQuestion.answers).length;
  const canConfirm =
    isMulti && pending.length === requiredCorrectCount && requiredCorrectCount > 0;

  const { w: arenaWidth, h: arenaHeight } = arenaSize;
  const { castleW, castleH, monsterSize, bulletSize, centerY } = getArenaMetrics(
    arenaWidth,
    arenaHeight
  );
  const bulletStartX = castleW + 16;

  let bulletX = null;
  let bulletY = null;
  if (bulletProgress !== null && monsterX !== null && isAlive) {
    const endX = monsterX + monsterSize * 0.5;
    bulletX = bulletStartX + (endX - bulletStartX) * bulletProgress;
    bulletY = centerY;
  }

  const isLaneSelected = (idx) => {
    if (qLocked) return (confirmed ?? []).includes(idx);
    return pending.includes(idx);
  };

  const getAnswerRevealClass = (idx, ans) => {
    if (forceRevealWrong) {
      if (ans.correct) return " game11-answer--reveal-correct";
      return "";
    }
    if (!qLocked) return "";
    const vis = getMcqAnswerVisualState(pending, confirmed, idx, ans);
    if (vis.tone === "correct" || vis.tone === "missed") return " game11-answer--reveal-correct";
    if (vis.tone === "wrong") return " game11-answer--reveal-wrong";
    return "";
  };

  return (
    <div className="game11-play">
      <style>{`
        .game11-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          background: #0b2f1f;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          font-family: inherit;
        }
        .game11-quiz {
          flex: 0 0 40%;
          width: 40%;
          max-width: 40%;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #1e3a1e 0%, #152b15 100%);
          border-right: 3px solid rgba(212, 175, 55, 0.35);
          overflow: hidden;
          box-sizing: border-box;
        }
        .game11-battle {
          flex: 0 0 60%;
          width: 60%;
          max-width: 60%;
          min-width: 0;
          height: 100%;
          position: relative;
          overflow: hidden;
          background: #1a3320;
          box-sizing: border-box;
        }
        .game11-hud {
          position: absolute;
          top: 2px;
          left: clamp(6px, 1.2vw, 10px);
          z-index: 20;
          pointer-events: none;
        }
        .game11-hud-controls {
          display: flex;
          align-items: flex-start;
          flex-wrap: nowrap;
          gap: clamp(4px, 1vw, 6px);
          pointer-events: auto;
        }
        .game11-hud-btn {
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          line-height: 0;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
        }
        .game11-hud-btn img {
          display: block;
          width: clamp(36px, 7vw, 48px);
          height: clamp(36px, 7vw, 48px);
          object-fit: contain;
        }
        .game11-score-wrap {
          position: relative;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          margin-left: 2px;
        }
        .game11-stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          height: clamp(36px, 7vw, 48px);
          box-sizing: border-box;
          padding: 0 12px 0 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          border: 2px solid #4caf50;
          font-weight: 800;
          font-size: clamp(0.85rem, 2.1vw, 1rem);
          color: #2e7d32;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          min-width: 72px;
          justify-content: center;
          line-height: 1;
        }
        .game11-stat-pill img.coin {
          width: clamp(30px, 6vw, 40px);
          height: clamp(30px, 6vw, 40px);
          object-fit: contain;
        }
        .game11-score-pop {
          position: absolute;
          left: calc(100% + 4px);
          top: 50%;
          color: #a5d6a7;
          font-weight: 800;
          font-size: clamp(0.85rem, 2.2vw, 1.05rem);
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
          animation: game11-pop-rise 0.9s ease-out forwards;
          pointer-events: none;
          white-space: nowrap;
        }
        @keyframes game11-pop-rise {
          0% { opacity: 0; transform: translateY(-50%) scale(0.5); }
          15% { opacity: 1; transform: translateY(-50%) scale(1.15); }
          50% { opacity: 1; transform: translateY(-90%) scale(1); }
          100% { opacity: 0; transform: translateY(-140%) scale(0.95); }
        }
        .game11-arena {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background-image: url(${game11Background});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .game11-castle {
          position: absolute;
          left: clamp(4px, 1.2vw, 12px);
          bottom: ${CASTLE_BOTTOM_PCT}%;
          object-fit: contain;
          z-index: 7;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
          pointer-events: none;
        }
        .game11-castle--hit {
          animation: game11-castle-flash ${CASTLE_FLASH_MS}ms ease-out;
        }
        @keyframes game11-castle-flash {
          0%, 100% {
            filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
          }
          45%, 55% {
            filter:
              drop-shadow(0 0 16px rgba(255, 40, 40, 0.95))
              brightness(1.15)
              sepia(1)
              saturate(6)
              hue-rotate(-25deg);
          }
        }
        .game11-monster {
          position: absolute;
          object-fit: contain;
          z-index: 8;
          pointer-events: none;
          animation: game11-monster-bob 2.8s ease-in-out infinite;
          filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.35));
        }
        @keyframes game11-monster-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        .game11-bullet {
          position: absolute;
          width: clamp(36px, 5vw, 52px);
          height: auto;
          object-fit: contain;
          z-index: 9;
          pointer-events: none;
          transform: translate(-50%, -50%) rotate(${BULLET_ROTATE_DEG}deg);
          transform-origin: 50% 50%;
          filter: drop-shadow(0 0 8px rgba(255, 170, 0, 0.65));
        }
        .game11-smoke {
          position: absolute;
          object-fit: contain;
          z-index: 10;
          pointer-events: none;
          transform: translate(-50%, -50%);
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
        }
        .game11-question-section {
          flex: 0 0 ${QUIZ_QUESTION_HEIGHT_PCT}%;
          max-height: ${QUIZ_QUESTION_HEIGHT_PCT}%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: clamp(10px, 1.5vh, 14px) clamp(10px, 1.2vw, 14px) clamp(6px, 1vh, 8px);
          box-sizing: border-box;
          overflow-y: auto;
        }
        .game11-answers-section {
          flex: 1 1 ${100 - QUIZ_QUESTION_HEIGHT_PCT}%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding: clamp(6px, 1vh, 10px) clamp(10px, 1.2vw, 14px) 0;
          box-sizing: border-box;
        }
        .game11-question-block {
          flex: 1;
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .game11-question-panel {
          flex-shrink: 0;
          width: 100%;
          padding: 8px 14px;
          border-radius: 14px 14px 0 0;
          background: rgba(255,255,255,0.95);
          border: 2px solid rgba(76, 175, 80, 0.45);
          border-bottom: none;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          box-sizing: border-box;
        }
        .game11-question-panel--solo {
          border-bottom: 2px solid rgba(76, 175, 80, 0.45);
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .game11-question-text {
          margin: 0;
          font-size: clamp(0.95rem, 2.5vw, 1.15rem);
          font-weight: 700;
          color: #1b5e20;
          line-height: 1.4;
          text-align: left;
        }
        .game11-question-image-wrap {
          flex: 1;
          min-height: 0;
          width: 100%;
          padding: 8px 12px 10px;
          border-radius: 0 0 14px 14px;
          background: #fff;
          border: 2px solid rgba(76, 175, 80, 0.45);
          border-top: 1px solid rgba(76, 175, 80, 0.2);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .game11-question-image-wrap > button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          max-height: 100%;
        }
        .game11-question-image-wrap img {
          display: block;
          max-width: 100%;
          max-height: 100%;
          margin: 0 auto;
          object-fit: contain;
        }
        .game11-hint-wrap {
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          margin: 6px auto 0;
        }
        .game11-answers {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(6px, 1vh, 10px);
          width: 100%;
          margin: 0;
          padding-bottom: 4px;
          align-content: start;
        }
        .game11-answer {
          display: flex;
          align-items: center;
          min-height: 52px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 2px solid rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.08);
          color: #f3f4f6;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
          box-sizing: border-box;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .game11-answer:hover:not(:disabled) {
          background: rgba(255,255,255,0.14);
          border-color: rgba(255, 213, 79, 0.45);
        }
        .game11-answer--active {
          color: #ffd54f;
          border-color: rgba(255, 213, 79, 0.75);
          background: rgba(255, 213, 79, 0.12);
          text-shadow: 0 0 10px rgba(255, 213, 79, 0.35);
        }
        .game11-answer--reveal-correct {
          background: rgba(34, 197, 94, 0.55);
          border-color: rgba(34, 197, 94, 0.85);
          color: #fff;
          cursor: default;
        }
        .game11-answer--reveal-wrong {
          background: rgba(239, 68, 68, 0.55);
          border-color: rgba(239, 68, 68, 0.85);
          color: #fff;
          cursor: default;
        }
        .game11-answer:disabled {
          cursor: default;
        }
        .game11-answer-row {
          width: 100%;
          min-width: 0;
          font-size: clamp(1.05rem, 2.4vw, 1.4rem);
        }
        .game11-actions {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: clamp(8px, 1.5vh, 12px) clamp(12px, 2vw, 16px) clamp(10px, 2vh, 14px);
          background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.15) 100%);
        }
        .game11-confirm-btn,
        .game11-continue-btn {
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
        .game11-confirm-btn:disabled {
          background: #78909c;
          cursor: default;
          box-shadow: none;
        }
        .game11-confirm-btn:hover:not(:disabled),
        .game11-continue-btn:hover {
          filter: brightness(1.05);
        }
        @media (max-width: 768px) {
          .game11-play {
            flex-direction: column;
          }
          .game11-quiz {
            flex: 0 0 40%;
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 40%;
            border-right: none;
            border-bottom: 3px solid rgba(212, 175, 55, 0.35);
          }
          .game11-battle {
            flex: 1 1 60%;
            width: 100%;
            max-width: 100%;
            min-height: 0;
          }
          .game11-hud-btn img {
            width: clamp(32px, 8vw, 42px);
            height: clamp(32px, 8vw, 42px);
          }
          .game11-question-text {
            font-size: clamp(0.88rem, 2.4vw, 1rem);
          }
        }
      `}</style>

      <div className="game11-quiz">
        <div className="game11-question-section">
          <div className="game11-question-block">
            <div
              className={`game11-question-panel${
                currentQuestion.question_image ? "" : " game11-question-panel--solo"
              }`}
            >
              <p className="game11-question-text">{currentQuestion.question_text}</p>
            </div>

            {currentQuestion.question_image && (
              <div className="game11-question-image-wrap">
                <GameQuestionImageZoom
                  src={questionImageUrl(currentQuestion.question_image) || undefined}
                  thumbStyle={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    display: "block",
                    margin: "0 auto",
                    objectFit: "contain",
                  }}
                />
              </div>
            )}
          </div>

          {hasHintFeature && (
            <div className="game11-hint-wrap">
              <GameHintButton
                hintsRemaining={hintsRemaining}
                disabled={qLocked || !canUseHint(qId, currentQuestion.answers)}
                onUse={() => applyHint(qId, currentQuestion.answers)}
                style={{ margin: 0 }}
              />
            </div>
          )}
        </div>

        <div className="game11-answers-section">
          <div className="game11-answers">
            {visibleAnswers.map(({ a, i: laneIdx }) => {
              const text = a.text || (a.image ? "🖼️" : "—");
              const active = isLaneSelected(laneIdx) && !qLocked && !awaitingContinue;
              const revealClass = getAnswerRevealClass(laneIdx, a);

              return (
                <button
                  key={`answer-${laneIdx}`}
                  type="button"
                  className={`game11-answer${active ? " game11-answer--active" : ""}${revealClass}`}
                  disabled={qLocked || awaitingContinue}
                  onClick={() => onLaneActivate(laneIdx)}
                >
                  <div
                    className="game11-answer-row"
                    style={{
                      ...laneAnswerTextStyle(text),
                      fontSize: compactAnswerText ? 18 : undefined,
                    }}
                  >
                    {getAnswerLabel(laneIdx)}.{" "}
                    {a.text ||
                      (a.image ? (
                        <img
                          src={questionImageUrl(a.image) || undefined}
                          alt=""
                          style={{ maxHeight: 24, verticalAlign: "middle" }}
                        />
                      ) : (
                        "—"
                      ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="game11-actions">
          {awaitingContinue ? (
            <button type="button" className="game11-continue-btn" onClick={continueAfterWrong}>
              Tiếp tục
            </button>
          ) : isMulti ? (
            <button
              type="button"
              className="game11-confirm-btn"
              disabled={qLocked || !canConfirm}
              onClick={confirmAnswer}
            >
              Xác nhận
            </button>
          ) : null}
        </div>
      </div>

      <div className="game11-battle">
        <div className="game11-hud">
          <div className="game11-hud-controls">
            <button
              type="button"
              className="game11-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={handleComeback}
              aria-label="Quay lại"
            >
              <img src={game11BackIcon} alt="" />
            </button>
            <button
              type="button"
              className="game11-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={() => setMusicEnabled((p) => !p)}
              aria-label={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}
            >
              <img src={musicEnabled ? game11MusicOnIcon : game11MusicOffIcon} alt="" />
            </button>
            <button
              type="button"
              className="game11-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={() => setSoundEnabled((p) => !p)}
              aria-label={soundEnabled ? "Tắt tiếng" : "Bật tiếng"}
            >
              <img src={soundEnabled ? game11SoundOnIcon : game11SoundOffIcon} alt="" />
            </button>
            <button
              type="button"
              className="game11-hud-btn"
              onPointerDown={stopControlPointer}
              onClick={resetGame}
              aria-label="Chơi lại"
            >
              <img src={game11RestartIcon} alt="" />
            </button>
            <div className="game11-score-wrap">
              <div className="game11-stat-pill" title="Thành tích">
                <img className="coin" src={game11CoinIcon} alt="" />
                {userScore}
              </div>
              {scorePops.map((id) => (
                <span key={id} className="game11-score-pop">
                  +1
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="game11-arena" ref={arenaRef}>
          <img
            src={game11Castle}
            alt=""
            className={`game11-castle${castleFlash ? " game11-castle--hit" : ""}`}
            draggable={false}
            style={{ width: castleW, height: castleH }}
          />

          {bulletX !== null && (
            <img
              src={game11Bullet}
              alt=""
              className="game11-bullet"
              draggable={false}
              style={{
                left: bulletX,
                top: bulletY,
                width: bulletSize,
              }}
            />
          )}

          {isAlive && monsterX !== null && (
            <img
              src={MONSTER_SPRITES[monsterVariant]}
              alt=""
              className="game11-monster"
              draggable={false}
              style={{
                left: monsterX,
                top: centerY - monsterSize * 0.5,
                width: monsterSize,
                height: monsterSize,
              }}
            />
          )}

          {showSmoke && smokePos && (
            <img
              src={game11Smoke}
              alt=""
              className="game11-smoke"
              draggable={false}
              style={{
                left: smokePos.x,
                top: smokePos.y,
                width: monsterSize * 1.5,
                height: monsterSize * 1.5,
              }}
            />
          )}
        </div>
      </div>

      <audio ref={correctSoundRef} src={`${publicUrl}/game-noises/dung.mp3`} preload="auto" />
      <audio ref={wrongSoundRef} src={`${publicUrl}/game-noises/wrong.mp3`} preload="auto" />
    </div>
  );
}
