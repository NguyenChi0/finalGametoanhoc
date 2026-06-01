import React, { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { questionImageUrl } from "../../api";
import GameQuestionImageZoom from "../components/GameQuestionImageZoom";
import QuestionAnswerPicker from "../components/QuestionAnswerPicker";
import { prepareReviewQuestions } from "../lib/lessonQuestions";
import { readReviewSession } from "../lib/playSession";
import { isAnswerSetFullyCorrect } from "../lib/questionScoring";

const QUESTIONS_PER_PAGE = 5;

function lessonSummaryLabel(lessons) {
  const list = Array.isArray(lessons) ? lessons : [];
  if (list.length === 0) return "";
  const names = list
    .map((l) => l.lessonName || `Bài ${l.lessonId}`)
    .slice(0, 3);
  const extra = list.length - names.length;
  if (extra > 0) return `${names.join(", ")} +${extra} bài`;
  return names.join(", ");
}

export default function LessonReviewSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const sessionPayload =
    location.state?.reviewMode && location.state?.batchReview
      ? location.state
      : readReviewSession();

  if (
    !sessionPayload?.reviewMode ||
    !sessionPayload?.batchReview ||
    !Array.isArray(sessionPayload?.questions) ||
    sessionPayload.questions.length === 0
  ) {
    return <Navigate to="/lessons" replace />;
  }

  return (
    <LessonReviewQuiz
      payload={sessionPayload}
      onBack={() => navigate("/lessons")}
    />
  );
}

