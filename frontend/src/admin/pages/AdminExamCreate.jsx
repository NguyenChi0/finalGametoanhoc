import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const GRADE_OPTIONS = [
  { id: "", label: "Tất cả các lớp" },
  { id: "4", label: "Lớp 4" },
  { id: "5", label: "Lớp 5" },
];

const EXAM_TITLE_OPTIONS = [
  { id: "4-1", grade: "4", name: "Toán cơ bản" },
  { id: "4-2", grade: "4", name: "Số học nâng cao" },
  { id: "4-3", grade: "4", name: "Hình học 4" },
  { id: "4-4", grade: "4", name: "Ôn tập giữa kỳ" },
  { id: "4-5", grade: "4", name: "Kiểm tra nhanh" },
  { id: "5-1", grade: "5", name: "Đại số 5" },
  { id: "5-2", grade: "5", name: "Hình học 5" },
  { id: "5-3", grade: "5", name: "Luyện đề giữa kỳ" },
  { id: "5-4", grade: "5", name: "Số học 5" },
  { id: "5-5", grade: "5", name: "Kiểm tra tổng hợp" },
];

const LESSON_OPTIONS = [
  { id: "", label: "Tất cả bài học" },
  { id: "lesson-1", label: "Ôn tập số học" },
  { id: "lesson-2", label: "Hình học cơ bản" },
  { id: "lesson-3", label: "Kiểm tra nhanh" },
];

const lessonNames = {
  "lesson-1": "Ôn tập số học",
  "lesson-2": "Hình học cơ bản",
  "lesson-3": "Kiểm tra nhanh",
};

const QUESTION_LIST = Array.from({ length: 45 }, (_, index) => {
  const grade = index < 30 ? "4" : "5";
  const groupIndex = Math.floor((index % (grade === "4" ? 30 : 15)) / 3);
  const titlesByGrade = EXAM_TITLE_OPTIONS.filter((item) => item.grade === grade);
  const title = titlesByGrade[groupIndex % titlesByGrade.length];
  const lessonId = `lesson-${(groupIndex % LESSON_OPTIONS.length) + 1}`;
  return {
    id: index + 1,
    grade,
    titleId: title.id,
    titleName: title.name,
    lessonId,
    lessonName: lessonNames[lessonId],
    text: `Câu hỏi ${index + 1}: ${title.name}`,
    detail: `Nội dung câu hỏi ${index + 1} cho ${grade}`,
  };
});

export default function AdminExamCreate() {
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [titleId, setTitleId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [message, setMessage] = useState("");

  const titleOptions = useMemo(() => {
    const base = !gradeId
      ? EXAM_TITLE_OPTIONS
      : EXAM_TITLE_OPTIONS.filter((item) => item.grade === gradeId);
    return [{ id: "", name: "Tất cả chủ đề" }, ...base];
  }, [gradeId]);

  const [lessonId, setLessonId] = useState("");

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return QUESTION_LIST.filter((question) => {
      const matchesGrade = !gradeId || question.grade === gradeId;
      const matchesTitle = !titleId || question.titleId === titleId;
      const matchesLesson = !lessonId || question.lessonId === lessonId;
      const matchesSearch = `${question.id} ${question.text} ${question.detail}`
        .toLowerCase()
        .includes(query);
      return matchesGrade && matchesTitle && matchesLesson && matchesSearch;
    });
  }, [gradeId, titleId, lessonId, search]);

  const selectedQuestions = QUESTION_LIST.filter((question) => selectedQuestionIds.includes(question.id));

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
    if (!examTitle.trim()) {
      setMessage("Vui lòng nhập tiêu đề exam.");
      return;
    }
    if (selectedQuestionIds.length === 0) {
      setMessage("Vui lòng thêm ít nhất 1 câu hỏi vào exam.");
      return;
    }
    setMessage(`Exam "${examTitle.trim()}" đã được tạo với ${selectedQuestionIds.length} câu hỏi.`);
  };

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
        <span style={styles.crumbCurrent}>Tạo exam mới</span>
      </nav>

      <header style={styles.headerRow}>
        <div style={styles.headerText}>
          <h1 style={styles.title}>Tạo exam mới</h1>
          <p style={styles.lead}>
            Nhập tiêu đề và mô tả exam rồi chọn câu hỏi phù hợp từ bộ lọc bên dưới.
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
            Chọn lớp, chủ đề, bài học và tìm kiếm để lọc danh sách câu hỏi.
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
              <div style={styles.emptyState}>
                Không tìm thấy câu hỏi phù hợp với bộ lọc.
              </div>
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

      {message && <div style={styles.messageBox}>{message}</div>}

      <footer style={styles.pageFooter}>
        <button type="button" style={styles.btnSaveFooter} onClick={handleSaveExam}>
          Lưu exam
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
  /** Fixed height panels; scrollable body */
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
  /** Question cards: same width/height both columns */
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
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 22px",
    borderRadius: 10,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 600,
    fontSize: "1rem",
    cursor: "pointer",
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
  messageBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    background: "#f0f8ff",
    color: "#2d5a76",
    fontWeight: 600,
  },
};
