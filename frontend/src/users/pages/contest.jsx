import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getContests, getGrades } from "../../api";
import ContestTop3Leaderboard from "../components/ContestTop3Leaderboard";
import { publicUrl } from "../../lib/publicUrl";
import {
  CONTEST_GRADE_PILL_STORAGE_KEY,
  readGradePillFilter,
  resolveSelectedGradeId,
  resolveVisibleGradeIds,
  writeGradePillFilter,
} from "../../lib/gradePillFilterStorage";
import "../styles/userCtaFlashShine.css";
import NumberPagination from "../components/NumberPagination";

const PAGE_SIZE = 5;

const CONTEST_STATUS_ACTIVE = 2;
const CONTEST_STATUS_SCHEDULED = 1;
const CONTEST_STATUS_ENDED = 0;

const copy = {
  pageTitle: "Cuộc thi Toán học",
  intro: "Tham gia cuộc thi và nhận muôn vàn giải thưởng hấp dẫn",
  noteTitle: "Lưu ý:",
  note1: "Mỗi bài thi chỉ được làm một lần",
  note2: "Điểm thưởng sẽ được cộng sau khi kết thúc cuộc thi",
  note3: "Chúc các bạn may mắn và rinh được các phần thưởng hấp dẫn",
  loading: "Đang tải danh sách cuộc thi…",
  loadError: "Không tải được danh sách cuộc thi.",
  empty: "Chưa có cuộc thi nào cho lớp đã chọn.",
  scheduleLabel: "Thời gian:",
  questionsSuffix: " câu hỏi",
  doQuiz: "Làm bài",
  completedQuiz: "Đã hoàn thành",
  endedQuiz: "Đã kết thúc",
  upcomingQuiz: "Chưa mở",
  statusActive: "Đang diễn ra",
  statusScheduled: "Sắp diễn ra",
  statusEnded: "Đã kết thúc",
  yourScore: "Điểm:",
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

function formatContestWindow(start, end) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s || Number.isNaN(s.getTime())) return "—";
  const opts = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  const a = s.toLocaleString("vi-VN", opts);
  if (!e || Number.isNaN(e.getTime())) return a;
  const b = e.toLocaleString("vi-VN", opts);
  return `${a} – ${b}`;
}

function contestStatusLabel(status) {
  const s = Number(status);
  if (s === CONTEST_STATUS_ACTIVE) return copy.statusActive;
  if (s === CONTEST_STATUS_SCHEDULED) return copy.statusScheduled;
  if (s === CONTEST_STATUS_ENDED) return copy.statusEnded;
  return "—";
}

function contestCtaLabel(status, done) {
  if (done) return copy.completedQuiz;
  const s = Number(status);
  if (s === CONTEST_STATUS_ACTIVE) return copy.doQuiz;
  if (s === CONTEST_STATUS_SCHEDULED) return copy.upcomingQuiz;
  return copy.endedQuiz;
}

function canDoContest(status, done) {
  return Number(status) === CONTEST_STATUS_ACTIVE && !done;
}

