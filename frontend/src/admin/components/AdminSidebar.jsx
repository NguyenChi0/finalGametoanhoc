import React from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { getStoredUser } from "../auth";

const navItems = [
  { to: "/admin", end: true, label: "Tổng quan" },
  { to: "/admin/questions", end: true, label: "Quản lý câu hỏi" },
  { to: "/admin/questions/new", end: true, label: "Tạo câu hỏi" },
  { to: "/admin/grades", end: false, label: "Quản lý lớp" },
  { to: "/admin/math-types", end: false, label: "Quản lý chủ đề" },
  { to: "/admin/contest", end: false, label: "Quản lý contest" },
  { to: "/admin/exams", end: false, label: "Quản lý exams" },
  { to: "/admin/users", end: false, label: "Quản lý user" },
];

function linkStyle({ isActive }) {
  return {
    ...styles.navLink,
    ...(isActive ? styles.navLinkActive : {}),
  };
}

export default function AdminSidebar() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <aside style={styles.sidebar}>
      {/* Trình duyệt vẽ vòng focus (outline) đen quanh <a> sau khi click — gỡ bằng CSS, chỉ giữ ring khi Tab (a11y) */}
      <style>
        {`
          /* Không dùng border "transparent" — trên Windows đôi khi vẽ thành viền đen; dùng màu trùng nền sidebar */
          .admin-nav-link {
            outline: none !important;
            -webkit-tap-highlight-color: transparent;
            border: 1px solid #ffffff !important;
            box-shadow: none !important;
          }
          .admin-nav-link[aria-current="page"] {
            border: 1px solid #b6e3ff !important;
            box-shadow: inset 3px 0 0 #0969da !important;
          }
          .admin-nav-link:focus {
            outline: none !important;
          }
          .admin-nav-link:focus:not(:focus-visible):not([aria-current="page"]) {
            border: 1px solid #ffffff !important;
            box-shadow: none !important;
          }
          .admin-nav-link:focus-visible {
            outline: 2px solid #0969da !important;
            outline-offset: 2px;
          }
          .admin-nav-link:focus-visible[aria-current="page"] {
            outline-offset: 2px;
          }
          .admin-nav-link:active {
            outline: none !important;
          }
        `}
      </style>

      <div style={styles.brand}>Quản trị</div>
      <nav style={styles.nav} aria-label="Menu quản trị">
        {navItems.map(({ to, end, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={linkStyle}
            className="admin-nav-link"
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div style={styles.sidebarFoot}>
        {user?.username && (
          <div style={styles.userHint}>{user.username}</div>
        )}
        <button type="button" onClick={handleLogout} style={styles.logoutBtn}>
          Đăng xuất
        </button>
        <Link to="/" style={styles.siteLink}>
          ← Về trang chủ
        </Link>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 260,
    flexShrink: 0,
    background: "#ffffff",
    borderRight: "1px solid #d0d7de",
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    boxShadow: "1px 0 0 rgba(31, 35, 40, 0.04)",
  },
  brand: {
    fontWeight: 700,
    fontSize: "1.15rem",
    padding: "0 20px 20px",
    borderBottom: "1px solid #d0d7de",
    color: "#1f2328",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "16px 12px",
    flex: 1,
    overflowY: "auto",
  },
  navLink: {
    color: "#24292f",
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: "0.92rem",
    /* Viền trùng nền trắng sidebar — tránh transparent bị vẽ đen trên một số GPU */
    border: "1px solid #ffffff",
    boxSizing: "border-box",
    transition: "background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  navLinkActive: {
    color: "#0969da",
    background: "#ddf4ff",
    border: "1px solid #b6e3ff",
    boxShadow: "inset 3px 0 0 #0969da",
  },
  sidebarFoot: {
    padding: "12px 16px",
    borderTop: "1px solid #d0d7de",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  userHint: {
    fontSize: "0.85rem",
    color: "#57606a",
    wordBreak: "break-all",
  },
  logoutBtn: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#ffffff",
    color: "#cf222e",
    fontWeight: 600,
    cursor: "pointer",
  },
  siteLink: {
    color: "#0969da",
    textDecoration: "none",
    fontSize: "0.9rem",
  },
};