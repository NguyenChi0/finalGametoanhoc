import React from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../auth";

/**
 * @param {{
 *   isMobile?: boolean;
 *   onOpenMobileMenu?: () => void;
 *   mobileMenuExpanded?: boolean;
 * }} props
 */
export default function AdminNavbar({
  isMobile = false,
  onOpenMobileMenu,
  mobileMenuExpanded = false,
}) {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav
      style={{
        ...styles.navbar,
        padding: isMobile ? "0 12px" : "0 32px",
      }}
    >
      {isMobile && (
        <div style={styles.leftSection}>
          <button
            type="button"
            style={styles.menuFab}
            onClick={() => onOpenMobileMenu?.()}
            aria-expanded={mobileMenuExpanded}
            aria-label="Mở menu quản trị"
          >
            <MenuIcon />
          </button>
        </div>
      )}
      <div
        style={{
          ...styles.rightSection,
          ...(isMobile ? styles.rightSectionMobile : { marginLeft: "auto" }),
        }}
      >
        {user?.username && (
          <div style={styles.userInfo}>{user.username}</div>
        )}
        <button type="button" onClick={handleLogout} style={styles.logoutBtn}>
          Đăng xuất
        </button>
      </div>
    </nav>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/** Đồng bộ với AdminSidebar */
const ADMIN_CHROME_BORDER = "1px solid #d0d7de";

const styles = {
  navbar: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 72,
    background: "#ffffff",
    borderBottom: ADMIN_CHROME_BORDER,
    width: "100%",
  },
  leftSection: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },
  menuFab: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "1px solid #d0d7de",
    background: "#ffffff",
    color: "#24292f",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(31, 35, 40, 0.08)",
    padding: 0,
    boxSizing: "border-box",
    WebkitTapHighlightColor: "transparent",
  },
  rightSection: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  /** Trên mobile vẫn gom phải nhưng cho phép wrap / co nhỏ */
  rightSectionMobile: {
    flexWrap: "wrap",
    justifyContent: "flex-end",
    rowGap: 8,
    columnGap: 10,
    minWidth: 0,
  },
  userInfo: {
    fontSize: "0.9rem",
    color: "#57606a",
    fontWeight: 500,
  },
  logoutBtn: {
    padding: "8px 14px",
    fontFamily: "inherit",
    borderRadius: 6,
    border: "1px solid #d0d7de",
    background: "#ffffff",
    color: "#cf222e",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  siteLink: {
    color: "#0969da",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: 500,
    transition: "color 0.15s",
  },
};
