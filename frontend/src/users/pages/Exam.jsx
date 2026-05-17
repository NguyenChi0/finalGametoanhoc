import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getExams, getGrades } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

const copy = {
  pageTitle: "Ngân hàng đề thi",
  intro: "Luyện tập với các đề thi chọn lọc từ ngân hàng câu hỏi",
  loading: "Đang tải danh sách đề thi…",
  loadError: "Không tải được danh sách đề thi.",
  empty: "Chưa có đề thi nào. Vui lòng quay lại sau.",
  questionsSuffix: "câu hỏi",
  durationSuffix: "phút",
  viewDetail: "Làm bài",
};

const CL = {
  periwinkle: "#6C7EE1",
  sky: "#92B9E3",
  peach: "#FFC4A4",
  pink: "#FBA2D0",
  lavender: "#C688EB",
  ink: "#4A5080",
  inkMuted: "#6B7099",
};

const CARD_ACCENTS = [CL.periwinkle, CL.sky, CL.peach, CL.pink, CL.lavender];

function accentForIndex(i) {
  return CARD_ACCENTS[i % CARD_ACCENTS.length];
}

export default function Exam() {
  const PAGE_SIZE = 5;
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [exams, setExams] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const gradeRows = await getGrades();
        if (!cancelled) {
          setGrades(Array.isArray(gradeRows) ? gradeRows : []);
        }
      } catch {
        if (!cancelled) setGrades([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getExams({
          grade_id: selectedGradeId || undefined,
          page,
          page_size: PAGE_SIZE,
        });
        if (!cancelled) {
          const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
          const pagination = data?.pagination || {};
          setExams(rows.filter((exam) => Number(exam?.status) === 1));
          setTotalPages(Math.max(1, Number(pagination.total_pages) || 1));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err.response?.data?.message || copy.loadError);
          setExams([]);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedGradeId, page]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const pageBg = `${publicUrl}/component-images/home-background.png`;

  return (
    <div className="exam-page">
      <div
        className="exam-bg-fixed"
        aria-hidden
        style={{ backgroundImage: `url(${pageBg})` }}
      />

      <div className="exam-container">
        <main>
          <header className="exam-hero">
            <h1 className="exam-hero-title">{copy.pageTitle}</h1>
            <p className="exam-hero-intro">{copy.intro}</p>
          </header>

          <section className="exam-panel">
            <div className="exam-toolbar">
              <label htmlFor="exam-grade-filter" className="exam-filter-label">
                Chọn lớp của bạn
              </label>
              <select
                id="exam-grade-filter"
                className="exam-filter-select"
                value={selectedGradeId}
                onChange={(e) => {
                  setSelectedGradeId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả lớp</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={String(grade.id)}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>

            {loading && <p className="exam-status">{copy.loading}</p>}
            {error && !loading && <p className="exam-error">{error}</p>}

            <div className="exam-list">
              {!loading &&
                exams.map((exam, index) => {
                  const qCount = Number(exam.question_count) || 0;
                  const duration = Number(exam.duration_time) || 0;
                  const desc = exam.description?.trim() || "—";
                  const accent = accentForIndex(index);
                  return (
                    <article
                      key={exam.id}
                      className="exam-card"
                      style={{ "--exam-accent": accent }}
                    >
                      <div className="exam-card-accent" aria-hidden />
                      <div className="card-content">
                        <div className="card-info">
                          <h3 className="exam-title">{exam.name?.trim() || "—"}</h3>
                          <p className="exam-desc">{desc}</p>
                          <div className="meta">
                            <span className="meta-chip meta-chip-grade">
                              🎓 {exam.grade_name || `Khối ${exam.grade_id}`}
                            </span>
                            <span className="meta-chip meta-chip-questions">
                              📝 {qCount} {copy.questionsSuffix}
                            </span>
                            <span className="meta-chip meta-chip-time">
                              ⏱️ {duration || "—"} {copy.durationSuffix}
                            </span>
                          </div>
                        </div>
                        <div className="card-button">
                          <button
                            type="button"
                            className="exam-cta"
                            onClick={() => navigate(`/exam/${exam.id}`)}
                          >
                            {copy.viewDetail}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>

            {!loading && !error && exams.length === 0 && (
              <p className="exam-status">{copy.empty}</p>
            )}

            {!loading && !error && exams.length > 0 && (
              <div className="exam-pagination">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Trang trước
                </button>
                <span>
                  Trang {page}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Trang sau
                </button>
              </div>
            )}
          </section>
        </main>
      </div>

      <style>{`
        .exam-page {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .exam-bg-fixed {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-color: #b8e0f5;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .exam-container {
          position: relative;
          z-index: 1;
          max-width: 960px;
          margin: 0 auto;
          padding: 24px 20px 48px;
          box-sizing: border-box;
        }
        .exam-hero {
          text-align: center;
          margin-bottom: 28px;
          padding: 8px 12px 0;
        }
        .exam-hero-title {
          margin: 0 0 12px;
          font-size: clamp(1.75rem, 4vw, 2.25rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(
            90deg,
            ${CL.periwinkle} 0%,
            ${CL.lavender} 45%,
            ${CL.pink} 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .exam-hero-intro {
          margin: 0 auto;
          max-width: 520px;
          line-height: 1.7;
          color: ${CL.ink};
          font-size: 1.05rem;
          font-weight: 500;
        }
        .exam-panel {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 24px;
          padding: 24px 22px 28px;
          border: 2px solid rgba(255, 255, 255, 0.85);
          box-shadow:
            0 8px 32px rgba(108, 126, 225, 0.18),
            0 2px 8px rgba(198, 136, 235, 0.12);
        }
        .exam-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
          flex-wrap: wrap;
          padding: 14px 16px;
          border-radius: 16px;
          background: linear-gradient(90deg, rgba(146, 185, 227, 0.35), rgba(251, 162, 208, 0.25));
        }
        .exam-filter-label {
          color: ${CL.ink};
          font-weight: 700;
          font-size: 0.95rem;
        }
        .exam-filter-select {
          min-width: 180px;
          flex: 1;
          max-width: 320px;
          border: 2px solid ${CL.periwinkle};
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: inherit;
          font-weight: 600;
          color: ${CL.ink};
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(108, 126, 225, 0.15);
        }
        .exam-filter-select:focus {
          outline: none;
          border-color: ${CL.lavender};
          box-shadow: 0 0 0 3px rgba(198, 136, 235, 0.35);
        }
        .exam-status {
          color: ${CL.inkMuted};
          font-weight: 500;
          text-align: center;
          padding: 12px;
        }
        .exam-error {
          color: #c62828;
          margin-bottom: 16px;
          font-weight: 600;
          text-align: center;
        }
        .exam-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .exam-card {
          position: relative;
          border-radius: 18px;
          padding: 18px 20px 18px 24px;
          background: #fff;
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 6px 20px rgba(74, 80, 128, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          overflow: hidden;
        }
        .exam-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(108, 126, 225, 0.22);
        }
        .exam-card-accent {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          background: var(--exam-accent, ${CL.periwinkle});
          border-radius: 18px 0 0 18px;
        }
        .card-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .card-info {
          flex: 1;
          min-width: 0;
        }
        .exam-title {
          margin: 0 0 8px;
          color: var(--exam-accent, ${CL.periwinkle});
          font-weight: 700;
          font-size: 1.2rem;
          line-height: 1.35;
        }
        .exam-desc {
          margin: 0 0 12px;
          color: ${CL.inkMuted};
          line-height: 1.55;
          font-size: 0.95rem;
        }
        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .meta-chip {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.3;
        }
        .meta-chip-grade {
          background: rgba(108, 126, 225, 0.18);
          color: ${CL.periwinkle};
        }
        .meta-chip-questions {
          background: rgba(255, 196, 164, 0.45);
          color: #b85a2e;
        }
        .meta-chip-time {
          background: rgba(198, 136, 235, 0.22);
          color: #8b4cad;
        }
        .card-button {
          flex-shrink: 0;
        }
        .exam-cta {
          border: none;
          border-radius: 999px;
          padding: 11px 26px;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(135deg, var(--exam-accent, ${CL.periwinkle}), ${CL.lavender});
          box-shadow: 0 4px 14px rgba(108, 126, 225, 0.35);
          transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s;
        }
        .exam-cta:hover {
          transform: scale(1.04);
          filter: brightness(1.05);
          box-shadow: 0 6px 20px rgba(198, 136, 235, 0.45);
        }
        .exam-cta:active {
          transform: scale(0.98);
        }
        .exam-pagination {
          margin-top: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .exam-pagination button {
          border: 2px solid ${CL.periwinkle};
          background: #fff;
          color: ${CL.periwinkle};
          border-radius: 999px;
          padding: 9px 18px;
          cursor: pointer;
          font-weight: 700;
          font-family: inherit;
          transition: background 0.2s, color 0.2s, transform 0.15s;
        }
        .exam-pagination button:hover:not(:disabled) {
          background: ${CL.periwinkle};
          color: #fff;
          transform: translateY(-1px);
        }
        .exam-pagination button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          border-color: #ccc;
          color: #999;
        }
        .exam-pagination span {
          color: ${CL.ink};
          font-size: 14px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(146, 185, 227, 0.3);
        }
        @media (max-width: 768px) {
          .exam-panel {
            padding: 18px 14px 22px;
            border-radius: 18px;
          }
          .exam-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .exam-filter-select {
            max-width: none;
            width: 100%;
          }
          .card-content {
            flex-direction: column;
            align-items: stretch;
          }
          .card-button {
            margin-top: 8px;
          }
          .exam-cta {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