export default function Contest() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [contests, setContests] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedGradeId, setSelectedGradeId] = useState(() => {
    const saved = readGradePillFilter(CONTEST_GRADE_PILL_STORAGE_KEY);
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
    const saved = readGradePillFilter(CONTEST_GRADE_PILL_STORAGE_KEY);
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
    writeGradePillFilter(CONTEST_GRADE_PILL_STORAGE_KEY, {
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
        const data = await getContests({
          grade_id: selectedGradeId || undefined,
          page,
          page_size: PAGE_SIZE,
        });
        if (!cancelled) {
          const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
          const pagination = data?.pagination || {};
          setContests(rows);
          setTotalPages(Math.max(1, Number(pagination.total_pages) || 1));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err.response?.data?.message || copy.loadError);
          setContests([]);
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

  const handleDoQuiz = (contestId) => {
    navigate(`/contest/${contestId}`);
  };

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
    <div className="contest-page">
      <div
        className="contest-bg-fixed"
        aria-hidden
        style={{ backgroundImage: `url(${pageBg})` }}
      />

      <div className="contest-container">
        <main>
          <header className="contest-hero">
            <h1 className="contest-hero-title">{copy.pageTitle}</h1>
            <p className="contest-hero-intro">{copy.intro}</p>
          </header>

          <section className="contest-panel">
            <aside className="contest-notes">
              <p className="contest-notes-title">{copy.noteTitle}</p>
              <ul className="contest-notes-list">
                <li>{copy.note1}</li>
                <li>{copy.note2}</li>
                <li>{copy.note3}</li>
              </ul>
            </aside>

            <div className="contest-toolbar">
              <p className="contest-filter-label">{copy.gradeFilterLabel}</p>
              <div className="contest-grade-pills" role="tablist" aria-label={copy.gradeFilterLabel}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedGradeId === ""}
                  className={`contest-grade-pill contest-grade-pill--all${
                    selectedGradeId === "" ? " contest-grade-pill--active" : ""
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
                      className={`contest-grade-pill-wrap${
                        active ? " contest-grade-pill-wrap--active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`contest-grade-pill${
                          active ? " contest-grade-pill--active" : ""
                        }`}
                        onClick={() => selectGrade(gid)}
                      >
                        {grade.name}
                      </button>
                      <button
                        type="button"
                        className="contest-grade-pill-remove"
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
                <div className="contest-grade-pill-add-wrap" ref={addPickerRef}>
                  <button
                    type="button"
                    className="contest-grade-pill contest-grade-pill--add"
                    aria-label={copy.addGrade}
                    aria-expanded={addPickerOpen}
                    onClick={() => setAddPickerOpen((open) => !open)}
                  >
                    +
                  </button>
                  {addPickerOpen && (
                    <div className="contest-grade-add-picker" role="listbox">
                      {hiddenGrades.length === 0 ? (
                        <p className="contest-grade-add-picker-empty">{copy.allGradesShown}</p>
                      ) : (
                        hiddenGrades.map((grade) => (
                          <button
                            key={grade.id}
                            type="button"
                            role="option"
                            className="contest-grade-add-picker-item"
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

            {loading && <p className="contest-status">{copy.loading}</p>}
            {error && !loading && <p className="contest-error">{error}</p>}

            <div className="contest-list">
              {!loading &&
                contests.map((contest, index) => {
                  const qCount = Number(contest.question_count) || 0;
                  const durationMin = Number(contest.exam_duration_minutes) || 30;
                  const desc = contest.description?.trim() || "—";
                  const done = Boolean(contest.completed);
                  const status = Number(contest.status);
                  const playable = canDoContest(status, done);
                  const ctaLabel = contestCtaLabel(status, done);
                  const myScore =
                    contest.my_score != null && contest.my_score !== ""
                      ? Number(contest.my_score)
                      : null;
                  const accent = accentForIndex(index);
                  return (
                    <article
                      key={contest.id}
                      className="contest-card"
                      style={{ "--contest-accent": accent }}
                    >
                      <div className="contest-card-accent" aria-hidden />
                      <div className="card-content">
                        <div className="card-info">
                          <h3 className="contest-title">{contest.name?.trim() || "—"}</h3>
                          <p className="contest-desc">{desc}</p>
                          {done && myScore != null && Number.isFinite(myScore) && (
                            <p className="contest-done-line">
                              {copy.yourScore} {myScore}/{qCount || "—"}
                            </p>
                          )}
                          <div className="meta">
                            <span className="meta-chip meta-chip-grade">
                              🎓 {contest.grade_name || `Khối ${contest.grade_id}`}
                            </span>
                            <span
                              className={`meta-chip meta-chip-status meta-chip-status--${
                                status === CONTEST_STATUS_ACTIVE
                                  ? "active"
                                  : status === CONTEST_STATUS_SCHEDULED
                                    ? "scheduled"
                                    : "ended"
                              }`}
                            >
                              {contestStatusLabel(status)}
                            </span>
                            <span className="meta-chip meta-chip-time">
                              ⏱️ {durationMin} phút
                            </span>
                            <span className="meta-chip meta-chip-questions">
                              📝 {qCount || "—"}
                              {copy.questionsSuffix}
                            </span>
                            <span className="meta-chip meta-chip-schedule">
                              📅 {copy.scheduleLabel}{" "}
                              {formatContestWindow(contest.start_time, contest.end_time)}
                            </span>
                          </div>
                        </div>
                        <div className="card-button">
                          <button
                            type="button"
                            disabled={!playable}
                            onClick={() => playable && handleDoQuiz(contest.id)}
                            className={`contest-cta${playable ? " user-cta-flash" : " contest-cta-done"}`}
                          >
                            <span className="user-cta-flash__label">{ctaLabel}</span>
                          </button>
                        </div>
                      </div>
                      <div className="card-leaderboard">
                        <ContestTop3Leaderboard
                          contestId={contest.id}
                          questionCount={qCount}
                        />
                      </div>
                    </article>
                  );
                })}
            </div>

            {!loading && !error && contests.length === 0 && (
              <p className="contest-status">{copy.empty}</p>
            )}

            {!loading && !error && contests.length > 0 && totalPages > 0 && (
              <NumberPagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                ariaLabel="Phân trang danh sách cuộc thi"
                accentColor={CL.periwinkle}
                inkColor={CL.ink}
              />
            )}
          </section>
        </main>
      </div>

      <style>{`
        .contest-page {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .contest-bg-fixed {
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
        .contest-container {
          position: relative;
          z-index: 1;
          max-width: 960px;
          margin: 0 auto;
          padding: 24px 20px 48px;
          box-sizing: border-box;
        }
        .contest-hero {
          text-align: center;
          margin-bottom: 28px;
          padding: 8px 12px 0;
        }
        .contest-hero-title {
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
        .contest-hero-intro {
          margin: 0 auto;
          max-width: 560px;
          line-height: 1.7;
          color: ${CL.ink};
          font-size: 1.05rem;
          font-weight: 500;
        }
        .contest-panel {
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
        .contest-notes {
          margin-bottom: 22px;
          padding: 16px 18px;
          border-radius: 16px;
          background: linear-gradient(90deg, rgba(146, 185, 227, 0.35), rgba(251, 162, 208, 0.25));
          border-left: 4px solid ${CL.periwinkle};
        }
        .contest-notes-title {
          margin: 0 0 8px;
          font-weight: 700;
          color: ${CL.periwinkle};
          font-size: 1rem;
        }
        .contest-notes-list {
          margin: 0;
          padding-left: 20px;
          color: ${CL.ink};
          line-height: 1.65;
          font-weight: 500;
        }
        .contest-notes-list li {
          margin-bottom: 4px;
        }
        .contest-notes-list li:last-child {
          margin-bottom: 0;
        }
        .contest-toolbar {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          margin-bottom: 22px;
          padding: 14px 16px;
          border-radius: 16px;
          background: linear-gradient(90deg, rgba(146, 185, 227, 0.35), rgba(251, 162, 208, 0.25));
        }
        .contest-filter-label {
          margin: 0;
          color: ${CL.ink};
          font-weight: 700;
          font-size: 0.95rem;
        }
        .contest-grade-pills {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .contest-grade-pill-wrap {
          display: inline-flex;
          align-items: stretch;
          border-radius: 999px;
          border: 2px solid rgba(108, 126, 225, 0.35);
          background: #fff;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(108, 126, 225, 0.12);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .contest-grade-pill-wrap--active {
          border-color: ${CL.periwinkle};
          background: linear-gradient(135deg, ${CL.periwinkle}, ${CL.lavender});
          box-shadow: 0 3px 12px rgba(108, 126, 225, 0.28);
        }
        .contest-grade-pill {
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
        .contest-grade-pill--all {
          border-radius: 999px;
          border: 2px solid rgba(108, 126, 225, 0.35);
          box-shadow: 0 2px 8px rgba(108, 126, 225, 0.12);
        }
        .contest-grade-pill--active {
          background: linear-gradient(135deg, ${CL.periwinkle}, ${CL.lavender});
          color: #fff;
        }
        .contest-grade-pill-wrap .contest-grade-pill {
          border-radius: 0;
          background: transparent;
          padding: 8px 2px 8px 14px;
        }
        .contest-grade-pill-wrap .contest-grade-pill--active {
          background: transparent;
          color: #fff;
        }
        .contest-grade-pill-remove {
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
        .contest-grade-pill-wrap--active .contest-grade-pill-remove {
          color: #fff;
          opacity: 0.88;
        }
        .contest-grade-pill-remove:hover {
          opacity: 1;
          color: ${CL.periwinkle};
        }
        .contest-grade-pill-wrap--active .contest-grade-pill-remove:hover {
          opacity: 1;
          color: #fff;
        }
        .contest-grade-pill-add-wrap {
          position: relative;
        }
        .contest-grade-pill--add {
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
        .contest-grade-pill--add:hover {
          background: #fff;
          border-color: ${CL.lavender};
          color: ${CL.lavender};
        }
        .contest-grade-add-picker {
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
        .contest-grade-add-picker-empty {
          margin: 0;
          padding: 10px 12px;
          color: ${CL.inkMuted};
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .contest-grade-add-picker-item {
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
        .contest-grade-add-picker-item:hover {
          background: rgba(108, 126, 225, 0.14);
          color: ${CL.periwinkle};
        }
        .contest-grade-pill:focus-visible,
        .contest-grade-pill-remove:focus-visible,
        .contest-grade-add-picker-item:focus-visible {
          outline: 2px solid ${CL.lavender};
          outline-offset: 2px;
        }
        .contest-status {
          color: ${CL.inkMuted};
          font-weight: 500;
          text-align: center;
          padding: 12px;
        }
        .contest-error {
          color: #c62828;
          margin-bottom: 16px;
          font-weight: 600;
          text-align: center;
        }
        .contest-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .contest-card {
          position: relative;
          border-radius: 18px;
          padding: 18px 20px 18px 24px;
          background: #fff;
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 6px 20px rgba(74, 80, 128, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          overflow: hidden;
        }
        .contest-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(108, 126, 225, 0.22);
        }
        .contest-card-accent {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          background: var(--contest-accent, ${CL.periwinkle});
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
        .contest-title {
          margin: 0 0 8px;
          color: var(--contest-accent, ${CL.periwinkle});
          font-weight: 700;
          font-size: 1.2rem;
          line-height: 1.35;
        }
        .contest-desc {
          margin: 0 0 12px;
          color: ${CL.inkMuted};
          line-height: 1.55;
          font-size: 0.95rem;
        }
        .contest-done-line {
          margin: 0 0 10px;
          color: #2e7d32;
          font-weight: 700;
          font-size: 15px;
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
        .meta-chip-status--active {
          background: rgba(46, 125, 50, 0.18);
          color: #2e7d32;
        }
        .meta-chip-status--scheduled {
          background: rgba(255, 196, 164, 0.45);
          color: #b85a2e;
        }
        .meta-chip-status--ended {
          background: rgba(176, 190, 197, 0.45);
          color: #546e7a;
        }
        .meta-chip-time {
          background: rgba(198, 136, 235, 0.22);
          color: #8b4cad;
        }
        .meta-chip-questions {
          background: rgba(255, 196, 164, 0.45);
          color: #b85a2e;
        }
        .meta-chip-schedule {
          width: fit-content;
          max-width: 100%;
          background: rgba(108, 126, 225, 0.18);
          color: ${CL.periwinkle};
          line-height: 1.45;
        }
        .card-button {
          flex-shrink: 0;
        }
        .card-leaderboard {
          margin-top: 14px;
          padding-top: 0;
        }
        .contest-cta {
          border: none;
          border-radius: 999px;
          padding: 11px 26px;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(135deg, var(--contest-accent, ${CL.periwinkle}), ${CL.lavender});
          box-shadow: 0 4px 14px rgba(108, 126, 225, 0.35);
          transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s;
        }
        .contest-cta:hover:not(:disabled) {
          transform: scale(1.04);
          filter: brightness(1.05);
          box-shadow: 0 6px 20px rgba(198, 136, 235, 0.45);
        }
        .contest-cta:active:not(:disabled) {
          transform: scale(0.98);
        }
        .contest-cta-done,
        .contest-cta:disabled {
          background: linear-gradient(135deg, #b0bec5, #90a4ae);
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
          filter: none;
        }
        @media (max-width: 768px) {
          .contest-panel {
            padding: 18px 14px 22px;
            border-radius: 18px;
          }
          .contest-grade-pills {
            gap: 6px;
          }
          .contest-grade-pill {
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
          .contest-cta {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
