import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { publicUrl } from "../../lib/publicUrl";
import { saveLessonProgress } from "../../api";
import { persistPregamePayload } from "../lib/playSession";
import {
  buildNextLessonPregamePayload,
  findNextLessonInType,
} from "../lib/nextLesson";
import "../styles/userCtaFlashShine.css";

function ReplayLineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12a9 9 0 0 1 15.5-6.36M21 12a9 9 0 0 1-15.5 6.36"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 4v5h5M21 20v-5h-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeLineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NextLessonLineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const resultBtnBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  color: "white",
  padding: "14px 32px",
  border: "none",
  borderRadius: 9999,
  cursor: "pointer",
  fontSize: "1.08em",
  fontWeight: "bold",
  fontFamily: "inherit",
};

const lessonCompleteBg = `${publicUrl}/component-images/lessonCompleteBackground.png`;

const CONFETTI_COLORS = [
  "#fba2d0",
  "#c688eb",
  "#ffc4a4",
  "#6c7ee1",
  "#c9a227",
  "#7ec8a8",
  "#ff9a76",
  "#ffd166",
];

function createConfettiPiece(width, height) {
  return {
    x: Math.random() * width,
    y: -Math.random() * height * 0.4 - 12,
    w: 6 + Math.random() * 8,
    h: 10 + Math.random() * 14,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.12,
    vy: 1.2 + Math.random() * 2.2,
    vx: (Math.random() - 0.5) * 1.4,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.02 + Math.random() * 0.03,
  };
}

function LessonCompleteConfetti() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let cancelled = false;
    let spawnTimer = 0;
    const spawnDuration = 2200;
    const maxPieces = 48;
    const pieces = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(resize)
      : null;
    ro?.observe(canvas.parentElement);
    window.addEventListener("resize", resize);

    let lastTime = performance.now();

    const tick = (now) => {
      if (cancelled) return;
      const dt = Math.min((now - lastTime) / 16.67, 2);
      lastTime = now;

      spawnTimer += dt * 16.67;
      if (spawnTimer < spawnDuration && pieces.length < maxPieces) {
        if (Math.random() < 0.35) {
          pieces.push(createConfettiPiece(canvas.clientWidth, canvas.clientHeight));
        }
      }

      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      for (let i = pieces.length - 1; i >= 0; i -= 1) {
        const p = pieces[i];
        p.sway += p.swaySpeed * dt;
        p.x += (p.vx + Math.sin(p.sway) * 0.6) * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.88;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        if (p.y > canvas.clientHeight + 24) {
          pieces.splice(i, 1);
        }
      }

      if (pieces.length > 0 || spawnTimer < spawnDuration) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      ro?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="lesson-complete-confetti"
      aria-hidden
    />
  );
}

/**
 * Màn kết thúc bài học dùng chung (nền lessonCompleteBackground, 3 nút + Bài tiếp).
 */
