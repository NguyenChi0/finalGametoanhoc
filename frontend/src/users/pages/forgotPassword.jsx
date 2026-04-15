import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { publicUrl } from "../../lib/publicUrl";

const NAVBAR_OFFSET = 52;

const t = {
  title: "Qu\u00EAn m\u1EADt kh\u1EA9u",
  body:
    "Hi\u1EC7n ch\u01B0a c\u00F3 ch\u1EE9c n\u0103ng \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u t\u1EF1 \u0111\u1ED9ng. Vui l\u00F2ng li\u00EAn h\u1EC7 qu\u1EA3n tr\u1ECB vi\u00EAn ho\u1EB7c b\u1ED9 ph\u1EADn h\u1ED7 tr\u1EE3 \u0111\u1EC3 \u0111\u01B0\u1EE3c c\u1EA5p l\u1EA1i m\u1EADt kh\u1EA9u.",
  back: "Quay l\u1EA1i \u0111\u0103ng nh\u1EADp",
};

export default function ForgotPassword() {
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

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <h1 style={styles.title}>{t.title}</h1>
        <p style={styles.text}>{t.body}</p>
        <Link to="/login" style={styles.backLink}>
          {t.back}
        </Link>
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
    textAlign: "center",
  },
  title: {
    color: "#333",
    marginBottom: "16px",
    fontSize: "1.5rem",
  },
  text: {
    color: "#333",
    lineHeight: 1.55,
    marginBottom: "24px",
    fontSize: "16px",
  },
  backLink: {
    color: "#1d5f7a",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    fontWeight: 500,
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
