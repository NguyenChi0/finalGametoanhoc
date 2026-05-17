import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const SCROLL_THRESHOLD = 320;

export default function ScrollToTopButton() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  const isShop = location.pathname === "/shop";

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      style={{
        position: "fixed",
        right: 24,
        bottom: isShop ? 120 : 28,
        zIndex: 1050,
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "none",
        backgroundColor: "#0f4c75",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        fontWeight: 700,
        lineHeight: 1,
        boxShadow: "0 4px 14px rgba(15, 76, 117, 0.35)",
        transition: "background-color 0.2s, transform 0.2s",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#3282b8";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#0f4c75";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      ↑
    </button>
  );
}
