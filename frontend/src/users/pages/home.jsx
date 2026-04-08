// src/pages/home.jsx
import React, { useMemo, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Leaderboard from "../components/leaderboard2";
import ChooseLesson from "../components/chooselesson";
import { externalLoginChild } from "../../api";
import {
  getKiloviaContext,
  setKiloviaContextFromMessage,
} from "../lib/kiloviaBridge";
import { publicUrl } from "../../lib/publicUrl";

const SESSION_KEY = "game_play_state_v1";

/** Origin Kilovia (trang mở popup). Có thể cấu hình qua env hoặc mặc định cho phép. */
const ALLOWED_KILOVIA_ORIGINS = [
  "https://kilovia.com",
  "http://localhost:3000",
  "http://localhost:5173",
  window.location.origin,
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_KILOVIA_ORIGINS.some(
    (allowed) => origin === allowed || origin.endsWith(".kilovia.com")
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [kiloviaFromMessage, setKiloviaFromMessage] = useState(() =>
    getKiloviaContext()
  );

  // Nhận childToken (và optional ma_tre_em) từ Kilovia qua postMessage (khi Kilovia mở gametoanhoc bằng window.open)
  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type !== "KILOVIA_CHILD_TOKEN" || !event.data?.childToken) return;
      if (!isAllowedOrigin(event.origin)) return;
      const childToken = event.data.childToken;
      const explicitMaTreEm = event.data.ma_tre_em || event.data.maTreEm || null;
      setKiloviaContextFromMessage(childToken, explicitMaTreEm);
      setKiloviaFromMessage(getKiloviaContext());
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const kilovia = useMemo(() => {
    const token = searchParams.get("kilovia_token");
    const lessonName = searchParams.get("lesson_name") || "Game";
    const childCode = searchParams.get("ma_tre_em");

    if (token || childCode) {
      return { token, lessonName, childCode };
    }
    if (kiloviaFromMessage?.token) {
      return {
        token: kiloviaFromMessage.token,
        lessonName: "Game",
        childCode: kiloviaFromMessage.childCode ?? null,
      };
    }
    return null;
  }, [searchParams, kiloviaFromMessage]);

  // Nếu có ma_tre_em (từ URL hoặc decode từ token) thì tạo/ghép user trong DB gametoanhoc
  useEffect(() => {
    if (!kilovia?.childCode) return;

    const maTreEm = kilovia.childCode;
    externalLoginChild({ maTreEm })
      .then((data) => {
        if (data && data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      })
      .catch((err) => {
        console.warn("externalLoginChild error:", err);
      });
  }, [kilovia]);

  function persistPlayState(gameId, payload) {
    try {
      const saved = { gameId, payload, ts: Date.now() };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(saved));
    } catch (e) {
      console.warn("Không lưu được state chơi:", e);
    }
  }

  function handleStartGame(gameInterface, payload) {
    persistPlayState(gameInterface, payload);
    navigate(`/game/${gameInterface}`, { state: payload });
  }

  const pageBg = `${publicUrl}/component-images/home-background.png`;
  const bgFixedLayer = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    backgroundColor: "#9ed3e7ff",
    backgroundImage: `url(${pageBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    transform: "translateZ(0)",
    backfaceVisibility: "hidden",
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={bgFixedLayer} aria-hidden />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 1500,
            margin: "24px auto",
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          {/* Main content - left */}
          <div style={{ flex: "1 1 500px", minWidth: 0 }}>
            <ChooseLesson onStartGame={handleStartGame} kilovia={kilovia} />
          </div>

          {/* Leaderboard - right, wraps below on small screens */}
          <div style={{ flex: "0 1 600px", minWidth: 250 }}>
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
