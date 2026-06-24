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
import GameMcqConfirmBar from "./GameMcqConfirmBar";
import {
  getMcqAnswerVisualState,
  useGameMcqSelection,
} from "../lib/useGameMcqSelection";
import game1Background from "../../assets/game-images/game1/background.png";
import game1ChooseSfx from "../../assets/game-images/game1/choose.mp3";
import game1BackIcon from "../../assets/game-images/back.png";
import game1MusicOnIcon from "../../assets/game-images/music_on.png";
import game1MusicOffIcon from "../../assets/game-images/music-off.png";
import game1SoundOnIcon from "../../assets/game-images/sound_on.png";
import game1SoundOffIcon from "../../assets/game-images/sound-off.png";
import game1RestartIcon from "../../assets/game-images/restart.png";

const ADVANCE_DELAY_MS = 1200;
const GAME1_FONT = '"FTV School Book New", Georgia, "Times New Roman", serif';
const GAME1_CHALK = "#f5f5f0";

function getChalkOvalTone(pending, confirmed, ai, answer) {
  const vis = getMcqAnswerVisualState(pending, confirmed, ai, answer);
  if (!vis.locked) {
    return vis.isSelected ? "pending" : null;
  }
  if (vis.tone === "correct" || vis.tone === "missed") return "correct";
  if (vis.tone === "wrong") return "wrong";
  return null;
}

