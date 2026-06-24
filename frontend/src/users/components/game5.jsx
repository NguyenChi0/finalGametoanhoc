// Game 5: Đào vàng — trắc nghiệm + móc lắc câu vàng/đá (layout 40/60 như game11)
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { prepareSessionQuestions } from "../lib/lessonQuestions";
import {
  getMcqAnswerVisualState,
  useGameMcqSelection,
} from "../lib/useGameMcqSelection";
import game5BackIcon from "../../assets/game-images/back.png";
import game5RestartIcon from "../../assets/game-images/restart.png";
import game5MusicOnIcon from "../../assets/game-images/music_on.png";
import game5MusicOffIcon from "../../assets/game-images/music-off.png";
import game5SoundOnIcon from "../../assets/game-images/sound_on.png";
import game5SoundOffIcon from "../../assets/game-images/sound-off.png";
import game5CoinIcon from "../../assets/game-images/coin.png";
import game5GoldImg from "../../assets/game-images/game5/gold.png";

/** Sprite vàng — preload + cờ sẵn sàng cho canvas */
const GOLD_SPRITE = new Image();
let goldSpriteReadyFlag = GOLD_SPRITE.complete && GOLD_SPRITE.naturalWidth > 0;
const goldSpriteWaiters = [];

function notifyGoldSpriteReady() {
  if (!GOLD_SPRITE.naturalWidth) return;
  goldSpriteReadyFlag = true;
  goldSpriteWaiters.splice(0).forEach((fn) => fn());
}

GOLD_SPRITE.addEventListener("load", notifyGoldSpriteReady);
GOLD_SPRITE.addEventListener("error", () => notifyGoldSpriteReady());
GOLD_SPRITE.src = game5GoldImg;
if (GOLD_SPRITE.decode) {
  GOLD_SPRITE.decode().then(notifyGoldSpriteReady).catch(notifyGoldSpriteReady);
} else if (goldSpriteReadyFlag) {
  notifyGoldSpriteReady();
}

function getGoldSprite() {
  if (goldSpriteReadyFlag && GOLD_SPRITE.naturalWidth > 0) return GOLD_SPRITE;
  return null;
}

function whenGoldSpriteReady(cb) {
  if (goldSpriteReadyFlag && GOLD_SPRITE.naturalWidth > 0) {
    cb();
    return () => {};
  }
  goldSpriteWaiters.push(cb);
  return () => {
    const i = goldSpriteWaiters.indexOf(cb);
    if (i >= 0) goldSpriteWaiters.splice(i, 1);
  };
}

const SWING_SPEED = 0.028;
const MAX_SWING = Math.PI / 2.35;
const ROPE_EXTEND_SPEED = 5.5;
const ROPE_BASE = 28;
const BAR_HEIGHT_RATIO = 0.13;
const ANSWER_LINE_MAX_CHARS = 10;

function getAnswerDisplayText(answer) {
  if (answer?.text) return String(answer.text).trim();
  if (answer?.image) return "🖼";
  return "—";
}

/** Mỗi dòng tối đa 10 ký tự trên cục vàng */
function wrapAnswerLines(text, maxLen = ANSWER_LINE_MAX_CHARS) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return ["—"];
  const lines = [];
  let rest = trimmed;
  while (rest.length > 0) {
    if (rest.length <= maxLen) {
      lines.push(rest);
      break;
    }
    let breakAt = rest.lastIndexOf(" ", maxLen);
    if (breakAt <= 0) breakAt = maxLen;
    lines.push(rest.slice(0, breakAt).trim());
    rest = rest.slice(breakAt).trim();
  }
  return lines.length ? lines : ["—"];
}

