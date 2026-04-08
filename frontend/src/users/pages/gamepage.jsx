// pages/gamepage.jsx — chỉ tải đúng một game theo gameId (chunk riêng)
import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { sendLessonResultToKilovia, getKiloviaContext } from "../lib/kiloviaBridge";
import { publicUrl } from "../../lib/publicUrl";

const SESSION_KEY = "game_play_state_v1";

const gameLazyMap = {
  game1: lazy(() => import("../components/game1")),
  game2: lazy(() => import("../components/game2")),
  game3: lazy(() => import("../components/game3")),
  game4: lazy(() => import("../components/game4")),
  game5: lazy(() => import("../components/game5")),
  game6: lazy(() => import("../components/game6")),
  game7: lazy(() => import("../components/game7")),
  game8: lazy(() => import("../components/game8")),
  game9: lazy(() => import("../components/game9")),
  game10: lazy(() => import("../components/game10")),
  game11: lazy(() => import("../components/game11")),
  game12: lazy(() => import("../components/game12")),
  game13: lazy(() => import("../components/game13")),
  game14: lazy(() => import("../components/game14")),
  game15: lazy(() => import("../components/game15")),
};

function getKiloviaFromSearch(search) {
  const params = new URLSearchParams(search);
  const token = params.get("kilovia_token");
  const childCode = params.get("ma_tre_em");
  if (!token && !childCode) return null;
  return {
    token,
    lessonName: params.get("lesson_name") || "Game",
    childCode: childCode || null,
  };
}

const gameLabels = {
  game1: "Đường lên đỉnh olympia",
  game2: "Diệt ruồi",
  game3: "Phi tiêu",
  game4: "Vượt chướng ngại vật",
  game5: "Tìm người nói thật",
  game6: "Chém hoa quả",
  game7: "Nhà thám hiểm tài ba",
  game8: "Làm bài giúp Nobita",
  game9: "Dẫn thỏ về hang",
  game10: "Xạ thủ đỉnh cao",
  game11: "Đố vui nhanh tay",
  game12: "Đuổi hình bắt chữ",
  game13: "Tính toán thần tốc",
  game14: "Ai nhanh hơn",
  game15: "Vượt qua thử thách",
};

function GameLoadFallback() {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "#455a64" }}>
      Đang tải game…
    </div>
  );
}

export default function GamePage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [payload, setPayload] = useState(null);
  const [message, setMessage] = useState(null);
  const gameStartTimeRef = useRef(null);

  useEffect(() => {
    const fromUrl = getKiloviaFromSearch(location.search);
    const fromPostMessage = getKiloviaContext();
    const kiloviaFallback =
      fromUrl ||
      (fromPostMessage?.token && {
        ...fromPostMessage,
        lessonName: "Game",
      });

    if (location.state) {
      const merged = {
        ...location.state,
        kilovia: location.state.kilovia || kiloviaFallback,
      };
      setPayload(merged);
      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ gameId, payload: merged, ts: Date.now() })
        );
      } catch (e) {
        console.warn("Không lưu session:", e);
      }
      return;
    }

    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.gameId === gameId && parsed.payload) {
          const merged = {
            ...parsed.payload,
            kilovia: parsed.payload.kilovia || kiloviaFallback,
          };
          setPayload(merged);
          return;
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc sessionStorage:", e);
    }

    if (fromUrl) {
      navigate("/?" + location.search, { replace: true });
      return;
    }

    setMessage("Không tìm thấy dữ liệu chơi. Quay về trang chọn...");
    const t = setTimeout(() => navigate("/", { replace: true }), 1800);
    return () => clearTimeout(t);
  }, [location.state, location.search, gameId, navigate]);

  useEffect(() => {
    if (payload?.kilovia) {
      gameStartTimeRef.current = Date.now();
    }
  }, [payload?.kilovia]);

  const handleLessonComplete = useCallback(
    (score) => {
      if (!payload?.kilovia?.token) return;
      const startAt = gameStartTimeRef.current
        ? new Date(gameStartTimeRef.current).toISOString()
        : new Date().toISOString();
      const endAt = new Date().toISOString();
      sendLessonResultToKilovia({
        token: payload.kilovia.token,
        maTreEm: payload.kilovia.childCode || null,
        score,
        startAt,
        endAt,
      });
    },
    [payload?.kilovia]
  );

  const onLessonComplete = payload?.kilovia ? handleLessonComplete : undefined;

  const displayName =
    payload?.game?.name || gameLabels[gameId] || gameId;

  const pageBg = `${publicUrl}/component-images/home-background.png`;

  const bgFixedLayer = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    backgroundColor: "#b8e0f5",
    backgroundImage: `url(${pageBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    transform: "translateZ(0)",
    backfaceVisibility: "hidden",
  };

  const LazyGame = gameId ? gameLazyMap[gameId] : null;

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={bgFixedLayer} aria-hidden />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 980,
          margin: "0 auto",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        {!payload && message && <div style={{ color: "#37474f" }}>{message}</div>}
        {!payload && !message && (
          <div style={{ color: "#37474f" }}>Đang chuẩn bị dữ liệu...</div>
        )}

        {payload && (
          <div>
            <header style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{displayName}</h2>
              <div style={{ color: "#455a64", fontSize: 13 }}>
                Lớp {payload?.grade?.id} / Dạng{" "}
                {payload?.type?.name || payload?.type?.id} / Bài{" "}
                {payload?.lesson?.name ||
                  payload?.lesson?.id ||
                  payload?.operation?.name ||
                  payload?.operation?.id}
              </div>
            </header>

            <div>
              {LazyGame ? (
                <Suspense fallback={<GameLoadFallback />}>
                  <LazyGame
                    payload={payload}
                    onLessonComplete={onLessonComplete}
                  />
                </Suspense>
              ) : (
                <div style={{ color: "crimson" }}>
                  Giao diện <strong>{gameId}</strong> chưa có — quay về trang chọn.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
