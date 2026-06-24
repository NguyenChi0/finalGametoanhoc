import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import GameHintButton from "./GameHintButton";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { useLessonHints } from "../lib/useLessonHints";
import { prepareSessionQuestions } from "../lib/lessonQuestions";
import GameMcqConfirmBar from "./GameMcqConfirmBar";
import {
  getMcqAnswerVisualState,
  useGameMcqSelection,
} from "../lib/useGameMcqSelection";
import game1Background from "../../assets/game-images/game1/background.png";
import game1Answer from "../../assets/game-images/game1/answer.png";
import game1BackIcon from "../../assets/game-images/back.png";
import game1MusicOnIcon from "../../assets/game-images/music_on.png";
import game1MusicOffIcon from "../../assets/game-images/music-off.png";
import game1SoundOnIcon from "../../assets/game-images/sound_on.png";
import game1SoundOffIcon from "../../assets/game-images/sound-off.png";
import game1RestartIcon from "../../assets/game-images/restart.png";

const ADVANCE_DELAY_MS = 1200;

function answerButtonStyle(pending, confirmed, ai, answer) {
  const base = {
    padding: "12px 16px",
    borderRadius: 0,
    fontSize: "clamp(0.85rem, 2.2vw, 1rem)",
    fontWeight: 700,
    cursor: confirmed === undefined ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "transparent",
    backgroundImage: `url(${game1Answer})`,
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    border: "none",
    boxShadow: "none",
    outline: "none",
    color: "#0f4c75",
  };

  const vis = getMcqAnswerVisualState(pending, confirmed, ai, answer);
  if (!vis.locked) {
    return {
      ...base,
      color: vis.isSelected ? "#1565c0" : "#0f4c75",
    };
  }

  const chosen = vis.isSelected;
  if (chosen && answer.correct) return { ...base, color: "#1b5e20" };
  if (chosen && !answer.correct) return { ...base, color: "#b71c1c" };
  if (!chosen && answer.correct) return { ...base, color: "#2e7d32" };
  return { ...base, opacity: 0.65, color: "#546e7a" };
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
  const tapSoundRef = useRef(null);

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
    tapSoundRef.current = new Audio(`${publicUrl}/game-noises/dap.mp3`);
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

  function playTapSound() {
    if (soundEnabled && tapSoundRef.current) {
      tapSoundRef.current.currentTime = 0;
      tapSoundRef.current.play().catch(() => {});
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
      playTapSound();
      const ok = mcq.toggleIndex(qId, answers, ansIdx);
      if (ok !== null) afterAnswer(qId, answers, ok);
    },
    [mcq, afterAnswer]
  );

  const confirmCurrent = useCallback(() => {
    const q = currentQuestion;
    if (!q || mcq.isLocked(q.id)) return;
    playTapSound();
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
        .game1-play {
          width: 100%;
          height: calc(100vh - var(--navbar-height, 76px));
          max-height: calc(100vh - var(--navbar-height, 76px));
          background-color: #b5e08a;
          background-image: url(${game1Background});
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
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
          font-weight: 700;
          font-size: clamp(1.05rem, 2.8vw, 1.35rem);
          line-height: 1.2;
          color: #fff;
          text-transform: lowercase;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
          text-align: center;
        }
        .game1-question-text {
          margin: 0;
          width: 100%;
          font-size: clamp(1.2rem, 3.6vw, 1.85rem);
          font-weight: 700;
          color: #fff;
          line-height: 1.45;
          text-align: center;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
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
        .game1-answer-btn {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 52px;
          transition: transform 0.15s ease, opacity 0.15s ease;
          text-align: center;
        }
        .game1-answer-btn.hidden-answer {
          visibility: hidden;
          opacity: 0;
          pointer-events: none;
        }
        .game1-answer-btn:not(:disabled):hover {
          transform: scale(1.04);
        }
        .game1-answer-btn:focus-visible {
          outline: 2px solid #ffd54f;
          outline-offset: 2px;
        }
        .game1-action-footer {
          flex-shrink: 0;
          min-height: 52px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .game1-continue-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 32px;
          min-width: 140px;
          font-size: clamp(0.95rem, 2.5vw, 1.05rem);
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #ff9800, #f57c00);
          border: none;
          border-radius: 24px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
          transition: transform 0.15s ease;
        }
        .game1-continue-btn:hover {
          transform: scale(1.04);
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
              <p className="game1-question-badge">
                câu {currentIndex + 1}/{qs.length}
              </p>
              <p className="game1-question-text">{currentQuestion.question_text}</p>
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
              return (
                <button
                  key={a.id ?? ai}
                  type="button"
                  className={`game1-answer-btn${hidden ? " hidden-answer" : ""}`}
                  disabled={qLocked || hidden}
                  onClick={() => choose(qId, currentQuestion.answers, ai)}
                  style={answerButtonStyle(pending, confirmed, ai, a)}
                >
                  {!hidden && (
                    <>
                      {a.text && <span>{a.text}</span>}
                      {a.image && (
                        <img
                          src={questionImageUrl(a.image) || a.image}
                          alt=""
                          style={{
                            maxHeight: 40,
                            maxWidth: "100%",
                            objectFit: "contain",
                          }}
                        />
                      )}
                      {!a.text && !a.image && <span>—</span>}
                    </>
                  )}
                </button>
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
              <button type="button" className="game1-continue-btn" onClick={goToNextQuestion}>
                Tiếp tục
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