function computeGoldSize(w, textLines) {
  const lineCount = textLines.length;
  const maxLineLen = Math.max(...textLines.map((l) => l.length), 1);

  const fontSize = Math.max(14, Math.min(22, w * 0.024 + maxLineLen * 0.35));
  const lineHeight = fontSize * 1.22;
  const textBlockW = maxLineLen * fontSize * 0.56;
  const textBlockH = lineCount * lineHeight;
  const padX = fontSize * 0.75;
  const padY = fontSize * 0.55;

  const halfW = Math.min(textBlockW / 2 + padX, w * 0.2);
  const halfH = Math.min(textBlockH / 2 + padY, w * 0.16);

  return {
    halfW,
    halfH,
    r: Math.max(halfW, halfH),
    textLines,
    fontSize,
  };
}

function getUserId(payload) {
  if (payload?.user?.id) return payload.user.id;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw)?.id ?? null;
  } catch {
    return null;
  }
}

/** Bố trí cục vàng cố định dưới lòng đất */
function layoutMineItems(w, h, barH, visibleAnswers) {
  const padX = Math.max(36, w * 0.06);
  const top = barH + h * 0.1;
  const bottom = h - Math.max(24, h * 0.04);
  const usableH = bottom - top;
  const count = visibleAnswers.length;
  const cols = count <= 2 ? count : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const cellW = (w - padX * 2) / cols;
  const cellH = usableH / rows;

  return visibleAnswers.map(({ a, i }, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const isGold = !!a.correct;
    const displayText = getAnswerDisplayText(a);
    const textLines = wrapAnswerLines(displayText);
    const { halfW, halfH, r, fontSize } = computeGoldSize(w, textLines);
    const x = padX + cellW * col + cellW * 0.5 + (row % 2 ? cellW * 0.08 : -cellW * 0.05);
    const y = top + cellH * row + cellH * 0.55;
    return {
      answerIndex: i,
      answer: a,
      displayText,
      textLines,
      x,
      y,
      halfW,
      halfH,
      r,
      fontSize,
      isGold,
      weight: isGold ? 1 : 2.6,
      grabbed: false,
    };
  });
}

function hookPoint(originX, originY, angle, ropeLen) {
  return {
    x: originX + Math.sin(angle) * ropeLen,
    y: originY + Math.cos(angle) * ropeLen,
  };
}

function drawUnderground(ctx, w, h, barH) {
  const layers = ["#c4a574", "#b8935c", "#a67c52", "#8d6e4c", "#7a5c3e"];
  layers.forEach((color, i) => {
    const y0 = barH + ((h - barH) / layers.length) * i;
    const y1 = barH + ((h - barH) / layers.length) * (i + 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, y0, w, y1 - y0);
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 18) {
      const wave = Math.sin(x * 0.02 + i) * 6;
      if (x === 0) ctx.moveTo(x, y0 + wave);
      else ctx.lineTo(x, y0 + wave);
    }
    ctx.stroke();
  });
}

function drawTopBar(ctx, w, barH) {
  const grad = ctx.createLinearGradient(0, 0, 0, barH);
  grad.addColorStop(0, "#ffe082");
  grad.addColorStop(1, "#ffb300");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, barH);
  ctx.strokeStyle = "#f57f17";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, barH);
  ctx.lineTo(w, barH);
  ctx.stroke();
}

