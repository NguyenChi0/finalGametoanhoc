import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getContests } from "../../api";
import ContestTop3Leaderboard from "../components/ContestTop3Leaderboard";
import { publicUrl } from "../../lib/publicUrl";

const copy = {
  pageTitle: "Cuộc thi Toán học",
    intro: "Tham gia cuộc thi và nhận muôn vàn giải thưởng hấp dẫn",
    noteTitle: "Lưu ý:",
  note1: "Mỗi bài thi chỉ được làm một lần",
  note2: "Điểm thưởng sẽ được cộng sau khi kết thúc cuộc thi",
  note3: "Hãy kiểm tra kết nối mạng trước khi làm bài.",
  loading: "Đang tải danh sách cuộc thi…",
  loadError: "Không tải được danh sách cuộc thi.",
  empty: "Hiện không có cuộc thi nào đang diễn ra. Vui lòng quay lại sau.",
  scheduleLabel: "Thời gian:",
  questionsSuffix: " câu hỏi",
  doQuiz: "Làm bài",
  completedQuiz: "Đã hoàn thành",
  yourScore: "Điểm:",
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

export default function Contest() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getContests();
        const raw = Array.isArray(data) ? data : [];
        const activeOnly = raw.filter((c) => Number(c.status) === 2);
        if (!cancelled) setContests(activeOnly);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err.response?.data?.message || copy.loadError);
          setContests([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const pageBg = `${publicUrl}/component-images/home-background.png`;

  const handleDoQuiz = (contestId) => {
    navigate(`/contest/${contestId}`);
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

            {loading && <p className="contest-status">{copy.loading}</p>}
            {error && !loading && <p className="contest-error">{error}</p>}

            <div className="contest-list">
              {!loading &&
                contests.map((contest, index) => {
                  const qCount = Number(contest.question_count) || 0;
                  const durationMin = Number(contest.exam_duration_minutes) || 30;
                  const desc = contest.description?.trim() || "—";
                  const done = Boolean(contest.completed);
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
                            disabled={done}
                            onClick={() => !done && handleDoQuiz(contest.id)}
                            className={`contest-cta${done ? " contest-cta-done" : ""}`}
                          >
                            {done ? copy.completedQuiz : copy.doQuiz}
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