export default function LessonCompleteScreen({
  payload,
  correctCount,
  totalQuestions,
  onReplay,
  onHome,
  homeLabel = "Về trang chủ",
  shellStyle = {},
  height = "75vh",
  fullBleed = false,
}) {
  const navigate = useNavigate();
  const viewportHeight = fullBleed
    ? "calc(100vh - var(--navbar-height, 76px))"
    : height;
  const [nextLessonAvailable, setNextLessonAvailable] = useState(false);
  const [nextLessonLoading, setNextLessonLoading] = useState(false);
  const [nextLessonError, setNextLessonError] = useState(null);
  const progressSavedRef = useRef(false);

  const isPerfect = correctCount === totalQuestions;
  const goHome =
    onHome ||
    (() => {
      navigate("/", { replace: true });
    });

  useEffect(() => {
    if (payload?.reviewMode) {
      setNextLessonAvailable(false);
      return undefined;
    }
    if (payload?.type?.id == null || payload?.lesson?.id == null) {
      setNextLessonAvailable(false);
      return undefined;
    }
    let cancelled = false;
    setNextLessonError(null);
    void (async () => {
      try {
        const next = await findNextLessonInType(payload.type.id, payload.lesson.id);
        if (!cancelled) setNextLessonAvailable(Boolean(next));
      } catch {
        if (!cancelled) setNextLessonAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload?.reviewMode, payload?.type?.id, payload?.lesson?.id]);

  useEffect(() => {
    const userId = payload?.user?.id;
    const lessonId = payload?.lesson?.id;
    const gradeId = payload?.grade?.id;
    const typeId = payload?.type?.id;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;

    if (
      payload?.reviewMode ||
      progressSavedRef.current ||
      !token ||
      !userId ||
      lessonId == null ||
      gradeId == null ||
      typeId == null ||
      !Number.isFinite(Number(totalQuestions)) ||
      Number(totalQuestions) <= 0
    ) {
      return undefined;
    }

    progressSavedRef.current = true;

    void saveLessonProgress({
      lessonId: Number(lessonId),
      gradeId: Number(gradeId),
      typeId: Number(typeId),
      correctCount: Math.max(0, Math.floor(Number(correctCount) || 0)),
      totalCount: Math.floor(Number(totalQuestions)),
      gameId: payload?.game?.id || null,
    }).catch((err) => {
      progressSavedRef.current = false;
      console.warn("Không lưu được tiến độ bài học:", err);
    });

    return undefined;
  }, [
    payload?.user?.id,
    payload?.lesson?.id,
    payload?.grade?.id,
    payload?.type?.id,
    payload?.game?.id,
    correctCount,
    totalQuestions,
  ]);

  useEffect(() => {
    if (!fullBleed) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [fullBleed]);

  async function handleGoNextLesson() {
    setNextLessonError(null);
    setNextLessonLoading(true);
    try {
      const nextPayload = await buildNextLessonPregamePayload(payload);
      if (!nextPayload) {
        setNextLessonAvailable(false);
        setNextLessonError("Không còn bài tiếp theo trong chủ đề này.");
        return;
      }
      persistPregamePayload(nextPayload);
      navigate("/play-setup", { state: nextPayload });
    } catch (err) {
      setNextLessonError(
        err?.message || "Không tải được bài tiếp theo. Vui lòng thử lại."
      );
    } finally {
      setNextLessonLoading(false);
    }
  }

  return (
    <div
      className={`lesson-complete-shell${fullBleed ? " lesson-complete-shell--full-bleed" : ""}`}
      style={{
        ...shellStyle,
        ...(fullBleed
          ? { overflow: "hidden" }
          : { minHeight: viewportHeight, height: viewportHeight }),
      }}
    >
      <style>{`
        .lesson-complete-shell:not(.lesson-complete-shell--full-bleed) {
          min-height: ${viewportHeight} !important;
          height: ${viewportHeight} !important;
          max-height: ${viewportHeight} !important;
        }
        .lesson-complete-shell--full-bleed {
          position: fixed;
          top: var(--navbar-height, 76px);
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: hidden;
          z-index: 30;
        }
        .lesson-complete-shell .lesson-complete-bg {
          position: relative;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          overflow: hidden;
          border-radius: 0 !important;
          box-sizing: border-box;
          padding-top: clamp(20px, 4vh, 40px);
        }
        .lesson-complete-shell:not(.lesson-complete-shell--full-bleed) .lesson-complete-bg {
          min-height: ${viewportHeight};
          height: ${viewportHeight};
          max-height: ${viewportHeight};
        }
        .lesson-complete-shell--full-bleed .lesson-complete-bg {
          position: absolute;
          inset: 0;
          height: 100%;
          min-height: 0 !important;
          max-height: none !important;
          padding-top: clamp(20px, 7vh, 64px);
        }
        .lesson-complete-shell--full-bleed .lesson-complete-scene {
          background-position: center bottom;
        }
        .lesson-complete-shell .lesson-complete-scene {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .lesson-complete-shell .lesson-complete-confetti {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }
        .lesson-complete-shell .lesson-complete-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: min(1120px, 98%);
          padding: clamp(16px, 3vw, 32px) clamp(24px, 4vw, 48px);
          box-sizing: border-box;
          text-align: center;
          color: #4a5080;
          border-radius: 0 !important;
        }
        .lesson-complete-shell .lesson-complete-title {
          margin: 0 0 24px;
        }
        .lesson-complete-shell .lesson-complete-body p {
          margin: 0 0 12px;
        }
        .lesson-complete-shell .lesson-complete-body p:last-child {
          margin-bottom: 0;
        }
        .lesson-complete-shell .lesson-complete-actions {
          display: flex;
          gap: 18px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .lesson-complete-shell .lesson-complete-btn {
          border-radius: 9999px !important;
          min-width: clamp(148px, 28vw, 200px);
          box-shadow: 0 4px 14px rgba(74, 80, 128, 0.16);
          transition: filter 0.2s ease, transform 0.15s ease;
        }
        .lesson-complete-shell .lesson-complete-btn:hover:not(:disabled) {
          filter: brightness(1.06);
          transform: translateY(-1px);
        }
        .lesson-complete-shell .lesson-complete-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .lesson-complete-shell .lesson-complete-btn .user-cta-flash__label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        @media (min-width: 768px) {
          .lesson-complete-shell .lesson-complete-title {
            font-size: clamp(2.15rem, 3.4vw, 2.85rem) !important;
            margin-bottom: clamp(22px, 3vw, 32px) !important;
          }
          .lesson-complete-shell .lesson-complete-body {
            margin-bottom: clamp(22px, 3vw, 36px) !important;
          }
          .lesson-complete-shell .lesson-complete-body p:first-child {
            font-size: clamp(1.35rem, 2.2vw, 1.6rem) !important;
          }
          .lesson-complete-shell .lesson-complete-body p:last-child {
            font-size: clamp(1.2rem, 2vw, 1.45rem) !important;
          }
          .lesson-complete-shell .lesson-complete-actions {
            gap: clamp(18px, 2.5vw, 28px) !important;
          }
          .lesson-complete-shell .lesson-complete-actions button {
            font-size: clamp(1.1rem, 1.6vw, 1.25rem) !important;
            padding: clamp(16px, 2vw, 22px) clamp(28px, 4vw, 44px) !important;
            min-height: 56px !important;
          }
        }
        @media (max-width: 767px) {
          .lesson-complete-shell:not(.lesson-complete-shell--full-bleed) {
            min-height: ${viewportHeight} !important;
            height: ${viewportHeight} !important;
            max-height: ${viewportHeight} !important;
          }
          .lesson-complete-shell:not(.lesson-complete-shell--full-bleed) .lesson-complete-bg {
            min-height: ${viewportHeight};
            height: ${viewportHeight};
            max-height: ${viewportHeight};
          }
          .lesson-complete-shell--full-bleed .lesson-complete-bg {
            padding-top: clamp(16px, 6vh, 48px);
          }
          .lesson-complete-shell .lesson-complete-title {
            font-size: clamp(2.05rem, 8.5vw, 2.85rem) !important;
            margin-bottom: clamp(20px, 5vw, 30px) !important;
            line-height: 1.2 !important;
          }
          .lesson-complete-shell .lesson-complete-body {
            margin-bottom: clamp(22px, 6vw, 36px) !important;
          }
          .lesson-complete-shell .lesson-complete-body p {
            font-size: clamp(1.25rem, 5.2vw, 1.5rem) !important;
            margin-bottom: clamp(10px, 3vw, 14px) !important;
          }
          .lesson-complete-shell .lesson-complete-body p:last-child {
            font-size: clamp(1.15rem, 4.8vw, 1.4rem) !important;
          }
          .lesson-complete-shell .lesson-complete-actions {
            gap: clamp(14px, 4vw, 22px) !important;
          }
          .lesson-complete-shell .lesson-complete-actions button {
            font-size: clamp(1.12rem, 4.8vw, 1.35rem) !important;
            padding: clamp(16px, 4.5vw, 22px) clamp(26px, 7vw, 40px) !important;
            min-height: 58px !important;
          }
        }
      `}</style>
      <div className="lesson-complete-bg">
        <div
          className="lesson-complete-scene"
          aria-hidden
          style={{ backgroundImage: `url(${lessonCompleteBg})` }}
        />
        <LessonCompleteConfetti />
        <div className="lesson-complete-content">
          <h2
            className="lesson-complete-title"
            style={{
              color: isPerfect ? "#c9a227" : "#6c7ee1",
              fontSize: "clamp(1.9rem, 4vw, 2.6rem)",
              fontWeight: 800,
            }}
          >
            {payload?.reviewMode ? "Hoàn thành ôn tập" : "Hoàn thành bài học"}
          </h2>

          <div className="lesson-complete-body" style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "1.35em", fontWeight: 600 }}>
              + {correctCount} điểm đạt được
            </p>
            <p style={{ fontSize: "1.25em", color: "#6c7ee1", fontWeight: 700 }}>
              Đúng : {correctCount}/{totalQuestions}
            </p>
          </div>

          {nextLessonError && (
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "0.95em",
                color: "#c62828",
                fontWeight: 600,
              }}
              role="alert"
            >
              {nextLessonError}
            </p>
          )}

          <div className="lesson-complete-actions">
            <button
              type="button"
              className="lesson-complete-btn user-cta-flash"
              onClick={onReplay}
              style={{
                ...resultBtnBase,
                background: "#fba2d0",
                color: "#4a5080",
              }}
            >
              <span className="user-cta-flash__label">
                <ReplayLineIcon />
                <span>Chơi lại</span>
              </span>
            </button>
            <button
              type="button"
              className="lesson-complete-btn user-cta-flash"
              onClick={goHome}
              style={{
                ...resultBtnBase,
                background: "#c688eb",
              }}
            >
              <span className="user-cta-flash__label">
                <HomeLineIcon />
                <span>{homeLabel}</span>
              </span>
            </button>
            {nextLessonAvailable && !payload?.reviewMode && (
              <button
                type="button"
                className="lesson-complete-btn user-cta-flash"
                onClick={handleGoNextLesson}
                disabled={nextLessonLoading}
                style={{
                  ...resultBtnBase,
                  background: "#ffc4a4",
                  color: "#4a5080",
                  opacity: nextLessonLoading ? 0.75 : 1,
                }}
              >
                <span className="user-cta-flash__label">
                  <NextLessonLineIcon />
                  <span>{nextLessonLoading ? "Đang tải…" : "Bài tiếp"}</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
