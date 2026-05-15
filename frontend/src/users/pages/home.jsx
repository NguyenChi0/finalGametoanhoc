import React from "react";
import { Link } from "react-router-dom";
import Leaderboard from "../components/leaderboard";
import { publicUrl } from "../../lib/publicUrl";

export default function Home() {
  const pageBg = `${publicUrl}/component-images/home-background.png`;

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundColor: "#9ed3e7ff",
          backgroundImage: `url(${pageBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          padding: "32px 20px 56px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          <section
            style={{
              textAlign: "center",
              background: "rgba(255,255,255,0.92)",
              borderRadius: 20,
              padding: "28px 24px",
              width: "100%",
              maxWidth: 560,
              boxShadow: "0 8px 32px rgba(74, 80, 128, 0.12)",
            }}
          >
            <h1
              style={{
                margin: "0 0 12px",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                color: "#4a5080",
              }}
            >
              Game toán học
            </h1>
            <p style={{ margin: "0 0 20px", color: "#6b7099", lineHeight: 1.5 }}>
              Chọn khối, chủ đề và bài học để bắt đầu luyện tập.
            </p>
            <Link
              to="/lessons"
              style={{
                display: "inline-block",
                padding: "14px 28px",
                borderRadius: 12,
                background: "#6c7ee1",
                color: "#fff",
                fontWeight: 800,
                textDecoration: "none",
                fontSize: "1.05rem",
              }}
            >
              Chọn bài học
            </Link>
          </section>

          <div style={{ width: "100%" }}>
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
