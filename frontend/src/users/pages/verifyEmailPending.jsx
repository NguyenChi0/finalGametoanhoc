import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { resendVerification, verifyEmail } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import { NAVBAR_OFFSET } from "../lib/navbarLayout";

export default function VerifyEmailPending() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const email = (searchParams.get("email") || "").trim();

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState(location.state?.message || "");
  const [success, setSuccess] = useState(Boolean(location.state?.message));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

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

  useEffect(() => {
    if (location.state?.message) {
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.pathname, location.search, location.state?.message, navigate]);

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setSubmitting(true);
    setMessage("");
    try {
      const res = await verifyEmail({ email, otp });
      setSuccess(true);
      setMessage(res.data?.message || "Xác minh thành công.");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Mã OTP không đúng hoặc đã hết hạn.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setMessage("");
    setSuccess(false);
    try {
      await resendVerification(email);
      setSuccess(true);
      setMessage("Đã gửi lại mã OTP. Vui lòng kiểm tra hộp thư.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Không gửi được email. Vui lòng thử lại.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <h1 style={styles.title}>Xác minh email</h1>
        <p style={styles.text}>
          Mã OTP 6 số đã được gửi tới <strong>{email}</strong>. Nhập mã bên dưới (hết hạn sau 10
          phút).
        </p>
        <form onSubmit={handleVerify} style={styles.form}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="Mã OTP 6 số"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            autoComplete="one-time-code"
            style={{ ...styles.input, letterSpacing: "8px", textAlign: "center", fontSize: "22px" }}
          />
          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "Đang xác minh…" : "Xác minh"}
          </button>
        </form>
        <button
          type="button"
          style={styles.secondaryBtn}
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Đang gửi…" : "Gửi lại mã OTP"}
        </button>
        {message && (
          <p style={success ? styles.successMessage : styles.message}>{message}</p>
        )}
        <p style={styles.footerHint}>
          <Link to="/login" style={styles.textLink}>
            Quay lại đăng nhập
          </Link>
        </p>
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
    maxWidth: "420px",
    textAlign: "center",
  },
  title: {
    color: "#333",
    marginBottom: "12px",
    fontSize: "1.5rem",
  },
  text: {
    color: "#333",
    lineHeight: 1.55,
    marginBottom: "20px",
    fontSize: "16px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "16px 24px",
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
    padding: "14px",
    background: "linear-gradient(90deg,rgb(230, 114, 114),rgb(29, 176, 206))",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "16px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  secondaryBtn: {
    marginTop: "12px",
    padding: "10px 18px",
    background: "transparent",
    color: "#1d5f7a",
    border: "1px solid #1d5f7a",
    borderRadius: "24px",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  message: {
    color: "#d9534f",
    fontWeight: 500,
    marginTop: "12px",
  },
  successMessage: {
    color: "#28a745",
    fontWeight: 500,
    marginTop: "12px",
  },
  textLink: {
    color: "#1d5f7a",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    fontWeight: 500,
  },
  footerHint: {
    marginTop: "16px",
  },
};
