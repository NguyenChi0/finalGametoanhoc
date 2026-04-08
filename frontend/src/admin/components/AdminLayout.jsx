import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

/**
 * Khung admin: sidebar (component riêng) + vùng nội dung (Outlet).
 */
export default function AdminLayout() {
  return (
    <div style={styles.shell}>
      <AdminSidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
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
    padding: "28px 32px",
    minWidth: 0,
    background: "#f6f8fa",
  },
};
