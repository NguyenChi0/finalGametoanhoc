import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getExams } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

const copy = {
  pageTitle: "Danh sách đề thi",
  intro:
    "Chọn một đề phù hợp để luyện tập. Mỗi đề được xây dựng từ ngân hàng câu hỏi theo từng khối lớp.",
  loading: "Đang tải danh sách đề thi…",
  loadError: "Không tải được danh sách đề thi.",
  empty: "Chưa có đề thi nào. Vui lòng quay lại sau.",
  questionsSuffix: "câu hỏi",
  durationSuffix: "phút",
  viewDetail: "Xem chi tiết",
};

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Exam() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getExams();
        if (!cancelled) {
          const rows = Array.isArray(data) ? data : [];
          setExams(rows.filter((exam) => Number(exam?.status) === 1));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err.response?.data?.message || copy.loadError);
          setExams([]);
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

            {loading && <p style={{ color: "#455a64" }}>{copy.loading}</p>}
            {error && !loading && (
              <p style={{ color: "#c62828", marginBottom: 16 }}>{error}</p>
            )}

            <div className="exam-list">
              {!loading &&
                exams.map((exam) => {
                  const qCount = Number(exam.question_count) || 0;
                  const duration = Number(exam.duration_time) || 0;
                  const desc = exam.description?.trim() || "—";
                  return (
                    <div key={exam.id} className="exam-card">
                      <div className="card-content">
                        <div className="card-info">
                          <h3 className="exam-title">{exam.name?.trim() || "—"}</h3>
                          <p className="exam-desc">{desc}</p>
                          <div className="meta">
                            <span>🎓 {exam.grade_name || `Khối ${exam.grade_id}`}</span>
                            <span>📝 {qCount} {copy.questionsSuffix}</span>
                            <span>⏱️ {duration || "—"} {copy.durationSuffix}</span>
                            <span className="meta-schedule">
                              🗓️ Tạo lúc: {formatDateTime(exam.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="card-button">
                          <button
                            type="button"
                            onClick={() => navigate(`/exam/${exam.id}`)}
                          >
                            {copy.viewDetail}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {!loading && !error && exams.length === 0 && (
              <p style={{ color: "#455a64" }}>{copy.empty}</p>
            )}

            <style>{`
              .exam-list { display: flex; flex-direction: column; gap: 20px; }
              .exam-card { border: 1px solid #e0e7ed; border-radius: 16px; padding: 18px 20px; transition: all 0.2s; background-color: #fefefe; }
              .card-content { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
              .card-info { flex: 1; }
              .card-info h3.exam-title { margin: 0 0 8px 0; color: #3282b8; font-weight: 600; font-size: 1.15rem; }
              .exam-desc { margin: 0 0 10px 0; color: #4a627a; line-height: 1.5; }
              .meta { display: flex; flex-wrap: wrap; gap: 12px 16px; font-size: 14px; color: #2c6e9e; }
              .meta-schedule { flex-basis: 100%; max-width: 100%; line-height: 1.4; }
              .card-button { flex-shrink: 0; }
              .card-button button { background-color: #0f4c75; border: none; border-radius: 40px; padding: 10px 24px; color: white; font-weight: 600; font-size: 15px; cursor: pointer; transition: background 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
              .card-button button:hover { background-color: #3282b8; }
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