function Game1ChalkOval({ tone, idSuffix, className = "" }) {
  if (!tone) return null;
  const stroke =
    tone === "correct"
      ? "#9dffaa"
      : tone === "wrong"
        ? "#ff8a8a"
        : "rgba(255, 255, 255, 0.92)";
  const filterId = `game1-chalk-${idSuffix}`;

  return (
    <svg
      className={`game1-chalk-oval ${className}`.trim()}
      viewBox="0 0 300 64"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <filter id={filterId} x="-8%" y="-12%" width="116%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <path
        d="M 22 34 C 16 17, 54 9, 102 8 C 162 7, 232 12, 274 23 C 294 29, 288 49, 246 55 C 168 63, 68 59, 30 48 C 14 42, 12 36, 22 34 Z"
        fill="none"
        stroke={stroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
        opacity="0.96"
      />
    </svg>
  );
}

export default function Game10({ payload, onLessonComplete }) {
  const navigate = useNavigate();
  const questions = payload?.questions || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameScreen, setGameScreen] = useState("playing");
  const mcq = useGameMcqSelection();
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const advanceTimerRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const chooseSoundRef = useRef(null);

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

  const currentQuestion = qs[currentIndex] ?? null;
  const sessionComplete = qs.length > 0 && currentIndex >= qs.length;

  useEffect(() => {
    chooseSoundRef.current = new Audio(game1ChooseSfx);
    chooseSoundRef.current.volume = 0.85;
    backgroundMusicRef.current = new Audio(`${publicUrl}/music/nhac1.mp3`);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.5;
    backgroundMusicRef.current.play().catch(() => {});

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
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

  function playChooseSound() {
    if (soundEnabled && chooseSoundRef.current) {
      chooseSoundRef.current.currentTime = 0;
      chooseSoundRef.current.play().catch(() => {});
    }
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

  const goToNextQuestion = useCallback(() => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setAwaitingContinue(false);
    setCurrentIndex((prev) => Math.min(prev + 1, qs.length));
  }, [qs.length]);

  const finishGame = useCallback(
    (totalCorrect) => {
      const userId =
        payload?.user?.id ||
        (localStorage.getItem("user") &&
          JSON.parse(localStorage.getItem("user")).id);

      if (!userId || totalCorrect <= 0) {
        setGameScreen("finished");
        onLessonComplete?.(totalCorrect);
        return;
      }

      incrementLessonScore(userId, totalCorrect, payload).then(() => {
        setGameScreen("finished");
      });
      onLessonComplete?.(totalCorrect);
    },
    [payload, onLessonComplete]
  );

  useEffect(() => {
    if (sessionComplete && gameScreen === "playing") {
      finishGame(correctCount);
    }
  }, [sessionComplete, correctCount, gameScreen, finishGame]);

  const resetGame = useCallback(() => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setShuffleSeed((s) => s + 1);
    setCurrentIndex(0);
    mcq.resetAll();
    setCorrectCount(0);
    setAwaitingContinue(false);
    setGameScreen("playing");
    resetHints();
    if (musicEnabled && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(() => {});
    }
  }, [resetHints, mcq, musicEnabled]);

  const afterAnswer = useCallback(
    (_qId, _answers, ok) => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }

      if (ok) {
        setCorrectCount((prev) => prev + 1);
        setAwaitingContinue(false);
        advanceTimerRef.current = window.setTimeout(() => {
          advanceTimerRef.current = null;
          goToNextQuestion();
        }, ADVANCE_DELAY_MS);
      } else {
        setAwaitingContinue(true);
      }
    },
    [goToNextQuestion]
  );

  const choose = useCallback(
    (qId, answers, ansIdx) => {
      if (mcq.isLocked(qId)) return;
      playChooseSound();
      const ok = mcq.toggleIndex(qId, answers, ansIdx);
      if (ok !== null) afterAnswer(qId, answers, ok);
    },
    [mcq, afterAnswer, soundEnabled]
  );

  const confirmCurrent = useCallback(() => {
    const q = currentQuestion;
    if (!q || mcq.isLocked(q.id)) return;
    const ok = mcq.confirmPending(q.id, q.answers);
    afterAnswer(q.id, q.answers, ok);
  }, [currentQuestion, mcq, afterAnswer]);

  if (qs.length === 0) {
    return (
      <p style={{ color: "#455a64", textAlign: "center", padding: 24 }}>
        Không có câu hỏi cho bài học này.
      </p>
    );
  }

  if (gameScreen === "finished") {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={correctCount}
        totalQuestions={qs.length}
        onReplay={resetGame}
        onHome={handleComeback}
        homeLabel="Về bài học"
        fullBleed
      />
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const qId = currentQuestion.id;
  const pending = mcq.getPendingIndices(qId);
  const confirmed = mcq.getConfirmedIndices(qId);
  const hiddenIndices = getHiddenIndices(qId);
  const qLocked = mcq.isLocked(qId);
  const isMulti = mcq.isMultiCorrectQuestion(currentQuestion.answers);
  const qImgSrc = currentQuestion.question_image
    ? questionImageUrl(currentQuestion.question_image) || currentQuestion.question_image
    : null;

  return (
    <div className="game1-play">
      <style>{`
        @font-face {
          font-family: "FTV School Book New";
          src: url(${publicUrl}/fonts/1FTV-School-Book-New.otf) format("opentype");
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        .game1-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          background-color: #2d6a4f;
          background-image: url(${game1Background});
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          font-family: "FTV School Book New", Georgia, "Times New Roman", serif;
          color: ${GAME1_CHALK};
        }
        .game1-play .game1-question-badge,
        .game1-play .game1-question-text,
        .game1-play .game1-answer-btn,
        .game1-play .game1-answer-label,
        .game1-play .game1-answer-content,
        .game1-play .game1-continue-btn,
        .game1-play .game1-action-footer button,
        .game1-play .game1-action-footer p {
          color: ${GAME1_CHALK};
          font-family: "FTV School Book New", Georgia, "Times New Roman", serif;
        }
        .game1-chalk-text {
          color: ${GAME1_CHALK};
          text-shadow:
            0 0 1px rgba(255, 255, 255, 0.55),
            0 1px 2px rgba(0, 0, 0, 0.28),
            1px 2px 0 rgba(0, 0, 0, 0.12);
        }
        .game1-controls {
          flex: 0 0 10%;
          max-width: 10%;
          min-width: 0;
          position: static;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(4px, 0.8vh, 6px);
          box-sizing: border-box;
        }
        .game1-content {
          flex: 1;
          min-height: 0;
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(6px, 1vh, 10px);
          padding: clamp(8px, 1.5vh, 14px) clamp(10px, 1.5vw, 16px);
          box-sizing: border-box;
          overflow: hidden;
        }
        .game1-question-panel {
          flex: 0 0 50%;
          max-height: 50%;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding-left: 5%;
          box-sizing: border-box;
        }
        .game1-question-row {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: clamp(6px, 1vw, 10px);
          box-sizing: border-box;
        }
        .game1-top-text {
          flex: 0 0 40%;
          max-width: 40%;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          box-sizing: border-box;
          overflow-y: auto;
          padding: clamp(4px, 1vw, 8px);
        }
        .game1-top-image {
          flex: 0 0 40%;
          max-width: 40%;
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: clamp(4px, 0.8vh, 8px);
        }
        .game1-control-btn {
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          line-height: 0;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }
        .game1-control-btn:hover { transform: scale(1.06); }
        .game1-control-btn:active { transform: scale(0.96); }
        .game1-control-btn img {
          display: block;
          width: clamp(28px, 6vw, 44px);
          height: auto;
          pointer-events: none;
        }
        .game1-question-badge {
          margin: 0 0 clamp(6px, 1vh, 10px);
          font-size: clamp(1.15rem, 3vw, 1.5rem);
          line-height: 1.25;
          text-transform: lowercase;
          text-align: center;
        }
        .game1-question-text {
          margin: 0;
          width: 100%;
          font-size: clamp(1.35rem, 4vw, 2rem);
          line-height: 1.45;
          text-align: center;
        }
        .game1-question-image-wrap {
          width: 100%;
          height: 100%;
          max-height: 100%;
          padding: clamp(8px, 1.2vw, 12px);
          background: #fff;
          border-radius: 8px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game1-question-image-wrap button {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game1-question-image-wrap img {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: auto !important;
          height: auto !important;
          object-fit: contain;
          margin: auto;
        }
        .game1-answers-section {
          flex: 0 0 50%;
          max-height: 50%;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: clamp(8px, 1.5vh, 12px);
          overflow-y: auto;
          box-sizing: border-box;
          padding: clamp(4px, 1vw, 8px);
        }
        .game1-hint-row {
          display: flex;
          justify-content: center;
          flex-shrink: 0;
        }
        .game1-answer-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-auto-rows: minmax(52px, auto);
          gap: clamp(8px, 1.5vw, 12px);
          align-items: stretch;
          width: 50%;
          max-width: 50%;
          margin: 0 auto;
        }
        .game1-answer-wrap {
          position: relative;
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: stretch;
        }
        .game1-chalk-oval {
          position: absolute;
          left: 50%;
          top: 50%;
          width: calc(100% + 20px);
          height: calc(100% + 12px);
          transform: translate(-50%, -50%) scale(1.2);
          pointer-events: none;
          z-index: 0;
        }
        .game1-chalk-oval--hover {
          opacity: 0;
          transition: opacity 0.18s ease;
        }
        .game1-answer-wrap:hover:not(.game1-answer-wrap--locked) .game1-chalk-oval--hover {
          opacity: 1;
        }
        .game1-answer-wrap--has-feedback .game1-chalk-oval--hover {
          opacity: 0;
        }
        .game1-answer-btn {
          position: relative;
          z-index: 1;
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          align-items: center;
          min-height: 44px;
          padding: 8px 6px;
          font-family: "FTV School Book New", Georgia, "Times New Roman", serif;
          font-size: clamp(1.1rem, 3vw, 1.45rem);
          line-height: 1.35;
          text-align: left;
          background: transparent;
          border: none;
          box-shadow: none;
          outline: none;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .game1-answer-btn:disabled {
          cursor: default;
        }
        .game1-answer-btn--neutral-locked {
          opacity: 0.55;
        }
        .game1-answer-label,
        .game1-answer-content {
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
        }
        .game1-answer-label {
          flex-shrink: 0;
        }
        .game1-answer-content {
          min-width: 0;
          word-break: break-word;
        }
        .game1-answer-wrap.hidden-answer {
          visibility: hidden;
          opacity: 0;
          pointer-events: none;
        }
        .game1-answer-btn:not(:disabled):hover {
          transform: none;
        }
        .game1-answer-btn:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.65);
          outline-offset: 3px;
        }
        .game1-action-footer {
          flex-shrink: 0;
          min-height: 52px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .game1-action-footer p {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
        }
        .game1-action-footer button[type="button"] {
          background: transparent !important;
          border: 2.5px solid rgba(255, 255, 255, 0.82) !important;
          color: ${GAME1_CHALK} !important;
          border-radius: 999px !important;
          box-shadow: none !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
        }
        .game1-action-footer button[type="button"]:disabled {
          opacity: 0.45 !important;
          border-color: rgba(255, 255, 255, 0.35) !important;
        }
        .game1-continue-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 32px;
          min-width: 140px;
          font-size: clamp(1rem, 2.8vw, 1.15rem);
          background: transparent;
          border: 2.5px solid rgba(255, 255, 255, 0.82);
          border-radius: 999px;
          cursor: pointer;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .game1-continue-btn:hover {
          transform: scale(1.04);
          background: rgba(255, 255, 255, 0.08);
        }
        @media (max-width: 768px) {
          .game1-content {
            padding: 8px;
            overflow-y: auto;
          }
          .game1-question-panel,
          .game1-answers-section {
            flex: 0 0 auto;
            max-height: none;
            width: 100%;
          }
          .game1-question-row {
            flex-wrap: wrap;
            height: auto;
          }
          .game1-top-text {
            flex: 0 0 100%;
            max-width: 100%;
            order: 1;
          }
          .game1-top-image {
            flex: 0 0 65%;
            max-width: 65%;
            order: 2;
            min-height: 100px;
            max-height: 28vh;
          }
          .game1-controls {
            flex: 0 0 35%;
            max-width: 35%;
            order: 3;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }
          .game1-answer-grid {
            width: 100%;
            max-width: 100%;
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="game1-content">
        <div className="game1-question-panel">
          <div className="game1-question-row">
            <div className="game1-top-text">
              <p className="game1-question-badge game1-chalk-text">
                câu {currentIndex + 1}/{qs.length}
              </p>
              <p className="game1-question-text game1-chalk-text">{currentQuestion.question_text}</p>
            </div>

            {qImgSrc ? (
              <div className="game1-top-image">
                <div className="game1-question-image-wrap">
                  <GameQuestionImageZoom
                    src={qImgSrc}
                    alt=""
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
              </div>
            ) : (
              <div className="game1-top-image" aria-hidden="true" />
            )}

            <div className="game1-controls">
              <button
                type="button"
                className="game1-control-btn"
                onPointerDown={stopControlPointer}
                onClick={handleComeback}
                aria-label="Quay lại"
              >
                <img src={game1BackIcon} alt="" />
              </button>
              <button
                type="button"
                className="game1-control-btn"
                onPointerDown={stopControlPointer}
                onClick={() => setMusicEnabled((p) => !p)}
                aria-label={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}
              >
                <img src={musicEnabled ? game1MusicOnIcon : game1MusicOffIcon} alt="" />
              </button>
              <button
                type="button"
                className="game1-control-btn"
                onPointerDown={stopControlPointer}
                onClick={() => setSoundEnabled((p) => !p)}
                aria-label={soundEnabled ? "Tắt tiếng" : "Bật tiếng"}
              >
                <img src={soundEnabled ? game1SoundOnIcon : game1SoundOffIcon} alt="" />
              </button>
              <button
                type="button"
                className="game1-control-btn"
                onPointerDown={stopControlPointer}
                onClick={resetGame}
                aria-label="Chơi lại"
              >
                <img src={game1RestartIcon} alt="" />
              </button>
            </div>
          </div>
        </div>

        <div className="game1-answers-section">
          {hasHintFeature && (
            <div className="game1-hint-row">
              <GameHintButton
                hintsRemaining={hintsRemaining}
                disabled={!canUseHint(currentQuestion.id, currentQuestion.answers) || qLocked}
                onUse={() => applyHint(currentQuestion.id, currentQuestion.answers)}
              />
            </div>
          )}

          <div className="game1-answer-grid">
            {currentQuestion.answers.map((a, ai) => {
              const hidden = hiddenIndices.has(ai);
              const ovalTone = hidden ? null : getChalkOvalTone(pending, confirmed, ai, a);
              const vis = getMcqAnswerVisualState(pending, confirmed, ai, a);
              const neutralLocked = vis.locked && vis.tone === "neutral";

              return (
                <div
                  key={a.id ?? ai}
                  className={`game1-answer-wrap${hidden ? " hidden-answer" : ""}${qLocked || hidden ? " game1-answer-wrap--locked" : ""}${ovalTone ? " game1-answer-wrap--has-feedback" : ""}`}
                >
                  {!hidden && !qLocked && (
                    <Game1ChalkOval
                      tone="hover"
                      idSuffix={`hover-${qId}-${ai}`}
                      className="game1-chalk-oval--hover"
                    />
                  )}
                  <Game1ChalkOval tone={ovalTone} idSuffix={`${qId}-${ai}`} />
                  <button
                    type="button"
                    className={`game1-answer-btn game1-chalk-text${neutralLocked ? " game1-answer-btn--neutral-locked" : ""}`}
                    disabled={qLocked || hidden}
                    onClick={() => choose(qId, currentQuestion.answers, ai)}
                  >
                    {!hidden && (
                      <>
                        <span className="game1-answer-label">{getAnswerLabel(ai)}.</span>
                        <span className="game1-answer-content">
                          {a.text ||
                            (a.image ? (
                              <img
                                src={questionImageUrl(a.image) || a.image}
                                alt=""
                                style={{
                                  maxHeight: 40,
                                  maxWidth: "100%",
                                  objectFit: "contain",
                                  verticalAlign: "middle",
                                }}
                              />
                            ) : (
                              "—"
                            ))}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="game1-action-footer">
            {isMulti && !qLocked && (
              <GameMcqConfirmBar
                answers={currentQuestion.answers}
                pendingIndices={pending}
                disabled={qLocked}
                onConfirm={confirmCurrent}
                showHint={false}
              />
            )}

            {qLocked && awaitingContinue && (
              <button type="button" className="game1-continue-btn game1-chalk-text" onClick={goToNextQuestion}>
                Tiếp tục
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
