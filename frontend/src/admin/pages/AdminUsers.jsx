import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from "../../api";

const USERS_PAGE_SIZE = 10;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    const fn = () => setMatches(m.matches);
    fn();
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, [query]);
  return matches;
}

function roleLabel(role) {
  if (role === 1) return "Quản trị";
  return "Người chơi";
}

function formatDateTime(isoLike) {
  if (!isoLike) return "—";
  const d = new Date(isoLike.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return isoLike;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

export default function AdminUsers() {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [users, setUsers] = useState([]);
  const [totalDb, setTotalDb] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  /** Đồng bộ API — lọc toàn bảng users trên server */
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("edit"); // "edit" or "add"
  const [editingUser, setEditingUser] = useState(null); // chỉ dùng khi edit
  const [editForm, setEditForm] = useState({
    username: "",
    week_score: 0,
    score: 0,
    role: 0,
    email: "",
    phone: "",
    password: "",
  });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * USERS_PAGE_SIZE;
      const params = { limit: USERS_PAGE_SIZE, offset };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await getAdminUsers(params);
      const list = Array.isArray(res?.data) ? res.data : [];
      setUsers(list);
      setTotalDb(typeof res?.count === "number" ? res.count : list.length);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Không tải được danh sách user.";
      setError(msg);
      setUsers([]);
      setTotalDb(0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.max(1, Math.ceil(totalDb / USERS_PAGE_SIZE) || 1);

  useEffect(() => {
    if (totalDb <= 0) return;
    const maxPage = Math.max(1, Math.ceil(totalDb / USERS_PAGE_SIZE));
    if (page > maxPage) setPage(maxPage);
  }, [totalDb, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const rangeStart = totalDb === 0 ? 0 : (page - 1) * USERS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * USERS_PAGE_SIZE, totalDb);

  const openEditModal = (user) => {
    setModalMode("edit");
    setEditingUser(user);
    setFormError(null);
    setEditForm({
      username: user.username,
      week_score: user.week_score != null ? Number(user.week_score) : 0,
      score: user.score != null ? Number(user.score) : 0,
      role: user.role != null ? Number(user.role) : 0,
      email: user.email || "",
      phone: user.phone || "",
      password: "",
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setModalMode("add");
    setEditingUser(null);
    setFormError(null);
    setEditForm({
      username: "",
      week_score: 0,
      score: 0,
      role: 0,
      email: "",
      phone: "",
      password: "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormError(null);
    setEditForm({
      username: "",
      week_score: 0,
      score: 0,
      role: 0,
      email: "",
      phone: "",
      password: "",
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      if (name === "week_score" || name === "score") {
        const n = value === "" ? 0 : Number(value);
        return { ...prev, [name]: Number.isNaN(n) ? 0 : n };
      }
      if (name === "role") {
        return { ...prev, role: Number(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSave = async () => {
    if (!editForm.username.trim()) {
      setFormError("Username không được để trống.");
      return;
    }
    if (modalMode === "add" && !editForm.password.trim()) {
      setFormError("Mật khẩu là bắt buộc khi tạo user mới.");
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      if (modalMode === "add") {
        await createAdminUser({
          username: editForm.username.trim(),
          password: editForm.password.trim(),
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          role: Number(editForm.role),
          score: Number(editForm.score) || 0,
          week_score:
            editForm.week_score === "" || editForm.week_score === null
              ? null
              : Number(editForm.week_score),
        });
      } else if (editingUser) {
        const payload = {
          username: editForm.username.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          role: Number(editForm.role),
          score: Number(editForm.score),
          week_score:
            editForm.week_score === "" || editForm.week_score === null
              ? null
              : Number(editForm.week_score),
        };
        if (editForm.password.trim()) {
          payload.password = editForm.password.trim();
        }
        await updateAdminUser(editingUser.id, payload);
      }
      await loadUsers();
      closeModal();
    } catch (e) {
      setFormError(
        e?.response?.data?.message || e?.message || "Không lưu được. Vui lòng thử lại."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa tài khoản "${u.username}" (ID ${u.id})? Hành động không thể hoàn tác.`)) {
      return;
    }
    setDeletingId(u.id);
    setError(null);
    try {
      await deleteAdminUser(u.id);
      await loadUsers();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không xóa được user.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") closeModal();
  };

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Quản lý user</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Quản lý user</h1>
          <p style={styles.lead}>
          Chào mừng bạn đến với trang quản lý tài khoản.
          </p>
        </div>
        <button
          type="button"
          style={styles.btnPrimary}
          title="Tạo user mới"
          onClick={openAddModal}
        >
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo user mới
        </button>
      </header>

      <div style={styles.toolbar}>
        <p style={styles.statLine}>
          Tổng số user (cơ sở dữ liệu):{" "}
          <span style={styles.statNumber}>{totalDb.toLocaleString("vi-VN")}</span>
        </p>
        <div style={styles.searchWrap}>
          <input
            type="search"
            placeholder="Tìm theo username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
            aria-label="Tìm kiếm user"
          />
          <span style={styles.searchIconSlot} aria-hidden>
            <SearchIcon />
          </span>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner} role="alert">
          {error}{" "}
          <button type="button" style={styles.linkBtn} onClick={loadUsers}>
            Thử lại
          </button>
        </div>
      )}

      {loading && users.length === 0 && !error && (
        <p style={styles.muted}>Đang tải danh sách user…</p>
      )}

      {!loading && totalDb === 0 && !error && (
        <p style={styles.muted}>
          {debouncedSearch
            ? `Không có user khớp “${debouncedSearch}”.`
            : "Chưa có user nào."}
        </p>
      )}

      {totalDb > 0 &&
        (isNarrow ? (
        <div style={styles.cardList}>
          {users.length === 0 ? (
            <div style={styles.cardEmpty}>Không có dữ liệu trên trang này.</div>
          ) : (
            users.map((u) => (
              <article key={u.id} style={styles.userCard}>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>User ID</span>
                  <span style={styles.cardValue}>{u.id}</span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Username</span>
                  <span style={{ ...styles.cardValue, fontWeight: 700 }}>{u.username}</span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Điểm tuần</span>
                  <span style={{ ...styles.cardValue, fontWeight: 600 }}>
                    {u.week_score != null ? u.week_score.toLocaleString("vi-VN") : "—"}
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Điểm tất cả</span>
                  <span style={{ ...styles.cardValue, fontWeight: 600 }}>
                    {u.score != null ? u.score.toLocaleString("vi-VN") : "—"}
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Vai trò</span>
                  <span>
                    <span style={u.role === 1 ? styles.badgeAdmin : styles.badgeUser}>
                      {roleLabel(u.role)}
                    </span>
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Email</span>
                  <span style={{ ...styles.cardValue, color: "#57606a" }}>
                    {u.email || "—"}
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Số điện thoại</span>
                  <span style={{ ...styles.cardValue, color: "#57606a" }}>
                    {u.phone || "—"}
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Thời gian tạo</span>
                  <span style={{ ...styles.cardValue, fontSize: "0.88rem" }}>
                    {formatDateTime(u.created_at)}
                  </span>
                </div>
                <div style={styles.cardActions}>
                  <button
                    type="button"
                    style={styles.iconBtn}
                    title="Chỉnh sửa"
                    onClick={() => openEditModal(u)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.iconBtn,
                      ...(deletingId === u.id ? { opacity: 0.55, pointerEvents: "none" } : {}),
                    }}
                    title="Xóa user"
                    disabled={deletingId != null}
                    onClick={() => handleDeleteUser(u)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, whiteSpace: "nowrap" }}>User ID</th>
                <th style={styles.th}>Username</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Điểm tuần</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Điểm tất cả</th>
                <th style={styles.th}>Vai trò</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Số điện thoại</th>
                <th style={{ ...styles.th, whiteSpace: "nowrap" }}>
                  Thời gian tạo
                </th>
                <th style={{ ...styles.th, textAlign: "right", width: 120 }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={9} style={styles.tdEmpty}>
                    Không có dữ liệu trên trang này.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td style={styles.td}>{u.id}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{u.username}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {u.week_score != null ? u.week_score.toLocaleString("vi-VN") : "—"}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {u.score != null ? u.score.toLocaleString("vi-VN") : "—"}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={
                          u.role === 1 ? styles.badgeAdmin : styles.badgeUser
                        }
                      >
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: "#57606a" }}>
                      {u.email || "—"}
                    </td>
                    <td style={{ ...styles.td, color: "#57606a" }}>
                      {u.phone || "—"}
                    </td>
                    <td style={{ ...styles.td, whiteSpace: "nowrap", fontSize: "0.88rem" }}>
                      {formatDateTime(u.created_at)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <button
                        type="button"
                        style={styles.iconBtn}
                        title="Chỉnh sửa"
                        onClick={() => openEditModal(u)}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        style={{
                          ...styles.iconBtn,
                          marginLeft: 8,
                          ...(deletingId === u.id ? { opacity: 0.55, pointerEvents: "none" } : {}),
                        }}
                        title="Xóa user"
                        disabled={deletingId != null}
                        onClick={() => handleDeleteUser(u)}
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
        ))}

      {!loading && totalDb > 0 && (
        <nav style={styles.paginationBar} aria-label="Phân trang danh sách user">
          <p style={styles.paginationMeta}>
            Hiển thị {rangeStart.toLocaleString("vi-VN")}–{rangeEnd.toLocaleString("vi-VN")} /{" "}
            {totalDb.toLocaleString("vi-VN")} user
          </p>
          <div style={styles.paginationControls}>
            <button
              type="button"
              style={{
                ...styles.paginationBtn,
                ...(page <= 1 ? styles.paginationBtnDisabled : {}),
              }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trang trước
            </button>
            <span style={styles.paginationPage}>
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              style={{
                ...styles.paginationBtn,
                ...(page >= totalPages ? styles.paginationBtnDisabled : {}),
              }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau
            </button>
          </div>
        </nav>
      )}

      {/* MODAL THÊM / SỬA */}
      {showModal && (
        <div
          style={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          onKeyDown={handleKeyDown}
        >
          <div style={styles.modalContainer}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modalMode === "add" ? "Thêm user mới" : "Chỉnh sửa tài khoản"}
              </h2>
              <button onClick={closeModal} style={styles.modalCloseBtn} aria-label="Đóng">
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formField}>
                  <label style={styles.label}>Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={editForm.username}
                    onChange={handleFormChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Điểm tuần</label>
                  <input
                    type="number"
                    name="week_score"
                    value={editForm.week_score}
                    onChange={handleFormChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Điểm tất cả</label>
                  <input
                    type="number"
                    name="score"
                    value={editForm.score}
                    onChange={handleFormChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Vai trò</label>
                  <select
                    name="role"
                    value={editForm.role}
                    onChange={handleFormChange}
                    style={styles.select}
                  >
                    <option value={0}>Người chơi</option>
                    <option value={1}>Quản trị viên</option>
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleFormChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleFormChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>
                    {modalMode === "add" ? "Mật khẩu *" : "Mật khẩu mới"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={editForm.password}
                    onChange={handleFormChange}
                    style={styles.input}
                    placeholder={modalMode === "add" ? "Nhập mật khẩu" : "Để trống nếu không đổi"}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {formError && (
                <div style={styles.formError} role="alert">
                  {formError}
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button type="button" onClick={closeModal} style={styles.btnCancel} disabled={saving}>
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{ ...styles.btnSave, ...(saving ? { opacity: 0.75 } : {}) }}
                disabled={saving}
              >
                {saving ? "Đang lưu…" : modalMode === "add" ? "Thêm user" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  codeInline: {
    fontSize: "0.88em",
    background: "#f6f8fa",
    padding: "2px 6px",
    borderRadius: 4,
  },
  muted: {
    color: "#57606a",
    marginBottom: 16,
    fontSize: "0.95rem",
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
    fontSize: "inherit",
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
    fontFamily: "inherit",
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
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  },
  userCard: {
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
    padding: "16px 14px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  cardField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 14,
    minWidth: 0,
  },
  cardLabel: {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#57606a",
  },
  cardValue: {
    fontSize: "0.9rem",
    color: "#24292f",
    lineHeight: 1.5,
    wordBreak: "break-word",
    overflowWrap: "break-word",
  },
  cardActions: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 12,
    marginTop: 4,
    borderTop: "1px solid #eaeef2",
  },
  cardEmpty: {
    padding: "28px 16px",
    textAlign: "center",
    color: "#57606a",
    fontSize: "0.95rem",
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
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
    minWidth: 960,
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
    verticalAlign: "middle",
    color: "#24292f",
  },
  tdEmpty: {
    padding: "28px 16px",
    textAlign: "center",
    color: "#57606a",
  },
  badgeAdmin: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: "0.78rem",
    fontWeight: 600,
    background: "#ddf4ff",
    color: "#2d5a76",
    border: "1px solid #b6e3ff",
  },
  badgeUser: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: "0.78rem",
    fontWeight: 600,
    background: "#f6f8fa",
    color: "#57606a",
    border: "1px solid #d0d7de",
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
    marginTop: 12,
    padding: "10px 12px",
    fontSize: "0.88rem",
    color: "#9a3412",
    background: "#fff8f5",
    border: "1px solid #f0c4a8",
    borderRadius: 8,
    lineHeight: 1.45,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 700,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 35px -8px rgba(0,0,0,0.2)",
    fontFamily: "inherit",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #eaeef2",
  },
  modalTitle: {
    margin: 0,
    fontSize: "1.35rem",
    fontWeight: 600,
    color: "#1f2328",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    fontSize: 24,
    cursor: "pointer",
    color: "#57606a",
    padding: "0 4px",
    lineHeight: 1,
  },
  modalBody: {
    padding: "24px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px 24px",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#1f2328",
  },
  input: {
    padding: "10px 12px",
    fontSize: "0.95rem",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    outline: "none",
    transition: "0.2s",
    fontFamily: "inherit",
  },
  select: {
    padding: "10px 12px",
    fontSize: "0.95rem",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    outline: "none",
    background: "#fff",
    fontFamily: "inherit",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #eaeef2",
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  btnCancel: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    fontSize: "0.9rem",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnSave: {
    padding: "8px 20px",
    borderRadius: 8,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  paginationBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 20,
    padding: "14px 16px",
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  paginationMeta: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#57606a",
    lineHeight: 1.45,
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  paginationBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.88rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  paginationBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  paginationPage: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#24292f",
    minWidth: 100,
    textAlign: "center",
  },
};