function LessonReviewQuiz({ payload, onBack }) {
  const lessons = payload.lessons || [];
  const lessonCount = lessons.length;
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  const qs = useMemo(
    () => prepareReviewQuestions(payload.questions),
    [payload.questions, shuffleSeed]
  );

  const totalPages = Math.max(1, Math.ceil(qs.length / QUESTIONS_PER_PAGE));
  const startIndex = currentPage * QUESTIONS_PER_PAGE;
  const currentQuestions = qs.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);

  function choose(qId, selectedIndices) {
    if (finished) return;
    setAnswers((prev) => ({ ...prev, [qId]: selectedIndices }));
  }

  function goToNextPage() {
    if (currentPage < totalPages - 1) setCurrentPage((p) => p + 1);
  }

  function goToPrevPage() {
    if (currentPage > 0) setCurrentPage((p) => p - 1);
  }

  function handleSubmit() {
    let correct = 0;
    for (const q of qs) {
      const sel = answers[q.id];
      if (sel != null && isAnswerSetFullyCorrect(sel, q.answers || [])) correct += 1;
    }
    setScore(correct);
    setFinished(true);
  }

  function handleRetry() {
    setShuffleSeed((s) => s + 1);
    setAnswers({});
    setCurrentPage(0);
    setFinished(false);
    setScore(0);
  }

  if (finished) {
    const totalQ = qs.length || 1;
    const ratio = score / totalQ;
    return (
      <div className="lesson-review-session">
        <main className="lesson-review-session__main">
          <section className="lesson-review-session__result">
            <h1>Hoàn thành ôn tập</h1>
            <p className="lesson-review-session__result-meta">
              {lessonCount} bài · {totalQ} câu
            </p>
            <p className="lesson-review-session__score">
              {score}/{totalQ}
            </p>
            <p>Bạn trả lời đúng {score} trên {totalQ} câu.</p>
            <div className="lesson-review-session__progress">
              <div
                className="lesson-review-session__progress-fill"
                style={{
                  width: `${ratio * 100}%`,
                  backgroundColor: ratio >= 0.7 ? "#4caf50" : "#ff9800",
                }}
              />
            </div>
            <div className="lesson-review-session__result-actions">
              <button type="button" className="lesson-review-session__btn" onClick={handleRetry}>
                Ôn lại
              </button>
              <button
                type="button"
                className="lesson-review-session__btn lesson-review-session__btn--primary"
                onClick={onBack}
              >
                Về bài học
              </button>
            </div>
          </section>
        </main>
        <ReviewSessionStyles />
      </div>
    );
  }

  return (
    <div className="lesson-review-session">
      <main className="lesson-review-session__main">
        <header className="lesson-review-session__header">
          <p className="lesson-review-session__badge">Ôn tập</p>
          <h1 className="lesson-review-session__title">
            {lessonCount} bài · {qs.length} câu
          </h1>
          {lessonSummaryLabel(lessons) ? (
            <p className="lesson-review-session__lessons">{lessonSummaryLabel(lessons)}</p>
          ) : null}
        </header>

        <section className="lesson-review-session__paper">
          {currentQuestions.map((q, index) => {
            const globalIndex = startIndex + index;
            return (
              <article key={q.id} className="lesson-review-session__question">
                <p className="lesson-review-session__question-text">
                  <strong>Câu {globalIndex + 1}:</strong> {q.question_text}
                </p>
                {q.question_image ? (
                  <GameQuestionImageZoom
                    src={questionImageUrl(q.question_image) || q.question_image}
                    alt="Hình câu hỏi"
                    thumbStyle={{ maxWidth: "220px", margin: "8px 0 12px" }}
                  />
                ) : null}
                <QuestionAnswerPicker
                  answers={q.answers || []}
                  value={answers[q.id]}
                  disabled={finished}
                  onConfirm={(indices) => choose(q.id, indices)}
                  classNamePrefix="lesson-review-session"
                  renderPrefix={(ai) => `${String.fromCharCode(65 + ai)}.`}
                />
              </article>
            );
          })}

          <nav className="lesson-review-session__nav">
            <div>
              {currentPage > 0 ? (
                <button type="button" className="lesson-review-session__nav-btn" onClick={goToPrevPage}>
                  ← Trang trước
                </button>
              ) : null}
            </div>
            <span className="lesson-review-session__page-info">
              Trang {currentPage + 1} / {totalPages}
            </span>
            <div>
              {currentPage < totalPages - 1 ? (
                <button type="button" className="lesson-review-session__nav-btn" onClick={goToNextPage}>
                  Trang sau →
                </button>
              ) : (
                <button
                  type="button"
                  className="lesson-review-session__submit-btn"
                  onClick={handleSubmit}
                >
                  Nộp bài
                </button>
              )}
            </div>
          </nav>
        </section>
      </main>
      <ReviewSessionStyles />
    </div>
  );
}

