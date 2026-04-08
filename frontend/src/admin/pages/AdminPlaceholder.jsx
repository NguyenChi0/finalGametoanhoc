import React from "react";

/** Trang placeholder chung cho các mục đang phát triển */
export default function AdminPlaceholder({ title, description }) {
  return (
    <div>
      <h1 style={styles.h1}>{title}</h1>
      <p style={styles.lead}>
        {description ||
          "Trang đang được xây dựng — kết nối API và bảng dữ liệu sẽ thêm sau."}
      </p>
    </div>
  );
}

const styles = {
  h1: {
    margin: "0 0 12px",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  lead: {
    margin: 0,
    color: "#57606a",
    maxWidth: 560,
    lineHeight: 1.55,
  },
};
