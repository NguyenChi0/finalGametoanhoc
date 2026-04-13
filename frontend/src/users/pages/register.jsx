import React, { useState, useEffect } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

const NAVBAR_OFFSET = 52;

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
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
    try {
      const res = await api.post("/register", { username, password, fullname });
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
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={4}
            style={styles.input}
          />
          <button type="submit" style={styles.button}>
            Đăng ký
          </button>
          <p style={styles.message}>{message}</p>
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
    overscrollBehavior: "none",
    touchAction: "manipulation",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    padding: "40px",
    width: "90%",
    maxWidth: "300px",
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
  },
  input: {
    padding: "20px",
    paddingLeft: "30px",
    fontSize: "16px",
    borderRadius: "40px",
    border: "1px solid rgb(255, 255, 255)",
    outline: "none",
    transition: "0.3s",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "black",
    
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
  },
  message: {
    textAlign: "center",
    color: "#d9534f",
    fontWeight: 500,
    marginTop: "10px",
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
