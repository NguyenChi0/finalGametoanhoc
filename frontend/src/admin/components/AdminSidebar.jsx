import React from "react";
import { NavLink, Link } from "react-router-dom";

/** Cùng chuỗi viền với AdminNavbar — góc giao vertical/horizontal đồng nhất */
const ADMIN_CHROME_BORDER = "1px solid #d0d7de";

const navItems = [
  { to: "/admin", end: true, label: "Tổng quan", icon: "overview" },
  { to: "/admin/questions", end: true, label: "Quản lý câu hỏi", icon: "questions" },
  { to: "/admin/grades", end: false, label: "Quản lý lớp", icon: "grades" },
  { to: "/admin/math-types", end: false, label: "Quản lý chủ đề", icon: "topics" },
  { to: "/admin/contest", end: false, label: "Quản lý cuộc thi", icon: "contest" },
  { to: "/admin/exams", end: false, label: "Quản lý đề thi", icon: "exams" },
  { to: "/admin/users", end: false, label: "Quản lý người dùng", icon: "users" },
  { to: "/admin/items", end: false, label: "Quản lý vật phẩm", icon: "items" },
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
            border: none !important;
            box-shadow: none !important;
          }
          .admin-nav-link:focus {
            outline: none !important;
          }
          .admin-nav-link:focus-visible {
            outline: 2px solid #3d8f5c !important;
            outline-offset: 2px;
          }
          .admin-nav-link:active {
            outline: none !important;
          }
          .admin-nav-link:hover:not([aria-current="page"]) {
            background: #f6f8fa;
          }
        `}
      </style>

      <div style={brandStyle}>
        <span style={styles.brandText}>Trang quản trị</span>
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
        {navItems.map(({ to, end, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={linkStyle}
            className="admin-nav-link"
            onClick={handleNav}
          >
            <AdminNavIcon name={icon} />
            <span style={styles.navLabel}>{label}</span>
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

function AdminNavIcon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "questions":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 4.2 1.8c0 1.8-2.2 2.2-2.2 4.2" />
          <circle cx="12" cy="17.2" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "grades":
      return (
        <svg {...common}>
          <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
          <path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" />
        </svg>
      );
    case "topics":
      return (
        <svg {...common}>
          <path d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
          <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
          <path d="M8 11h8M8 15h5" />
        </svg>
      );
    case "contest":
      return (
        <svg {...common}>
          <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
          <path d="M6 4H4v2a2 2 0 0 0 2 2M18 4h2v2a2 2 0 0 1-2 2" />
          <path d="M12 11v3M9 20h6M10 14h4v3a2 2 0 0 1-4 0v-3Z" />
        </svg>
      );
    case "exams":
      return (
        <svg {...common}>
          <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
          <path d="M9 9h6M9 13h6" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19.5c.8-3 3.2-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
          <circle cx="17.5" cy="9" r="2.5" />
          <path d="M15 19.5c.5-1.8 1.8-2.8 3.5-2.8" />
        </svg>
      );
    case "items":
      return (
        <svg {...common}>
          <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
          <path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
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
    color: "#2d5a76",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#24292f",
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: "50px",
    fontWeight: 500,
    fontSize: "0.92rem",
    border: "none",
    boxSizing: "border-box",
    transition: "background 0.15s, color 0.15s",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  navLabel: {
    minWidth: 0,
    lineHeight: 1.35,
  },
  navLinkActive: {
    color: "#1f6b3f",
    background: "#d8f0de",
    fontWeight: 500,
  },
};
