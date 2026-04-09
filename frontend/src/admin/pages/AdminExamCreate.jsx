import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const GRADE_OPTIONS = [
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

const QUESTION_LIST = Array.from({ length: 30 }, (_, index) => {
  const grade = index < 15 ? "4" : "5";
  const groupIndex = Math.floor((index % 15) / 3);
  const title = EXAM_TITLE_OPTIONS.filter((item) => item.grade === grade)[groupIndex];
  return {
    id: index + 1,
    grade,
    titleId: title.id,
    titleName: title.name,
    text: `Câu hỏi ${index + 1}: ${title.name}`,
    detail: `Nội dung câu hỏi ${index + 1} cho ${grade}`,
  };
});

export default function AdminExamCreate() {
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [gradeId, setGradeId] = useState("4");
  const [titleId, setTitleId] = useState("4-1");
  const [search, setSearch] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [message, setMessage] = useState("");

  const titleOptions = EXAM_TITLE_OPTIONS.filter((item) => item.grade === gradeId);

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return QUESTION_LIST.filter((question) => {
      const matchesGrade = question.grade === gradeId;
      const matchesTitle = question.titleId === titleId;
      const matchesSearch = `${question.id} ${question.text} ${question.detail}`
        .toLowerCase()
        .includes(query);
      return matchesGrade && matchesTitle && matchesSearch;
    });
  }, [gradeId, titleId, search]);

  const selectedQuestions = QUESTION_LIST.filter((question) => selectedQuestionIds.includes(question.id));

  const handleGradeChange = (value) => {
    setGradeId(value);
    const nextTitle = EXAM_TITLE_OPTIONS.find((item) => item.grade === value);
    setTitleId(nextTitle?.id || "");
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
        <div>
          <h1 style={styles.title}>Tạo exam mới</h1>
          <p style={styles.lead}>
            Nhập tiêu đề và mô tả exam rồi chọn câu hỏi phù hợp từ bộ lọc bên dưới.
          </p>
        </div>
        <Link to="/admin/exams" style={styles.btnSecondary}>
          ← Quay lại quản lý exams
        </Link>
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
          <div>
            <h2 style={styles.sectionTitle}>Bộ lọc câu hỏi</h2>
            <p style={styles.sectionSubtitle}>
              Chọn lớp, tiêu đề exam và tìm kiếm để lọc danh sách câu hỏi.
            </p>
          </div>
          <button type="button" style={styles.btnPrimary} onClick={handleSaveExam}>
            Lưu exam
          </button>
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
                <option key={grade.id} value={grade.id}>
                  {grade.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label htmlFor="title-filter" style={styles.filterLabel}>
              Tiêu đề exam
            </label>
            <select
              id="title-filter"
              value={titleId}
              onChange={(e) => setTitleId(e.target.value)}
              style={styles.select}
            >
              {titleOptions.map((title) => (
                <option key={title.id} value={title.id}>
                  {title.name}
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
            {filteredQuestions.length === 0 ? (
              <div style={styles.emptyState}>
                Không tìm thấy câu hỏi phù hợp với bộ lọc.
              </div>
            ) : (
              filteredQuestions.map((question) => (
                <div key={question.id} style={styles.questionCard}>
                  <div>
                    <p style={styles.questionText}>{question.text}</p>
                    <p style={styles.questionDetail}>{question.detail}</p>
                  </div>
                  <button
                    type="button"
                    style={styles.addButton}
                    onClick={() => toggleQuestion(question.id)}
                  >
                    {selectedQuestionIds.includes(question.id) ? "Đã thêm" : "+"}
                  </button>
                </div>
              ))
            )}
          </div>

          <aside style={styles.summaryPanel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>Câu hỏi đã chọn</h3>
              <span style={styles.panelMeta}>{selectedQuestionIds.length} mục</span>
            </div>
            {selectedQuestions.length === 0 ? (
              <div style={styles.emptyState}>Chưa có câu hỏi nào được thêm.</div>
            ) : (
              selectedQuestions.map((question) => (
                <div key={question.id} style={styles.selectedItem}>
                  <div>
                    <p style={styles.selectedText}>{question.text}</p>
                    <p style={styles.selectedMeta}>{question.titleName}</p>
                  </div>
                  <button
                    type="button"
                    style={styles.removeButton}
                    onClick={() => toggleQuestion(question.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </aside>
        </div>
      </section>

      {message && <div style={styles.messageBox}>{message}</div>}
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
    color: "#0969da",
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
    maxWidth: 640,
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 18px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    textDecoration: "none",
    fontSize: "0.95rem",
  },
  examInfo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 24,
  },
  fieldGroup: {
    display: "grid",
    gap: 10,
  },
  label: {
    color: "#24292f",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    color: "#24292f",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 120,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    color: "#24292f",
    outline: "none",
    resize: "vertical",
  },
  filterSection: {
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 16,
    padding: 24,
  },
  filterHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap",
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
    gridTemplateColumns: "240px 240px minmax(200px,1fr)",
    gap: 16,
    marginBottom: 20,
  },
  filterField: {
    display: "grid",
    gap: 10,
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
    color: "#24292f",
    outline: "none",
  },
  gridLayout: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 20,
  },
  questionPanel: {
    display: "grid",
    gap: 12,
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  panelTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
  },
  panelMeta: {
    color: "#57606a",
    fontSize: "0.9rem",
  },
  questionCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 16,
    borderRadius: 14,
    background: "#f8fafb",
    border: "1px solid #d8dee2",
  },
  questionText: {
    margin: 0,
    fontSize: "0.96rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  questionDetail: {
    margin: "8px 0 0",
    fontSize: "0.9rem",
    color: "#57606a",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: "1px solid #0969da",
    background: "#ffffff",
    color: "#09606a",
    fontSize: "1.1rem",
    cursor: "pointer",
    fontWeight: 700,
  },
  summaryPanel: {
    display: "grid",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    border: "1px solid #d0d7de",
    background: "#fff",
    minHeight: 280,
  },
  selectedItem: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e1e4e8",
    background: "#f6f8fa",
  },
  selectedText: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  selectedMeta: {
    margin: "6px 0 0",
    fontSize: "0.85rem",
    color: "#57606a",
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontSize: "1.1rem",
    cursor: "pointer",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 22px",
    borderRadius: 10,
    border: "none",
    background: "#0969da",
    color: "#fff",
    fontWeight: 600,
    fontSize: "1rem",
    cursor: "pointer",
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
    color: "#0969da",
    fontWeight: 600,
  },
};
