// pages/gamepage.jsx — chỉ tải đúng một game theo gameId (chunk riêng)
import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getItemEffects } from "../../api";
import { sendLessonResultToKilovia, getKiloviaContext } from "../lib/kiloviaBridge";
import { publicUrl } from "../../lib/publicUrl";
import { GAME_LABELS } from "../lib/gameInterfaces";
import { SESSION_KEY } from "../lib/playSession";

const gameLazyMap = {
  game1: lazy(() => import("../components/game1")),
  game2: lazy(() => import("../components/game2")),
  game3: lazy(() => import("../components/game3")),
  game4: lazy(() => import("../components/game4")),
  game5: lazy(() => import("../components/game5")),
  game6: lazy(() => import("../components/game6")),
  game10: lazy(() => import("../components/game10")),
  game11: lazy(() => import("../components/game11")),
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

const EMPTY_ITEM_EFFECTS = {
  lessonBonusPerComplete: 0,
  hintQuestionsPerLesson: 0,
  hintsRemaining: 0,
};

async function enrichPayloadWithItemEffects(base) {
  if (!base) return null;
  if (base.reviewMode) {
    return { ...base, itemEffects: { ...EMPTY_ITEM_EFFECTS }, selectedItemIds: [] };
  }
  if (!localStorage.getItem("token")) return base;
  const selectedItemIds = Array.isArray(base.selectedItemIds)
    ? base.selectedItemIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
        .slice(0, 3)
    : [];
  try {
    const data = await getItemEffects(selectedItemIds);
    const hintN = Number(data?.hintQuestionsPerLesson) || 0;
    const bonus = Number(data?.lessonBonusPerComplete) || 0;
    return {
      ...base,
      selectedItemIds,
      itemEffects: {
        lessonBonusPerComplete: bonus,
        hintQuestionsPerLesson: hintN,
        hintsRemaining: hintN,
      },
    };
  } catch (e) {
    console.warn("Không tải item-effects:", e);
    return {
      ...base,
      selectedItemIds,
      itemEffects: { ...EMPTY_ITEM_EFFECTS },
    };
  }
}

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
    let cancelled = false;
    let redirectTimer;

    async function resolvePayload() {
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
        const enriched = await enrichPayloadWithItemEffects(merged);
        if (cancelled) return;
        setPayload(enriched);
        try {
          sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ gameId, payload: enriched, ts: Date.now() })
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
            const enriched = await enrichPayloadWithItemEffects(merged);
            if (cancelled) return;
            setPayload(enriched);
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
      redirectTimer = setTimeout(() => navigate("/", { replace: true }), 1800);
    }

    resolvePayload();
    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
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
    payload?.game?.name || GAME_LABELS[gameId] || gameId;

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
  const isFullBleedGame =
    gameId === "game1" ||
    gameId === "game2" ||
    gameId === "game3" ||
    gameId === "game4" ||
    gameId === "game5" ||
    gameId === "game6" ||
    gameId === "game10" ||
    gameId === "game11";

  return (
    <div
      style={{
        position: "relative",
        minHeight: isFullBleedGame ? 0 : "100vh",
        height: isFullBleedGame ? "calc(100vh - var(--navbar-height, 76px))" : undefined,
        overflow: isFullBleedGame ? "hidden" : undefined,
      }}
    >
      <div style={bgFixedLayer} aria-hidden />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: isFullBleedGame ? "100%" : 980,
          margin: "0 auto",
          padding: isFullBleedGame ? 0 : 16,
          boxSizing: "border-box",
        }}
      >
        {!payload && message && <div style={{ color: "#37474f" }}>{message}</div>}
        {!payload && !message && (
          <div style={{ color: "#37474f" }}>Đang chuẩn bị dữ liệu...</div>
        )}

        {payload && (
          <div>
            {!isFullBleedGame && (
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
            )}

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
