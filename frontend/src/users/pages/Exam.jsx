import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getExams, getGrades } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import {
  EXAM_GRADE_PILL_STORAGE_KEY,
  readGradePillFilter,
  resolveSelectedGradeId,
  resolveVisibleGradeIds,
  writeGradePillFilter,
} from "../../lib/gradePillFilterStorage";
import "../styles/userCtaFlashShine.css";

const copy = {
  pageTitle: "Ngân hàng đề thi",
  intro: "Luyện tập với các đề thi chọn lọc từ ngân hàng câu hỏi",
  loading: "Đang tải danh sách đề thi…",
  loadError: "Không tải được danh sách đề thi.",
  empty: "Chưa có đề thi nào. Vui lòng quay lại sau.",
  questionsSuffix: "câu hỏi",
  durationSuffix: "phút",
  viewDetail: "Làm bài",
  gradeFilterLabel: "Lọc theo khối",
  allGrades: "Tất cả lớp",
  addGrade: "Thêm khối",
  removeGrade: "Bỏ khối",
  allGradesShown: "Đã hiển thị tất cả khối",
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
  const [selectedGradeId, setSelectedGradeId] = useState(() => {
    const saved = readGradePillFilter(EXAM_GRADE_PILL_STORAGE_KEY);
    return saved?.selectedGradeId ?? "";
  });
  const [visibleGradeIds, setVisibleGradeIds] = useState(null);
  const [gradeFilterHydrated, setGradeFilterHydrated] = useState(false);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const addPickerRef = useRef(null);
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
    if (grades.length === 0 || gradeFilterHydrated) return;
    const saved = readGradePillFilter(EXAM_GRADE_PILL_STORAGE_KEY);
    const allIds = grades.map((g) => String(g.id));
    const visible = resolveVisibleGradeIds(saved?.visibleGradeIds, allIds);
    setVisibleGradeIds(visible);
    setSelectedGradeId((cur) =>
      resolveSelectedGradeId(cur !== "" ? cur : saved?.selectedGradeId ?? "", visible)
    );
    setGradeFilterHydrated(true);
  }, [grades, gradeFilterHydrated]);

  useEffect(() => {
    if (!gradeFilterHydrated || visibleGradeIds === null) return;
    writeGradePillFilter(EXAM_GRADE_PILL_STORAGE_KEY, {
      visibleGradeIds,
      selectedGradeId,
    });
  }, [gradeFilterHydrated, visibleGradeIds, selectedGradeId]);

  useEffect(() => {
    if (!addPickerOpen) return undefined;
    const onDocClick = (e) => {
      if (addPickerRef.current && !addPickerRef.current.contains(e.target)) {
        setAddPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [addPickerOpen]);

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

  const visibleGrades = (visibleGradeIds ?? [])
    .map((id) => grades.find((g) => String(g.id) === id))
    .filter(Boolean);
  const hiddenGrades = grades.filter(
    (g) => !(visibleGradeIds ?? []).includes(String(g.id))
  );

  const selectGrade = (gradeId) => {
    setSelectedGradeId(String(gradeId));
    setPage(1);
  };

  const removeVisibleGrade = (gradeId) => {
    const sid = String(gradeId);
    setVisibleGradeIds((prev) => {
      const list = prev ?? [];
      const next = list.filter((x) => x !== sid);
      setSelectedGradeId((cur) => (cur === sid ? next[0] ?? "" : cur));
      return next;
    });
    setPage(1);
  };

  const addVisibleGrade = (gradeId) => {
    const sid = String(gradeId);
    setVisibleGradeIds((prev) => {
      const list = prev ?? [];
      if (list.includes(sid)) return list;
      return [...list, sid];
    });
    setAddPickerOpen(false);
  };

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
              <p className="exam-filter-label">{copy.gradeFilterLabel}</p>
              <div className="exam-grade-pills" role="tablist" aria-label={copy.gradeFilterLabel}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedGradeId === ""}
                  className={`exam-grade-pill exam-grade-pill--all${
                    selectedGradeId === "" ? " exam-grade-pill--active" : ""
                  }`}
                  onClick={() => selectGrade("")}
                >
                  {copy.allGrades}
                </button>
                {visibleGrades.map((grade) => {
                  const gid = String(grade.id);
                  const active = selectedGradeId === gid;
                  return (
                    <span
                      key={grade.id}
                      className={`exam-grade-pill-wrap${
                        active ? " exam-grade-pill-wrap--active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`exam-grade-pill${
                          active ? " exam-grade-pill--active" : ""
                        }`}
                        onClick={() => selectGrade(gid)}
                      >
                        {grade.name}
                      </button>
                      <button
                        type="button"
                        className="exam-grade-pill-remove"
                        aria-label={`${copy.removeGrade} ${grade.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVisibleGrade(gid);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <div className="exam-grade-pill-add-wrap" ref={addPickerRef}>
                  <button
                    type="button"
                    className="exam-grade-pill exam-grade-pill--add"
                    aria-label={copy.addGrade}
                    aria-expanded={addPickerOpen}
                    onClick={() => setAddPickerOpen((open) => !open)}
                  >
                    +
                  </button>
                  {addPickerOpen && (
                    <div className="exam-grade-add-picker" role="listbox">
                      {hiddenGrades.length === 0 ? (
                        <p className="exam-grade-add-picker-empty">{copy.allGradesShown}</p>
                      ) : (
                        hiddenGrades.map((grade) => (
                          <button
                            key={grade.id}
                            type="button"
                            role="option"
                            className="exam-grade-add-picker-item"
                            onClick={() => addVisibleGrade(grade.id)}
                          >
                            {grade.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
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
                            className="exam-cta user-cta-flash"
                            onClick={() => navigate(`/exam/${exam.id}`)}
                          >
                            <span className="user-cta-flash__label">{copy.viewDetail}</span>
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
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          margin-bottom: 22px;
          padding: 14px 16px;
          border-radius: 16px;
          background: linear-gradient(90deg, rgba(146, 185, 227, 0.35), rgba(251, 162, 208, 0.25));
        }
        .exam-filter-label {
          margin: 0;
          color: ${CL.ink};
          font-weight: 700;
          font-size: 0.95rem;
        }
        .exam-grade-pills {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .exam-grade-pill-wrap {
          display: inline-flex;
          align-items: stretch;
          border-radius: 999px;
          border: 2px solid rgba(108, 126, 225, 0.35);
          background: #fff;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(108, 126, 225, 0.12);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .exam-grade-pill-wrap--active {
          border-color: ${CL.periwinkle};
          background: linear-gradient(135deg, ${CL.periwinkle}, ${CL.lavender});
          box-shadow: 0 3px 12px rgba(108, 126, 225, 0.28);
        }
        .exam-grade-pill {
          border: none;
          background: #fff;
          color: ${CL.ink};
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.2;
          padding: 8px 14px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .exam-grade-pill--all {
          border-radius: 999px;
          border: 2px solid rgba(108, 126, 225, 0.35);
          box-shadow: 0 2px 8px rgba(108, 126, 225, 0.12);
        }
        .exam-grade-pill--active {
          background: linear-gradient(135deg, ${CL.periwinkle}, ${CL.lavender});
          color: #fff;
        }
        .exam-grade-pill-wrap .exam-grade-pill {
          border-radius: 0;
          background: transparent;
          padding: 8px 2px 8px 14px;
        }
        .exam-grade-pill-wrap .exam-grade-pill--active {
          background: transparent;
          color: #fff;
        }
        .exam-grade-pill-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          flex-shrink: 0;
          border: none;
          background: transparent;
          color: ${CL.inkMuted};
          font-size: 17px;
          line-height: 1;
          cursor: pointer;
          font-family: inherit;
          padding: 0 10px 0 0;
          opacity: 0.72;
          transition: opacity 0.15s ease, color 0.15s ease;
        }
        .exam-grade-pill-wrap--active .exam-grade-pill-remove {
          color: #fff;
          opacity: 0.88;
        }
        .exam-grade-pill-remove:hover {
          opacity: 1;
          color: ${CL.periwinkle};
        }
        .exam-grade-pill-wrap--active .exam-grade-pill-remove:hover {
          opacity: 1;
          color: #fff;
        }
        .exam-grade-pill-add-wrap {
          position: relative;
        }
        .exam-grade-pill--add {
          width: 36px;
          height: 36px;
          padding: 0;
          border-radius: 999px;
          border: 2px dashed rgba(108, 126, 225, 0.55);
          background: rgba(255, 255, 255, 0.85);
          color: ${CL.periwinkle};
          font-size: 22px;
          font-weight: 700;
          line-height: 1;
          box-shadow: none;
        }
        .exam-grade-pill--add:hover {
          background: #fff;
          border-color: ${CL.lavender};
          color: ${CL.lavender};
        }
        .exam-grade-add-picker {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          z-index: 20;
          min-width: 160px;
          max-height: 220px;
          overflow-y: auto;
          padding: 6px;
          border-radius: 14px;
          border: 2px solid rgba(108, 126, 225, 0.35);
          background: #fff;
          box-shadow: 0 10px 28px rgba(74, 80, 128, 0.18);
        }
        .exam-grade-add-picker-empty {
          margin: 0;
          padding: 10px 12px;
          color: ${CL.inkMuted};
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .exam-grade-add-picker-item {
          display: block;
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 9px 12px;
          text-align: left;
          background: transparent;
          color: ${CL.ink};
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .exam-grade-add-picker-item:hover {
          background: rgba(108, 126, 225, 0.14);
          color: ${CL.periwinkle};
        }
        .exam-grade-pill:focus-visible,
        .exam-grade-pill-remove:focus-visible,
        .exam-grade-add-picker-item:focus-visible {
          outline: 2px solid ${CL.lavender};
          outline-offset: 2px;
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
          .exam-grade-pills {
            gap: 6px;
          }
          .exam-grade-pill {
            font-size: 12px;
            padding: 7px 12px;
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
