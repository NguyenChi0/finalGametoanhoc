import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { changePassword as changePasswordApi } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function ChangePassword() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (newPassword === currentPassword) {
      setMessage("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const res = await changePasswordApi({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setMessage(res.data?.message || "Đổi mật khẩu thành công");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Lỗi khi đổi mật khẩu!";
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <h1 style={styles.title}>Đổi mật khẩu</h1>
          <div style={styles.passwordWrap}>
            <input
              type={showCurrentPassword ? "text" : "password"}
              placeholder="Mật khẩu hiện tại"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ ...styles.input, paddingRight: 54 }}
            />
            <button
              type="button"
              style={styles.eyeBtn}
              onClick={() => setShowCurrentPassword((v) => !v)}
              aria-label={showCurrentPassword ? "Ẩn mật khẩu hiện tại" : "Hiện mật khẩu hiện tại"}
              title={showCurrentPassword ? "Ẩn mật khẩu hiện tại" : "Hiện mật khẩu hiện tại"}
            >
              {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div style={styles.passwordWrap}>
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={4}
              style={{ ...styles.input, paddingRight: 54 }}
            />
            <button
              type="button"
              style={styles.eyeBtn}
              onClick={() => setShowNewPassword((v) => !v)}
              aria-label={showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
              title={showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
            >
              {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div style={styles.passwordWrap}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={4}
              style={{ ...styles.input, paddingRight: 54 }}
            />
            <button
              type="button"
              style={styles.eyeBtn}
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
              title={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "Đang xử lý…" : "Đổi mật khẩu"}
          </button>
          {message && (
            <p style={success ? styles.successMessage : styles.message}>{message}</p>
          )}
          <p style={styles.footerHint}>
            <Link to="/profile" style={styles.textLink}>
              Quay lại trang cá nhân
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.7 10.7 0 0112 19C5 19 1 12 1 12a21.7 21.7 0 015.06-6.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0112 5c7 0 11 7 11 7a21.35 21.35 0 01-2.17 3.19" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

const styles = {
  page: {
    backgroundImage: `url(${publicUrl}/component-images/home-background.png)`,
    backgroundColor: "#9ed3e7ff",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    minHeight: "calc(100vh - var(--navbar-height, 76px))",
    width: "100%",
    boxSizing: "border-box",
    overflowX: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
  },
  overlay: {
    padding: "40px",
    width: "90%",
    maxWidth: "390px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  title: {
    textAlign: "center",
    color: "#333",
    marginBottom: "10px",
    fontFamily: "inherit",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "20px",
    paddingLeft: "30px",
    fontSize: "16px",
    borderRadius: "40px",
    border: "1px solid rgb(255, 255, 255)",
    outline: "none",
    transition: "0.3s",
    backgroundColor: "rgba(0, 0, 0, 0)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "black",
    fontFamily: "inherit",
  },
  passwordWrap: {
    position: "relative",
    width: "100%",
  },
  eyeBtn: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: "translateY(-50%)",
    width: 30,
    height: 30,
    border: "none",
    background: "transparent",
    color: "#333",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  button: {
    padding: "16px",
    background: "linear-gradient(90deg,rgb(230, 114, 114),rgb(29, 176, 206))",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "0.3s",
    fontFamily: "inherit",
  },
  message: {
    textAlign: "center",
    color: "#d9534f",
    fontWeight: 500,
    marginTop: "10px",
  },
  successMessage: {
    textAlign: "center",
    color: "#28a745",
    fontWeight: 500,
    marginTop: "10px",
  },
  textLink: {
    color: "#1d5f7a",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    fontWeight: 500,
    fontSize: "15px",
  },
  footerHint: {
    textAlign: "center",
    marginTop: "-8px",
    color: "#333",
    fontSize: "15px",
  },
};

if (window.innerWidth < 768) {
  styles.overlay.width = "85%";
  styles.overlay.padding = "30px";
  styles.input.fontSize = "15px";
  styles.button.fontSize = "15px";
}

if (window.innerWidth < 480) {
  styles.overlay.width = "90%";
  styles.overlay.padding = "20px";
  styles.title.fontSize = "20px";
}
