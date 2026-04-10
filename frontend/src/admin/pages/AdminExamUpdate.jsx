import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const GRADE_OPTIONS = [
  { id: "", label: "Tất cả các lớp" },
  { id: "4", label: "Lớp 4" },
  { id: "5", label: "Lớp 5" },
];

const EXAM_TITLE_OPTIONS = [
  { id: "4-1", grade: "4", name: "Toán cơ bản" },
  { id: "4-2", grade: "4", name: "Số học nâng cao" },
  { id: "5-1", grade: "5", name: "Đại số 5" },
];

const LESSON_OPTIONS = [
  { id: "", label: "Tất cả bài học" },
  { id: "lesson-1", label: "Ôn tập số học" },
  { id: "lesson-2", label: "Hình học cơ bản" },
];

/** Một bộ câu hỏi mock nhỏ, nội dung dòng chữ dùng chung (demo — không API). */
const SHARED_QUESTION_BODY =
  "Phép cộng, phép trừ trong phạm vi đã học (mẫu dùng chung cho mọi câu trong bài — demo).";
const SHARED_DETAIL = "Bài: Ôn tập số học · Lớp 4 & 5 (demo).";

const MOCK_QUESTION_POOL = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const grade = n <= 6 ? "4" : "5";
  const titleId = grade === "4" ? "4-1" : "5-1";
  const titleName = grade === "4" ? "Toán cơ bản" : "Đại số 5";
  return {
    id: n,
    grade,
    titleId,
    titleName,
    lessonId: "lesson-1",
    lessonName: "Ôn tập số học",
    text: `Câu ${n}: ${SHARED_QUESTION_BODY}`,
    detail: SHARED_DETAIL,
  };
});

/**
 * Demo: draft từ Quản lý exams — { id, name, description, selectedQuestionIds: number[] }.
 */
