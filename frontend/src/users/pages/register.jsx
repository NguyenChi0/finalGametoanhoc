import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { register as registerApi } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

const NAVBAR_OFFSET = 52;

const t = {
  loginFooterHint: "\u0110\u00E3 c\u00F3 t\u00E0i kho\u1EA3n? ",
  loginFooterLink: "\u0110\u0103ng nh\u1EADp ngay",
};

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");

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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      return;
    }
    try {
      const res = await registerApi({
        username,
        password,
        email,
        phone,
      });
      setMessage(res.data.message);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Lỗi khi đăng ký!";
      setMessage(msg);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <form onSubmit={handleRegister} style={styles.form}>
          <h1 style={styles.title}>Đăng ký</h1>
          <input
            type="text"
            placeholder="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            style={styles.input}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            style={styles.input}
          />
          <div style={styles.passwordWrap}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={4}
              style={{ ...styles.input, paddingRight: 54 }}
            />
            <button
              type="button"
              style={styles.eyeBtn}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div style={styles.passwordWrap}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu"
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
          <button type="submit" style={styles.button}>
            Đăng ký
          </button>
          <p style={styles.message}>{message}</p>
          <p style={styles.registerHint}>
            {t.loginFooterHint}
            <Link to="/login" style={styles.textLink}>
              {t.loginFooterLink}
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
    height: `calc(100vh - ${NAVBAR_OFFSET}px)`,
    maxHeight: `calc(100vh - ${NAVBAR_OFFSET}px)`,
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    overscrollBehavior: "none",
    touchAction: "manipulation",
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
