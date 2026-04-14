import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  getAdminGrades,
  createAdminGrade,
  updateAdminGrade,
  deleteAdminGrade,
} from "../../api";

/** Chuẩn hóa dòng từ API — không chèn mô tả giả; NULL/empty giữ đúng như DB. */
function normalizeGradeRow(row) {
  const d = row.description;
  return {
    ...row,
    description: d == null || String(d).trim() === "" ? "" : String(d).trim(),
  };
}

const MOBILE_MAX_PX = 767;

/** Bảng trên desktop; thẻ dọc trên mobile (tránh cột bảng bị ép sát). */
function useIsDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(`(min-width: ${MOBILE_MAX_PX + 1}px)`).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MOBILE_MAX_PX + 1}px)`);
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export default function AdminGrades() {
  const isDesktopLayout = useIsDesktopLayout();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  /** ID khối khi tạo mới (bắt buộc trên server) */
  const [formId, setFormId] = useState("1");
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockModalText, setBlockModalText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminGrades();
      const list = Array.isArray(data) ? data : [];
      setGrades(list.map(normalizeGradeRow));
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Không tải được danh sách lớp.";
      setError(msg);
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

  const totalFormatted = useMemo(() => {
    if (loading && grades.length === 0) return "—";
    return String(grades.length);
  }, [loading, grades.length]);

  const openEdit = (g) => {
    setEditId(g.id);
    setFormName(g.name);
    setFormDesc(g.description || "");
    setFormError(null);
    setEditOpen(true);
    setCreateOpen(false);
  };

  const openCreate = () => {
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setFormError(null);
    const nextId =
      grades.length === 0 ? 1 : Math.max(...grades.map((g) => Number(g.id))) + 1;
    setFormId(String(nextId));
    setCreateOpen(true);
    setEditOpen(true);
  };

  const closeModal = () => {
    setEditOpen(false);
    setCreateOpen(false);
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setFormId("1");
    setFormError(null);
  };

  const saveForm = async (e) => {
    e.preventDefault();
    const name = formName.trim();
    const desc = formDesc.trim();
    if (!name) return;

    setFormError(null);
    setSaving(true);
    try {
      if (createOpen) {
        const idNum = Number(formId);
        if (!Number.isInteger(idNum) || idNum < 1 || idNum > 255) {
          setFormError("ID khối phải là số nguyên từ 1 đến 255.");
          return;
        }
        await createAdminGrade({
          id: idNum,
          name,
          description: desc || null,
        });
      } else if (editId != null) {
        await updateAdminGrade(editId, {
          name,
          description: desc,
        });
      }
      await load();
      closeModal();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không lưu được. Vui lòng thử lại.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g) => {
    if (
      !window.confirm(
        `Xóa khối "${g.name}" (ID ${g.id})?\n\nHành động này không thể hoàn tác nếu không còn dữ liệu phụ thuộc.`
      )
    ) {
      return;
    }
    setDeletingId(g.id);
    setError(null);
    try {
      await deleteAdminGrade(g.id);
      await load();
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không xóa được khối lớp.";
      if (status === 409) {
        setBlockModalText(msg);
        setBlockModalOpen(true);
      } else {
        setError(msg);
      }
    } finally {
      setDeletingId(null);
    }
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
            Chào mừng bạn đến với trang quản lý khối lớp.
          </p>
        </div>
        <button type="button" style={styles.btnPrimary} onClick={openCreate}>
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo khối lớp mới
        </button>
      </header>

      {error && (
        <div style={styles.errorBanner}>
          {error}{" "}
          <button type="button" style={styles.linkBtn} onClick={load}>
            Thử lại
          </button>
        </div>
      )}

      <section style={styles.statCard} aria-label="Thống kê">
        <div style={styles.statIconWrap}>
          <DocumentIcon />
        </div>
        <div>
          <p style={styles.statLabel}>Tổng số khối lớp</p>
          <p style={styles.statNumber}>{totalFormatted}</p>
        </div>
      </section>

      <div style={styles.toolbar}>
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

      {loading && grades.length === 0 && !error && (
        <p style={styles.muted}>Đang tải danh sách…</p>
      )}

      {!loading && grades.length === 0 && !error && (
        <p style={styles.muted}>Chưa có dữ liệu lớp.</p>
      )}

      {grades.length > 0 && (
        isDesktopLayout ? (
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
                        {g.description ? g.description : "—"}
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
                          style={{
                            ...styles.iconBtn,
                            marginLeft: 8,
                            ...(deletingId === g.id ? { opacity: 0.6, pointerEvents: "none" } : {}),
                          }}
                          title="Xóa"
                          disabled={deletingId != null}
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
        ) : (
          <div style={styles.cardList} aria-label="Danh sách khối lớp dạng thẻ">
            {filtered.length === 0 ? (
              <div style={styles.cardEmpty}>
                Không có kết quả phù hợp với “{search}”.
              </div>
            ) : (
              filtered.map((g) => (
                <article key={g.id} style={styles.gradeCard}>
                  <div style={styles.cardField}>
                    <span style={styles.cardLabel}>ID</span>
                    <span style={styles.cardValue}>{g.id}</span>
                  </div>
                  <div style={styles.cardField}>
                    <span style={styles.cardLabel}>Tên khối lớp</span>
                    <span style={{ ...styles.cardValue, fontWeight: 700 }}>{g.name}</span>
                  </div>
                  <div style={styles.cardField}>
                    <span style={styles.cardLabel}>Mô tả</span>
                    <span style={{ ...styles.cardValue, color: "#57606a", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {g.description ? g.description : "—"}
                    </span>
                  </div>
                  <div style={styles.cardActions}>
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
                      style={{
                        ...styles.iconBtn,
                        ...(deletingId === g.id ? { opacity: 0.6, pointerEvents: "none" } : {}),
                      }}
                      title="Xóa"
                      disabled={deletingId != null}
                      onClick={() => handleDelete(g)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )
      )}

      {editOpen && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {createOpen ? "Tạo khối lớp mới" : "Chỉnh sửa khối lớp"}
            </h3>
            <form onSubmit={saveForm}>
              {createOpen && (
                <label style={styles.label}>
                  ID khối (1–255)
                  <input
                    type="number"
                    min={1}
                    max={255}
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    style={styles.inputLight}
                    required
                    autoFocus
                  />
                </label>
              )}
              <label style={styles.label}>
                Tên khối lớp
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={styles.inputLight}
                  required
                  autoFocus={!createOpen}
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
              {formError && (
                <div style={styles.formError} role="alert">
                  {formError}
                </div>
              )}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={closeModal}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.btnPrimaryModal,
                    ...(saving ? { opacity: 0.75, pointerEvents: "none" } : {}),
                  }}
                  disabled={saving}
                >
                  {saving ? "Đang lưu…" : createOpen ? "Tạo" : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {blockModalOpen && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="block-delete-title">
          <div style={styles.modal}>
            <h3 id="block-delete-title" style={styles.modalTitleWarn}>
              Không thể xóa khối lớp
            </h3>
            <p style={styles.blockModalBody}>{blockModalText}</p>
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.btnPrimaryModal}
                onClick={() => {
                  setBlockModalOpen(false);
                  setBlockModalText("");
                }}
              >
                Đã hiểu
              </button>
            </div>
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

function DocumentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d5a76" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
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
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
  },
  gradeCard: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 10,
    padding: "14px 16px",
    boxShadow: "0 1px 2px rgba(31,35,40,0.06)",
  },
  cardField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  cardLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#57606a",
  },
  cardValue: {
    fontSize: "0.95rem",
    lineHeight: 1.45,
    color: "#24292f",
  },
  cardActions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10,
    borderTop: "1px solid #eaeef2",
  },
  cardEmpty: {
    padding: "24px 16px",
    textAlign: "center",
    color: "#57606a",
    fontSize: "0.95rem",
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 10,
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
  formError: {
    marginBottom: 12,
    padding: "10px 12px",
    fontSize: "0.88rem",
    color: "#9a3412",
    background: "#fff8f5",
    border: "1px solid #f0c4a8",
    borderRadius: 8,
    lineHeight: 1.45,
  },
  modalTitleWarn: {
    margin: "0 0 12px",
    fontSize: "1.1rem",
    color: "#9a3412",
    fontWeight: 700,
  },
  blockModalBody: {
    margin: "0 0 18px",
    fontSize: "0.95rem",
    color: "#24292f",
    lineHeight: 1.55,
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
    fontFamily: "inherit",
  },
  btnPrimaryModal: {
    padding: "8px 18px",
    borderRadius: 8,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
