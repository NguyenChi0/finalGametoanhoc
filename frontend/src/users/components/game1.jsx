import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { questionImageUrl } from "../../api";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import GameHintButton from "./GameHintButton";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { incrementLessonScore } from "../lib/lessonScore";
import { useLessonHints } from "../lib/useLessonHints";
import { prepareSessionQuestions } from "../lib/lessonQuestions";
import { isSelectionCorrect, normalizeSelected } from "../lib/questionScoring";
import { useMultiMcqSelection } from "../lib/useMultiMcqSelection";

const ADVANCE_DELAY_MS = 1000;

function answerButtonStyle(sel, ai, answer, pendingMulti, isPending) {
  const base = {
    padding: "12px 16px",
    borderRadius: 40,
    fontSize: 18,
    fontWeight: 600,
    cursor: sel === undefined && !pendingMulti ? "pointer" : pendingMulti ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    width: "100%",
    boxSizing: "border-box",
  };

  if (sel === undefined && !pendingMulti) {
    return {
      ...base,
      backgroundColor: isPending ? "#d0dfe8" : "#f0f6fa",
      color: "#0f4c75",
      border: isPending ? "2px solid #0f4c75" : "2px solid #d0dfe8",
    };
  }

  if (pendingMulti && isPending) {
    return {
      ...base,
      backgroundColor: "#0f4c75",
      color: "#fff",
      border: "2px solid #0f4c75",
    };
  }

  const norm = normalizeSelected(sel);
  const chosen = norm.includes(ai);
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
  const [selected, setSelected] = useState({});
  const [correctCount, setCorrectCount] = useState(0);
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
    qs.length > 0 && Object.keys(selected).length === qs.length;

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
    setSelected({});
    setCorrectCount(0);
    setScoreSent(false);
    resetHints();
  }, [resetHints]);

  const choose = useCallback(
    (qId, indices) => {
      if (selected[qId] !== undefined) return;

      const q = qs.find((x) => x.id === qId);
      const isCorrect = isSelectionCorrect(indices, q?.answers || []);
      setSelected((prev) => ({ ...prev, [qId]: normalizeSelected(indices) }));
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
      }

      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
      advanceTimerRef.current = window.setTimeout(() => {
        advanceTimerRef.current = null;
        goToNextQuestion();
      }, ADVANCE_DELAY_MS);
    },
    [selected, qs, goToNextQuestion]
  );

  const handleConfirmSelection = useCallback(
    (indices) => {
      const q = qs[currentIndex];
      if (q?.id != null) choose(q.id, indices);
    },
    [qs, currentIndex, choose]
  );

  const {
    multi: multiCurrent,
    onOptionClick,
    confirmMulti,
    isOptionSelected,
    canConfirmMulti,
  } = useMultiMcqSelection(currentQuestion?.answers ?? [], handleConfirmSelection);

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

  const sel = selected[currentQuestion.id];
  const hiddenIndices = getHiddenIndices(currentQuestion.id);
  const qLocked = sel !== undefined;
  const qImgSrc = currentQuestion.question_image
    ? questionImageUrl(currentQuestion.question_image) || currentQuestion.question_image
    : null;

  return (
    <div className="game10-quiz">
      <style>{`
        .game10-quiz .game10-answer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 640px) {
          .game10-quiz .game10-answer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <p
        style={{
          margin: "0 0 12px",
          textAlign: "center",
          color: "#3282b8",
          fontWeight: 600,
          fontSize: 16,
        }}
      >
        Câu {currentIndex + 1} / {qs.length}
      </p>

      <section
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: "28px 24px",
          boxShadow: "0 10px 36px rgba(0,0,0,0.08)",
        }}
      >
        <h2
          style={{
            margin: "0 0 16px",
            color: "#0f4c75",
            fontSize: 28,
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
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
          <div style={{ textAlign: "center" }}>
            <GameHintButton
              hintsRemaining={hintsRemaining}
              disabled={
                !canUseHint(currentQuestion.id, currentQuestion.answers) || qLocked
              }
              onUse={() => applyHint(currentQuestion.id, currentQuestion.answers)}
            />
          </div>
        )}

        {multiCurrent && !qLocked ? (
          <p style={{ textAlign: "center", color: "#3282b8", fontWeight: 600, margin: "0 0 8px" }}>
            Chọn tất cả đáp án đúng rồi bấm Xác nhận
          </p>
        ) : null}
        <div className="game10-answer-grid">
          {currentQuestion.answers.map((a, ai) => {
            if (hiddenIndices.has(ai)) return null;
            return (
            <button
              key={a.id ?? ai}
              type="button"
              disabled={qLocked}
              onClick={() => onOptionClick(ai)}
              style={answerButtonStyle(
                sel,
                ai,
                a,
                multiCurrent && !qLocked,
                isOptionSelected(ai)
              )}
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
        {multiCurrent && !qLocked && (
          <button
            type="button"
            disabled={!canConfirmMulti}
            onClick={confirmMulti}
            style={{
              display: "block",
              margin: "12px auto 0",
              padding: "10px 24px",
              borderRadius: 40,
              border: "none",
              background: "#0f4c75",
              color: "#fff",
              fontWeight: 600,
              cursor: canConfirmMulti ? "pointer" : "not-allowed",
              opacity: canConfirmMulti ? 1 : 0.5,
            }}
          >
            Xác nhận
          </button>
        )}
      </section>
    </div>
  );
}
