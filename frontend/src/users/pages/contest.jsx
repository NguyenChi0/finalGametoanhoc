import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getContests } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

const copy = {
  pageTitle: "Cuộc thi Toán học",
  intro:
    "Chào mừng bạn đến với Cuộc thi Toán học",
  noteTitle: "Lưu ý:",
  note1:
    "Mỗi bài thi chỉ được làm một lần",
  note2:
    "Điểm thưởng sẽ được cộng sau khi kết thúc cuộc thi",
  note3:
    "Hãy kiểm tra kết nối mạng trước khi làm bài.",
  loading: "Đang tải danh sách cuộc thi…",
  loadError: "Không tải được danh sách cuộc thi.",
  empty: "Hiện không có cuộc thi nào đang diễn ra. Vui lòng quay lại sau.",
  scheduleLabel: "Thời gian tổ chức:",
  questionsSuffix: " câu hỏi",
  doQuiz: "Làm bài",
  completedQuiz: "Đã hoàn thành",
  yourScore: "Điểm:",
};

function formatContestWindow(start, end) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s || Number.isNaN(s.getTime())) return "—";
  const opts = { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" };
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
        // Chỉ hiển thị cuộc thi đang diễn ra (status === 2), khớp backend.
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

  const bgFixedLayer = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    backgroundColor: "#b8e0f5",
    backgroundImage: `url(${pageBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    transform: "translateZ(0)",
    backfaceVisibility: "hidden",
  };

  const handleDoQuiz = (contestId) => {
    navigate(`/contest/${contestId}`);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={bgFixedLayer} aria-hidden />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 960,
          margin: "0 auto",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <main>
          <section style={{ padding: "28px 24px" }}>
            <h1 style={{ marginBottom: 14, color: "#0f4c75" }}>{copy.pageTitle}</h1>
            <p style={{ lineHeight: 1.75, color: "#263238", marginBottom: 24 }}>{copy.intro}</p>

            <div style={{ marginBottom: 32 }}>
              <p style={{ margin: 0, fontWeight: 600, color: "#3282b8" }}>{copy.noteTitle}</p>
              <ul style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0, color: "#455a64" }}>
                <li>{copy.note1}</li>
                <li>{copy.note2}</li>
                <li>{copy.note3}</li>
              </ul>
            </div>

            {loading && <p style={{ color: "#455a64" }}>{copy.loading}</p>}
            {error && !loading && (
              <p style={{ color: "#c62828", marginBottom: 16 }}>{error}</p>
            )}

            <div className="contest-list">
              {!loading &&
                contests.map((contest) => {
                  const qCount = Number(contest.question_count) || 0;
                  const durationMin = Number(contest.exam_duration_minutes) || 30;
                  const desc = contest.description?.trim() || "—";
                  const done = Boolean(contest.completed);
                  const myScore =
                    contest.my_score != null && contest.my_score !== ""
                      ? Number(contest.my_score)
                      : null;
                  return (
                    <div key={contest.id} className="contest-card">
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
                            <span>{"\u23F1\uFE0F"} {durationMin} phút</span>
                            <span>
                              {"\uD83D\uDCDD"} {qCount || "—"}
                              {copy.questionsSuffix}
                            </span>
                            <span className="meta-schedule">
                              {"\uD83D\uDCC5"} {copy.scheduleLabel}{" "}
                              {formatContestWindow(contest.start_time, contest.end_time)}
                            </span>
                          </div>
                        </div>
                        <div className="card-button">
                          <button
                            type="button"
                            disabled={done}
                            onClick={() => !done && handleDoQuiz(contest.id)}
                            className={done ? "btn-done" : ""}
                          >
                            {done ? copy.completedQuiz : copy.doQuiz}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {!loading && !error && contests.length === 0 && (
              <p style={{ color: "#455a64" }}>{copy.empty}</p>
            )}

            <style>{`
                .contest-list { display: flex; flex-direction: column; gap: 20px; }
                .contest-card { border: 1px solid #e0e7ed; border-radius: 16px; padding: 18px 20px; transition: all 0.2s; background-color: #fefefe; }
                .card-content { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
                .card-info { flex: 1; }
                .card-info h3.contest-title { margin: 0 0 8px 0; color: #3282b8; font-weight: 600; font-size: 1.15rem; }
                .contest-desc { margin: 0 0 10px 0; color: #4a627a; line-height: 1.5; }
                .contest-done-line { margin: 0 0 8px 0; color: #2e7d32; font-weight: 600; font-size: 15px; }
                .meta { display: flex; flex-wrap: wrap; gap: 12px 16px; font-size: 14px; color: #2c6e9e; }
                .meta-schedule { flex-basis: 100%; max-width: 100%; line-height: 1.4; }
                .card-button { flex-shrink: 0; }
                .card-button button { background-color: #0f4c75; border: none; border-radius: 40px; padding: 10px 24px; color: white; font-weight: 600; font-size: 15px; cursor: pointer; transition: background 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
                .card-button button:hover:not(:disabled) { background-color: #3282b8; }
                .card-button button:disabled, .card-button button.btn-done { background-color: #90a4ae; cursor: not-allowed; box-shadow: none; }
                @media (max-width: 768px) {
                  .card-content { flex-direction: column; align-items: stretch; }
                  .card-button { margin-top: 12px; }
                  .card-button button { width: 100%; }
                }
              `}</style>
          </section>
        </main>
      </div>
    </div>
  );
}