function drawMiner(ctx, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = "#5d4037";
  ctx.fillRect(-18 * scale, 8 * scale, 36 * scale, 22 * scale);

  ctx.fillStyle = "#ffcc80";
  ctx.beginPath();
  ctx.arc(0, -6 * scale, 14 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#bdbdbd";
  ctx.beginPath();
  ctx.ellipse(0, 4 * scale, 16 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#757575";
  ctx.beginPath();
  ctx.arc(0, -18 * scale, 16 * scale, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = "#424242";
  ctx.fillRect(-10 * scale, -4 * scale, 20 * scale, 3 * scale);

  ctx.restore();
}

function drawWinch(ctx, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#616161";
  ctx.fillRect(-14 * scale, -6 * scale, 28 * scale, 12 * scale);
  ctx.fillStyle = "#424242";
  ctx.beginPath();
  ctx.arc(0, 0, 8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGold(ctx, item, revealTone) {
  const { x, y, halfW, halfH, textLines, fontSize: itemFontSize } = item;
  const sprite = getGoldSprite();
  const spriteScale = 1.38;

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  if (sprite) {
    const aspect = sprite.naturalWidth / sprite.naturalHeight || 1;
    let drawW = halfW * 2 * spriteScale;
    let drawH = halfH * 2 * spriteScale;
    if (drawW / drawH > aspect) drawW = drawH * aspect;
    else drawH = drawW / aspect;
    ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const overlayW = halfW * 2 * spriteScale;
  const overlayH = halfH * 2 * spriteScale;
  if (revealTone === "wrong") {
    ctx.fillStyle = "rgba(244, 67, 54, 0.38)";
    ctx.fillRect(-overlayW / 2, -overlayH / 2, overlayW, overlayH);
  } else if (revealTone === "correct") {
    ctx.fillStyle = "rgba(76, 175, 80, 0.28)";
    ctx.fillRect(-overlayW / 2, -overlayH / 2, overlayW, overlayH);
  }

  const fontSize = itemFontSize || Math.max(14, Math.min(20, halfH * 0.38));
  const lineHeight = fontSize * 1.22;
  const blockH = textLines.length * lineHeight;
  let ty = -blockH / 2 + lineHeight / 2;

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(2.5, fontSize * 0.18);
  textLines.forEach((line) => {
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.strokeText(line, 0, ty);
    ctx.fillStyle = "#3e2723";
    ctx.fillText(line, 0, ty);
    ty += lineHeight;
  });

  ctx.restore();
}

function drawHookHead(ctx, x, y, scale, open) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#424242";
  ctx.lineWidth = 3 * scale;
  ctx.fillStyle = "#757575";
  const gap = open ? 0.55 : 0.15;
  ctx.beginPath();
  ctx.arc(-4 * scale, 4 * scale, 7 * scale, Math.PI * 0.2, Math.PI * 1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4 * scale, 4 * scale, 7 * scale, Math.PI * 1.8, Math.PI * 0.8, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -2 * scale);
  ctx.lineTo(0, 10 * scale);
  ctx.stroke();
  ctx.restore();
}

export default function Game5({ payload, onLessonComplete }) {
  const navigate = useNavigate();
  const questions = payload?.questions || [];

  const mcq = useGameMcqSelection();
  const [current, setCurrent] = useState(0);
  const [locked, setLocked] = useState(false);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [gameScreen, setGameScreen] = useState("playing");
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [scorePops, setScorePops] = useState([]);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [forceRevealWrong, setForceRevealWrong] = useState(false);
  const [arenaSize, setArenaSize] = useState({ w: 800, h: 500 });

  const canvasRef = useRef(null);
  const arenaRef = useRef(null);
  const mineRef = useRef(null);
  const rafRef = useRef(null);
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);
  const grabSoundRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const scorePopIdRef = useRef(0);
  const finishedRef = useRef(false);
  const lockedRef = useRef(false);
  const awaitingContinueRef = useRef(false);
  const revealStateRef = useRef({});
  const onCatchRef = useRef(null);
  const [goldSpriteReady, setGoldSpriteReady] = useState(goldSpriteReadyFlag);

  const gameQuestions = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );
  const currentQuestion = gameQuestions[current];

  const stopControlPointer = (e) => e.stopPropagation();

  useEffect(() => whenGoldSpriteReady(() => setGoldSpriteReady(true)), []);

  useEffect(() => {
    finishedRef.current = gameScreen === "finished";
  }, [gameScreen]);

  useEffect(() => {
    lockedRef.current = locked;
    awaitingContinueRef.current = awaitingContinue;
  }, [locked, awaitingContinue]);

  useEffect(() => {
    backgroundMusicRef.current = new Audio(`${publicUrl}/music/nhac6.mp3`);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.4;
    backgroundMusicRef.current.play().catch(() => {});
    correctSoundRef.current = new Audio(`${publicUrl}/game-noises/dung.mp3`);
    wrongSoundRef.current = new Audio(`${publicUrl}/game-noises/wrong.mp3`);
    grabSoundRef.current = new Audio(`${publicUrl}/game-noises/dap.mp3`);
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (!backgroundMusicRef.current) return;
    if (musicEnabled) backgroundMusicRef.current.play().catch(() => {});
    else backgroundMusicRef.current.pause();
  }, [musicEnabled]);

  useEffect(() => {
    if (gameScreen !== "playing") return undefined;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [gameScreen]);

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return undefined;
    const update = () => {
      const w = el.clientWidth || 800;
      const h = el.clientHeight || 500;
      if (w > 0 && h > 0) setArenaSize({ w, h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gameScreen, current]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (gameScreen !== "playing" || lockedRef.current) return;
      if (e.code === "Space" || e.key === "ArrowDown") {
        e.preventDefault();
        const m = mineRef.current;
        if (m && m.phase === "swing") m.phase = "extend";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameScreen]);

  function spawnScorePop() {
    const id = scorePopIdRef.current + 1;
    scorePopIdRef.current = id;
    setScorePops((prev) => [...prev, id]);
    window.setTimeout(() => {
      setScorePops((prev) => prev.filter((popId) => popId !== id));
    }, 900);
  }

  const playSound = (type) => {
    if (!soundEnabled) return;
    const map = {
      correct: correctSoundRef,
      wrong: wrongSoundRef,
      grab: grabSoundRef,
    };
    const ref = map[type];
    if (ref?.current) {
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    }
  };

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

  const proceedToNext = useCallback(
    (finalCorrectCount) => {
      setAwaitingContinue(false);
      setForceRevealWrong(false);
      if (current + 1 >= gameQuestions.length) {
        finishGame(finalCorrectCount);
      } else {
        setCurrent((c) => c + 1);
        setLocked(false);
      }
    },
    [current, gameQuestions.length]
  );

  const finishAnswer = useCallback(
    (isCorrect) => {
      if (lockedRef.current || gameScreen !== "playing" || !currentQuestion) return;
      setLocked(true);
      playSound(isCorrect ? "correct" : "wrong");
      if (!isCorrect) setForceRevealWrong(true);
      const newCount = isCorrect ? correctCount + 1 : correctCount;
      if (isCorrect) {
        setCorrectCount(newCount);
        setUserScore((s) => s + 1);
        spawnScorePop();
        window.setTimeout(() => proceedToNext(newCount), 1400);
      } else {
        setAwaitingContinue(true);
      }
    },
    [gameScreen, currentQuestion, correctCount, proceedToNext, soundEnabled]
  );

  const isMulti = currentQuestion
    ? mcq.isMultiCorrectQuestion(currentQuestion.answers)
    : false;

  const handleCatch = useCallback(
    (item) => {
      if (lockedRef.current || awaitingContinueRef.current || !currentQuestion || !item) {
        return;
      }
      playSound("grab");

      if (isMulti) {
        finishAnswer(!!item.answer.correct);
        return;
      }

      const ok = mcq.toggleIndex(
        currentQuestion.id,
        currentQuestion.answers,
        item.answerIndex
      );
      if (ok !== null) finishAnswer(ok);
    },
    [currentQuestion, isMulti, mcq, finishAnswer, soundEnabled]
  );

  useEffect(() => {
    onCatchRef.current = handleCatch;
  }, [handleCatch]);

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
    setForceRevealWrong(false);
    if (musicEnabled && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(() => {});
    }
  };

  const fireHook = () => {
    const m = mineRef.current;
    if (m && m.phase === "swing" && !lockedRef.current) {
      m.phase = "extend";
    }
  };

  const initMine = useCallback(
    (w, h, visibleAnswers) => {
      const barH = Math.max(52, h * BAR_HEIGHT_RATIO);
      const originX = w / 2;
      const originY = barH - 4;
      return {
        w,
        h,
        barH,
        originX,
        originY,
        angle: 0,
        angleDir: 1,
        phase: "swing",
        ropeLen: ROPE_BASE,
        maxRopeLen: Math.hypot(w * 0.48, h - barH),
        caught: null,
        items: layoutMineItems(w, h, barH, visibleAnswers),
      };
    },
    []
  );

  useEffect(() => {
    if (gameScreen !== "playing" || !currentQuestion) return;
    if (arenaSize.w <= 0 || arenaSize.h <= 0) return;

    const visibleAnswers = currentQuestion.answers.map((a, i) => ({ a, i }));

    mineRef.current = initMine(arenaSize.w, arenaSize.h, visibleAnswers);
  }, [gameScreen, current, currentQuestion, arenaSize, initMine]);

  useEffect(() => {
    if (gameScreen !== "playing" || !currentQuestion) return;

    const qId = currentQuestion.id;
    const pending = mcq.getPendingIndices(qId);
    const confirmed = mcq.getConfirmedIndices(qId);
    const qLocked = mcq.isLocked(qId) || locked;

    const revealMap = {};
    currentQuestion.answers.forEach((a, i) => {
      if (forceRevealWrong) {
        if (a.correct) revealMap[i] = "correct";
        else revealMap[i] = "wrong";
        return;
      }
      if (!qLocked) return;
      const vis = getMcqAnswerVisualState(pending, confirmed, i, a);
      if (vis.tone === "correct" || vis.tone === "missed") revealMap[i] = "correct";
      else if (vis.tone === "wrong") revealMap[i] = "wrong";
    });

    revealStateRef.current = { revealMap, qLocked };
  }, [gameScreen, currentQuestion, locked, forceRevealWrong, mcq]);

  useEffect(() => {
    if (gameScreen !== "playing") return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const loop = () => {
      const m = mineRef.current;
      if (!m) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const { w, h, barH, originX, originY } = m;
      const dpr = devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const scale = Math.min(w, h) / 500;
      const { revealMap } = revealStateRef.current;
      const canPlay = !lockedRef.current && !awaitingContinueRef.current;

      if (m.phase === "swing" && canPlay) {
        m.angle += SWING_SPEED * m.angleDir;
        if (m.angle >= MAX_SWING) {
          m.angle = MAX_SWING;
          m.angleDir = -1;
        } else if (m.angle <= -MAX_SWING) {
          m.angle = -MAX_SWING;
          m.angleDir = 1;
        }
      }

      if (m.phase === "extend") {
        m.ropeLen += ROPE_EXTEND_SPEED;
        const tip = hookPoint(originX, originY, m.angle, m.ropeLen);
        let hit = null;
        for (const item of m.items) {
          if (item.grabbed) continue;
          if (
            Math.abs(tip.x - item.x) < item.halfW + 10 &&
            Math.abs(tip.y - item.y) < item.halfH + 10
          ) {
            hit = item;
            break;
          }
        }
        if (hit) {
          hit.grabbed = true;
          m.caught = hit;
          m.phase = "retract";
        } else if (m.ropeLen >= m.maxRopeLen) {
          m.phase = "retract";
        }
      }

      if (m.phase === "retract") {
        const speed = m.caught ? ROPE_EXTEND_SPEED / m.caught.weight : ROPE_EXTEND_SPEED * 1.4;
        m.ropeLen -= speed;
        if (m.caught) {
          const tip = hookPoint(originX, originY, m.angle, m.ropeLen);
          m.caught.x = tip.x;
          m.caught.y = tip.y + 8;
        }
        if (m.ropeLen <= ROPE_BASE) {
          m.ropeLen = ROPE_BASE;
          const caughtItem = m.caught;
          m.caught = null;
          m.phase = "swing";
          if (caughtItem) {
            onCatchRef.current?.(caughtItem);
          }
        }
      }

      drawUnderground(ctx, w, h, barH);
      drawTopBar(ctx, w, barH);

      for (const item of m.items) {
        if (item.grabbed && item !== m.caught) continue;
        const tone = revealMap?.[item.answerIndex] || null;
        drawGold(ctx, item, tone);
      }

      drawWinch(ctx, originX, originY - 8 * scale, scale);
      drawMiner(ctx, originX, originY - 22 * scale, scale);

      const tip = hookPoint(originX, originY, m.angle, m.ropeLen);
      ctx.strokeStyle = "#212121";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      drawHookHead(ctx, tip.x, tip.y, scale, m.phase === "extend" && !m.caught);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameScreen, current, gameQuestions.length, goldSpriteReady]);

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

  const hasQuestionImage = !!currentQuestion.question_image;

  return (
    <div className="game5-play">
      <style>{`
        .game5-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          background: #3e2723;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          font-family: inherit;
        }
        .game5-quiz {
          flex: 0 0 38%;
          width: 38%;
          max-width: 38%;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #5d4037 0%, #4e342e 100%);
          border-right: 3px solid rgba(255, 213, 79, 0.35);
          overflow: hidden;
          box-sizing: border-box;
        }
        .game5-mine {
          flex: 1 1 62%;
          width: 62%;
          max-width: 62%;
          min-width: 280px;
          height: 100%;
          position: relative;
          overflow: hidden;
          background: #6d4c41;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .game5-hud {
          position: absolute;
          top: 2px;
          left: clamp(6px, 1.2vw, 10px);
          z-index: 20;
          pointer-events: none;
        }
        .game5-hud-controls {
          display: flex;
          align-items: flex-start;
          flex-wrap: nowrap;
          gap: clamp(4px, 1vw, 6px);
          pointer-events: auto;
        }
        .game5-hud-btn {
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          line-height: 0;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
        }
        .game5-hud-btn img {
          width: clamp(36px, 7vw, 48px);
          height: clamp(36px, 7vw, 48px);
          object-fit: contain;
        }
        .game5-score-wrap { position: relative; display: flex; align-items: center; margin-left: 2px; }
        .game5-stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          height: clamp(36px, 7vw, 48px);
          padding: 0 12px 0 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          border: 2px solid #ffb300;
          font-weight: 800;
          font-size: clamp(0.85rem, 2.1vw, 1rem);
          color: #e65100;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          min-width: 72px;
          justify-content: center;
        }
        .game5-stat-pill img.coin { width: clamp(30px, 6vw, 40px); height: clamp(30px, 6vw, 40px); }
        .game5-score-pop {
          position: absolute;
          left: calc(100% + 4px);
          top: 50%;
          color: #ffd54f;
          font-weight: 800;
          animation: game5-pop-rise 0.9s ease-out forwards;
          pointer-events: none;
        }
        @keyframes game5-pop-rise {
          0% { opacity: 0; transform: translateY(-50%) scale(0.5); }
          50% { opacity: 1; transform: translateY(-90%) scale(1); }
          100% { opacity: 0; transform: translateY(-140%) scale(0.95); }
        }
        .game5-question-section {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: clamp(10px, 1.5vh, 14px) clamp(10px, 1.2vw, 14px);
          box-sizing: border-box;
          overflow: hidden;
        }
        .game5-question-progress {
          flex-shrink: 0;
          margin: 0 0 8px;
          font-size: clamp(0.82rem, 2vw, 0.95rem);
          font-weight: 700;
          color: #ffe082;
        }
        .game5-question-block {
          flex: 1;
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .game5-question-panel {
          flex-shrink: 0;
          width: 100%;
          padding: 10px 14px;
          border-radius: 14px 14px 0 0;
          background: rgba(255,255,255,0.95);
          border: 2px solid rgba(255, 183, 77, 0.55);
          border-bottom: none;
          box-sizing: border-box;
        }
        .game5-question-panel--solo {
          border-bottom: 2px solid rgba(255, 183, 77, 0.55);
          border-radius: 14px;
        }
        .game5-question-text {
          margin: 0;
          font-size: clamp(0.92rem, 2.4vw, 1.12rem);
          font-weight: 700;
          color: #4e342e;
          line-height: 1.45;
        }
        .game5-question-image-wrap {
          flex: 1;
          min-height: 0;
          width: 100%;
          padding: 8px 12px 10px;
          border-radius: 0 0 14px 14px;
          background: rgba(255,255,255,0.95);
          border: 2px solid rgba(255, 183, 77, 0.55);
          border-top: 1px solid rgba(255, 183, 77, 0.3);
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .game5-question-image-wrap > button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          max-height: 100%;
          padding: 0;
          border: none;
          background: transparent;
          cursor: zoom-in;
          line-height: 0;
        }
        .game5-question-image-wrap img {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          margin: 0 auto;
          object-fit: contain;
        }
        .game5-actions {
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          padding: clamp(8px, 1.5vh, 12px) clamp(12px, 2vw, 16px) clamp(10px, 2vh, 14px);
        }
        .game5-continue-btn {
          padding: 12px 32px;
          min-width: 160px;
          border: none;
          border-radius: 24px;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          background: linear-gradient(135deg, #ffb300, #f57c00);
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        }
        .game5-canvas-wrap {
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .game5-canvas-wrap canvas { display: block; width: 100%; height: 100%; }
        @media (max-width: 768px) {
          .game5-play { flex-direction: column; }
          .game5-quiz {
            flex: 0 0 42%;
            width: 100%;
            max-width: 100%;
            max-height: 42%;
            border-right: none;
            border-bottom: 3px solid rgba(255, 213, 79, 0.35);
          }
          .game5-mine { flex: 1 1 58%; width: 100%; max-width: 100%; min-height: 0; }
        }
      `}</style>

      <div className="game5-quiz">
        <div className="game5-question-section">
          <p className="game5-question-progress">
            Câu {current + 1}/{gameQuestions.length}
          </p>
          <div className="game5-question-block">
            <div
              className={`game5-question-panel${
                hasQuestionImage ? "" : " game5-question-panel--solo"
              }`}
            >
              <p className="game5-question-text">{currentQuestion.question_text}</p>
            </div>
            {hasQuestionImage && (
              <div className="game5-question-image-wrap">
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
        </div>

        {awaitingContinue && (
          <div className="game5-actions">
            <button type="button" className="game5-continue-btn" onClick={continueAfterWrong}>
              Tiếp tục
            </button>
          </div>
        )}
      </div>

      <div className="game5-mine" ref={arenaRef}>
        <div className="game5-hud">
          <div className="game5-hud-controls">
            <button type="button" className="game5-hud-btn" onPointerDown={stopControlPointer} onClick={handleComeback} aria-label="Quay lại">
              <img src={game5BackIcon} alt="" />
            </button>
            <button type="button" className="game5-hud-btn" onPointerDown={stopControlPointer} onClick={() => setMusicEnabled((p) => !p)} aria-label="Nhạc">
              <img src={musicEnabled ? game5MusicOnIcon : game5MusicOffIcon} alt="" />
            </button>
            <button type="button" className="game5-hud-btn" onPointerDown={stopControlPointer} onClick={() => setSoundEnabled((p) => !p)} aria-label="Tiếng">
              <img src={soundEnabled ? game5SoundOnIcon : game5SoundOffIcon} alt="" />
            </button>
            <button type="button" className="game5-hud-btn" onPointerDown={stopControlPointer} onClick={resetGame} aria-label="Chơi lại">
              <img src={game5RestartIcon} alt="" />
            </button>
            <div className="game5-score-wrap">
              <div className="game5-stat-pill">
                <img className="coin" src={game5CoinIcon} alt="" />
                <span>{userScore}</span>
              </div>
              {scorePops.map((id) => (
                <span key={id} className="game5-score-pop">+1</span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="game5-canvas-wrap"
          onPointerDown={(e) => {
            e.preventDefault();
            fireHook();
          }}
          role="button"
          tabIndex={0}
          aria-label="Khu đào vàng — chạm để thả móc"
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
