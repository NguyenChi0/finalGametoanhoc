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
  const [questionImagePreview, setQuestionImagePreview] = useState("");
  const [answers, setAnswers] = useState(initialAnswers);
  const [correctIndex, setCorrectIndex] = useState(0);

  const [loadingGrades, setLoadingGrades] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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

  const readImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setQuestionImage(String(dataUrl || ""));
      setQuestionImagePreview(String(dataUrl || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      readImageFile(file);
    } else {
      setQuestionImage("");
      setQuestionImagePreview("");
    }
  };

  const handlePaste = (event) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            readImageFile(file);
            return;
          }
        }
      }
    }

    const text = event.clipboardData?.getData("text");
    if (text) {
      setQuestionImage(text.trim());
      setQuestionImagePreview(text.trim());
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      readImageFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
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

      setQuestionText("");
      setQuestionImage("");
      setQuestionImagePreview("");
      setAnswers(initialAnswers);
      setCorrectIndex(0);
      setSuccessMessage("Đã lưu câu hỏi. Bạn có thể tiếp tục nhập câu hỏi mới.");
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
              <span style={styles.labelTitle}>
                Khối lớp <span style={styles.req}>*</span>
              </span>
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
              <span style={styles.labelTitle}>
                Chủ đề <span style={styles.req}>*</span>
              </span>
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
              <span style={styles.labelTitle}>
                Bài học <span style={styles.req}>*</span>
              </span>
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
            <span style={styles.labelTitle}>
              Câu hỏi <span style={styles.req}>*</span>
            </span>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              style={styles.textarea}
              rows={4}
              placeholder="Nhập nội dung câu hỏi…"
              required
            />
          </label>
          <div style={styles.uploadLabelContainer}>
            <span style={styles.uploadLabelText}>Ảnh câu hỏi (tùy chọn)</span>
            <div
              style={styles.uploadDropZone}
              onPaste={handlePaste}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              tabIndex={0}
              aria-label="Click để paste ảnh hoặc kéo thả file vào đây"
            >
              <div style={styles.uploadIcon} aria-hidden>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2d5a76" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 5 17 10" />
                  <path d="M12 5v12" />
                </svg>
              </div>
              <div style={styles.uploadTextBlock}>
                <p style={styles.uploadTitle}>Click để paste ảnh (Ctrl+V)</p>
                <p style={styles.uploadSubtitle}>hoặc kéo thả file vào đây</p>
                <p style={styles.uploadHint}>Hỗ trợ: JPG, PNG, GIF (tối đa 5MB)</p>
              </div>
              <label style={styles.uploadButton}>
                Chọn file từ thiết bị
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={styles.fileInput}
                />
              </label>
            </div>
          </div>
          {questionImagePreview && (
            <div style={styles.imagePreviewWrap}>
              <img
                src={questionImagePreview}
                alt="Xem trước ảnh câu hỏi"
                style={styles.previewImage}
              />
              <button
                type="button"
                style={styles.removeImageButton}
                onClick={() => {
                  setQuestionImage("");
                  setQuestionImagePreview("");
                }}
              >
                Xóa ảnh
              </button>
            </div>
          )}
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
      {successMessage && (
        <div style={styles.successBanner} role="status">
          {successMessage}
        </div>
      )}
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
    color: "#2d5a76",
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
    gridTemplateColumns: "repeat(3, minmax(240px, 1fr))",
    gap: 20,
    alignItems: "start",
  },
  label: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontWeight: 600,
    fontSize: "0.88rem",
    color: "#24292f",
  },
  uploadLabelContainer: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontWeight: 600,
    fontSize: "0.88rem",
    color: "#24292f",
  },
  uploadLabelText: {
    fontWeight: 600,
    color: "#24292f",
  },
  labelTitle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
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
    width: "100%",
    boxSizing: "border-box",
  },
  uploadDropZone: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: 16,
    padding: "22px 20px",
    borderRadius: 16,
    border: "1px dashed #c9d3dd",
    background: "#f8fafc",
    color: "#24292f",
    minHeight: 132,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eaf4ff",
    borderRadius: 14,
  },
  uploadTextBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  uploadTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    color: "#24292f",
  },
  uploadSubtitle: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#57606a",
  },
  uploadHint: {
    margin: 0,
    fontSize: "0.82rem",
    color: "#8b96a5",
  },
  uploadButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 18px",
    borderRadius: 10,
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  fileInput: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },
  imagePreviewWrap: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  previewImage: {
    maxWidth: 200,
    maxHeight: 140,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    objectFit: "contain",
  },
  removeImageButton: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    cursor: "pointer",
    fontWeight: 600,
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
    background: "#2d5a76",
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
  successBanner: {
    padding: "12px 16px",
    marginBottom: 16,
    background: "#ecfdf5",
    border: "1px solid #b7ebc6",
    color: "#14532d",
    fontSize: "0.95rem",
  },
};
