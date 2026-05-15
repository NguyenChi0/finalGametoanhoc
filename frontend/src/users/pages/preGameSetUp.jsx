import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GAME_OPTIONS } from "../lib/gameInterfaces";
import {
  persistPlayState,
  readPregamePayload,
} from "../lib/playSession";

function isValidPlayPayload(p) {
  if (!p || typeof p !== "object") return false;
  if (!p.lesson || p.lesson.id == null) return false;
  if (!Array.isArray(p.questions)) return false;
  return true;
}

const THUMB_COLORS = ["#92B9E3", "#6C7EE1", "#FFC4A4", "#FBA2D0", "#C688EB", "#B8D4F0"];

function thumbColorForLesson(lessonId) {
  const s = String(lessonId ?? "0");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return THUMB_COLORS[hash % THUMB_COLORS.length];
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#6B7099" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#6B7099" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#6B7099" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#6B7099" />
    </svg>
  );
}

export default function PreGameSetUp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [gameId, setGameId] = useState("game1");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const fromNav = location.state;
    if (isValidPlayPayload(fromNav)) {
      setPayload(fromNav);
      setMissing(false);
      return;
    }
    const fromSession = readPregamePayload();
    if (isValidPlayPayload(fromSession)) {
      setPayload(fromSession);
      setMissing(false);
      return;
    }
    setPayload(null);
    setMissing(true);
  }, [location.state]);

  const lessonMeta = useMemo(() => {
    if (!payload) return null;
    const gradeLabel = payload.grade?.id != null ? `Khối ${payload.grade.id}` : null;
    const typeName = payload.type?.name || (payload.type?.id != null ? `Chủ đề ${payload.type.id}` : null);
    const lessonName = payload.lesson?.name || `Bài ${payload.lesson?.id ?? "—"}`;
    const title = typeName ? `${typeName}: ${lessonName}` : lessonName;
    const questionCount = payload.questions?.length ?? 0;
    const description =
      questionCount > 0
        ? `Sắp xếp số phạm vi 100`
        : "Chưa có câu hỏi cho bài học này.";
    const thumbColor = thumbColorForLesson(payload.lesson?.id);
    return {
      title,
      description,
      gradeLabel,
      typeName,
      questionCount,
      thumbColor,
      courseName: typeName || gradeLabel || "Toán học",
    };
  }, [payload]);

  const handlePlay = () => {
    if (!payload || !isValidPlayPayload(payload)) return;
    persistPlayState(gameId, payload);
    navigate(`/game/${gameId}`, { state: payload });
  };

  return (
    <>
      <style>{`
        .pregame-page {
          min-height: 100vh;
          background: #f7f8fa;
          padding: clamp(20px, 4vw, 48px) clamp(16px, 4vw, 32px) 56px;
          box-sizing: border-box;
        }
        .pregame-inner {
          max-width: 960px;
          margin: 0 auto;
        }
        .pregame-card {
          display: flex;
          gap: clamp(20px, 3vw, 32px);
          align-items: stretch;
          background: #fff;
          border-radius: 16px;
          padding: clamp(20px, 3vw, 28px);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid #e8eaed;
        }
        .pregame-thumb {
          flex: 0 0 clamp(140px, 32vw, 220px);
          width: clamp(140px, 32vw, 220px);
          aspect-ratio: 1;
          border-radius: 14px;
          align-self: flex-start;
        }
        .pregame-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pregame-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: #6b7099;
          font-weight: 600;
        }
        .pregame-title {
          margin: 0;
          font-size: clamp(1.35rem, 3.5vw, 1.75rem);
          font-weight: 700;
          color: #1a1d26;
          line-height: 1.25;
        }
        .pregame-desc {
          margin: 0;
          font-size: 0.95rem;
          color: #5c6370;
          line-height: 1.5;
        }
        .pregame-course {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 4px;
        }
        .pregame-course-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .pregame-course-kicker {
          font-size: 0.75rem;
          color: #6b7099;
          margin-bottom: 2px;
        }
        .pregame-course-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1a1d26;
        }
        .pregame-actions {
          margin-top: 24px;
          background: #fff;
          border-radius: 16px;
          padding: 20px 24px;
          border: 1px solid #e8eaed;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        }
        .pregame-actions-label {
          display: block;
          font-weight: 700;
          margin-bottom: 8px;
          color: #1a1d26;
          font-size: 0.9rem;
        }
        .pregame-select {
          width: 100%;
          max-width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #d8dce3;
          font-size: 0.95rem;
          margin-bottom: 16px;
          box-sizing: border-box;
          background: #fff;
          color: #1a1d26;
        }
        .pregame-btns {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pregame-btn-primary {
          flex: 1 1 160px;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          background: #6c7ee1;
          color: #fff;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
        }
        .pregame-btn-primary:hover {
          background: #5a6ed4;
        }
        .pregame-btn-secondary {
          flex: 1 1 120px;
          padding: 14px 20px;
          border-radius: 12px;
          border: 1px solid #d8dce3;
          background: #fff;
          color: #4a5080;
          font-weight: 600;
          cursor: pointer;
        }
        .pregame-missing {
          text-align: center;
          padding: 48px 16px;
          color: #37474f;
        }
        @media (max-width: 640px) {
          .pregame-card {
            flex-direction: column;
          }
          .pregame-thumb {
            width: 100%;
            flex: none;
            max-width: 280px;
            margin: 0 auto;
          }
        }
      `}</style>

      <div className="pregame-page">
        <div className="pregame-inner">
          {missing && (
            <div className="pregame-missing">
              <p>Không có dữ liệu bài học. Vui lòng chọn lại từ trang chủ.</p>
              <button type="button" className="pregame-btn-secondary" onClick={() => navigate("/lessons")}>
                Về trang chủ
              </button>
            </div>
          )}

          {!missing && payload && lessonMeta && (
            <>
              <article className="pregame-card">
                <div
                  className="pregame-thumb"
                  style={{ background: lessonMeta.thumbColor }}
                  role="img"
                  aria-label="Ảnh minh họa bài học (đang cập nhật)"
                />
                <div className="pregame-body">
                  <div className="pregame-brand">
                    <GridIcon />
                    <span>Game toán học</span>
                  </div>
                  <h1 className="pregame-title">{lessonMeta.title}</h1>
                  <p className="pregame-desc">{lessonMeta.description}</p>

                  <div className="pregame-course">
                    <div
                      className="pregame-course-icon"
                      style={{ background: lessonMeta.thumbColor }}
                      aria-hidden
                    />
                    <div>
                      <div className="pregame-course-kicker">Nằm trong khoá học</div>
                      <div className="pregame-course-name">{lessonMeta.courseName}</div>
                    </div>
                  </div>
                </div>
              </article>

              <section className="pregame-actions" aria-label="Cài đặt trước khi chơi">
                <label htmlFor="pregame-interface" className="pregame-actions-label">
                  Chọn giao diện game
                </label>
                <select
                  id="pregame-interface"
                  className="pregame-select"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                >
                  {GAME_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <div className="pregame-btns">
                  <button type="button" className="pregame-btn-primary" onClick={handlePlay}>
                    Chơi
                  </button>
                  <button type="button" className="pregame-btn-secondary" onClick={() => navigate("/lessons")}>
                    Quay lại
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
