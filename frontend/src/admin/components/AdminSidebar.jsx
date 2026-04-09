import React from "react";
import { NavLink, Link } from "react-router-dom";

/** Cùng chuỗi viền với AdminNavbar — góc giao vertical/horizontal đồng nhất */
const ADMIN_CHROME_BORDER = "1px solid #d0d7de";

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

/**
 * @param {{ variant?: "default" | "drawer"; onRequestClose?: () => void }} props
 * — drawer: panel fixed khi mở từ mobile; onRequestClose: đóng sau khi chọn link hoặc bấm đóng.
 */
export default function AdminSidebar({ variant = "default", onRequestClose }) {
  const isDrawer = variant === "drawer";

  const rootStyle = {
    ...styles.sidebar,
    ...(isDrawer ? styles.sidebarDrawer : {}),
  };

  const brandStyle = {
    ...styles.brand,
    ...(isDrawer ? styles.brandDrawer : {}),
  };

  const handleNav = () => {
    onRequestClose?.();
  };

  return (
    <aside style={rootStyle}>
      <style>
        {`
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

      <div style={brandStyle}>
        <span style={styles.brandText}>Bảng điều khiển</span>
        {isDrawer && (
          <button
            type="button"
            style={styles.closeBtn}
            onClick={handleNav}
            aria-label="Đóng menu"
          >
            <CloseIcon />
          </button>
        )}
      </div>
      <div style={styles.sidebarHeaderLink}>
        <Link to="/" style={styles.siteLink}>
          ← Về trang chủ
        </Link>
      </div>
      <nav style={styles.nav} aria-label="Menu quản trị">
        {navItems.map(({ to, end, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={linkStyle}
            className="admin-nav-link"
            onClick={handleNav}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

const styles = {
  sidebar: {
    width: 260,
    flexShrink: 0,
    background: "#ffffff",
    borderRight: ADMIN_CHROME_BORDER,
    display: "flex",
    flexDirection: "column",
    padding: 0,
    boxSizing: "border-box",
  },
  /** Mobile drawer — trên overlay */
  sidebarDrawer: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: "min(280px, 88vw)",
    zIndex: 1002,
    maxHeight: "100dvh",
    boxShadow: "4px 0 24px rgba(0, 0, 0, 0.18)",
  },
  brand: {
    boxSizing: "border-box",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    minHeight: 72,
    fontWeight: 700,
    fontSize: "1.15rem",
    padding: "0 20px",
    borderBottom: ADMIN_CHROME_BORDER,
    color: "#1f2328",
  },
  brandDrawer: {
    justifyContent: "space-between",
    gap: 12,
  },
  brandText: {
    minWidth: 0,
  },
  closeBtn: {
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    color: "#24292f",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    boxSizing: "border-box",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "16px 12px",
    flex: 1,
    overflowY: "auto",
  },
  sidebarHeaderLink: {
    padding: "12px 20px",
    borderBottom: ADMIN_CHROME_BORDER,
    background: "#f6f8fa",
  },
  siteLink: {
    color: "#0969da",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  navLink: {
    color: "#24292f",
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: "0.92rem",
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
};
