import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../../api";
import AdminPerformanceChart from "../components/AdminPerformanceChart";

const KPI_CARDS = [
  { key: "users", label: "Người dùng", to: "/admin/users" },
  { key: "questions", label: "Câu hỏi", to: "/admin/questions" },
  { key: "grades", label: "Khối lớp", to: "/admin/grades" },
  { key: "types", label: "Chủ đề", to: "/admin/math-types" },
  { key: "lessons", label: "Bài học", to: "/admin/math-types" },
  { key: "examTemplates", label: "Mẫu đề", to: "/admin/exams" },
  { key: "contests", label: "Cuộc thi", to: "/admin/contest" },
  { key: "items", label: "Vật phẩm", to: "/admin/items" },
];

const KPI_THEMES = {
  users: { bg: "#eff6ff", label: "#1e40af", value: "#1d4ed8" },
  questions: { bg: "#f5f3ff", label: "#5b21b6", value: "#6d28d9" },
  grades: { bg: "#ecfdf5", label: "#047857", value: "#059669" },
  types: { bg: "#fff7ed", label: "#c2410c", value: "#ea580c" },
  lessons: { bg: "#ecfeff", label: "#0e7490", value: "#0891b2" },
  examTemplates: { bg: "#eef2ff", label: "#4338ca", value: "#4f46e5" },
  contests: { bg: "#fff1f2", label: "#be123c", value: "#e11d48" },
  items: { bg: "#fefce8", label: "#a16207", value: "#ca8a04" },
};

const INFO_CARD_THEMES = {
  contest: { background: "#fff1f2", color: "#be123c" },
  topLessons: { background: "#ecfeff", color: "#0e7490" },
  unplayed: { background: "#fefce8", color: "#a16207" },
  topScore: { background: "#eef2ff", color: "#4338ca" },
};