function ReviewSessionStyles() {
  return (
    <style>{`
      .lesson-review-session {
        min-height: calc(100vh - 64px);
        background: linear-gradient(180deg, #eef2ff 0%, #f8f9ff 40%, #fff 100%);
        padding: 24px 16px 40px;
        box-sizing: border-box;
      }
      .lesson-review-session__main {
        max-width: 820px;
        margin: 0 auto;
      }
      .lesson-review-session__header {
        margin-bottom: 16px;
        text-align: center;
      }
      .lesson-review-session__badge {
        display: inline-block;
        margin: 0 0 8px;
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(108, 126, 225, 0.15);
        color: #6c7ee1;
        font-size: 0.82rem;
        font-weight: 700;
      }
      .lesson-review-session__title {
        margin: 0 0 6px;
        font-size: clamp(1.2rem, 3vw, 1.5rem);
        color: #4a5080;
      }
      .lesson-review-session__lessons {
        margin: 0;
        font-size: 0.85rem;
        color: #6b7099;
        line-height: 1.45;
      }
      .lesson-review-session__paper {
        background: #fff;
        border-radius: 16px;
        padding: 24px 20px;
        box-shadow: 0 10px 36px rgba(74, 80, 128, 0.08);
        border: 1px solid rgba(146, 185, 227, 0.35);
      }
      .lesson-review-session__question {
        margin-bottom: 28px;
      }
      .lesson-review-session__question:last-of-type {
        margin-bottom: 20px;
      }
      .lesson-review-session__question-text {
        margin: 0 0 8px;
        font-size: 1rem;
        line-height: 1.5;
        color: #4a5080;
      }
      .lesson-review-session__answers,
      .lesson-review-session__list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .lesson-review-session__multi-hint {
        margin: 0 0 8px;
        font-size: 0.85rem;
        color: #6b7099;
        font-weight: 600;
      }
      .lesson-review-session__confirm {
        margin-top: 8px;
        border: none;
        border-radius: 10px;
        padding: 8px 14px;
        background: #6c7ee1;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      }
      .lesson-review-session__confirm:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .lesson-review-session__answer,
      .lesson-review-session__option {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        width: 100%;
        text-align: left;
        padding: 10px 12px;
        border: 1px solid rgba(146, 185, 227, 0.5);
        border-radius: 10px;
        background: #fff;
        color: #4a5080;
        font-family: inherit;
        font-size: 0.95rem;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .lesson-review-session__answer:hover,
      .lesson-review-session__option:hover {
        background: rgba(146, 185, 227, 0.1);
      }
      .lesson-review-session__answer--selected,
      .lesson-review-session__option--selected {
        border-color: #6c7ee1;
        background: rgba(108, 126, 225, 0.12);
      }
      .lesson-review-session__answer-prefix,
      .lesson-review-session__prefix {
        font-weight: 700;
        min-width: 1.5em;
      }
      .lesson-review-session__answer-img,
      .lesson-review-session__img {
        max-width: 100px;
        margin-left: auto;
      }
      .lesson-review-session__nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        border-top: 1px solid rgba(146, 185, 227, 0.35);
        padding-top: 16px;
      }
      .lesson-review-session__page-info {
        font-size: 0.88rem;
        font-weight: 600;
        color: #6b7099;
      }
      .lesson-review-session__nav-btn,
      .lesson-review-session__submit-btn {
        border: none;
        border-radius: 10px;
        padding: 10px 16px;
        font-family: inherit;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
      }
      .lesson-review-session__nav-btn {
        background: rgba(108, 126, 225, 0.12);
        color: #6c7ee1;
      }
      .lesson-review-session__submit-btn {
        background: linear-gradient(135deg, #6c7ee1, #c688eb);
        color: #fff;
      }
      .lesson-review-session__result {
        background: #fff;
        border-radius: 20px;
        padding: 40px 28px;
        text-align: center;
        box-shadow: 0 10px 36px rgba(74, 80, 128, 0.08);
        border: 1px solid rgba(146, 185, 227, 0.35);
      }
      .lesson-review-session__result h1 {
        margin: 0 0 8px;
        color: #4a5080;
        font-size: 1.5rem;
      }
      .lesson-review-session__result-meta {
        margin: 0 0 16px;
        color: #6b7099;
      }
      .lesson-review-session__score {
        margin: 0 0 8px;
        font-size: 3rem;
        font-weight: 800;
        color: #6c7ee1;
      }
      .lesson-review-session__progress {
        width: 100%;
        height: 12px;
        background: #e8f1f5;
        border-radius: 6px;
        margin: 20px 0 24px;
        overflow: hidden;
      }
      .lesson-review-session__progress-fill {
        height: 100%;
        border-radius: 6px;
        transition: width 0.3s ease;
      }
      .lesson-review-session__result-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
      }
      .lesson-review-session__btn {
        border: 1px solid rgba(108, 126, 225, 0.45);
        border-radius: 999px;
        padding: 12px 24px;
        background: #fff;
        color: #6c7ee1;
        font-family: inherit;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
      }
      .lesson-review-session__btn--primary {
        border: none;
        background: linear-gradient(135deg, #6c7ee1, #c688eb);
        color: #fff;
      }
    `}</style>
  );
}
