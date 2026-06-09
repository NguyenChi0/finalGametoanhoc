import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { questionImageUrl } from "../../api";
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

const ADVANCE_DELAY_MS = 1000;

function answerButtonStyle(pending, confirmed, ai, answer) {
  const base = {
    padding: "12px 16px",
    borderRadius: 40,
    fontSize: 18,
    fontWeight: 600,
    cursor: confirmed === undefined ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    width: "100%",
    boxSizing: "border-box",
  };

  const vis = getMcqAnswerVisualState(pending, confirmed, ai, answer);
  if (!vis.locked) {
    return {
      ...base,
      backgroundColor: vis.isSelected ? "#bbdefb" : "#f0f6fa",
      color: "#0f4c75",
      border: vis.isSelected ? "2px solid #1976d2" : "2px solid #d0dfe8",
    };
  }

  const chosen = vis.isSelected;
  if (chosen && answer.correct) {
    return {
      ...base,
      backgroundColor: "#4caf50",
      color: "#fff",
      border: "2px solid #388e3c",
    };
  }
  if (chosen && !answer.correct) {
    return {
      ...base,
      backgroundColor: "#e57373",
      color: "#fff",
      border: "2px solid #c62828",
    };
  }
  if (!chosen && answer.correct) {
    return {
      ...base,
      backgroundColor: "#c8e6c9",
      color: "#1b5e20",
      border: "2px solid #4caf50",
    };
  }
  return {
    ...base,
    backgroundColor: "#f5f5f5",
    color: "#757575",
    border: "2px solid #e0e0e0",
  };
}

export default function Game10({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const mcq = useGameMcqSelection();
  const [scoreSent, setScoreSent] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const advanceTimerRef = useRef(null);
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
  const allAnswered =
    qs.length > 0 && qs.every((q) => mcq.isLocked(q.id));

  const goToNextQuestion = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, qs.length));
  }, [qs.length]);

  const resetGame = useCallback(() => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setShuffleSeed((s) => s + 1);
    setCurrentIndex(0);
    mcq.resetAll();
    setCorrectCount(0);
    setScoreSent(false);
    resetHints();
  }, [resetHints, mcq]);

  const afterAnswer = useCallback(
    (qId, answers, ok) => {
      if (ok) setCorrectCount((prev) => prev + 1);
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = window.setTimeout(() => {
        advanceTimerRef.current = null;
        goToNextQuestion();
      }, ADVANCE_DELAY_MS);
    },
    [goToNextQuestion]
  );

  const choose = useCallback(
    (qId, answers, ansIdx) => {
      if (mcq.isLocked(qId)) return;
      const ok = mcq.toggleIndex(qId, answers, ansIdx);
      if (ok !== null) afterAnswer(qId, answers, ok);
    },
    [mcq, afterAnswer]
  );

  const confirmCurrent = useCallback(() => {
    const q = currentQuestion;
    if (!q || mcq.isLocked(q.id)) return;
    const ok = mcq.confirmPending(q.id, q.answers);
    afterAnswer(q.id, q.answers, ok);
  }, [currentQuestion, mcq, afterAnswer]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scoreSent && allAnswered && correctCount > 0) {
      const userId =
        payload?.user?.id ||
        (localStorage.getItem("user") &&
          JSON.parse(localStorage.getItem("user")).id);

      if (!userId) {
        setScoreSent(true);
        onLessonComplete?.(correctCount);
        return;
      }

      incrementLessonScore(userId, correctCount, payload).then(() => {
        setScoreSent(true);
      });
      onLessonComplete?.(correctCount);
    } else if (!scoreSent && allAnswered) {
      setScoreSent(true);
      onLessonComplete?.(correctCount);
    }
  }, [allAnswered, correctCount, scoreSent, payload, onLessonComplete]);

  if (qs.length === 0) {
    return (
      <p style={{ color: "#455a64", textAlign: "center", padding: 24 }}>
        Không có câu hỏi cho bài học này.
      </p>
    );
  }

  if (allAnswered) {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={correctCount}
        totalQuestions={qs.length}
        onReplay={resetGame}
        height="75vh"
      />
    );
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
    <div className="game10-quiz">
      <style>{`
        .game10-quiz .game10-question-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px 24px 28px;
          box-shadow: 0 10px 36px rgba(0, 0, 0, 0.08);
        }
        .game10-quiz .game10-question-progress {
          margin: 0 0 16px;
          text-align: center;
          color: #3282b8;
          font-weight: 600;
          font-size: 16px;
        }
        .game10-quiz .game10-question-text {
          margin: 0 0 16px;
          color: #0f4c75;
          font-size: clamp(1.15rem, 3.2vw, 1.75rem);
          text-align: center;
          line-height: 1.35;
        }
        .game10-quiz .game10-answer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 8px;
        }
        @media (max-width: 640px) {
          .game10-quiz .game10-answer-grid {
            grid-template-columns: 1fr;
          }
          .game10-quiz .game10-question-card {
            padding: 20px 16px 24px;
          }
        }
      `}</style>

      <section className="game10-question-card">
        <p className="game10-question-progress">
          Câu {currentIndex + 1} / {qs.length}
        </p>

        <h2 className="game10-question-text">
          {currentQuestion.question_text}
        </h2>

        {qImgSrc && (
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <GameQuestionImageZoom
              src={qImgSrc}
              alt=""
              thumbStyle={{
                maxWidth: "100%",
                maxHeight: 280,
                objectFit: "contain",
                borderRadius: 12,
              }}
            />
          </div>
        )}

        {hasHintFeature && (
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <GameHintButton
              hintsRemaining={hintsRemaining}
              disabled={
                !canUseHint(currentQuestion.id, currentQuestion.answers) || qLocked
              }
              onUse={() => applyHint(currentQuestion.id, currentQuestion.answers)}
            />
          </div>
        )}

        <div className="game10-answer-grid">
          {currentQuestion.answers.map((a, ai) => {
            if (hiddenIndices.has(ai)) return null;
            return (
            <button
              key={a.id ?? ai}
              type="button"
              disabled={qLocked}
              onClick={() => choose(qId, currentQuestion.answers, ai)}
              style={answerButtonStyle(pending, confirmed, ai, a)}
            >
              {a.text && <span>{a.text}</span>}
              {a.image && (
                <img
                  src={questionImageUrl(a.image) || a.image}
                  alt=""
                  style={{
                    maxHeight: 44,
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
                />
              )}
              {!a.text && !a.image && <span>—</span>}
            </button>
            );
          })}
        </div>

        {isMulti && !qLocked && (
          <GameMcqConfirmBar
            answers={currentQuestion.answers}
            pendingIndices={pending}
            disabled={qLocked}
            onConfirm={confirmCurrent}
          />
        )}
      </section>
    </div>
  );
}