function fmt(n) {
  return Number(n || 0).toLocaleString("vi-VN");
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lessonLine(item) {
  const parts = [item.gradeName, item.typeName, item.name].filter(Boolean);
  return parts.length ? parts.join(" · ") : item.name || `#${item.id}`;
}

function extraCount(total, items) {
  const t = Number(total) || 0;
  const n = Array.isArray(items) ? items.length : 0;
  const rest = t - n;
  return rest > 0 ? ` (và ${fmt(rest)} mục khác)` : "";
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const res = await getAdminDashboard();
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.response?.data?.message || e?.message || "Không tải được thống kê."
          );
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = data?.counts || {};
  const alerts = data?.alerts || {};
  const activity = data?.activity || {};
  const users = data?.users || {};

  const lessonsNoQ = alerts.lessonsWithoutQuestions || { total: 0, items: [] };
  const emptyExams = alerts.emptyExamTemplates || { total: 0, items: [] };
  const contestInfo = alerts.contests || {
    scheduled: 0,
    active: 0,
    ended: 0,
    activeItems: [],
    upcomingItems: [],
  };
  const unplayed = activity.unplayedLessons || { total: 0, items: [] };

  const hasAlerts = (lessonsNoQ.total || 0) > 0 || (emptyExams.total || 0) > 0;

  return (
    <div>
      <style>
        {`
          .admin-kpi-link {
            display: block;
            text-decoration: none;
            color: inherit;
          }
          .admin-kpi-card {
            transition: box-shadow 0.22s ease, transform 0.22s ease;
          }
          .admin-kpi-link:hover .admin-kpi-card {
            transform: translateY(-4px);
            box-shadow:
              0 10px 28px rgba(31, 35, 40, 0.14),
              0 4px 10px rgba(31, 35, 40, 0.08);
          }
          .admin-kpi-link:active .admin-kpi-card {
            transform: translateY(-1px);
            box-shadow:
              0 4px 14px rgba(31, 35, 40, 0.1),
              0 2px 6px rgba(31, 35, 40, 0.06);
          }
          .admin-kpi-link:focus-visible {
            outline: 2px solid #2d5a76;
            outline-offset: 3px;
            border-radius: 14px;
          }
        `}
      </style>
      <h1 style={styles.h1}>Tổng quan</h1>
      <p style={styles.lead}>
        Số liệu hệ thống, việc cần xử lý và hoạt động học tập gần đây.
      </p>

      {loading ? (
        <p style={styles.muted}>Đang tải thống kê…</p>
      ) : error ? (
        <p style={styles.error} role="alert">
          {error}
        </p>
      ) : (
        <>
          <section style={styles.section} aria-label="Chỉ số tổng quan">
            <h2 style={styles.sectionTitle}>Chỉ số</h2>
            <div style={styles.kpiGrid}>
              {KPI_CARDS.map(({ key, label, to }) => {
                const theme = KPI_THEMES[key] || KPI_THEMES.users;
                return (
                  <Link key={key} to={to} className="admin-kpi-link">
                    <div
                      className="admin-kpi-card"
                      style={{
                        ...styles.kpiCard,
                        background: theme.bg,
                      }}
                    >
                      <span style={{ ...styles.kpiLabel, color: theme.label }}>{label}</span>
                      <span style={{ ...styles.kpiValue, color: theme.value }}>
                        {fmt(counts[key])}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section style={styles.section} aria-label="Cần xử lý">
            <h2 style={styles.sectionTitle}>Cần xử lý</h2>
            {!hasAlerts ? (
              <p style={styles.okMsg}>Không có việc cần xử lý.</p>
            ) : (
              <div style={styles.twoCol}>
                <div style={styles.card}>
                  <h3 style={styles.alertCardTitle}>
                    Bài chưa có câu hỏi ({fmt(lessonsNoQ.total)})
                  </h3>
                  {lessonsNoQ.total === 0 ? (
                    <p style={styles.cardMuted}>Không có.</p>
                  ) : (
                    <ul style={styles.list}>
                      {(lessonsNoQ.items || []).map((item) => (
                        <li key={item.id}>{lessonLine(item)}</li>
                      ))}
                    </ul>
                  )}
                  {lessonsNoQ.total > 0 ? (
                    <p style={styles.cardFoot}>
                      <Link to="/admin/questions" style={styles.inlineLink}>
                        Quản lý câu hỏi
                      </Link>
                      {extraCount(lessonsNoQ.total, lessonsNoQ.items)}
                    </p>
                  ) : null}
                </div>

                <div style={styles.card}>
                  <h3 style={styles.alertCardTitle}>
                    Mẫu đề trống ({fmt(emptyExams.total)})
                  </h3>
                  {emptyExams.total === 0 ? (
                    <p style={styles.cardMuted}>Không có.</p>
                  ) : (
                    <ul style={styles.list}>
                      {(emptyExams.items || []).map((item) => (
                        <li key={item.id}>
                          {item.name}
                          {item.gradeName ? ` (${item.gradeName})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {emptyExams.total > 0 ? (
                    <p style={styles.cardFoot}>
                      <Link to="/admin/exams" style={styles.inlineLink}>
                        Quản lý đề thi
                      </Link>
                      {extraCount(emptyExams.total, emptyExams.items)}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          <section style={styles.section} aria-label="Thông tin">
            <h2 style={styles.sectionTitle}>Thông tin</h2>
            <div style={styles.infoGrid}>
              <div style={styles.card}>
                <h3 style={{ ...styles.infoCardTitle, ...INFO_CARD_THEMES.contest }}>Cuộc thi</h3>
                <div style={styles.contestStats}>
                  <span>Sắp diễn ra: <b>{fmt(contestInfo.scheduled)}</b></span>
                  <span>Đang chạy: <b>{fmt(contestInfo.active)}</b></span>
                  <span>Đã kết thúc: <b>{fmt(contestInfo.ended)}</b></span>
                </div>
                {(contestInfo.activeItems || []).length > 0 ? (
                  <>
                    <p style={styles.subHeadActive}>Đang diễn ra</p>
                    <ul style={styles.list}>
                      {contestInfo.activeItems.map((c) => (
                        <li key={c.id}>
                          {c.name}
                          {c.gradeName ? ` · ${c.gradeName}` : ""}
                          {" — kết thúc "}
                          {fmtDateTime(c.endTime)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {(contestInfo.upcomingItems || []).length > 0 ? (
                  <>
                    <p style={styles.subHeadUpcoming}>Sắp diễn ra</p>
                    <ul style={styles.list}>
                      {contestInfo.upcomingItems.map((c) => (
                        <li key={c.id}>
                          {c.name}
                          {c.gradeName ? ` · ${c.gradeName}` : ""}
                          {" — bắt đầu "}
                          {fmtDateTime(c.startTime)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <p style={styles.cardFoot}>
                  <Link to="/admin/contest" style={styles.inlineLink}>
                    Quản lý cuộc thi
                  </Link>
                </p>
              </div>

              <div style={styles.card}>
                <h3 style={{ ...styles.infoCardTitle, ...INFO_CARD_THEMES.topLessons }}>
                  Top bài chơi nhiều
                </h3>
                {(activity.topLessons7d || []).length === 0 ? (
                  <p style={styles.cardMuted}>Chưa có dữ liệu.</p>
                ) : (
                  <ul style={styles.list}>
                    {(activity.topLessons7d || []).map((row) => (
                      <li key={row.lessonId}>
                        {lessonLine({ ...row, name: row.lessonName })} — {fmt(row.completions)} lượt
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={styles.card}>
                <h3 style={{ ...styles.infoCardTitle, ...INFO_CARD_THEMES.unplayed }}>
                  Bài chưa ai chơi ({fmt(unplayed.total)})
                </h3>
                {unplayed.total === 0 ? (
                  <p style={styles.cardMuted}>Mọi bài đều đã có người chơi.</p>
                ) : (
                  <>
                    <ul style={styles.list}>
                      {(unplayed.items || []).map((item) => (
                        <li key={item.id}>{lessonLine(item)}</li>
                      ))}
                    </ul>
                    <p style={styles.cardFoot}>{extraCount(unplayed.total, unplayed.items)}</p>
                  </>
                )}
              </div>

              <div style={styles.card}>
                <h3 style={{ ...styles.infoCardTitle, ...INFO_CARD_THEMES.topScore }}>
                  Top điểm tuần
                </h3>
                {(users.topWeekScore || []).length === 0 ? (
                  <p style={styles.cardMuted}>Chưa có dữ liệu.</p>
                ) : (
                  <ol style={styles.rankList}>
                    {(users.topWeekScore || []).map((u, i) => (
                      <li key={u.id}>
                        <span style={styles.rankNum}>{i + 1}.</span>
                        {u.username} — {fmt(u.weekScore)} điểm
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </section>

          <section style={styles.section} aria-label="Hiệu suất">
            <h2 style={styles.sectionTitle}>Hiệu suất</h2>
            <div style={styles.twoCol}>
              <AdminPerformanceChart />
            </div>
          </section>

          <section style={styles.section} aria-label="Người dùng">
            <h2 style={styles.sectionTitle}>Người dùng</h2>
            <div style={styles.twoCol}>
              <div style={styles.card}>
                <div style={styles.statRow}>
                  <div style={styles.miniStat}>
                    <span style={styles.miniStatValue}>{fmt(users.new7d)}</span>
                    <span style={styles.miniStatLabel}>Đăng ký mới trong 7 ngày</span>
                  </div>
                  <div style={styles.miniStat}>
                    <span style={styles.miniStatValue}>{fmt(users.new30d)}</span>
                    <span style={styles.miniStatLabel}>Đăng ký mới trong 30 ngày</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const styles = {
  h1: {
    margin: "0 0 8px",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  lead: {
    margin: "0 0 24px",
    color: "#57606a",
    maxWidth: 640,
    lineHeight: 1.5,
  },
  muted: {
    color: "#57606a",
    fontSize: "0.95rem",
  },
  error: {
    color: "#cf222e",
    fontWeight: 600,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#2d5a76",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 12,
  },
  kpiCard: {
    borderRadius: 12,
    padding: "16px 14px",
    boxShadow: "0 1px 3px rgba(31, 35, 40, 0.06)",
  },
  kpiLabel: {
    display: "block",
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: 6,
  },
  kpiValue: {
    display: "block",
    fontSize: "1.65rem",
    fontWeight: 800,
    lineHeight: 1.2,
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 12,
    padding: "18px 16px",
    boxShadow: "0 1px 3px rgba(31, 35, 40, 0.06)",
  },
  cardWide: {
    gridColumn: "1 / -1",
  },
  cardTitle: {
    margin: "0 0 10px",
    fontSize: "0.98rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  infoCardTitle: {
    margin: "-18px -16px 12px",
    padding: "10px 16px",
    fontSize: "0.98rem",
    fontWeight: 700,
    borderRadius: "12px 12px 0 0",
  },
  alertCardTitle: {
    margin: "-18px -16px 12px",
    padding: "10px 16px",
    fontSize: "0.98rem",
    fontWeight: 700,
    color: "#7f1d1d",
    background: "#fecaca",
    borderRadius: "12px 12px 0 0",
  },
  cardMuted: {
    margin: 0,
    fontSize: "0.88rem",
    color: "#57606a",
  },
  cardFoot: {
    margin: "10px 0 0",
    fontSize: "0.82rem",
    color: "#57606a",
  },
  okMsg: {
    margin: 0,
    padding: "14px 16px",
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    borderRadius: 10,
    color: "#57606a",
    fontSize: "0.9rem",
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    fontSize: "0.88rem",
    color: "#24292f",
    lineHeight: 1.5,
  },
  rankList: {
    margin: 0,
    paddingLeft: 0,
    listStyle: "none",
    fontSize: "0.88rem",
    color: "#24292f",
    lineHeight: 1.6,
  },
  rankNum: {
    display: "inline-block",
    minWidth: 20,
    color: "#57606a",
    fontWeight: 700,
  },
  inlineLink: {
    color: "#2d5a76",
    fontWeight: 600,
    textDecoration: "none",
  },
  contestStats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px 20px",
    fontSize: "0.88rem",
    color: "#57606a",
    marginBottom: 10,
  },
  subHeadActive: {
    display: "inline-block",
    margin: "12px 0 8px",
    padding: "5px 12px",
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#166534",
    background: "#dcfce7",
    borderRadius: 999,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  subHeadUpcoming: {
    display: "inline-block",
    margin: "12px 0 8px",
    padding: "5px 12px",
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#854d0e",
    background: "#fef9c3",
    borderRadius: 999,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  statRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
  },
  miniStat: {
    flex: "1 1 120px",
  },
  miniStatValue: {
    display: "block",
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#2d5a76",
    lineHeight: 1.2,
  },
  miniStatLabel: {
    display: "block",
    fontSize: "0.82rem",
    color: "#57606a",
    marginTop: 4,
  },
};
