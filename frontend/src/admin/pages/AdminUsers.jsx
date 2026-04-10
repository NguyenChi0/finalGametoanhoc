import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/** Giao diện demo — chưa nối API */
const MOCK_USERS = [
  {
    id: 1,
    username: "admin",
    week_score: 647,
    score: 635,
    role: 1,
    email: "admin@gametoanhoc.local",
    phone: "0901112233",
    created_at: "2025-10-13 10:17:24",
  },
  {
    id: 5,
    username: "username01",
    week_score: 16,
    score: 22,
    role: 0,
    email: null,
    phone: null,
    created_at: "2025-10-14 15:35:27",
  },
  {
    id: 8,
    username: "hocsinh_demo",
    week_score: 45,
    score: 500,
    role: 0,
    email: "hoc.sinh@mail.com",
    phone: "0987654321",
    created_at: "2025-11-02 08:30:00",
  },
];

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
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_USERS;
    return MOCK_USERS.filter((u) => {
      const blob = [
        u.id,
        u.username,
        u.email || "",
        u.phone || "",
        roleLabel(u.role),
        String(u.score),
        String(u.week_score),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [search]);

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
            Danh sách tài khoản, điểm và vai trò trong hệ thống
          </p>
        </div>
        <button
          type="button"
          style={styles.btnPrimary}
          title="Sắp nối API"
          onClick={() => {}}
        >
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo user mới
        </button>
      </header>

      <div style={styles.toolbar}>
        <p style={styles.statLine}>
          Tổng số user :{" "}
          <span style={styles.statNumber}>{MOCK_USERS.length}</span>
        </p>
        <div style={styles.searchWrap}>
          <input
            type="search"
            placeholder="Tìm theo ID, username, email, điểm, vai trò…"
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
                Thời gian tạo nick
              </th>
              <th style={{ ...styles.th, textAlign: "right", width: 120 }}>
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={styles.tdEmpty}>
                  Không có kết quả phù hợp với “{search}”.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
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
                      title="Chỉnh sửa (demo)"
                      onClick={() => {}}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.iconBtn, marginLeft: 8 }}
                      title="Xóa (demo)"
                      onClick={() => {}}
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

      <p style={styles.demoNote}>
        Giao diện demo với dữ liệu mẫu. Kết nối API admin để đồng bộ cơ sở dữ liệu.
      </p>
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
  demoNote: {
    marginTop: 20,
    fontSize: "0.8rem",
    color: "#6e7781",
    lineHeight: 1.45,
  },
};
