import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { getGrades } from "../../api";

/** Mô tả demo theo khối (DB grades hiện chỉ có id + name) */
const DEFAULT_DESCRIPTIONS = {
  1:
    "Làm quen với số và phép cộng, trừ trong phạm vi 100; hình học cơ bản.",
  2:
    "Phép nhân, chia; đơn vị đo độ dài, khối lượng; bài toán có lời văn.",
  3:
    "Số đến 10.000; phân số cơ bản; chu vi, diện tích đơn giản.",
  4:
    "Số thập phân; phép tính với số thập phân; hình học phẳng.",
  5:
    "Phần trăm; tỉ số; hình học không gian và các bài toán tổng hợp.",
};

function enrich(row) {
  return {
    ...row,
    description:
      row.description ||
      DEFAULT_DESCRIPTIONS[row.id] ||
      "Chưa có mô tả chi tiết.",
  };
}

export default function AdminGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGrades();
      const list = Array.isArray(data) ? data : [];
      setGrades(list.map(enrich));
    } catch (e) {
      setError(e?.message || "Không tải được danh sách lớp.");
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grades;
    return grades.filter((g) => {
      const idStr = String(g.id);
      const blob = `${idStr} ${g.name} ${g.description || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [grades, search]);

  const openEdit = (g) => {
    setEditId(g.id);
    setFormName(g.name);
    setFormDesc(g.description || "");
    setEditOpen(true);
    setCreateOpen(false);
  };

  const openCreate = () => {
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setCreateOpen(true);
    setEditOpen(true);
  };

  const closeModal = () => {
    setEditOpen(false);
    setCreateOpen(false);
    setEditId(null);
    setFormName("");
    setFormDesc("");
  };

  const saveForm = (e) => {
    e.preventDefault();
    const name = formName.trim();
    const desc = formDesc.trim();
    if (!name) return;

    if (createOpen) {
      const nextId =
        grades.length === 0 ? 1 : Math.max(...grades.map((g) => g.id)) + 1;
      setGrades((list) => [...list, enrich({ id: nextId, name, description: desc })]);
    } else if (editId != null) {
      setGrades((list) =>
        list.map((x) =>
          x.id === editId
            ? { ...x, name, description: desc || DEFAULT_DESCRIPTIONS[x.id] || x.description }
            : x
        )
      );
    }
    closeModal();
  };

  const handleDelete = (g) => {
    if (
      !window.confirm(
        `Xóa "${g.name}"?\n\n(Demo: chỉ xóa trên giao diện — F5 tải lại từ server.)`
      )
    ) {
      return;
    }
    setGrades((list) => list.filter((x) => x.id !== g.id));
  };

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Quản lý khối lớp</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Quản lý khối lớp</h1>
          <p style={styles.lead}>
            Quản lý danh sách các khối lớp trong hệ thống
          </p>
        </div>
        <button type="button" style={styles.btnPrimary} onClick={openCreate}>
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo khối lớp mới
        </button>
      </header>

      <div style={styles.toolbar}>
        <p style={styles.statLine}>
          Tổng số khối lớp :{" "}
          <span style={styles.statNumber}>{grades.length}</span>
        </p>
        <div style={styles.searchWrap}>
          <input
            type="search"
            placeholder="Tìm theo tên khối lớp, mô tả hoặc ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
            aria-label="Tìm kiếm khối lớp"
          />
          <span style={styles.searchIconSlot} aria-hidden>
            <SearchIcon />
          </span>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          {error}{" "}
          <button type="button" style={styles.linkBtn} onClick={load}>
            Thử lại
          </button>
        </div>
      )}

      {loading && grades.length === 0 && !error && (
        <p style={styles.muted}>Đang tải danh sách…</p>
      )}

      {!loading && grades.length === 0 && !error && (
        <p style={styles.muted}>Chưa có dữ liệu lớp.</p>
      )}

      {grades.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Tên khối lớp</th>
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
                filtered.map((g) => (
                  <tr key={g.id}>
                    <td style={styles.td}>{g.id}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{g.name}</td>
                    <td style={{ ...styles.td, color: "#57606a" }}>
                      {g.description}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <button
                        type="button"
                        style={styles.iconBtn}
                        title="Chỉnh sửa"
                        onClick={() => openEdit(g)}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        style={{ ...styles.iconBtn, marginLeft: 8 }}
                        title="Xóa"
                        onClick={() => handleDelete(g)}
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={styles.demoNote}>
        Demo: Sửa / Xóa / Tạo chỉ lưu trên trình duyệt. Kết nối API admin để đồng bộ
        cơ sở dữ liệu.
      </p>

      {editOpen && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {createOpen ? "Tạo khối lớp mới" : "Chỉnh sửa khối lớp"}
            </h3>
            <form onSubmit={saveForm}>
              <label style={styles.label}>
                Tên khối lớp
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={styles.inputLight}
                  required
                  autoFocus
                />
              </label>
              <label style={styles.label}>
                Mô tả
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{ ...styles.inputLight, minHeight: 100, resize: "vertical" }}
                  rows={4}
                />
              </label>
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={closeModal}
                >
                  Hủy
                </button>
                <button type="submit" style={styles.btnPrimaryModal}>
                  {createOpen ? "Tạo" : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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
      style={{ display: "block", verticalAlign: "middle" }}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
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
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(31,35,40,0.08)",
  },
  btnIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
  muted: {
    color: "#57606a",
    marginBottom: 16,
  },
  errorBanner: {
    background: "#fff8f8",
    border: "1px solid #ff818266",
    color: "#a40e26",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: "0.9rem",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#2d5a76",
    cursor: "pointer",
    textDecoration: "underline",
    marginLeft: 8,
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
  demoNote: {
    marginTop: 20,
    fontSize: "0.8rem",
    color: "#6e7781",
    lineHeight: 1.45,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(31, 35, 40, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 440,
    background: "#fff",
    borderRadius: 12,
    padding: "24px",
    boxShadow: "0 8px 32px rgba(31,35,40,0.2)",
    border: "1px solid #d0d7de",
  },
  modalTitle: {
    margin: "0 0 18px",
    fontSize: "1.15rem",
    color: "#1f2328",
    fontWeight: 700,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#24292f",
    fontSize: "0.88rem",
    fontWeight: 600,
    marginBottom: 14,
  },
  inputLight: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontSize: "0.95rem",
    fontFamily: "inherit",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  btnSecondary: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    color: "#24292f",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnPrimaryModal: {
    padding: "8px 18px",
    borderRadius: 8,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};
