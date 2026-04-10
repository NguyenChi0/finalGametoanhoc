import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/** Một dòng bảng mock → payload đưa sang trang sửa (demo, không gọi API). */
function buildQuestionEditDraft(row) {
  const correctText = row.answer.replace(/^[A-D]\.\s*/i, "").trim() || row.answer;
  return {
    id: row.id,
    gradeLabel: row.grade,
    subjectLabel: row.subject,
    lessonLabel: row.lesson,
    gradeLine: row.gradeLine,
    topicLine: row.topicLine,
    typeLabel: row.typeLabel,
    questionText: row.content,
    answers: [
      correctText,
      `${correctText} (nhiễu 1)`,
      `${correctText} (nhiễu 2)`,
      "Phương án D — demo",
    ],
    correctIndex: 0,
    questionImage: "",
    questionImagePreview: "",
  };
}

/** Giao diện tĩnh (mock) — chưa nối API */
const TOTAL_QUESTIONS = 4939;

const MOCK_ROWS = [
  {
    id: 1,
    typeLabel: "Trắc nghiệm 1",
    content:
      "Giá trị của chữ số 7 trong số 67 là bao nhiêu đơn vị?",
    answer: "A. 7",
    grade: "Lớp 2",
    subject: "Toán",
    lesson: "Các số trong phạm vi 1000",
    gradeLine: "Lớp 2 > Toán 2",
    topicLine: "Các số trong phạm vi 1000 > Giá trị của chữ số -...",
    createdAt: "14:55 06/04/2026",
  },
  {
    id: 2,
    typeLabel: "Trắc nghiệm 1",
    content:
      "Số gồm 3 trăm, 0 chục và 7 đơn vị được viết là số nào?",
    answer: "A. 307",
    grade: "Lớp 2",
    subject: "Toán",
    lesson: "Các số trong phạm vi 1000",
    gradeLine: "Lớp 2 > Toán 2",
    topicLine: "Các số trong phạm vi 1000 > Viết số có ba chữ số -...",
    createdAt: "14:55 06/04/2026",
  },
  {
    id: 3,
    typeLabel: "Trắc nghiệm 1",
    content:
      "Số 0 là số có bao nhiêu chữ số?",
    answer: "A. 1",
    grade: "Lớp 2",
    subject: "Toán",
    lesson: "Các số trong phạm vi 1000",
    gradeLine: "Lớp 2 > Toán 2",
    topicLine: "Các số trong phạm vi 1000 > Các số có ba chữ số -...",
    createdAt: "14:55 06/04/2026",
  },
  {
    id: 4,
    typeLabel: "Trắc nghiệm 1",
    content:
      "Số liền trước của 999 là số nào?",
    answer: "A. 998",
    grade: "Lớp 2",
    subject: "Toán",
    lesson: "Các số trong phạm vi 1000",
    gradeLine: "Lớp 2 > Toán 2",
    topicLine: "Các số trong phạm vi 1000 > Số liền trước, số liền sau -...",
    createdAt: "14:55 06/04/2026",
  },
  {
    id: 5,
    typeLabel: "Trắc nghiệm 1",
    content:
      "Số 1000 là số có bao nhiêu chữ số?",
    answer: "A. 4",
    grade: "Lớp 2",
    subject: "Toán",
    lesson: "Các số trong phạm vi 1000",
    gradeLine: "Lớp 2 > Toán 2",
    topicLine: "Các số trong phạm vi 1000 > Các số có bốn chữ số -...",
    createdAt: "14:55 06/04/2026",
  },
  {
    id: 6,
    typeLabel: "Trắc nghiệm 2",
    content: "Một cửa hàng buổi sáng bán được 120 kg gạo, buổi chiều bán được nhiều hơn buổi sáng 35 kg gạo. Hỏi cả hai buổi cửa hàng đó bán được bao nhiêu ki-lô-gam gạo?",
    answer: "A. 275",
    grade: "Lớp 2",
    subject: "Toán",
    lesson: "Ôn tập các số trong phạm vi 1000",
    gradeLine: "Lớp 2 > Toán 2",
    topicLine: "Ôn tập các số trong phạm vi 1000 > Giải bài toán có lời văn -...",
    createdAt: "09:12 05/04/2026",
  },
];

