import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { isAdminUser } from "../../admin/auth";
import { publicUrl } from "../../lib/publicUrl";

const NAVBAR_OFFSET = 52;

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
  const navigate = useNavigate();

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

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/login", { username, password });
      const { user, token, message: msg } = res.data || {};

      if (!user || !token) {
        setMessage(t.loginFail);
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setMessage(msg || t.loginOk);
      if (isAdminUser(user)) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || t.wrongCreds;
      setMessage(msg);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <form onSubmit={handleLogin} style={styles.form}>
          <h1 style={styles.title}>{t.loginTitle}</h1>
          <input
            type="text"
            placeholder={t.usernamePh}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            style={styles.input}
          />
          <div style={styles.passwordWrap}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t.passwordPh}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ ...styles.input, paddingRight: 54 }}
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
            {t.submit}
          </button>
          <p style={styles.message}>{message}</p>
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
    border: "4px solid rgba(255,255,255,0.3)",
    outline: "none",
    transition: "0.3s",
    border: "1px solid rgb(255, 255, 255)",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
  },
  message: {
    textAlign: "center",
    color: "#d9534f",
    fontWeight: 500,
    marginTop: "10px",
  },
};

// Responsive inline style tweaks
// Vi inline styles khong co media query, ta them logic JS
// de tu dieu chinh theo kich thuoc man hinh
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
