import React, { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";

const MOBILE_BREAKPOINT = "(max-width: 768px)";

/**
 * Khung admin: desktop — sidebar trái + main; mobile — full width, nút tròn mở menu drawer.
 */
export default function AdminLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setDrawerOpen(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile || !drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div style={styles.shell}>
      {!isMobile && <AdminSidebar />}

      <main style={styles.main}>
        <AdminNavbar
          isMobile={isMobile}
          onOpenMobileMenu={() => setDrawerOpen(true)}
          mobileMenuExpanded={drawerOpen}
        />
        <div style={styles.content}>
          <Outlet />
        </div>
      </main>

      {isMobile && drawerOpen && (
        <>
          <div
            style={styles.drawerOverlay}
            aria-hidden
            onClick={closeDrawer}
          />
          <AdminSidebar variant="drawer" onRequestClose={closeDrawer} />
        </>
      )}
    </div>
  );
}

const styles = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "#f6f8fa",
    color: "#24292f",
  },
  main: {
    flex: 1,
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    background: "#f6f8fa",
  },
  drawerOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.45)",
    zIndex: 1001,
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "10px 10px",
  },
};