export default function AdminExamUpdate() {
  const location = useLocation();
  const navigate = useNavigate();
  const draft = location.state?.draft;

  const [examId, setExamId] = useState(null);
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [titleId, setTitleId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const titleOptions = useMemo(() => {
    const base = !gradeId
      ? EXAM_TITLE_OPTIONS
      : EXAM_TITLE_OPTIONS.filter((item) => item.grade === gradeId);
    return [{ id: "", name: "Tất cả chủ đề" }, ...base];
  }, [gradeId]);

  useEffect(() => {
    if (!draft) {
      setExamId(null);
      setExamTitle("");
      setExamDescription("");
      setGradeId("");
      setTitleId("");
      setLessonId("");
      setSearch("");
      setSelectedQuestionIds([]);
      return;
    }
    setExamId(draft.id);
    setExamTitle(draft.name || "");
    setExamDescription(draft.description || "");
    setGradeId("");
    setTitleId("");
    setLessonId("");
    setSearch("");
    const ids = Array.isArray(draft.selectedQuestionIds) ? draft.selectedQuestionIds : [];
    const valid = ids.filter((id) => MOCK_QUESTION_POOL.some((q) => q.id === id));
    setSelectedQuestionIds(valid.length > 0 ? valid : [1, 2, 3]);
  }, [draft, location.key]);

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return MOCK_QUESTION_POOL.filter((question) => {
      const matchesGrade = !gradeId || question.grade === gradeId;
      const matchesTitle = !titleId || question.titleId === titleId;
      const matchesLesson = !lessonId || question.lessonId === lessonId;
      const matchesSearch = `${question.id} ${question.text} ${question.detail}`
        .toLowerCase()
        .includes(query);
      return matchesGrade && matchesTitle && matchesLesson && matchesSearch;
    });
  }, [gradeId, titleId, lessonId, search]);

  const selectedQuestions = MOCK_QUESTION_POOL.filter((question) =>
    selectedQuestionIds.includes(question.id)
  );

  const handleGradeChange = (value) => {
    setGradeId(value);
    setTitleId("");
  };

  const toggleQuestion = (questionId) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const handleSaveExam = () => {
    if (!draft) return;
    if (!examTitle.trim()) return;
    if (selectedQuestionIds.length === 0) return;
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      navigate("/admin/exams", { replace: true });
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
          <Link to="/admin/exams" style={styles.crumbLink}>
            Quản lý exams
          </Link>
          <span style={styles.crumbSep}>›</span>
          <span style={styles.crumbCurrent}>Cập nhật exam</span>
        </nav>
        <div style={styles.emptyWrap}>
          <p style={styles.emptyTitle}>Chưa có dữ liệu đề</p>
          <p style={styles.muted}>
            Mở từ <strong>Quản lý exams</strong> → nút chỉnh sửa (bút) trên một dòng đề. F5 hoặc vào URL trực
            tiếp sẽ mất <code style={styles.code}>location.state</code>.
          </p>
          <Link to="/admin/exams" style={styles.btnGhost}>
            ← Quay lại quản lý exams
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
        <Link to="/admin/exams" style={styles.crumbLink}>
          Quản lý exams
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Cập nhật exam</span>
      </nav>

      <header style={styles.headerRow}>
        <div style={styles.headerText}>
          <h1 style={styles.title}>Cập nhật exam #{examId}</h1>
          <p style={styles.lead}>
            Cập nhật tiêu đề, mô tả và danh sách câu hỏi. Ngân hàng câu hỏi demo gồm {MOCK_QUESTION_POOL.length}{" "}
            câu (nội dung mẫu dùng chung). Lưu sẽ quay về danh sách (chưa gọi API).
          </p>
        </div>
      </header>

      <section style={styles.examInfo}>
        <div style={styles.fieldGroup}>
          <label htmlFor="exam-title" style={styles.label}>
            Tiêu đề exam
          </label>
          <input
            id="exam-title"
            type="text"
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            placeholder="Nhập tiêu đề exam"
            style={styles.input}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label htmlFor="exam-description" style={styles.label}>
            Mô tả exam
          </label>
          <textarea
            id="exam-description"
            value={examDescription}
            onChange={(e) => setExamDescription(e.target.value)}
            placeholder="Mô tả ngắn gọn exam"
            style={styles.textarea}
          />
        </div>
      </section>

      <section style={styles.filterSection}>
        <div style={styles.filterHeader}>
          <h2 style={styles.sectionTitle}>Bộ lọc câu hỏi</h2>
          <p style={styles.sectionSubtitle}>
            Chọn lớp, chủ đề, bài học và tìm kiếm để lọc danh sách câu hỏi (pool demo).
          </p>
        </div>

        <div style={styles.filterRow}>
          <div style={styles.filterField}>
            <label htmlFor="grade-filter" style={styles.filterLabel}>
              Lớp
            </label>
            <select
              id="grade-filter"
              value={gradeId}
              onChange={(e) => handleGradeChange(e.target.value)}
              style={styles.select}
            >
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade.id || "all-grades"} value={grade.id}>
                  {grade.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label htmlFor="title-filter" style={styles.filterLabel}>
              Chủ đề
            </label>
            <select
              id="title-filter"
              value={titleId}
              onChange={(e) => setTitleId(e.target.value)}
              style={styles.select}
            >
              {titleOptions.map((title) => (
                <option key={title.id || "all-topics"} value={title.id}>
                  {title.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label htmlFor="lesson-filter" style={styles.filterLabel}>
              Bài học
            </label>
            <select
              id="lesson-filter"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              style={styles.select}
            >
              {LESSON_OPTIONS.map((lesson) => (
                <option key={lesson.id || "all-lessons"} value={lesson.id}>
                  {lesson.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label htmlFor="question-search" style={styles.filterLabel}>
              Tìm câu hỏi
            </label>
            <input
              id="question-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.gridLayout}>
          <div style={styles.questionPanel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>Danh sách câu hỏi</h3>
              <span style={styles.panelMeta}>{filteredQuestions.length} câu hỏi</span>
            </div>
            <div style={styles.panelScroll}>
              {filteredQuestions.length === 0 ? (
                <div style={styles.emptyState}>Không tìm thấy câu hỏi phù hợp với bộ lọc.</div>
              ) : (
                filteredQuestions.map((question) => (
                  <div key={question.id} style={styles.questionCard}>
                    <div style={styles.cardBody}>
                      <p style={styles.questionText}>{question.text}</p>
                      <p style={styles.questionDetail}>{question.detail}</p>
                    </div>
                    <button
                      type="button"
                      style={styles.cardActionBtn}
                      onClick={() => toggleQuestion(question.id)}
                    >
                      {selectedQuestionIds.includes(question.id) ? "−" : "+"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside style={styles.summaryPanel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>Câu hỏi đã chọn</h3>
              <span style={styles.panelMeta}>{selectedQuestionIds.length} mục</span>
            </div>
            <div style={styles.panelScroll}>
              {selectedQuestions.length === 0 ? (
                <div style={styles.emptyState}>Chưa có câu hỏi nào được thêm.</div>
              ) : (
                selectedQuestions.map((question) => (
                  <div key={question.id} style={styles.questionCard}>
                    <div style={styles.cardBody}>
                      <p style={styles.questionText}>{question.text}</p>
                      <p style={styles.questionDetail}>{question.titleName}</p>
                    </div>
                    <button
                      type="button"
                      style={styles.cardActionBtn}
                      onClick={() => toggleQuestion(question.id)}
                      aria-label="Gỡ khỏi danh sách"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>

      <footer style={styles.pageFooter}>
        <button
          type="button"
          style={{
            ...styles.btnSaveFooter,
            ...(saving || !examTitle.trim() || selectedQuestionIds.length === 0
              ? { opacity: 0.55, pointerEvents: saving ? "none" : "auto" }
              : {}),
          }}
          disabled={saving || !examTitle.trim() || selectedQuestionIds.length === 0}
          onClick={handleSaveExam}
        >
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
        <Link to="/admin/exams" style={styles.btnCancelFooter}>
          Hủy và quay về trang quản lý exams
        </Link>
      </footer>
    </div>
  );
}

const styles = {
  root: {
    width: "100%",
    minWidth: 0,
    color: "#1f2328",
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
  crumbSep: {
    color: "#d0d7de",
    userSelect: "none",
  },
  crumbCurrent: {
    color: "#24292f",
    fontWeight: 500,
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
    minWidth: 0,
  },
  headerText: {
    minWidth: 0,
    flex: "1 1 auto",
    maxWidth: "100%",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1f2328",
    letterSpacing: "-0.02em",
    overflowWrap: "anywhere",
  },
  lead: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#57606a",
    lineHeight: 1.5,
    maxWidth: 640,
    overflowWrap: "anywhere",
  },
  emptyWrap: {
    padding: "32px 24px",
    background: "#fff",
    border: "1px solid #d0d7de",
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
  },
  muted: {
    margin: "0 0 16px",
    fontSize: "0.9rem",
    color: "#57606a",
    lineHeight: 1.5,
  },
  examInfo: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 20,
    marginBottom: 24,
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  fieldGroup: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    maxWidth: "100%",
  },
  label: {
    color: "#24292f",
    fontWeight: 600,
  },
  input: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    color: "#24292f",
    outline: "none",
    overflowWrap: "anywhere",
  },
  textarea: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    minHeight: 120,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    color: "#24292f",
    outline: "none",
    resize: "vertical",
    overflowWrap: "anywhere",
    overflow: "auto",
  },
  filterSection: {
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 16,
    padding: 24,
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  filterHeader: {
    marginBottom: 20,
    minWidth: 0,
  },
  sectionTitle: {
    margin: "0 0 4px",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  sectionSubtitle: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#57606a",
    lineHeight: 1.5,
  },
  filterRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 20,
    minWidth: 0,
  },
  filterField: {
    display: "grid",
    gap: 10,
    minWidth: 0,
  },
  filterLabel: {
    fontSize: "0.9rem",
    color: "#24292f",
    fontWeight: 600,
  },
  select: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
  },
  searchInput: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    color: "#24292f",
    outline: "none",
  },
  gridLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    alignItems: "stretch",
  },
  questionPanel: {
    boxSizing: "border-box",
    display: "grid",
    gridTemplateRows: "52px 1fr",
    gap: 0,
    height: 520,
    minHeight: 520,
    maxHeight: 520,
    padding: "0 16px 16px",
    borderRadius: 14,
    border: "1px solid #d0d7de",
    background: "#fff",
    overflow: "hidden",
  },
  summaryPanel: {
    boxSizing: "border-box",
    display: "grid",
    gridTemplateRows: "52px 1fr",
    gap: 0,
    height: 520,
    minHeight: 520,
    maxHeight: 520,
    padding: "0 16px 16px",
    borderRadius: 14,
    border: "1px solid #d0d7de",
    background: "#fff",
    overflow: "hidden",
  },
  panelHeader: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    height: 52,
    minHeight: 52,
    maxHeight: 52,
    paddingTop: 4,
    flexShrink: 0,
    borderBottom: "1px solid #eaeef2",
  },
  panelScroll: {
    boxSizing: "border-box",
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    paddingTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  panelTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    lineHeight: 1.25,
  },
  panelMeta: {
    color: "#57606a",
    fontSize: "0.9rem",
    lineHeight: 1.25,
    whiteSpace: "nowrap",
  },
  questionCard: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
    minHeight: 108,
    height: 108,
    maxHeight: 108,
    padding: "12px 14px",
    borderRadius: 12,
    background: "#f6f8fa",
    border: "1px solid #e1e4e8",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    overflow: "hidden",
  },
  questionText: {
    margin: 0,
    fontSize: "0.93rem",
    fontWeight: 700,
    color: "#1f2328",
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  questionDetail: {
    margin: "4px 0 0",
    fontSize: "0.88rem",
    color: "#57606a",
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardActionBtn: {
    flexShrink: 0,
    alignSelf: "center",
    width: 44,
    height: 44,
    borderRadius: 12,
    border: "1px solid #2d5a76",
    background: "#ffffff",
    color: "#2d5a76",
    fontSize: "1.15rem",
    cursor: "pointer",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    fontFamily: "inherit",
  },
  pageFooter: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid #eaeef2",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    width: "100%",
  },
  btnSaveFooter: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    width: "100%",
    maxWidth: "100%",
    fontFamily: "inherit",
    textAlign: "center",
  },
  btnCancelFooter: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "100%",
    padding: "12px 20px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.95rem",
    textDecoration: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    overflowWrap: "anywhere",
    textAlign: "center",
  },
  emptyState: {
    padding: 22,
    borderRadius: 14,
    background: "#f6f8fa",
    color: "#57606a",
    textAlign: "center",
  },
};
