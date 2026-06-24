import React, { useState, useMemo, useRef, useEffect } from "react";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import GameHintButton from "./GameHintButton";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { useLessonHints } from "../lib/useLessonHints";
import { prepareSessionQuestions, getAnswerLabel } from "../lib/lessonQuestions";
import GameMcqConfirmBar from "./GameMcqConfirmBar";
import {
  getMcqAnswerVisualState,
  useGameMcqSelection,
} from "../lib/useGameMcqSelection";

/** Bậc thang trong scene — tọa độ % theo canvas 800×600 gốc. */
const PLATFORMS = [
  { x: 0, y: 91.7, w: 100, h: 8.3, type: 1 },
  { x: 12.5, y: 75, w: 25, h: 3.3, type: 2 },
  { x: 56.3, y: 58.3, w: 25, h: 3.3, type: 1 },
  { x: 18.8, y: 41.7, w: 25, h: 3.3, type: 2 },
  { x: 62.5, y: 25, w: 25, h: 3.3, type: 1 },
  { x: 37.5, y: 8.3, w: 18.8, h: 3.3, type: 2 },
];

const STARS = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%`,
  top: `${(i * 23 + 11) % 88}%`,
  size: 1 + (i % 3),
  delay: `${(i % 10) * 0.35}s`,
}));

function Platform({ x, y, w, h, type }) {
  return (
    <div
      className={`game3-platform game3-platform--type${type}`}
      style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
      aria-hidden
    />
  );
}

export default function Game3({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];
  const user = payload?.user;
  const [current, setCurrent] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [levelTransition, setLevelTransition] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const mcq = useGameMcqSelection();
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [portalActive, setPortalActive] = useState(false);

  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);
  const timerRef = useRef(null);

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

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!showResult && !locked) setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [showResult, locked]);

  const playSound = (isCorrect) => {
    const ref = isCorrect ? correctSoundRef : wrongSoundRef;
    if (ref.current) {
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    }
  };

  function finishLesson(newCorrectCount) {
    setShowResult(true);
    if (user?.id && newCorrectCount > 0) {
      incrementLessonScore(user.id, newCorrectCount, payload).catch(() => {});
    }
    onLessonComplete?.(newCorrectCount);
  }

  function finishAnswer(isCorrect) {
    if (locked) return;
    setLocked(true);
    playSound(isCorrect);
    setFeedback(isCorrect ? "correct" : "wrong");

    const isLast = current + 1 >= totalQuestions;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    if (isCorrect) setPortalActive(true);

    setTimeout(() => {
      if (isCorrect && !isLast) {
        setLevelTransition(true);
        setTimeout(() => {
          setCorrectCount(newCorrectCount);
          setCurrent((c) => c + 1);
          setLocked(false);
          setFeedback(null);
          setPortalActive(false);
          setLevelTransition(false);
        }, 1600);
        return;
      }

      if (isCorrect && isLast) {
        setCorrectCount(newCorrectCount);
        finishLesson(newCorrectCount);
        return;
      }

      finishLesson(newCorrectCount);
    }, isCorrect && !isLast ? 1200 : 2000);
  }

  function handleAnswer(answer, idx) {
    if (locked || !currentQuestion) return;
    const qId = currentQuestion.id;
    if (mcq.isLocked(qId)) return;
    const ok = mcq.toggleIndex(qId, currentQuestion.answers, idx);
    if (ok !== null) finishAnswer(ok);
  }

  function confirmMultiAnswer() {
    if (locked || !currentQuestion) return;
    const ok = mcq.confirmPending(currentQuestion.id, currentQuestion.answers);
    finishAnswer(ok);
  }

  function resetGame() {
    setShuffleSeed((s) => s + 1);
    setCurrent(0);
    setShowResult(false);
    setLocked(false);
    setFeedback(null);
    setLevelTransition(false);
    setPortalActive(false);
    setCorrectCount(0);
    setElapsedSec(0);
    mcq.resetAll();
    resetHints();
  }

  const gameShellStyle = {
    width: "100%",
    maxWidth: "100%",
    minHeight: "clamp(480px, 78vh, 720px)",
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
      />
    );
  }

  const questionImageSrc = currentQuestion.question_image
    ? questionImageUrl(currentQuestion.question_image) || null
    : null;

  const isMulti = mcq.isMultiCorrectQuestion(currentQuestion.answers);
  const astronautLift = portalActive || feedback === "correct";

  return (
    <div className="game3-root" style={gameShellStyle}>
      <style>{`
        .game3-root {
          --g3-blue-deep: #1e3c72;
          --g3-blue-mid: #2a5298;
          --g3-accent: #4a90e2;
          --g3-text: #fff;
          font-family: Arial, sans-serif;
        }

        .game3-arena {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          max-height: min(78vh, 680px);
          margin: 0 auto;
          border: 3px solid var(--g3-accent);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          background: linear-gradient(135deg, var(--g3-blue-deep) 0%, var(--g3-blue-mid) 100%);
        }

        /* PLACEHOLDER: thay bằng flowerbackground.png */
        .game3-bg-placeholder {
          position: absolute;
          inset: 0;
          background: #d48cb8;
          opacity: 0.45;
          z-index: 0;
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
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.35); }
        }

        .game3-platform {
          position: absolute;
          z-index: 2;
          border-radius: 4px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
        }
        /* PLACEHOLDER: platform1.png */
        .game3-platform--type1 {
          background: linear-gradient(180deg, #a07850 0%, #6b4c30 100%);
          border: 2px solid #c49a6c;
        }
        /* PLACEHOLDER: platform2.png */
        .game3-platform--type2 {
          background: linear-gradient(180deg, #7cb87c 0%, #4a8a4a 100%);
          border: 2px solid #9ed49e;
        }

        /* PLACEHOLDER: phihanhgia3.png — phi hành gia */
        .game3-astronaut {
          position: absolute;
          left: 4%;
          bottom: 14%;
          width: clamp(36px, 7vw, 52px);
          height: clamp(36px, 7vw, 52px);
          z-index: 4;
          background: #ff6b9d;
          border: 2px solid #fff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          transition: transform 1s ease, bottom 1s ease;
        }
        .game3-astronaut::after {
          content: "🧑‍🚀";
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(18px, 3.5vw, 26px);
        }
        .game3-astronaut--lift {
          bottom: 78%;
          transform: translateX(280%) scale(0.9);
        }

        /* PLACEHOLDER: door.png — cổng thoát */
        .game3-portal {
          position: absolute;
          left: 50%;
          top: 3.5%;
          transform: translateX(-50%);
          width: clamp(40px, 8vw, 56px);
          height: clamp(40px, 8vw, 56px);
          z-index: 3;
          border-radius: 50%;
          background: rgba(100, 100, 100, 0.65);
          border: 3px solid #888;
          transition: background 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease;
        }
        .game3-portal--active {
          background: rgba(0, 200, 255, 0.55);
          border-color: #00ffff;
          box-shadow: 0 0 24px rgba(0, 255, 255, 0.65);
          animation: game3-portal-pulse 1.2s ease-in-out infinite;
        }
        @keyframes game3-portal-pulse {
          0%, 100% { box-shadow: 0 0 16px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 32px rgba(0, 255, 255, 0.9); }
        }

        .game3-hud {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 20;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .game3-hud__item {
          background: rgba(0, 0, 0, 0.6);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--g3-accent);
          color: var(--g3-text);
          font-size: clamp(11px, 2.2vw, 13px);
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          white-space: nowrap;
        }

        .game3-question-box {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -58%);
          z-index: 15;
          width: min(92%, 520px);
          max-height: 42%;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.85);
          padding: clamp(12px, 2.5vw, 18px);
          border-radius: 10px;
          border: 2px solid var(--g3-accent);
          color: var(--g3-text);
          text-align: center;
          box-sizing: border-box;
        }
        .game3-question-box__label {
          font-size: clamp(10px, 2vw, 12px);
          color: #ccc;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .game3-question-box__text {
          font-size: clamp(0.92rem, 2.6vw, 1.15rem);
          font-weight: bold;
          line-height: 1.45;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .game3-answers {
          position: absolute;
          bottom: 12px;
          left: 12px;
          right: 12px;
          z-index: 18;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        @media (max-width: 520px) {
          .game3-answers { grid-template-columns: 1fr; }
        }

        .game3-answer-btn {
          background: rgba(0, 0, 0, 0.6);
          border: 2px solid var(--g3-accent);
          color: white;
          font-size: clamp(12px, 2.4vw, 14px);
          font-weight: bold;
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
          transition: transform 0.1s, background 0.2s;
          min-height: 48px;
          line-height: 1.3;
        }
        .game3-answer-btn:not(:disabled):active {
          transform: scale(0.96);
          background: rgba(74, 144, 226, 0.8);
        }
        .game3-answer-btn:disabled { cursor: default; }
        .game3-answer-btn__badge {
          flex-shrink: 0;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #ffd700;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          border: 2px solid #ffb300;
        }
        .game3-answer-btn--selected {
          border-color: #ffd700;
          background: rgba(74, 144, 226, 0.45);
        }
        .game3-answer-btn--correct {
          border-color: #66bb6a;
          background: rgba(46, 125, 50, 0.75);
        }
        .game3-answer-btn--wrong {
          border-color: #ef5350;
          background: rgba(198, 40, 40, 0.75);
        }
        .game3-answer-btn--dim { opacity: 0.45; }

        .game3-hint-wrap {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 20;
        }
        .game3-hint-wrap button {
          background: rgba(0, 0, 0, 0.6) !important;
          border: 2px solid var(--g3-accent) !important;
          color: white !important;
        }

        .game3-confirm-wrap {
          position: absolute;
          bottom: 12px;
          left: 12px;
          right: 12px;
          z-index: 19;
          transform: translateY(calc(-100% - 52px));
        }
        .game3-confirm-wrap p { color: #ccc !important; }

        .game3-overlay {
          position: absolute;
          inset: 0;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.82);
          color: white;
          text-align: center;
          padding: 20px;
        }
        .game3-overlay__title {
          font-size: clamp(1.4rem, 5vw, 2rem);
          font-weight: 900;
          margin: 0 0 12px;
        }
        .game3-overlay__title--win { color: #ffeb3b; }
        .game3-overlay__title--lose { color: #ff6464; }
        .game3-overlay__sub {
          font-size: clamp(0.95rem, 3vw, 1.15rem);
          margin: 0;
          color: #eee;
        }

        .game3-instructions {
          position: absolute;
          bottom: 12px;
          left: 12px;
          z-index: 5;
          color: #ccc;
          font-size: 11px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          pointer-events: none;
          opacity: 0.7;
          display: none;
        }
        @media (min-width: 900px) {
          .game3-instructions { display: block; }
          .game3-answers { bottom: 48px; }
        }
      `}</style>

      <audio ref={correctSoundRef} src={`${publicUrl}/game-noises/dung.mp3`} preload="auto" />
      <audio ref={wrongSoundRef} src={`${publicUrl}/game-noises/wrong.mp3`} preload="auto" />

      <div className="game3-arena">
        {/* PLACEHOLDER nền */}
        <div className="game3-bg-placeholder" aria-hidden />

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
          <Platform key={i} {...p} />
        ))}

        <div
          className={`game3-portal${portalActive ? " game3-portal--active" : ""}`}
          aria-label="Cổng thoát"
          title="Cổng thoát"
        />

        <div
          className={`game3-astronaut${astronautLift ? " game3-astronaut--lift" : ""}`}
          aria-hidden
        />

        <div className="game3-hud">
          <div className="game3-hud__item">🏆 Đúng: {correctCount}/{totalQuestions}</div>
          <div className="game3-hud__item">🚀 Câu: {current + 1}/{totalQuestions}</div>
          <div className="game3-hud__item">⏱️ {elapsedSec}s</div>
        </div>

        {hasHintFeature && (
          <div className="game3-hint-wrap">
            <GameHintButton
              hintsRemaining={hintsRemaining}
              disabled={
                locked ||
                !canUseHint(currentQuestion.id, currentQuestion.answers)
              }
              onUse={() => applyHint(currentQuestion.id, currentQuestion.answers)}
              style={{ margin: 0 }}
            />
          </div>
        )}

        {!locked && !levelTransition && (
          <div className="game3-question-box">
            <div className="game3-question-box__label">Câu hỏi</div>
            <div className="game3-question-box__text">
              {currentQuestion.question_text}
            </div>
            {questionImageSrc && (
              <div style={{ marginTop: 10 }}>
                <GameQuestionImageZoom
                  src={questionImageSrc}
                  onThumbError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = "none";
                  }}
                  thumbStyle={{
                    maxHeight: 120,
                    objectFit: "contain",
                    backgroundColor: "#fff",
                    borderRadius: 6,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {!levelTransition && (
          <div className="game3-answers">
            {currentQuestion.answers.map((ans, i) => {
              if (getHiddenIndices(currentQuestion.id).has(i)) return null;

              const pending = mcq.getPendingIndices(currentQuestion.id);
              const confirmed = mcq.getConfirmedIndices(currentQuestion.id);
              const vis = getMcqAnswerVisualState(pending, confirmed, i, ans);

              let stateClass = "";
              if (!vis.locked && vis.isSelected) stateClass = "game3-answer-btn--selected";
              else if (vis.locked) {
                if (vis.tone === "correct" || vis.tone === "missed") {
                  stateClass = "game3-answer-btn--correct";
                } else if (vis.tone === "wrong") {
                  stateClass = "game3-answer-btn--wrong";
                } else {
                  stateClass = "game3-answer-btn--dim";
                }
              }

              return (
                <button
                  key={i}
                  type="button"
                  className={`game3-answer-btn ${stateClass}`}
                  onClick={() => handleAnswer(ans, i)}
                  disabled={locked}
                >
                  <span className="game3-answer-btn__badge">{getAnswerLabel(i)}</span>
                  <span>{ans.text}</span>
                </button>
              );
            })}
          </div>
        )}

        {isMulti && !locked && !levelTransition && (
          <div className="game3-confirm-wrap">
            <GameMcqConfirmBar
              answers={currentQuestion.answers}
              pendingIndices={mcq.getPendingIndices(currentQuestion.id)}
              disabled={locked}
              onConfirm={confirmMultiAnswer}
            />
          </div>
        )}

        <div className="game3-instructions" aria-hidden>
          <div>Chọn đáp án đúng để mở cổng</div>
        </div>

        {levelTransition && (
          <div className="game3-overlay">
            <h2 className="game3-overlay__title game3-overlay__title--win">
              🎉 CÂU {current + 1} HOÀN THÀNH! 🎉
            </h2>
            <p className="game3-overlay__sub">
              Chuẩn bị câu {current + 2}...
            </p>
          </div>
        )}

        {feedback === "wrong" && !levelTransition && (
          <div className="game3-overlay">
            <h2 className="game3-overlay__title game3-overlay__title--lose">
              💥 GAME OVER 💥
            </h2>
            <p className="game3-overlay__sub">Bạn đã trả lời sai!</p>
          </div>
        )}
      </div>
    </div>
  );
}
