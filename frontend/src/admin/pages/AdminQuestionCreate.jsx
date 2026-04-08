import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getGrades, getTypes, getLessons, createQuestion } from "../../api";

const initialAnswers = ["", "", "", ""];

export default function AdminQuestionCreate() {
  const navigate = useNavigate();
  const [grades, setGrades] = useState([]);
  const [types, setTypes] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [gradeId, setGradeId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [lessonId, setLessonId] = useState("");

  const [questionText, setQuestionText] = useState("");
  const [questionImage, setQuestionImage] = useState("");
  const [answers, setAnswers] = useState(initialAnswers);
  const [correctIndex, setCorrectIndex] = useState(0);

  const [loadingGrades, setLoadingGrades] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadGrades = useCallback(async () => {
    setLoadingGrades(true);
    setError(null);
    try {
      const data = await getGrades();
      setGrades(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Không tải được danh sách khối lớp.");
      setGrades([]);
    } finally {
      setLoadingGrades(false);
    }
  }, []);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    if (!gradeId) {
      setTypes([]);
      setTypeId("");
      return;
    }
    const gid = Number(gradeId);
    let cancelled = false;
    (async () => {
      setLoadingTypes(true);
      setError(null);
      try {
        const raw = await getTypes(gid);
        if (!cancelled) {
          setTypes(Array.isArray(raw) ? raw : []);
          setTypeId("");
          setLessonId("");
          setLessons([]);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Không tải được chủ đề.");
          setTypes([]);
        }
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeId]);

  useEffect(() => {
    if (!typeId) {
      setLessons([]);
      setLessonId("");
      return;
    }
    const tid = Number(typeId);
    let cancelled = false;
    (async () => {
      setLoadingLessons(true);
      setError(null);
      try {
        const raw = await getLessons(tid);
        if (!cancelled) {
          setLessons(Array.isArray(raw) ? raw : []);
          setLessonId("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Không tải được bài học.");
          setLessons([]);
        }
      } finally {
        if (!cancelled) setLoadingLessons(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [typeId]);

  const setAnswerAt = (idx, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!gradeId || !typeId || !lessonId) {
      setError("Vui lòng chọn khối lớp, chủ đề và bài học.");
      return;
    }
    setSaving(true);
    try {
      await createQuestion({
        grade_id: Number(gradeId),
        type_id: Number(typeId),
        lesson_id: Number(lessonId),
        question_text: questionText,
        question_image: questionImage.trim() || null,
        answers,
        correct_index: correctIndex,
      });
      navigate("/admin/questions");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không lưu được câu hỏi.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const canPickHierarchy =
    !loadingGrades && grades.length > 0;

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <Link to="/admin/questions" style={styles.crumbLink}>
          Quản lý câu hỏi
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Tạo câu hỏi</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Tạo câu hỏi</h1>
          <p style={styles.lead}>
            Chọn phân cấp (khối → chủ đề → bài học), nhập nội dung và bốn đáp án
            trắc nghiệm, đánh dấu đáp án đúng.
          </p>
        </div>
        <Link to="/admin/questions" style={styles.btnGhost}>
          ← Quay lại danh sách
        </Link>
      </header>

      {error && (
        <div style={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      {loadingGrades && (
        <p style={styles.muted}>Đang tải danh sách khối lớp…</p>
      )}

      <form onSubmit={handleSubmit} style={styles.formCard}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Phân cấp</h2>
          <div style={styles.grid3}>
            <label style={styles.label}>
              Khối lớp <span style={styles.req}>*</span>
              <select
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                style={styles.select}
                required
                disabled={!canPickHierarchy}
              >
                <option value="">— Chọn khối —</option>
                {grades.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Chủ đề <span style={styles.req}>*</span>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                style={styles.select}
                required
                disabled={!gradeId || loadingTypes}
              >
                <option value="">
                  {gradeId ? "— Chọn chủ đề —" : "Chọn khối trước"}
                </option>
                {types.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              Bài học <span style={styles.req}>*</span>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                style={styles.select}
                required
                disabled={!typeId || loadingLessons}
              >
                <option value="">
                  {typeId ? "— Chọn bài học —" : "Chọn chủ đề trước"}
                </option>
                {lessons.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </select>
              {typeId && !loadingLessons && lessons.length === 0 && (
                <span style={styles.warnInline}>
                  Chưa có bài học cho chủ đề này — thêm bài học ở Quản lý chủ đề
                  trước.
                </span>
              )}
            </label>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Nội dung câu hỏi</h2>
          <label style={styles.label}>
            Câu hỏi <span style={styles.req}>*</span>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              style={styles.textarea}
              rows={4}
              placeholder="Nhập nội dung câu hỏi…"
              required
            />
          </label>
          <label style={styles.label}>
            Link ảnh câu hỏi (tùy chọn)
            <input
              type="url"
              value={questionImage}
              onChange={(e) => setQuestionImage(e.target.value)}
              style={styles.input}
              placeholder="https://…"
            />
          </label>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Đáp án trắc nghiệm</h2>
          <p style={styles.hint}>
            Nhập đủ 4 phương án và chọn một đáp án đúng.
          </p>
          {[0, 1, 2, 3].map((i) => {
            const label = ["A", "B", "C", "D"][i];
            return (
              <div key={i} style={styles.answerRow}>
                <label style={styles.radioWrap}>
                  <input
                    type="radio"
                    name="correct"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                  />
                  <span style={styles.answerBadge}>{label}</span>
                </label>
                <input
                  type="text"
                  value={answers[i]}
                  onChange={(e) => setAnswerAt(i, e.target.value)}
                  style={styles.inputFlex}
                  placeholder={`Đáp án ${label}`}
                  required
                />
              </div>
            );
          })}
        </section>

        <div style={styles.actions}>
          <Link to="/admin/questions" style={styles.btnSecondary}>
            Hủy
          </Link>
          <button
            type="submit"
            style={{
              ...styles.btnPrimary,
              ...(saving ? { opacity: 0.7, pointerEvents: "none" } : {}),
            }}
            disabled={saving}
          >
            {saving ? "Đang lưu…" : "Lưu câu hỏi"}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  root: {
    width: "100%",
    minWidth: 0,
    color: "#24292f",
  },
  breadcrumb: {
    fontSize: "0.875rem",
    color: "#57606a",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  crumbLink: {
    color: "#0969da",
    textDecoration: "none",
  },
  crumbSep: { color: "#d0d7de", userSelect: "none" },
  crumbCurrent: { color: "#24292f", fontWeight: 600 },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1f2328",
    letterSpacing: "-0.02em",
  },
  lead: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#57606a",
    lineHeight: 1.5,
  },
  btnGhost: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.9rem",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  errorBanner: {
    padding: "12px 16px",
    marginBottom: 16,
    borderRadius: 8,
    background: "#fff8f5",
    border: "1px solid #f0c4a8",
    color: "#9a3412",
    fontSize: "0.9rem",
  },
  formCard: {
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
    padding: "20px 24px",
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontWeight: 600,
    fontSize: "0.88rem",
    color: "#24292f",
  },
  req: { color: "#cf222e" },
  select: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    background: "#fff",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
  },
  textarea: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    lineHeight: 1.5,
    resize: "vertical",
  },
  hint: {
    margin: "0 0 12px",
    fontSize: "0.88rem",
    color: "#57606a",
    fontWeight: 400,
  },
  answerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  radioWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 72,
    cursor: "pointer",
    fontWeight: 600,
  },
  answerBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    fontSize: "0.85rem",
    color: "#24292f",
  },
  inputFlex: {
    flex: 1,
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 8,
    borderTop: "1px solid #eaeef2",
    marginTop: 8,
  },
  btnSecondary: {
    padding: "10px 20px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.95rem",
    textDecoration: "none",
  },
  btnPrimary: {
    padding: "10px 22px",
    borderRadius: 10,
    border: "none",
    background: "#0969da",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(31,35,40,0.08)",
  },
  muted: {
    margin: "0 0 16px",
    fontSize: "0.9rem",
    color: "#57606a",
  },
  warnInline: {
    fontSize: "0.82rem",
    color: "#9a3412",
    fontWeight: 500,
    marginTop: 4,
  },
};
