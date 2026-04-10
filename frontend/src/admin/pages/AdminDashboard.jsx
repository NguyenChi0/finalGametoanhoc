import React from "react";

/**
 * Trang tổng quan admin — placeholder, sẽ mở rộng CRUD sau.
 */
export default function AdminDashboard() {
  return (
    <div>
      <h1 style={styles.h1}>Bảng điều khiển</h1>
      <p style={styles.lead}>
        Chào mừng đến khu vực quản trị. Các mục Users, bài học, câu hỏi, bài kiểm tra
        theo tuần sẽ được thêm dần.
      </p>
      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Người dùng</h2>
          <p style={styles.cardText}>Quản lý tài khoản, điểm — đang phát triển.</p>
        </div>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Nội dung</h2>
          <p style={styles.cardText}>Lớp, dạng bài, câu hỏi — đang phát triển.</p>
        </div>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Kiểm tra tuần</h2>
          <p style={styles.cardText}>Template đề & lịch tuần — đang phát triển.</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  h1: {
    margin: "0 0 8px",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  lead: {
    margin: "0 0 28px",
    color: "#57606a",
    maxWidth: 560,
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 12,
    padding: "20px",
    boxShadow: "0 1px 3px rgba(31, 35, 40, 0.06)",
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: "1.05rem",
    color: "#2d5a76",
  },
  cardText: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#57606a",
    lineHeight: 1.45,
  },
};
