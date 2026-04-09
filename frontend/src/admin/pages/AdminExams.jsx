import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/** Khối lớp demo — chưa nối API */
const GRADE_OPTIONS = [
  { id: "1", name: "Lớp 1" },
  { id: "2", name: "Lớp 2" },
  { id: "3", name: "Lớp 3" },
  { id: "4", name: "Lớp 4" },
  { id: "5", name: "Lớp 5" },
];

/** Mẫu đề demo theo khối (giao diện — chưa nối API) */
const MOCK_EXAMS = [
  { id: 1, name: "Đề kiểm tra giữa kỳ", description: "Chưa có mô tả." },
  { id: 2, name: "Đề ôn tuần 1", description: "Chưa có mô tả." },
  { id: 3, name: "Đề kiểm tra cuối kỳ", description: "Chưa có mô tả." },
];

export default function AdminExams() {
  const [gradeId, setGradeId] = useState("1");
  const [search, setSearch] = useState("");
  const [expandedExamId, setExpandedExamId] = useState("1");

  const selectedGrade = GRADE_OPTIONS.find((g) => g.id === gradeId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_EXAMS;
    return MOCK_EXAMS.filter((row) => {
      const blob = `${row.id} ${row.name} ${row.description || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [search]);

  const toggleExpand = (row) => {
    const id = String(row.id);
    setExpandedExamId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Quản lý exams</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Quản lý exams</h1>
          <p style={styles.lead}>
            Chọn khối lớp để xem và quản lý đề kiểm tra, kỳ thi theo từng khối.
          </p>
        </div>
        <Link to="new" style={styles.btnPrimary}>
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo đề / exam mới
        </Link>
      </header>

      {/* Session 1 — lọc khối */}
      <section style={styles.filterCard} aria-label="Lọc theo khối lớp">
        <label style={styles.filterLabel} htmlFor="admin-exams-grade">
          Khối lớp
        </label>
        <select
          id="admin-exams-grade"
          value={gradeId}
          onChange={(e) => setGradeId(e.target.value)}
          style={styles.filterSelect}
        >
          {GRADE_OPTIONS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </section>

      {/* Session 2 — thống kê + tìm kiếm + bảng + panel mở rộng */}
      <div style={styles.toolbar}>
        <p style={styles.statLine}>
          {selectedGrade ? (
            <>
              Tổng số mẫu đề ({selectedGrade.name}) :{" "}
              <span style={styles.statNumber}>{MOCK_EXAMS.length}</span>
            </>
          ) : (
            <>
              Tổng số mẫu đề :{" "}
              <span style={styles.statNumber}>{MOCK_EXAMS.length}</span>
            </>
          )}
        </p>
        <div style={styles.searchWrap}>
          <input
            type="search"
            placeholder="Tìm theo tên đề, mô tả hoặc ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
            aria-label="Tìm kiếm mẫu đề"
          />
          <span style={styles.searchIconSlot} aria-hidden>
            <SearchIcon />
          </span>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Tên đề</th>
              <th style={styles.th}>Mô tả</th>
              <th style={{ ...styles.th, textAlign: "right", width: 120 }}>
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={styles.tdEmpty}>
                  Không có kết quả phù hợp với “{search}”.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const eid = String(row.id);
                const isOpen = expandedExamId === eid;
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      style={styles.dataRow}
                      onClick={() => toggleExpand(row)}
                      aria-expanded={isOpen}
                    >
                      <td style={styles.td}>{row.id}</td>
                      <td style={styles.td}>
                        <div style={styles.examName}>{row.name}</div>
                      </td>
                      <td style={{ ...styles.td, color: "#57606a" }}>
                        {row.description}
                      </td>
                      <td
                        style={{ ...styles.td, textAlign: "right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          style={styles.iconBtn}
                          title="Chỉnh sửa"
                          onClick={() => {}}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          style={{ ...styles.iconBtn, marginLeft: 8 }}
                          title="Xóa"
                          onClick={() => {}}
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={4} style={styles.nestedCell}>
                          <div style={styles.nestedPanel}>
                            <div style={styles.nestedHeader}>
                              <span style={styles.nestedTitle}>
                                Câu hỏi trong đề
                              </span>
                              <button type="button" style={styles.btnAdd}>
                                + Thêm câu hỏi
                              </button>
                            </div>
                            <p style={styles.mutedSmall}>
                              Chưa có câu hỏi. Thêm mới bằng nút bên trên.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p style={styles.demoNote}>
        Giao diện demo — chưa nối API. Bấm dòng để mở/đóng phần câu hỏi.
      </p>
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

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#57606a"
      strokeWidth="2"
      style={{ display: "block" }}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#24292f" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4 11.5-11.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cf222e" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
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
    marginBottom: 20,
    flexWrap: "wrap",
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
  filterCard: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    marginBottom: 24,
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 10,
    maxWidth: 480,
    boxSizing: "border-box",
  },
  filterLabel: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#24292f",
    flexShrink: 0,
  },
  filterSelect: {
    flex: 1,
    minWidth: 200,
    padding: "10px 12px",
    fontSize: "0.95rem",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  statLine: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#24292f",
    fontWeight: 600,
    lineHeight: 1.4,
    whiteSpace: "nowrap",
  },
  statNumber: {
    color: "#cf222e",
    fontWeight: 700,
  },
  searchWrap: {
    flex: 1,
    minWidth: 240,
    display: "flex",
    alignItems: "center",
    border: "1px solid #d0d7de",
    borderRadius: 10,
    background: "#fff",
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
    padding: "11px 8px 11px 14px",
    fontSize: "0.95rem",
    lineHeight: 1.4,
    border: "none",
    background: "transparent",
    color: "#24292f",
    outline: "none",
  },
  searchIconSlot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "0 12px 0 4px",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #d0d7de",
    borderRadius: 0,
    background: "#fff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    background: "#f6f8fa",
    color: "#24292f",
    fontWeight: 700,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "1px solid #d0d7de",
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #eaeef2",
    verticalAlign: "top",
    color: "#24292f",
  },
  tdEmpty: {
    padding: "28px 16px",
    textAlign: "center",
    color: "#57606a",
  },
  dataRow: {
    cursor: "pointer",
  },
  examName: {
    fontWeight: 700,
    color: "#0969da",
    textAlign: "left",
  },
  iconBtn: {
    width: 36,
    height: 36,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    cursor: "pointer",
    verticalAlign: "middle",
  },
  nestedCell: {
    padding: 0,
    borderBottom: "1px solid #d0d7de",
    background: "#f6f8fa",
    verticalAlign: "top",
  },
  nestedPanel: {
    padding: "14px 16px 16px 28px",
    borderLeft: "3px solid #0969da",
  },
  nestedHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  nestedTitle: {
    fontSize: "0.88rem",
    fontWeight: 700,
    color: "#24292f",
  },
  btnAdd: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #0969da",
    background: "#fff",
    color: "#0969da",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  mutedSmall: {
    margin: 0,
    fontSize: "0.88rem",
    color: "#57606a",
    lineHeight: 1.45,
  },
  demoNote: {
    marginTop: 20,
    fontSize: "0.8rem",
    color: "#6e7781",
    lineHeight: 1.45,
  },
};
