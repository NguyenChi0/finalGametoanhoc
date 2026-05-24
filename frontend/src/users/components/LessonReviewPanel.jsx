import React from "react";
import LessonStarRating from "./LessonStarRating";

function formatReviewDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const QUESTIONS_PER_LESSON_OPTIONS = [3, 5, 10];

export default function LessonReviewPanel({
  days,
  onDaysChange,
  items,
  loading,
  error,
  isLoggedIn,
  selectedIds,
  onToggleLesson,
  onSelectAll,
  onClearAll,
  questionsPerLesson,
  onQuestionsPerLessonChange,
  onStartReview,
  startingReview,
  onCollapse,
}) {
  const list = Array.isArray(items) ? items : [];
  const selectedSet =
    selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
  const selectedCount = selectedSet.size;
  const approxQuestions = selectedCount * (questionsPerLesson || 5);
  const canStart = isLoggedIn && selectedCount > 0 && !loading && !startingReview;

  return (
    <aside
      id="lesson-review-panel"
      className="lesson-review-panel"
      aria-label="Ôn tập bài đã học"
    >
      <div className="lesson-review-panel__head">
        <h2 className="lesson-review-panel__title">Ôn tập</h2>
        <button
          type="button"
          className="lesson-review-panel__collapse-btn"
          onClick={onCollapse}
          aria-label="Thu gọn ôn tập"
          title="Thu gọn"
        >
          Thu gọn
        </button>
      </div>

      <p className="lesson-review-panel__hint">
        Ôn lại các bài vừa học nhé
      </p>

      <div className="lesson-review-panel__days" role="tablist" aria-label="Khoảng thời gian">
        {[3, 7].map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={days === d}
            className={`lesson-review-panel__day-pill${
              days === d ? " lesson-review-panel__day-pill--active" : ""
            }`}
            onClick={() => onDaysChange(d)}
          >
            {d} ngày
          </button>
        ))}
      </div>

      {isLoggedIn && list.length > 0 ? (
        <>
          <div className="lesson-review-panel__per-lesson" role="group" aria-label="Số câu mỗi bài">
            <span className="lesson-review-panel__per-lesson-label">Số câu</span>
            <div className="lesson-review-panel__per-lesson-pills">
              {QUESTIONS_PER_LESSON_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`lesson-review-panel__count-pill${
                    questionsPerLesson === n
                      ? " lesson-review-panel__count-pill--active"
                      : ""
                  }`}
                  aria-pressed={questionsPerLesson === n}
                  onClick={() => onQuestionsPerLessonChange(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="lesson-review-panel__select-actions">
            <button
              type="button"
              className="lesson-review-panel__link-btn"
              onClick={onSelectAll}
              disabled={loading || startingReview}
            >
              Chọn tất cả
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className="lesson-review-panel__link-btn"
              onClick={onClearAll}
              disabled={loading || startingReview || selectedCount === 0}
            >
              Bỏ chọn
            </button>
          </div>
        </>
      ) : null}

      {!isLoggedIn ? (
        <p className="lesson-review-panel__muted">
          Đăng nhập để xem bài đã học và ôn tập.
        </p>
      ) : loading ? (
        <p className="lesson-review-panel__muted">Đang tải danh sách ôn tập…</p>
      ) : error ? (
        <p className="lesson-review-panel__error" role="alert">
          {error}
        </p>
      ) : list.length === 0 ? (
        <p className="lesson-review-panel__muted">
          Chưa có bài hoàn thành trong {days} ngày qua. Hãy chơi trên bản đồ trước nhé!
        </p>
      ) : (
        <ul className="lesson-review-panel__list">
          {list.map((item) => {
            const lessonKey = String(item.lessonId);
            const checked = selectedSet.has(lessonKey);
            const rowKey = `${item.lessonId}-${item.completedAt}`;
            return (
              <li key={rowKey} className="lesson-review-panel__item">
                <label className="lesson-review-panel__lesson-row">
                  <input
                    type="checkbox"
                    className="lesson-review-panel__checkbox"
                    checked={checked}
                    disabled={startingReview}
                    onChange={() => onToggleLesson(item.lessonId)}
                  />
                  <span className="lesson-review-panel__lesson-body">
                    <span className="lesson-review-panel__lesson-name">
                      {item.lessonName || `Bài ${item.lessonId}`}
                    </span>
                    <span className="lesson-review-panel__meta">
                      {item.gradeName ? `${item.gradeName} · ` : ""}
                      {item.typeName || "Chủ đề"}
                    </span>
                    <span className="lesson-review-panel__foot">
                      <LessonStarRating stars={item.stars} size="xs" />
                      {item.completedAt ? (
                        <span className="lesson-review-panel__date">
                          {formatReviewDate(item.completedAt)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {isLoggedIn && list.length > 0 ? (
        <button
          type="button"
          className="lesson-review-panel__start-btn"
          disabled={!canStart}
          onClick={onStartReview}
        >
          {startingReview
            ? "Đang tải câu hỏi…"
            : selectedCount > 0
              ? `Bắt đầu ôn tập`
              : "Bắt đầu ôn tập"}
        </button>
      ) : null}

      <style>{`
        .lesson-review-panel {
          flex: 0 0 auto;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 16px 14px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(146, 185, 227, 0.35);
          box-shadow: 0 8px 28px rgba(74, 80, 128, 0.08);
          font-family: inherit;
          color: var(--cl-ink, #4a5080);
          overflow-x: clip;
        }
        @media (min-width: 960px) {
          .lesson-review-panel {
            width: min(320px, 28vw);
            max-height: calc(100vh - 48px);
            display: flex;
            flex-direction: column;
          }
        }
        .lesson-review-panel__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }
        .lesson-review-panel__title {
          margin: 0;
          font-size: clamp(0.95rem, 2.5vw, 1.08rem);
          font-weight: 800;
          color: var(--cl-periwinkle, #6c7ee1);
          line-height: 1.3;
        }
        .lesson-review-panel__collapse-btn {
          flex: 0 0 auto;
          margin: 0;
          padding: 6px 12px;
          border: 1px solid rgba(146, 185, 227, 0.55);
          border-radius: 10px;
          background: #fff;
          color: var(--cl-ink-muted, #6b7099);
          font-size: 0.78rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
        }
        .lesson-review-panel__collapse-btn:hover,
        .lesson-review-panel__collapse-btn:focus-visible {
          color: var(--cl-periwinkle, #6c7ee1);
          outline: none;
        }
        .lesson-review-panel__hint {
          margin: 0 0 10px;
          font-size: 0.82rem;
          line-height: 1.45;
          color: var(--cl-ink-muted, #6b7099);
        }
        .lesson-review-panel__days {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .lesson-review-panel__day-pill {
          border: 2px solid rgba(108, 126, 225, 0.35);
          border-radius: 999px;
          padding: 6px 14px;
          background: #fff;
          color: var(--cl-ink, #4a5080);
          font-size: 0.8rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }
        .lesson-review-panel__day-pill--active {
          border-color: var(--cl-periwinkle, #6c7ee1);
          background: linear-gradient(135deg, #6c7ee1, #c688eb);
          color: #fff;
        }
        .lesson-review-panel__per-lesson {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
          min-width: 0;
        }
        .lesson-review-panel__per-lesson-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--cl-ink-muted, #6b7099);
        }
        .lesson-review-panel__per-lesson-pills {
          display: flex;
          gap: 6px;
        }
        .lesson-review-panel__count-pill {
          border: 2px solid rgba(108, 126, 225, 0.35);
          border-radius: 999px;
          min-width: 36px;
          padding: 4px 10px;
          background: #fff;
          color: var(--cl-ink, #4a5080);
          font-size: 0.78rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }
        .lesson-review-panel__count-pill--active {
          border-color: var(--cl-periwinkle, #6c7ee1);
          background: rgba(108, 126, 225, 0.15);
          color: var(--cl-periwinkle, #6c7ee1);
        }
        .lesson-review-panel__select-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 0.78rem;
          color: var(--cl-ink-muted, #6b7099);
          flex-wrap: wrap;
          min-width: 0;
        }
        .lesson-review-panel__link-btn {
          border: none;
          background: none;
          padding: 0;
          font-family: inherit;
          font-size: inherit;
          font-weight: 600;
          color: var(--cl-periwinkle, #6c7ee1);
          cursor: pointer;
        }
        .lesson-review-panel__link-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .lesson-review-panel__list {
          list-style: none;
          margin: 0;
          padding: 0;
          overflow-y: auto;
          overflow-x: clip;
          flex: 1 1 auto;
          min-height: 0;
          min-width: 0;
        }
        .lesson-review-panel__item {
          margin-bottom: 8px;
        }
        .lesson-review-panel__item:last-child {
          margin-bottom: 0;
        }
        .lesson-review-panel__lesson-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border: 1px solid rgba(146, 185, 227, 0.4);
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(146, 185, 227, 0.08);
          cursor: pointer;
          font-family: inherit;
        }
        .lesson-review-panel__lesson-row:hover {
          box-shadow: 0 4px 14px rgba(74, 80, 128, 0.1);
        }
        .lesson-review-panel__checkbox {
          flex: 0 0 auto;
          margin-top: 3px;
          width: 16px;
          height: 16px;
          accent-color: var(--cl-periwinkle, #6c7ee1);
          cursor: pointer;
        }
        .lesson-review-panel__lesson-body {
          flex: 1 1 auto;
          min-width: 0;
        }
        .lesson-review-panel__lesson-name {
          display: block;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--cl-ink, #4a5080);
          line-height: 1.35;
          margin-bottom: 4px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .lesson-review-panel__meta {
          display: block;
          font-size: 0.76rem;
          color: var(--cl-ink-muted, #6b7099);
          line-height: 1.35;
          margin-bottom: 6px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .lesson-review-panel__foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
        }
        .lesson-review-panel__date {
          font-size: 0.72rem;
          color: var(--cl-ink-muted, #6b7099);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .lesson-review-panel__start-btn {
          margin-top: 12px;
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 12px 10px;
          background: linear-gradient(135deg, #6c7ee1, #c688eb);
          color: #fff;
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 800;
          line-height: 1.35;
          white-space: normal;
          text-align: center;
          cursor: pointer;
          transition: opacity 0.15s ease;
          box-sizing: border-box;
        }
        .lesson-review-panel__start-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lesson-review-panel__muted {
          margin: 0;
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--cl-ink-muted, #6b7099);
        }
        .lesson-review-panel__error {
          margin: 0;
          font-size: 0.85rem;
          color: #c62828;
          font-weight: 600;
        }
      `}</style>
    </aside>
  );
}
