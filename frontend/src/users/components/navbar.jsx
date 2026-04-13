import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { isAdminUser } from "../../admin/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setMobileOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    setMobileOpen(false);
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
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const linkBase = {
    color: "#fff",
    textDecoration: "none",
    fontWeight: 600,
  };

  return (
    <>
      <style>{`
        .navbar-root {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: #0f4c75;
          color: #fff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
          position: relative;
          /* Trên overlay: tránh tap “xuyên” xuống nút 3 gạch (ghost click mở lại menu). */
          z-index: 1100;
        }
        .navbar-desktop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 12px;
        }
        .navbar-desktop-left,
        .navbar-desktop-right {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px 12px;
        }
        .navbar-desktop a {
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .navbar-desktop a:hover {
          background: rgba(255, 255, 255, 0.15);
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
          font-size: clamp(0.88rem, 3.8vw, 1.05rem);
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
          display: block;
          width: 100%;
          text-align: left;
          padding: 14px 16px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #fff;
          font-size: 1rem;
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
        .navbar-mobile-panel .nav-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.15);
          margin: 4px 8px;
        }
        .navbar-mobile-panel .nav-user {
          padding: 12px 16px;
          font-size: 0.9rem;
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
            transform: translateY(-8px);
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
          <div className="navbar-desktop-left">
            <Link to="/" style={linkBase}>
              Trang chủ
            </Link>
            {user && (
              <Link to="/contest" style={linkBase}>
                Cuộc thi
              </Link>
            )}
            {user && (
              <Link to="/shop" style={linkBase}>
                Cửa hàng
              </Link>
            )}
            {user && isAdminUser(user) && (
              <Link to="/admin" style={linkBase}>
                Quản trị
              </Link>
            )}
          </div>
          <div className="navbar-desktop-right">
            {!user ? (
              <>
                <Link to="/login" style={linkBase}>
                  Đăng nhập
                </Link>
                <Link to="/register" style={linkBase}>
                  Đăng ký
                </Link>
              </>
            ) : (
              <>
                <Link to="/profile" style={linkBase}>
                  Trang cá nhân
                </Link>
                <span style={{ opacity: 0.95, fontSize: "0.95rem" }}>
                  Xin chào, {user.username}!
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    background: "#c82333",
                    color: "#fff",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontFamily: "inherit",
                  }}
                >
                  Đăng xuất
                </button>
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
        <Link to="/" role="menuitem" onClick={() => setMobileOpen(false)}>
          Trang chủ
        </Link>
        {user && (
          <Link to="/contest" role="menuitem" onClick={() => setMobileOpen(false)}>
            Cuộc thi
          </Link>
        )}
        {user && (
          <Link to="/shop" role="menuitem" onClick={() => setMobileOpen(false)}>
            Cửa hàng
          </Link>
        )}
        {user && isAdminUser(user) && (
          <Link to="/admin" role="menuitem" onClick={() => setMobileOpen(false)}>
            Quản trị
          </Link>
        )}
        <div className="nav-divider" />
        {!user ? (
          <>
            <Link to="/login" role="menuitem" onClick={() => setMobileOpen(false)}>
              Đăng nhập
            </Link>
            <Link to="/register" role="menuitem" onClick={() => setMobileOpen(false)}>
              Đăng ký
            </Link>
          </>
        ) : (
          <>
            {user.username && (
              <div className="nav-user">👤 {user.username}</div>
            )}
            <Link to="/profile" role="menuitem" onClick={() => setMobileOpen(false)}>
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
