import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAdminGrades,
  getAdminExamTemplates,
  getAdminExamTemplate,
  deleteAdminExamTemplate,
  removeQuestionFromExamTemplate,
} from "../../api.js";

/** Draft gửi sang AdminExamUpdate — `selectedQuestionIds` khớp bảng `questions`. */
function buildExamEditDraft(row, questionsInExam) {
  const selectedQuestionIds = (questionsInExam || []).map((q) => Number(q.id));
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    grade_id: row.grade_id,
    selectedQuestionIds,
  };
}

export default function AdminExams() {
  const navigate = useNavigate();
  const [grades, setGrades] = useState([]);
  const [gradeId, setGradeId] = useState("");
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [questionsByExamId, setQuestionsByExamId] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGrades(true);
      try {
        const list = await getAdminGrades();
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        setGrades(arr);
        setGradeId((prev) => {
          if (prev !== "") return prev;
          return arr.length ? String(arr[0].id) : "";
        });
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err.message || "Không tải được danh sách khối.");
        }
      } finally {
        if (!cancelled) setLoadingGrades(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gradeId === "") {
      setLoading(false);
      setExams([]);
      setQuestionsByExamId({});
      setExpandedExamId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await getAdminExamTemplates({ grade_id: gradeId });
        if (cancelled) return;
        setExams(Array.isArray(rows) ? rows : []);
        setQuestionsByExamId({});
        setExpandedExamId(null);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err.message || "Không tải được danh sách đề.");
          setExams([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeId]);

  const selectedGrade = grades.find((g) => String(g.id) === gradeId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exams;
    return exams.filter((row) => {
      const blob = `${row.id} ${row.name} ${row.description || ""} ${row.grade_name || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [search, exams]);

  const totalFormatted = useMemo(() => {
    if (!gradeId || (loading && exams.length === 0)) return "—";
    return filtered.length.toLocaleString("vi-VN");
  }, [gradeId, loading, exams.length, filtered.length]);

  const statLabelText = useMemo(() => {
    if (selectedGrade) return `Số mẫu đề ${selectedGrade.name}`;
    return "Số mẫu đề";
  }, [selectedGrade]);

  const toggleExpand = async (row) => {
    const id = String(row.id);
    if (expandedExamId === id) {
      setExpandedExamId(null);
      return;
    }
    setExpandedExamId(id);
    if (questionsByExamId[row.id]) return;
    setDetailLoadingId(row.id);
    setError(null);
    try {
      const t = await getAdminExamTemplate(row.id);
      const mapped = (t.questions || []).map((q) => ({
        id: Number(q.id),
        text: q.text,
      }));
      setQuestionsByExamId((prev) => ({ ...prev, [row.id]: mapped }));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Không tải chi tiết đề.");
    } finally {
      setDetailLoadingId(null);
    }
  };

  const removeQuestion = async (examId, questionId, e) => {
    e.stopPropagation();
    setError(null);
    try {
      await removeQuestionFromExamTemplate(examId, questionId);
      setQuestionsByExamId((prev) => ({
        ...prev,
        [examId]: (prev[examId] || []).filter((q) => q.id !== questionId),
      }));
      setExams((prev) =>
        prev.map((x) =>
          x.id === examId
            ? { ...x, question_count: Math.max(0, Number(x.question_count || 0) - 1) }
            : x
        )
      );
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Không gỡ được câu hỏi.");
    }
  };

  const handleDeleteExam = async (row, e) => {
    e.stopPropagation();
    if (!window.confirm(`Xóa mẫu đề "${row.name}" (ID ${row.id})?`)) return;
    setError(null);
    try {
      await deleteAdminExamTemplate(row.id);
      setExams((prev) => prev.filter((x) => x.id !== row.id));
      setQuestionsByExamId((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      if (expandedExamId === String(row.id)) setExpandedExamId(null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Không xóa được đề.");
    }
  };

  const handleEditExam = async (row, e) => {
    e.stopPropagation();
    setError(null);
    try {
      let qs = questionsByExamId[row.id];
      if (!qs) {
        const t = await getAdminExamTemplate(row.id);
        qs = (t.questions || []).map((q) => ({
          id: Number(q.id),
          text: q.text,
        }));
        setQuestionsByExamId((prev) => ({ ...prev, [row.id]: qs }));
      }
      navigate("/admin/exams/edit", {
        state: {
          draft: buildExamEditDraft(row, qs),
        },
      });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Không mở được trang sửa đề.");
    }
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
            Chọn 1 khối để xem danh sách mẫu đề tương ứng
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
          onChange={(e) => {
            setGradeId(e.target.value);
            setSearch("");
          }}
          style={styles.filterSelect}
          disabled={loadingGrades || !grades.length}
        >
          <option value="">— Chọn khối lớp —</option>
          {grades.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </select>
      </section>

      {loadingGrades && (
        <p style={styles.muted}>Đang tải danh sách khối lớp…</p>
      )}

      {!loadingGrades && !grades.length && !error && (
        <p style={styles.muted}>Chưa có khối lớp trong hệ thống.</p>
      )}

      {error && (
        <div style={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      {!gradeId && !loadingGrades && grades.length > 0 && !error && (
        <p style={styles.muted}>Chọn khối lớp để xem danh sách mẫu đề.</p>
      )}

      {gradeId && (
        <>
          <section style={styles.statCard} aria-label="Thống kê">
            <div style={styles.statIconWrap}>
              <DocumentIcon />
            </div>
            <div>
              <p style={styles.statLabel}>{statLabelText}</p>
              <p style={styles.statNumber}>{totalFormatted}</p>
            </div>
          </section>

          <div style={styles.toolbar}>
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
                  <th style={styles.th}>Khối</th>
                  <th style={styles.th}>Mô tả</th>
                  <th style={{ ...styles.th, textAlign: "right", width: 120 }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={styles.tdEmpty}>
                      Đang tải danh sách đề…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={styles.tdEmpty}>
                      {search.trim()
                        ? `Không có kết quả phù hợp với “${search}”.`
                        : "Chưa có mẫu đề cho khối này — tạo đề mới từ nút trên."}
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
                        {row.question_count != null && (
                          <div style={styles.mutedSmall}>
                            {Number(row.question_count)} câu trong đề
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>{row.grade_name || `ID ${row.grade_id}`}</td>
                      <td style={{ ...styles.td, color: "#57606a" }}>
                        {row.description || "—"}
                      </td>
                      <td
                        style={{ ...styles.td, textAlign: "right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          style={styles.iconBtn}
                          title="Chỉnh sửa đề"
                          onClick={(e) => handleEditExam(row, e)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          style={{ ...styles.iconBtn, marginLeft: 8 }}
                          title="Xóa đề"
                          onClick={(e) => handleDeleteExam(row, e)}
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} style={styles.nestedCell}>
                          <div style={styles.nestedPanel}>
                            <div style={styles.nestedHeader}>
                              <span style={styles.nestedTitle}>Câu hỏi trong đề</span>
                            </div>
                            {detailLoadingId === row.id ? (
                              <p style={styles.mutedSmall}>Đang tải câu hỏi…</p>
                            ) : (questionsByExamId[row.id] || []).length === 0 ? (
                              <p style={styles.mutedSmall}>Chưa có câu hỏi trong đề này.</p>
                            ) : (
                              <ul style={styles.questionList}>
                                {(questionsByExamId[row.id] || []).map((q, index) => (
                                  <li key={q.id} style={styles.questionItem}>
                                    <p style={styles.questionText}>
                                      Câu {index + 1}: {q.text}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
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
        </>
      )}
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

function DocumentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d5a76" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
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
  muted: {
    margin: "0 0 16px",
    fontSize: "0.95rem",
    color: "#57606a",
    lineHeight: 1.5,
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
    fontFamily: "inherit",
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
  background: "#2d5a76",  
  color: "#fff",          
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
    color: "#2d5a76",
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
    borderLeft: "3px solid #2d5a76",
  },
  nestedHeader: {
    marginBottom: 12,
  },
  nestedTitle: {
    fontSize: "0.88rem",
    fontWeight: 700,
    color: "#24292f",
  },
  questionList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  questionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 10,
    background: "#fff",
    border: "1px solid #d0d7de",
    boxSizing: "border-box",
    minWidth: 0,
  },
  questionText: {
    margin: 0,
    flex: 1,
    minWidth: 0,
    fontSize: "0.9rem",
    lineHeight: 1.45,
    color: "#24292f",
    overflowWrap: "anywhere",
  },
  
  mutedSmall: {
    margin: 0,
    fontSize: "0.88rem",
    color: "#57606a",
    lineHeight: 1.45,
  },
  errorBanner: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 10,
    background: "#fff8f8",
    border: "1px solid #ff818266",
    color: "#a40e26",
    fontSize: "0.9rem",
    lineHeight: 1.45,
  },
  inlineCode: {
    fontSize: "0.85em",
    background: "#f6f8fa",
    padding: "1px 6px",
    borderRadius: 4,
  },
};
