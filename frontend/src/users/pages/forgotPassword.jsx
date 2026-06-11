import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword as forgotPasswordApi } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import { NAVBAR_OFFSET } from "../lib/navbarLayout";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setSubmitting(true);
    setMessage("");
    try {
      const res = await forgotPasswordApi(email);
      setSuccess(true);
      setMessage(
        res.data?.message ||
          "Nếu email tồn tại, chúng tôi đã gửi mã OTP. Chuyển sang trang nhập mã…"
      );
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`, { replace: true });
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Không gửi được email. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <h1 style={styles.title}>Quên mật khẩu</h1>
          <p style={styles.hint}>
            Nhập email đã đăng ký. Chúng tôi sẽ gửi mã OTP 6 số để đặt lại mật khẩu (hết hạn sau 10 phút).
          </p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "Đang gửi…" : "Gửi mã OTP"}
          </button>
          {message && (
            <p style={success ? styles.successMessage : styles.message}>{message}</p>
          )}
          <p style={styles.footerHint}>
            <Link to="/login" style={styles.textLink}>
              Quay lại đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    backgroundImage: `url(${publicUrl}/component-images/home-background.png)`,
    backgroundColor: "#9ed3e7ff",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    height: `calc(100vh - ${NAVBAR_OFFSET}px)`,
    maxHeight: `calc(100vh - ${NAVBAR_OFFSET}px)`,
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: "4px",
    fontFamily: "inherit",
  },
  hint: {
    textAlign: "center",
    color: "#333",
    lineHeight: 1.5,
    fontSize: "15px",
    margin: 0,
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
    backgroundColor: "rgba(0, 0, 0, 0)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "black",
    fontFamily: "inherit",
  },
  button: {
    padding: "16px",
    background: "linear-gradient(90deg,rgb(230, 114, 114),rgb(29, 176, 206))",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "16px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  message: {
    textAlign: "center",
    color: "#d9534f",
    fontWeight: 500,
    marginTop: "4px",
  },
  successMessage: {
    textAlign: "center",
    color: "#28a745",
    fontWeight: 500,
    marginTop: "4px",
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
    marginTop: "-4px",
  },
};

if (window.innerWidth < 768) {
  styles.overlay.width = "85%";
  styles.overlay.padding = "30px";
}

if (window.innerWidth < 480) {
  styles.overlay.width = "90%";
  styles.overlay.padding = "20px";
  styles.title.fontSize = "20px";
}
