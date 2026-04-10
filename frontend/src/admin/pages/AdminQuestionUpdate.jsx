import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const initialAnswers = ["", "", "", ""];

/**
 * Demo: nhận dữ liệu từ Quản lý câu hỏi qua navigate(..., { state: { draft } }).
 * Không gọi API — giữ giao diện tương tự AdminQuestionCreate.
 */
export default function AdminQuestionUpdate() {
  const location = useLocation();
  const navigate = useNavigate();
  const draft = location.state?.draft;

  const [questionId, setQuestionId] = useState(null);
  const [gradeLabel, setGradeLabel] = useState("");
  const [subjectLabel, setSubjectLabel] = useState("");
  const [lessonLabel, setLessonLabel] = useState("");
  const [gradeLine, setGradeLine] = useState("");
  const [topicLine, setTopicLine] = useState("");
  const [typeLabel, setTypeLabel] = useState("");

  const [questionText, setQuestionText] = useState("");
  const [questionImage, setQuestionImage] = useState("");
  const [questionImagePreview, setQuestionImagePreview] = useState("");
  const [answers, setAnswers] = useState(initialAnswers);
  const [correctIndex, setCorrectIndex] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    if (!draft) {
      setQuestionId(null);
      setGradeLabel("");
      setSubjectLabel("");
      setLessonLabel("");
      setGradeLine("");
      setTopicLine("");
      setTypeLabel("");
      setQuestionText("");
      setQuestionImage("");
      setQuestionImagePreview("");
      setAnswers(initialAnswers);
      setCorrectIndex(0);
      return;
    }
    setQuestionId(draft.id);
    setGradeLabel(draft.gradeLabel || "");
    setSubjectLabel(draft.subjectLabel || "");
    setLessonLabel(draft.lessonLabel || "");
    setGradeLine(draft.gradeLine || "");
    setTopicLine(draft.topicLine || "");
    setTypeLabel(draft.typeLabel || "");
    setQuestionText(draft.questionText || "");
    setQuestionImage(draft.questionImage || "");
    setQuestionImagePreview(draft.questionImagePreview || "");
    setAnswers(
      Array.isArray(draft.answers) && draft.answers.length === 4
        ? [...draft.answers]
        : initialAnswers
    );
    setCorrectIndex(
      typeof draft.correctIndex === "number" && draft.correctIndex >= 0 && draft.correctIndex < 4
        ? draft.correctIndex
        : 0
    );
  }, [draft, location.key]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!draft) {
      setError("Không có dữ liệu câu hỏi.");
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      navigate("/admin/questions", { replace: true });
    }, 400);
  };

  if (!draft) {
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
          <span style={styles.crumbCurrent}>Cập nhật câu hỏi</span>
        </nav>
        <div style={styles.emptyWrap}>
          <p style={styles.emptyTitle}>Chưa có dữ liệu câu hỏi</p>
          <p style={styles.muted}>
            Hãy mở từ <strong>Quản lý câu hỏi</strong> → nút chỉnh sửa (bút) trên một dòng. Truy cập trực
            tiếp URL hoặc F5 sẽ mất <code style={styles.code}>location.state</code>.
          </p>
          <Link to="/admin/questions" style={styles.btnGhost}>
            ← Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

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
        <span style={styles.crumbCurrent}>Cập nhật câu hỏi</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Cập nhật câu hỏi #{questionId}</h1>
          <p style={styles.lead}>
            Cập nhật phân cấp (khối → chủ đề → bài học), nhập nội dung và bốn đáp án trắc nghiệm, đánh dấu
            đáp án đúng.
          </p>
        </div>
        <Link to="/admin/questions" style={styles.btnGhost}>
          ← Quay lại danh sách
        </Link>
      </header>

      <p style={styles.demoBanner}>
        Demo: <strong>Phân cấp</strong> đọc từ dòng bảng (mock). Sau này có thể thay bằng select gắn API
        giống màn tạo mới.
      </p>

      {error && (
        <div style={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.formCard}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Phân cấp (xem)</h2>
          <div style={styles.grid3}>
            <div style={styles.label}>
              <span style={styles.labelTitle}>Khối lớp</span>
              <div style={styles.readonlyBox}>{gradeLabel || "—"}</div>
            </div>
            <div style={styles.label}>
              <span style={styles.labelTitle}>Dạng / môn</span>
              <div style={styles.readonlyBox}>{subjectLabel || "—"}</div>
            </div>
            <div style={styles.label}>
              <span style={styles.labelTitle}>Bài học</span>
              <div style={styles.readonlyBox}>{lessonLabel || "—"}</div>
            </div>
          </div>
          <div style={styles.hierarchyBlock}>
            <span style={styles.hierarchyLine}>{gradeLine}</span>
            <span style={styles.hierarchySub}>{topicLine}</span>
            <span style={styles.typeLine}>Loại: {typeLabel}</span>
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
                <input type="file" accept="image/*" onChange={handleFileChange} style={styles.fileInput} />
              </label>
            </div>
          </div>
          {questionImagePreview && (
            <div style={styles.imagePreviewWrap}>
              <img src={questionImagePreview} alt="Xem trước ảnh câu hỏi" style={styles.previewImage} />
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
          <p style={styles.hint}>Nhập đủ 4 phương án và chọn một đáp án đúng.</p>
          {[0, 1, 2, 3].map((i) => {
            const label = ["A", "B", "C", "D"][i];
            return (
              <div key={i} style={styles.answerRow}>
                <label style={styles.radioWrap}>
                  <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
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
            {saving ? "Đang lưu…" : "Lưu thay đổi (demo)"}
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
    marginBottom: 16,
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
  demoBanner: {
    margin: "0 0 16px",
    padding: "10px 14px",
    fontSize: "0.88rem",
    color: "#1e3a4c",
    background: "#eaf4ff",
    border: "1px solid #c9d8e8",
    borderRadius: 8,
    lineHeight: 1.45,
  },
  emptyWrap: {
    padding: "32px 24px",
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
    maxWidth: 520,
  },
  emptyTitle: {
    margin: "0 0 8px",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  code: {
    fontSize: "0.85em",
    background: "#f6f8fa",
    padding: "2px 6px",
    borderRadius: 4,
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
  labelTitle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
  },
  req: { color: "#cf222e" },
  readonlyBox: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e1e4e8",
    background: "#f6f8fa",
    fontSize: "0.95rem",
    color: "#24292f",
    fontWeight: 500,
    minHeight: 20,
  },
  hierarchyBlock: {
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "12px 14px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px dashed #c9d3dd",
  },
  hierarchyLine: {
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "#24292f",
  },
  hierarchySub: {
    fontSize: "0.82rem",
    color: "#57606a",
    lineHeight: 1.4,
  },
  typeLine: {
    fontSize: "0.82rem",
    color: "#57606a",
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
    lineHeight: 1.5,
  },
};
