import React from "react";
import { Link } from "react-router-dom";

/** Giao diện tĩnh (mock) — chưa nối API */
const TOTAL_QUESTIONS = 4939;

const MOCK_ROWS = [
  {
    id: 1,
    typeLabel: "Trắc nghiệm 1",
    content:
      "Giá trị của chữ số 7 trong số 67 là bao nhiêu đơn vị?",
    answer: "A. 7",
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
    gradeLine: "Lớp 2 > Toán 2",
    topicLine: "Các số trong phạm vi 1000 > Các số có bốn chữ số -...",
    createdAt: "14:55 06/04/2026",
  },
  {
    id: 6,
    typeLabel: "Trắc nghiệm 2",
    content: "Một cửa hàng buổi sáng bán được 120 kg gạo, buổi chiều bán được nhiều hơn buổi sáng 35 kg gạo. Hỏi cả hai buổi cửa hàng đó bán được bao nhiêu ki-lô-gam gạo?",
    answer: "A. 275",
    gradeLine: "Lớp 2 > Toán 2",
    topicLine: "Ôn tập các số trong phạm vi 1000 > Giải bài toán có lời văn -...",
    createdAt: "09:12 05/04/2026",
  },
];

export default function AdminQuestions() {
  const totalFormatted = TOTAL_QUESTIONS.toLocaleString("vi-VN");

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

      <div style={styles.filterBar}>
        <div style={styles.filterBarLeft}>
          <span style={styles.filterIcon} aria-hidden>
            <FilterIcon />
          </span>
          <span style={styles.filterTitle}>Bộ lọc tìm kiếm</span>
        </div>
        <span style={styles.chevron} aria-hidden>
          <ChevronDownIcon />
        </span>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 44 }} aria-label="Chọn" />
              <th style={{ ...styles.th, width: 140 }}>Loại câu hỏi</th>
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
            {MOCK_ROWS.map((row) => (
              <tr key={row.id}>
                <td style={styles.td}>
                  <span style={styles.checkboxMock} aria-hidden />
                </td>
                <td style={styles.td}>
                  <span style={styles.badge}>{row.typeLabel}</span>
                </td>
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
                    <span style={styles.actionBtn} title="Xem">
                      <EyeIcon />
                    </span>
                    <span style={styles.actionBtn} title="Sửa">
                      <PencilIcon />
                    </span>
                    <span style={{ ...styles.actionBtn, ...styles.actionBtnDanger }} title="Xóa">
                      <TrashIcon />
                    </span>
                  </div>
                </td>
              </tr>
            ))}
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0969da" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0969da" strokeWidth="2">
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
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: "#0969da",
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
    cursor: "default",
  },
  actionBtnDanger: {
    background: "#fff8f8",
    borderColor: "#f0c4c8",
  },
};
