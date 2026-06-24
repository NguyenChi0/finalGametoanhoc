import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api, { resendVerification } from "../../api";
import { isAdminUser } from "../../admin/auth";
import { publicUrl } from "../../lib/publicUrl";

import { clearItemLoadout } from "../lib/playSession";

const t = {
  loginFail: "\u0110\u0103ng nh\u1EADp th\u1EA5t b\u1EA1i. Ki\u1EC3m tra backend.",
  loginOk: "\u0110\u0103ng nh\u1EADp th\u00E0nh c\u00F4ng",
  loginTitle: "\u0110\u0103ng nh\u1EADp",
  usernamePh: "T\u00EAn \u0111\u0103ng nh\u1EADp",
  passwordPh: "M\u1EADt kh\u1EA9u",
  forgot: "Qu\u00EAn m\u1EADt kh\u1EA9u?",
  submit: "\u0110\u0103ng nh\u1EADp",
  wrongCreds:
    "Sai t\u00EAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u!",
  registerHint: "Ch\u01B0a c\u00F3 t\u00E0i kho\u1EA3n? ",
  registerLink: "\u0110\u0103ng k\u00FD ngay",
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state?.message, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setUnverifiedEmail("");
    setNeedsVerification(false);
    try {
      const res = await api.post("/login", { username, password });
      const { user, token, message: msg } = res.data || {};

      if (!user || !token) {
        setMessage(t.loginFail);
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      clearItemLoadout();
      setMessage(msg || t.loginOk);
      if (isAdminUser(user)) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      if (err.response?.status === 403 && data?.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(data.email || "");
        setNeedsVerification(true);
        setMessage(data.message || "Tài khoản chưa được xác minh.");
        return;
      }
      setUnverifiedEmail("");
      setNeedsVerification(false);
      const msg = data?.message || t.wrongCreds;
      setMessage(msg);
    }
  };

  const goToVerifyAccount = async () => {
    if (!unverifiedEmail) return;
    setSendingOtp(true);
    try {
      await resendVerification(unverifiedEmail);
      navigate(
        `/verify-email-pending?email=${encodeURIComponent(unverifiedEmail)}`,
        {
          state: { message: "Đã gửi mã OTP đến email của bạn." },
        }
      );
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Không gửi được mã OTP. Vui lòng thử lại."
      );
    } finally {
      setSendingOtp(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <form onSubmit={handleLogin} style={styles.form}>
          <h1 style={styles.title}>{t.loginTitle}</h1>
          <div style={styles.inputWrap}>
            <span style={styles.inputIcon} aria-hidden>
              <UserIcon />
            </span>
            <input
              type="text"
              placeholder={t.usernamePh}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={styles.inputWithIcon}
            />
          </div>
          <div style={styles.passwordWrap}>
            <span style={styles.inputIcon} aria-hidden>
              <LockIcon />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t.passwordPh}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={styles.inputWithIconPassword}
            />
            <button
              type="button"
              style={styles.eyeBtn}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? "\u1EA8n m\u1EADt kh\u1EA9u"
                  : "Hi\u1EC7n m\u1EADt kh\u1EA9u"
              }
              title={
                showPassword
                  ? "\u1EA8n m\u1EADt kh\u1EA9u"
                  : "Hi\u1EC7n m\u1EADt kh\u1EA9u"
              }
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div style={styles.forgotRow}>
            <Link to="/forgot-password" style={styles.textLink}>
              {t.forgot}
            </Link>
          </div>
          <button type="submit" style={styles.button}>
            <LogInIcon />
            <span>{t.submit}</span>
          </button>
          <p style={styles.message}>{message}</p>
          {needsVerification && (
            <div style={styles.verifyBlock}>
              <button
                type="button"
                style={styles.verifyBtn}
                onClick={goToVerifyAccount}
                disabled={sendingOtp || !unverifiedEmail}
              >
                {sendingOtp ? "Đang gửi mã OTP…" : "Xác minh tài khoản"}
              </button>
            </div>
          )}
          <p style={styles.registerHint}>
            {t.registerHint}
            <Link to="/register" style={styles.textLink}>
              {t.registerLink}
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

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21a8 8 0 10-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function LogInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
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
  inputWrap: {
    position: "relative",
    width: "100%",
  },
  inputIcon: {
    position: "absolute",
    left: 18,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#555",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 1,
  },
  inputWithIcon: {
    width: "100%",
    boxSizing: "border-box",
    padding: "20px 20px 20px 50px",
    fontSize: "16px",
    borderRadius: "40px",
    border: "none",
    outline: "none",
    transition: "0.3s",
    backgroundColor: "rgba(0, 0, 0, 0)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "black",
    fontFamily: "inherit",
    boxShadow: "inset 0 0 0 1px rgb(255, 255, 255)",
  },
  inputWithIconPassword: {
    width: "100%",
    boxSizing: "border-box",
    padding: "20px 54px 20px 50px",
    fontSize: "16px",
    borderRadius: "40px",
    border: "none",
    outline: "none",
    transition: "0.3s",
    backgroundColor: "rgba(0, 0, 0, 0)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "black",
    fontFamily: "inherit",
    boxShadow: "inset 0 0 0 1px rgb(255, 255, 255)",
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
  forgotRow: {
    display: "flex",
    justifyContent: "flex-start",
    marginTop: "-8px",
    marginBottom: "4px",
  },
  textLink: {
    color: "#1d5f7a",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    fontWeight: 500,
    fontSize: "15px",
  },
  registerHint: {
    textAlign: "center",
    marginTop: "-8px",
    color: "#333",
    fontSize: "15px",
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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
  },
  message: {
    textAlign: "center",
    color: "#d9534f",
    fontWeight: 500,
    marginTop: "10px",
  },
  verifyBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "4px",
  },
  verifyBtn: {
    padding: "10px 18px",
    background: "transparent",
    color: "#1d5f7a",
    border: "1px solid #1d5f7a",
    borderRadius: "24px",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

// Responsive inline style tweaks
// Vi inline styles khong co media query, ta them logic JS
// de tu dieu chinh theo kich thuoc man hinh
if (window.innerWidth < 768) {
  styles.overlay.width = "85%";
  styles.overlay.padding = "30px";
  styles.inputWithIcon.fontSize = "15px";
  styles.inputWithIconPassword.fontSize = "15px";
  styles.button.fontSize = "15px";
}

if (window.innerWidth < 480) {
  styles.overlay.width = "90%";
  styles.overlay.padding = "20px";
  styles.title.fontSize = "20px";
}
