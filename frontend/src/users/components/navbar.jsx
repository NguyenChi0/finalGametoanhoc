import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { isAdminUser } from "../../admin/auth";

const NAV_ICONS = {
  home: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  lessons: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M4 5a1 1 0 0 1 1-1h6.5L13 5.5V20H5a1 1 0 0 1-1-1V5Zm9 .5L11.5 4H18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  contest: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M8 4h8v3a4 4 0 1 1-8 0V4Zm-3 1h3v3a4 4 0 0 1-3-3.86V5Zm14 0v-.86A4 4 0 0 1 16 8V5h3ZM10 12h4v3l1 5H9l1-5v-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  exam: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm6 0v5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 13h6M9 17h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  shop: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M4 7h16l-1.2 11.1A2 2 0 0 1 16.8 20H7.2a2 2 0 0 1-2-1.9L4 7Zm4 0V5a4 4 0 0 1 8 0v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const userMenuDesktopRef = useRef(null);
  const userBtnDesktopRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setMobileOpen(false);
    setUserMenuOpen(false);
    navigate("/login");
  };

  const closeMenus = () => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onDown = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        btnRef.current?.contains(e.target)
      ) {
        return;
      }
      setMobileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e) => {
      if (
        userMenuDesktopRef.current?.contains(e.target) ||
        userBtnDesktopRef.current?.contains(e.target)
      ) {
        return;
      }
      setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const renderNavLink = (to, label, icon, end = false) => (
    <NavLink
      to={to}
      end={end}
      onClick={closeMenus}
      className={({ isActive }) =>
        `navbar-link${isActive ? " navbar-link--active" : ""}`
      }
    >
      <span className="navbar-link-icon" aria-hidden>
        {icon}
      </span>
      <span className="navbar-link-label">{label}</span>
    </NavLink>
  );

  const navLinks = (
    <>
      {renderNavLink("/", "Trang chủ", NAV_ICONS.home, true)}
      {renderNavLink("/lessons", "Bài học", NAV_ICONS.lessons)}
      {user && renderNavLink("/contest", "Cuộc thi", NAV_ICONS.contest)}
      {user && renderNavLink("/exam", "Đề thi", NAV_ICONS.exam)}
      {user && renderNavLink("/shop", "Cửa hàng", NAV_ICONS.shop)}
      {user && isAdminUser(user) && renderNavLink("/admin", "Quản trị", NAV_ICONS.admin)}
    </>
  );

  const userMenuLabel = user?.username ? `Xin chào, ${user.username}` : "";

  const renderUserMenu = (menuRef) => (
    <div
      ref={menuRef}
      className={`navbar-user-menu ${userMenuOpen ? "visible" : ""}`}
      role="menu"
    >
      <Link to="/profile" role="menuitem" onClick={closeMenus}>
        Trang cá nhân
      </Link>
      <button type="button" className="logout" role="menuitem" onClick={handleLogout}>
        Đăng xuất
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        .navbar-root {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          background: #6c7ee1;
          color: #fff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
          position: relative;
          z-index: 1100;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: clip;
        }
        .navbar-desktop {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          width: 100%;
          gap: 12px;
        }
        .navbar-desktop-spacer {
          min-width: 0;
        }
        .navbar-desktop-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 4px 8px;
        }
        .navbar-desktop-center a,
        .navbar-desktop-right a {
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .navbar-desktop-right a:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .navbar-desktop-center .navbar-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px 10px;
          font-size: 1.1rem;
          background: transparent;
          border-radius: 0;
        }
        .navbar-desktop-center .navbar-link::after {
          content: "";
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 2px;
          height: 3px;
          border-radius: 2px;
          background: #fff;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.22s ease, opacity 0.22s ease;
          opacity: 0;
          pointer-events: none;
        }
        .navbar-desktop-center .navbar-link:hover {
          background: transparent;
        }
        .navbar-desktop-center .navbar-link:hover::after,
        .navbar-desktop-center .navbar-link--active::after {
          transform: scaleX(1);
          opacity: 1;
        }
        .navbar-link-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
        }
        .navbar-link-icon svg {
          display: block;
        }
        .navbar-desktop-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          position: relative;
          min-width: 0;
          max-width: 100%;
        }
        .navbar-auth-links {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .navbar-auth-link {
          position: relative;
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          font-size: 1.08rem;
          padding: 7px 14px 10px;
          border-radius: 8px;
          white-space: nowrap;
          transition: background 0.2s, color 0.2s;
        }
        .navbar-auth-link::after {
          content: "";
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 2px;
          height: 3px;
          border-radius: 2px;
          background: #fff;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.22s ease, opacity 0.22s ease;
          opacity: 0;
          pointer-events: none;
        }
        .navbar-auth-link:hover::after,
        .navbar-auth-link--active::after {
          transform: scaleX(1);
          opacity: 1;
        }
        .navbar-desktop-right .navbar-auth-link:hover {
          background: transparent;
        }
        .navbar-auth-link--register:hover {
          background: transparent;
        }
        .navbar-auth-link--login {
          background: #c069a1;
          color: #fff;
        }
        .navbar-auth-link--login:hover {
          background: #a8588f;
          color: #fff;
        }
        .navbar-auth-link--login.navbar-auth-link--active {
          background: #a8588f;
        }
        .navbar-user-trigger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #fff;
          font-weight: 600;
          font-size: 1.1rem;
          cursor: pointer;
          font-family: inherit;
          max-width: 100%;
          transition: background 0.2s;
        }
        .navbar-user-trigger:hover,
        .navbar-user-trigger.open {
          background: rgba(255, 255, 255, 0.15);
        }
        .navbar-user-trigger-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
          flex: 1;
        }
        .navbar-desktop-right .navbar-user-trigger {
          max-width: min(200px, 42vw);
        }
        .navbar-user-chevron {
          font-size: 0.85rem;
          opacity: 0.9;
          flex-shrink: 0;
        }
        .navbar-user-menu {
          display: none;
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          left: auto;
          width: min(220px, calc(100vw - 32px));
          max-width: min(220px, calc(100vw - 32px));
          min-width: 0;
          box-sizing: border-box;
          background: #0b5067;
          border-radius: 12px;
          padding: 6px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.12);
          z-index: 1200;
          flex-direction: column;
          gap: 2px;
          animation: navbarSlide 0.18s ease;
          overflow: hidden;
        }
        .navbar-user-menu.visible {
          display: flex;
        }
        .navbar-user-menu a,
        .navbar-user-menu button {
          display: block;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          text-align: left;
          padding: 12px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #fff;
          font-size: 1.08rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .navbar-user-menu a:hover,
        .navbar-user-menu button:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .navbar-user-menu .logout {
          color: #ffb4b4;
        }
        .navbar-mobile-bar {
          display: none;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-height: 44px;
          gap: 10px;
        }
        .navbar-mobile-brand-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
          text-decoration: none;
          color: #fff;
          overflow: visible;
          padding-right: 4px;
        }
        .navbar-mobile-brand-text {
          font-weight: 800;
          font-size: clamp(1rem, 4.2vw, 1.25rem);
          line-height: 1.3;
          letter-spacing: 0.02em;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .navbar-mobile-brand-text.guest-title {
          white-space: normal;
          word-wrap: break-word;
          overflow-wrap: break-word;
          overflow: visible;
          hyphens: manual;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .navbar-fab {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #0b5067, #157a9a);
          color: #fff;
          box-shadow: 0 4px 14px rgba(11, 80, 103, 0.45);
          transition: transform 0.2s ease, box-shadow 0.2s;
          flex-shrink: 0;
          touch-action: manipulation;
        }
        .navbar-fab:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 18px rgba(11, 80, 103, 0.55);
        }
        .navbar-fab:active {
          transform: scale(0.98);
        }
        .navbar-fab-icon {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          width: 22px;
        }
        .navbar-fab-icon span {
          display: block;
          height: 2px;
          background: #fff;
          border-radius: 1px;
          transition: transform 0.25s ease, opacity 0.2s;
        }
        .navbar-fab.open .navbar-fab-icon span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .navbar-fab.open .navbar-fab-icon span:nth-child(2) {
          opacity: 0;
        }
        .navbar-fab.open .navbar-fab-icon span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }
        .navbar-mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 1000;
          animation: navbarFadeIn 0.2s ease;
        }
        .navbar-mobile-overlay.visible {
          display: block;
        }
        .navbar-mobile-panel {
          display: none;
          position: fixed;
          top: 72px;
          right: 12px;
          left: 12px;
          max-width: 320px;
          margin-left: auto;
          background: #0b5067;
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.12);
          z-index: 1050;
          flex-direction: column;
          gap: 4px;
          animation: navbarSlide 0.22s ease;
        }
        .navbar-mobile-panel.visible {
          display: flex;
        }
        .navbar-mobile-panel a,
        .navbar-mobile-panel button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          text-align: left;
          padding: 14px 16px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #fff;
          font-size: 1.15rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s;
        }
        .navbar-mobile-panel a:hover,
        .navbar-mobile-panel button:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .navbar-mobile-panel .navbar-link--active {
          background: rgba(255, 255, 255, 0.18);
        }
        .navbar-mobile-panel .navbar-link-icon {
          flex-shrink: 0;
        }
        .navbar-mobile-panel .nav-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.15);
          margin: 4px 8px;
        }
        .navbar-mobile-panel .nav-user {
          padding: 12px 16px;
          font-size: 1.05rem;
          color: rgba(255, 255, 255, 0.85);
        }
        .navbar-mobile-panel .logout {
          color: #ffb4b4;
        }
        @keyframes navbarFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes navbarSlide {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 768px) {
          .navbar-desktop {
            display: none;
          }
          .navbar-mobile-bar {
            display: flex;
          }
        }
        @media (min-width: 769px) {
          .navbar-mobile-overlay,
          .navbar-mobile-panel {
            display: none !important;
          }
        }
      `}</style>

      <nav className="navbar-root">
        <div className="navbar-desktop">
          <div className="navbar-desktop-spacer" aria-hidden />
          <div className="navbar-desktop-center">{navLinks}</div>
          <div className="navbar-desktop-right">
            {!user ? (
              <div className="navbar-auth-links">
                <NavLink
                  to="/login"
                  onClick={closeMenus}
                  className={({ isActive }) =>
                    `navbar-auth-link navbar-auth-link--login${
                      isActive ? " navbar-auth-link--active" : ""
                    }`
                  }
                >
                  Đăng nhập
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={closeMenus}
                  className={({ isActive }) =>
                    `navbar-auth-link navbar-auth-link--register${
                      isActive ? " navbar-auth-link--active" : ""
                    }`
                  }
                >
                  Đăng ký
                </NavLink>
              </div>
            ) : (
              <>
                <button
                  ref={userBtnDesktopRef}
                  type="button"
                  className={`navbar-user-trigger ${userMenuOpen ? "open" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen((v) => !v);
                    setMobileOpen(false);
                  }}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="navbar-user-trigger-label">{userMenuLabel}</span>
                  <span className="navbar-user-chevron" aria-hidden>
                    {userMenuOpen ? "▲" : "▼"}
                  </span>
                </button>
                {renderUserMenu(userMenuDesktopRef)}
              </>
            )}
          </div>
        </div>

        <div className="navbar-mobile-bar">
          <Link
            to="/"
            className="navbar-mobile-brand-row"
            onClick={() => setMobileOpen(false)}
          >
            {user?.username ? (
              <span className="navbar-mobile-brand-text">
                Xin chào, {user.username}
              </span>
            ) : (
              <span className="navbar-mobile-brand-text guest-title">
                Game toán học
              </span>
            )}
          </Link>
          <button
            ref={btnRef}
            type="button"
            className={`navbar-fab ${mobileOpen ? "open" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setMobileOpen((v) => !v);
              setUserMenuOpen(false);
            }}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          >
            <span className="navbar-fab-icon">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </nav>

      <div
        className={`navbar-mobile-overlay ${mobileOpen ? "visible" : ""}`}
        aria-hidden
        onClick={(e) => {
          e.stopPropagation();
          setMobileOpen(false);
        }}
      />

      <div
        ref={menuRef}
        className={`navbar-mobile-panel ${mobileOpen ? "visible" : ""}`}
        role="menu"
      >
        {navLinks}
        <div className="nav-divider" />
        {!user ? (
          <>
            <Link to="/login" role="menuitem" onClick={closeMenus}>
              Đăng nhập
            </Link>
            <Link to="/register" role="menuitem" onClick={closeMenus}>
              Đăng ký
            </Link>
          </>
        ) : (
          <>
            {user.username && (
              <div className="nav-user">👤 {user.username}</div>
            )}
            <Link to="/profile" role="menuitem" onClick={closeMenus}>
              Trang cá nhân
            </Link>
            <button
              type="button"
              className="logout"
              role="menuitem"
              onClick={handleLogout}
            >
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </>
  );
}
