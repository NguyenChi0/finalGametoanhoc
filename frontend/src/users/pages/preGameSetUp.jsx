import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getLessons, getTypes, lessonImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import { GAME_OPTIONS } from "../lib/gameInterfaces";
import {
  persistPlayState,
  persistPregamePayload,
  readPregamePayload,
} from "../lib/playSession";

function isValidPlayPayload(p) {
  if (!p || typeof p !== "object") return false;
  if (!p.lesson || p.lesson.id == null) return false;
  if (!Array.isArray(p.questions)) return false;
  return true;
}

const THUMB_COLORS = ["#92B9E3", "#6C7EE1", "#FFC4A4", "#FBA2D0", "#C688EB", "#B8D4F0"];

const LESSON_CHIP_BG_IMAGES = [
  `${publicUrl}/component-images/imgLessonType1.png`,
  `${publicUrl}/component-images/imgLessonType2.png`,
  `${publicUrl}/component-images/imgLessonType3.png`,
];

function thumbColorForLesson(lessonId) {
  const s = String(lessonId ?? "0");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return THUMB_COLORS[hash % THUMB_COLORS.length];
}

function lessonChipBackgroundUrl(lessonId) {
  const s = String(lessonId ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return LESSON_CHIP_BG_IMAGES[hash % LESSON_CHIP_BG_IMAGES.length];
}

function lessonHasDetailImage(lesson) {
  if (lesson?.image == null || String(lesson.image).trim() === "") return false;
  return Boolean(lessonImageUrl(lesson.image));
}

function lessonDetailImageUrl(lesson) {
  return lessonHasDetailImage(lesson) ? lessonImageUrl(lesson.image) : "";
}

function needsPayloadHydration(p) {
  if (!p?.grade?.id || !p?.type?.id || !p?.lesson?.id) return false;
  const missingLessonImage =
    p.lesson.image == null || String(p.lesson.image).trim() === "";
  const missingTypeName = !p.type?.name;
  const missingLessonName = !p.lesson?.name;
  return missingLessonImage || missingTypeName || missingLessonName;
}

export default function PreGameSetUp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [gameId, setGameId] = useState("game1");
  const [missing, setMissing] = useState(false);
  const [lessonImgFailed, setLessonImgFailed] = useState(false);
  const hydrateAttempted = useRef(false);

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

  useEffect(() => {
    setLessonImgFailed(false);
    hydrateAttempted.current = false;
  }, [payload?.lesson?.id, payload?.type?.id, payload?.lesson?.image, payload?.type?.name]);

  useEffect(() => {
    if (!payload || !needsPayloadHydration(payload) || hydrateAttempted.current) {
      return;
    }
    hydrateAttempted.current = true;
    const gradeId = payload.grade.id;
    const typeId = payload.type.id;
    const lessonId = payload.lesson.id;

    void (async () => {
      try {
        const [types, lessons] = await Promise.all([
          getTypes(gradeId),
          getLessons(typeId),
        ]);
        const typeRow = (Array.isArray(types) ? types : []).find(
          (t) => String(t.id) === String(typeId)
        );
        const lessonRow = (Array.isArray(lessons) ? lessons : []).find(
          (l) => String(l.id) === String(lessonId)
        );
        if (!typeRow && !lessonRow) return;

        setPayload((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            type: {
              ...prev.type,
              ...(typeRow?.name && !prev.type?.name ? { name: typeRow.name } : {}),
            },
            lesson: {
              ...prev.lesson,
              ...(lessonRow?.image != null && lessonRow.image !== ""
                ? { image: lessonRow.image }
                : {}),
              ...(lessonRow?.name && !prev.lesson?.name
                ? { name: lessonRow.name }
                : {}),
            },
          };
          persistPregamePayload(next);
          return next;
        });
      } catch (e) {
        console.warn("Không tải được thông tin bài học:", e);
      }
    })();
  }, [payload]);

  const lessonMeta = useMemo(() => {
    if (!payload) return null;
    const gradeLabel = payload.grade?.id != null ? `Khối ${payload.grade.id}` : null;
    const typeName =
      payload.type?.name ||
      (payload.type?.id != null ? `Chủ đề ${payload.type.id}` : null);
    const lessonName = payload.lesson?.name || `Bài ${payload.lesson?.id ?? "—"}`;
    const questionCount = payload.questions?.length ?? 0;
    const description =
      questionCount > 0
        ? `Sắp xếp số phạm vi 100`
        : "Chưa có câu hỏi cho bài học này.";
    const thumbColor = thumbColorForLesson(payload.lesson?.id);
    const hasLessonDetail = lessonHasDetailImage(payload.lesson);
    const lessonDetailUrl = lessonDetailImageUrl(payload.lesson);
    const lessonChipBg = lessonChipBackgroundUrl(payload.lesson?.id);
    return {
      title: lessonName,
      description,
      gradeLabel,
      typeName,
      lessonName,
      questionCount,
      thumbColor,
      courseName: typeName || gradeLabel || "Toán học",
      hasLessonDetail,
      lessonDetailUrl,
      lessonChipBg,
    };
  }, [payload]);

  const handlePlay = () => {
    if (!payload || !isValidPlayPayload(payload)) return;
    persistPlayState(gameId, payload);
    navigate(`/game/${gameId}`, { state: payload });
  };

  const lessonUsesDetailBg =
    lessonMeta?.hasLessonDetail && lessonMeta.lessonDetailUrl && !lessonImgFailed;
  const lessonThumbBg = lessonUsesDetailBg
    ? lessonMeta.lessonDetailUrl
    : lessonMeta?.lessonChipBg || "";
  const showLessonThumbLabel = !lessonUsesDetailBg;

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
          overflow: hidden;
          position: relative;
          background-color: #e8f2fc;
          background-repeat: no-repeat;
          background-position: center;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: clamp(10px, 2.5vw, 16px);
        }
        .pregame-thumb--detail {
          background-size: cover;
          padding: 0;
        }
        .pregame-thumb--chip {
          background-size: 100% 100%;
        }
        .pregame-thumb-label {
          position: relative;
          z-index: 1;
          margin: 0;
          font-weight: 700;
          font-size: clamp(0.78rem, 2.4vw, 0.95rem);
          line-height: 1.35;
          text-align: center;
          color: #4a5080;
          word-break: break-word;
          text-shadow:
            0 1px 2px rgba(255, 255, 255, 0.95),
            0 0 10px rgba(255, 255, 255, 0.75);
        }
        .pregame-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
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
          margin-top: 4px;
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
              <button
                type="button"
                className="pregame-btn-secondary"
                onClick={() => navigate("/lessons")}
              >
                Về trang chủ
              </button>
            </div>
          )}

          {!missing && payload && lessonMeta && (
            <>
              <article className="pregame-card">
                <div
                  className={`pregame-thumb${
                    lessonUsesDetailBg ? " pregame-thumb--detail" : " pregame-thumb--chip"
                  }`}
                  style={
                    lessonThumbBg
                      ? { backgroundImage: `url(${lessonThumbBg})` }
                      : { background: lessonMeta.thumbColor }
                  }
                  role="img"
                  aria-label={lessonMeta.lessonName}
                >
                  {showLessonThumbLabel && (
                    <span className="pregame-thumb-label">{lessonMeta.lessonName}</span>
                  )}
                  {lessonUsesDetailBg && (
                    <img
                      src={lessonMeta.lessonDetailUrl}
                      alt=""
                      aria-hidden
                      style={{
                        position: "absolute",
                        width: 0,
                        height: 0,
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                      onError={() => setLessonImgFailed(true)}
                    />
                  )}
                </div>
                <div className="pregame-body">
                  <h1 className="pregame-title">{lessonMeta.title}</h1>
                  <p className="pregame-desc">{lessonMeta.description}</p>

                  <div className="pregame-course">
                    <div className="pregame-course-kicker">Nằm trong chủ đề</div>
                    <div className="pregame-course-name">{lessonMeta.courseName}</div>
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
                  <button
                    type="button"
                    className="pregame-btn-secondary"
                    onClick={() => navigate("/lessons")}
                  >
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