const GRADE_OPTIONS = [
  { id: "", label: "Tất cả lớp" },
  { id: "Lớp 2", label: "Lớp 2" },
  { id: "Lớp 3", label: "Lớp 3" },
];

const SUBJECT_OPTIONS = [
  { id: "", label: "Tất cả dạng toán" },
  { id: "Toán", label: "Toán" },
  { id: "Luyện tập", label: "Luyện tập" },
];

const LESSON_OPTIONS = [
  { id: "", label: "Tất cả bài học" },
  { id: "Các số trong phạm vi 1000", label: "Các số trong phạm vi 1000" },
  { id: "Ôn tập các số trong phạm vi 1000", label: "Ôn tập các số trong phạm vi 1000" },
];

export default function AdminQuestions() {
  const navigate = useNavigate();
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedLesson, setSelectedLesson] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const totalFormatted = TOTAL_QUESTIONS.toLocaleString("vi-VN");

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return MOCK_ROWS.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.content.toLowerCase().includes(normalizedSearch) ||
        row.id.toString().includes(normalizedSearch);

      return (
        matchesSearch &&
        (!selectedGrade || row.grade === selectedGrade) &&
        (!selectedSubject || row.subject === selectedSubject) &&
        (!selectedLesson || row.lesson === selectedLesson)
      );
    });
  }, [selectedGrade, selectedSubject, selectedLesson, searchTerm]);

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Quản lý câu hỏi</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Quản lý câu hỏi</h1>
          <p style={styles.lead}>
            Xem, tìm kiếm và quản lý tất cả câu hỏi đã tạo
          </p>
        </div>
        <Link to="new" style={styles.btnPrimary}>
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo câu hỏi mới
        </Link>
      </header>

      <section style={styles.statCard} aria-label="Thống kê">
        <div style={styles.statIconWrap}>
          <DocumentIcon />
        </div>
        <div>
          <p style={styles.statLabel}>Tổng số câu hỏi</p>
          <p style={styles.statNumber}>{totalFormatted}</p>
        </div>
      </section>

      <div
        style={{ ...styles.filterBar, cursor: "pointer" }}
        role="button"
        tabIndex={0}
        aria-expanded={isFilterOpen}
        onClick={() => setIsFilterOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setIsFilterOpen((value) => !value);
          }
        }}
      >
        <div style={styles.filterBarLeft}>
          <span style={styles.filterIcon} aria-hidden>
            <FilterIcon />
          </span>
          <span style={styles.filterTitle}>Bộ lọc tìm kiếm</span>
        </div>
        <span
          style={{
            ...styles.chevron,
            transform: isFilterOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
          aria-hidden
        >
          <ChevronDownIcon />
        </span>
      </div>

      {isFilterOpen && (
        <section style={styles.filterPanel}>
          <div style={styles.filterPanelHeading}>Lọc theo phân cấp</div>
          <div style={styles.filterGrid}>
            <label style={styles.filterField}>
              <span style={styles.filterFieldLabel}>Tìm kiếm</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo nội dung hoặc ID"
                style={styles.filterInput}
              />
            </label>

            <label style={styles.filterField}>
              <span style={styles.filterFieldLabel}>Lớp</span>
              <select
                value={selectedGrade}
                onChange={(event) => setSelectedGrade(event.target.value)}
                style={styles.filterSelect}
              >
                {GRADE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              <span style={styles.filterFieldLabel}>Dạng toán</span>
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                style={styles.filterSelect}
              >
                {SUBJECT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              <span style={styles.filterFieldLabel}>Bài học</span>
              <select
                value={selectedLesson}
                onChange={(event) => setSelectedLesson(event.target.value)}
                style={styles.filterSelect}
              >
                {LESSON_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 44 }} aria-label="Chọn" />
              <th style={{ ...styles.th, width: 72 }}>ID</th>
              <th style={styles.th}>Nội dung câu hỏi</th>
              <th style={{ ...styles.th, width: 100 }}>Đáp án</th>
              <th style={{ ...styles.th, minWidth: 220 }}>Phân cấp</th>
              <th style={{ ...styles.th, width: 130 }}>Ngày tạo</th>
              <th style={{ ...styles.th, width: 120, textAlign: "right" }}>
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>
                    <span style={styles.checkboxMock} aria-hidden />
                  </td>
                  <td style={styles.td}>{row.id}</td>
                  <td style={{ ...styles.td, ...styles.tdContent }}>{row.content}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{row.answer}</td>
                  <td style={styles.td}>
                    <div style={styles.hierarchy}>
                      <span style={styles.hierarchyMain}>{row.gradeLine}</span>
                      <span style={styles.hierarchySub}>{row.topicLine}</span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: "#57606a", whiteSpace: "nowrap" }}>
                    {row.createdAt}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <div style={styles.actionGroup}>
                      <button
                        type="button"
                        style={styles.actionBtn}
                        title="Chỉnh sửa câu hỏi"
                        onClick={() =>
                          navigate("/admin/questions/edit", {
                            state: { draft: buildQuestionEditDraft(row) },
                          })
                        }
                      >
                        <PencilIcon />
                      </button>
                      <span style={{ ...styles.actionBtn, ...styles.actionBtnDanger }} title="Xóa">
                        <TrashIcon />
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={styles.emptyState} colSpan={7}>
                  Không có câu hỏi nào khớp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d5a76" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d5a76" strokeWidth="2">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#57606a" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#57606a" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#57606a" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4 11.5-11.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cf222e" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
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
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 1px 2px rgba(31,35,40,0.08)",
  },
  btnIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 20px",
    marginBottom: 16,
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    background: "#ddf4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statLabel: {
    margin: "0 0 4px",
    fontSize: "0.9rem",
    color: "#57606a",
    fontWeight: 500,
  },
  statNumber: {
    margin: 0,
    fontSize: "1.65rem",
    fontWeight: 700,
    color: "#1f2328",
    letterSpacing: "-0.02em",
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    marginBottom: 16,
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  filterBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  filterIcon: {
    display: "flex",
    alignItems: "center",
  },
  filterTitle: {
    fontWeight: 600,
    fontSize: "0.95rem",
    color: "#24292f",
  },
  chevron: {
    display: "flex",
    alignItems: "center",
    opacity: 0.85,
  },
  filterPanel: {
    display: "grid",
    gap: 16,
    padding: "16px 20px",
    marginBottom: 16,
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  filterPanelHeading: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#24292f",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  filterFieldLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#57606a",
  },
  filterSelect: {
    width: "100%",
    height: 44,
    minHeight: 44,
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    lineHeight: "1.4",
    color: "#24292f",
    background: "#fff",
    appearance: "none",
  },
  filterInput: {
    width: "100%",
    height: 44,
    minHeight: 44,
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    lineHeight: "1.4",
    color: "#24292f",
    background: "#fff",
  },
  emptyState: {
    padding: "24px 16px",
    textAlign: "center",
    color: "#57606a",
    fontSize: "0.95rem",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
    minWidth: 960,
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    background: "#f6f8fa",
    color: "#57606a",
    fontWeight: 700,
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #d0d7de",
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #eaeef2",
    verticalAlign: "top",
    color: "#24292f",
  },
  tdContent: {
    lineHeight: 1.5,
    maxWidth: 360,
  },
  checkboxMock: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "1px solid #d0d7de",
    borderRadius: 4,
    background: "#fff",
    verticalAlign: "middle",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: "0.8rem",
    fontWeight: 600,
    background: "#dafbe1",
    color: "#1a7f37",
    border: "1px solid #aceebb",
    whiteSpace: "nowrap",
  },
  hierarchy: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxWidth: 280,
  },
  hierarchyMain: {
    fontWeight: 600,
    fontSize: "0.85rem",
    color: "#24292f",
    lineHeight: 1.35,
  },
  hierarchySub: {
    fontSize: "0.8rem",
    color: "#57606a",
    lineHeight: 1.4,
  },
  actionGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },
  actionBtnDanger: {
    background: "#fff8f8",
    borderColor: "#f0c4c8",
  },
};
