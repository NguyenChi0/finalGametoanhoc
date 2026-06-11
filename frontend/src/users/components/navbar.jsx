import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { isAdminUser } from "../../admin/auth";
import { clearItemLoadout } from "../lib/playSession";

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
  login: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  register: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path d="M20 21a8 8 0 10-16 0" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  password: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c1.5-3.5 5-5 8-5s6.5 1.5 8 5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
};

const SCROLL_THRESHOLD = 48;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const userMenuDesktopRef = useRef(null);
  const userBtnDesktopRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    clearItemLoadout();
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
    const handleScroll = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setScrolled(window.scrollY > SCROLL_THRESHOLD);
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
        <span className="navbar-menu-icon">{NAV_ICONS.profile}</span>
        Trang cá nhân
      </Link>
      <Link to="/change-password" role="menuitem" onClick={closeMenus}>
        <span className="navbar-menu-icon">{NAV_ICONS.password}</span>
        Đổi mật khẩu
      </Link>
      <button type="button" className="logout" role="menuitem" onClick={handleLogout}>
        <span className="navbar-menu-icon">{NAV_ICONS.logout}</span>
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
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1100;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: clip;
          transition: background 0.28s ease, box-shadow 0.28s ease, color 0.28s ease;
        }
        .navbar-root--top {
          background: transparent;
          color: #454038;
          box-shadow: none;
        }
        .navbar-root--scrolled {
          background: #fff;
          color: #1a1a1a;
          box-shadow: 0 1px 14px rgba(0, 0, 0, 0.08);
        }
        .navbar-desktop {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: flex-end;
          width: 100%;
          gap: 12px;
        }
        .navbar-desktop-spacer {
          min-width: 0;
        }
        .navbar-desktop-center {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          flex-wrap: wrap;
          gap: 2px 14px;
        }
        .navbar-desktop-center a,
        .navbar-desktop-right a {
          color: inherit;
          text-decoration: none;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .navbar-root--scrolled .navbar-desktop-right a:not(.navbar-link):hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .navbar-root--top .navbar-desktop-right a:not(.navbar-link):hover {
          background: rgba(69, 64, 56, 0.08);
        }
        .navbar-desktop-center .navbar-link,
        .navbar-desktop-right .navbar-link {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 4px 8px 2px;
          font-size: 0.82rem;
          font-weight: 500;
          color: inherit;
          background: transparent;
          border-radius: 0;
          text-align: center;
          min-width: 64px;
        }
        .navbar-desktop-center .navbar-link:hover,
        .navbar-desktop-right .navbar-link:hover {
          background: transparent;
        }
        .navbar-link-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1.5px solid transparent;
          box-sizing: border-box;
          line-height: 0;
          transition: border-color 0.22s ease, background 0.22s ease;
        }
        .navbar-link--active .navbar-link-icon {
          border-color: currentColor;
        }
        .navbar-root--top .navbar-link--active .navbar-link-icon {
          background: rgba(69, 64, 56, 0.06);
        }
        .navbar-root--scrolled .navbar-link--active .navbar-link-icon {
          background: rgba(0, 0, 0, 0.04);
        }
        .navbar-link-icon svg {
          display: block;
        }
        .navbar-link-label {
          line-height: 1.2;
          white-space: nowrap;
        }
        .navbar-desktop-right {
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
          max-width: 100%;
          flex-shrink: 0;
        }
        .navbar-user-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .navbar-auth-links {
          display: flex;
          align-items: flex-end;
          gap: 2px 14px;
          flex-shrink: 0;
        }
        .navbar-user-trigger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: inherit;
          font-weight: 500;
          font-size: 1.02rem;
          cursor: pointer;
          font-family: inherit;
          max-width: 100%;
          transition: background 0.2s;
        }
        .navbar-root--scrolled .navbar-user-trigger:hover,
        .navbar-root--scrolled .navbar-user-trigger.open {
          background: rgba(0, 0, 0, 0.05);
        }
        .navbar-root--top .navbar-user-trigger:hover,
        .navbar-root--top .navbar-user-trigger.open {
          background: rgba(69, 64, 56, 0.08);
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
          display: flex;
          align-items: center;
          gap: 10px;
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
          font-size: 1rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .navbar-menu-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          line-height: 0;
          opacity: 0.95;
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
          color: inherit;
          overflow: visible;
          padding-right: 4px;
        }
        .navbar-mobile-brand-text {
          font-weight: 500;
          font-size: clamp(1rem, 4.2vw, 1.2rem);
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
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: inherit;
          box-shadow: none;
          transition: transform 0.2s ease, background 0.2s;
          flex-shrink: 0;
          touch-action: manipulation;
        }
        .navbar-root--scrolled .navbar-fab:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .navbar-root--top .navbar-fab:hover {
          background: rgba(69, 64, 56, 0.08);
        }
        .navbar-fab:hover {
          transform: scale(1.03);
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
          background: currentColor;
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
          top: calc(var(--navbar-height, 76px) + 8px);
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
          font-size: 1.05rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s;
        }
        .navbar-mobile-panel a:hover,
        .navbar-mobile-panel button:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .navbar-mobile-panel .navbar-link {
          flex-direction: row;
          gap: 12px;
          min-width: 0;
        }
        .navbar-mobile-panel .navbar-link--active {
          background: rgba(255, 255, 255, 0.12);
        }
        .navbar-mobile-panel .navbar-link--active .navbar-link-icon {
          border-color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.1);
        }
        .navbar-mobile-panel .navbar-link-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
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
          display: flex;
          align-items: center;
          gap: 10px;
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

      <nav className={`navbar-root ${scrolled ? "navbar-root--scrolled" : "navbar-root--top"}`}>
        <div className="navbar-desktop">
          <div className="navbar-desktop-spacer" aria-hidden />
          <div className="navbar-desktop-center">{navLinks}</div>
          <div className="navbar-desktop-right">
            {!user ? (
              <div className="navbar-auth-links">
                {renderNavLink("/login", "Đăng nhập", NAV_ICONS.login)}
                {renderNavLink("/register", "Đăng ký", NAV_ICONS.register)}
              </div>
            ) : (
              <div className="navbar-user-wrap">
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
              </div>
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
            {renderNavLink("/login", "Đăng nhập", NAV_ICONS.login)}
            {renderNavLink("/register", "Đăng ký", NAV_ICONS.register)}
          </>
        ) : (
          <>
            {user.username && (
              <div className="nav-user">
                <span className="navbar-menu-icon">{NAV_ICONS.user}</span>
                {user.username}
              </div>
            )}
            <Link to="/profile" role="menuitem" onClick={closeMenus}>
              <span className="navbar-menu-icon">{NAV_ICONS.profile}</span>
              Trang cá nhân
            </Link>
            <Link to="/change-password" role="menuitem" onClick={closeMenus}>
              <span className="navbar-menu-icon">{NAV_ICONS.password}</span>
              Đổi mật khẩu
            </Link>
            <button
              type="button"
              className="logout"
              role="menuitem"
              onClick={handleLogout}
            >
              <span className="navbar-menu-icon">{NAV_ICONS.logout}</span>
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </>
  );
}
