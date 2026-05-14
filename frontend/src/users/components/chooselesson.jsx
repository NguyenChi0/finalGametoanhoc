// src/components/chooselesson.jsx
import React, { useState, useEffect } from "react";
import {
  getGrades,
  getTypes,
  getLessons,
  getQuestions,
  questionImageUrl,
} from "../../api";

function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const GRADES_PER_ROW = 5;
/** Kích thước cố định mỗi ô khối lớp (px) — hàng tối đa 5 ô, có chồng lấn -18px */
const GRADE_CHEVRON_WIDTH_PX = 156;
const GRADE_CHEVRON_HEIGHT_PX = 52;
/** Một hình cho mọi ô: trái lõm (khía tam giác), phải nhọn — nối chuỗi giống breadcrumb */
const GRADE_CHEVRON_CLIP =
  "polygon(14% 50%, 0% 0%, 86% 0%, 100% 50%, 86% 100%, 0% 100%)";

function chunkArray(arr, size) {
  const chunks = [];
  const list = Array.isArray(arr) ? arr : [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

/** DB: `/questions-images/...` — nối origin API để `<img src>` tải đúng. */
function withResolvedQuestionMedia(q) {
  if (!q || typeof q !== "object") return q;
  return {
    ...q,
    question_image: q.question_image
      ? questionImageUrl(q.question_image) || q.question_image
      : q.question_image,
    answers: Array.isArray(q.answers)
      ? q.answers.map((a) =>
          !a || typeof a !== "object"
            ? a
            : {
                ...a,
                image: a.image ? questionImageUrl(a.image) || a.image : a.image,
              }
        )
      : q.answers,
  };
}

export default function ChooseLessonTree({ onStartGame, kilovia }) {
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [cache, setCache] = useState({ types: {}, lessons: {}, questions: {} });
  const [selectedGameInterface, setSelectedGameInterface] = useState("game1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const gameOptions = [
    { id: "game1", label: "Đường lên đỉnh olympia" },
    { id: "game2", label: "Diệt ruồi" },
    { id: "game3", label: "Phi tiêu" },
    { id: "game4", label: "Vượt chướng ngại vật" },
    { id: "game5", label: "Finding Dory" },
    { id: "game6", label: "Chém hoa quả" },
    { id: "game7", label: "Nhà thám hiểm tài ba" },
    { id: "game8", label: "Bài kiểm tra" },
    { id: "game9", label: "Dẫn thỏ về hang" },
    { id: "game10", label: "Xạ thủ đỉnh cao" },
    { id: "game11", label: "Đố vui nhanh tay" },
  ];

  // Tải danh sách lớp học
  useEffect(() => {
    getGrades()
      .then(setGrades)
      .catch((err) => setError(err.message));
  }, []);

  // Khi loading bật lên -> đảm bảo spinner hiển thị tối thiểu 1 giây
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleSelectGrade = async (gradeId) => {
    setSelectedGrade(gradeId);
    setLoading(true);
    try {
      if (!cache.types[gradeId]) {
        const types = await getTypes(gradeId);
        setCache((prev) => ({ ...prev, types: { ...prev.types, [gradeId]: types } }));

        // Load lessons (bài học) cho từng type luôn
        const newLessons = {};
        for (const t of types) {
          const lessons = await getLessons(t.id);
          newLessons[t.id] = lessons;
        }
        setCache((prev) => ({ ...prev, lessons: { ...prev.lessons, ...newLessons } }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async (gradeId, typeId, lessonId) => {
    let questions = cache.questions[lessonId];
    if (!questions) {
      setLoading(true);
      try {
        const res = await getQuestions({
          grade_id: gradeId,
          type_id: typeId,
          lesson_id: lessonId,
          randomize: true,
        });
        questions = res.data || res;
        setCache((prev) => ({
          ...prev,
          questions: { ...prev.questions, [lessonId]: questions },
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    const rawUser = localStorage.getItem("user");
    const currentUser = rawUser ? JSON.parse(rawUser) : null;
    const shuffledQuestions = shuffleArray(questions.map(withResolvedQuestionMedia));

    onStartGame(selectedGameInterface, {
  grade: { id: gradeId },
  type: {
    id: typeId,
    name:
      cache.types[gradeId]?.find(
        (t) => String(t.id) === String(typeId)
      )?.name || null,
  },
  lesson: {
    id: lessonId,
    name:
      cache.lessons[typeId]?.find(
        (row) => String(row.id) === String(lessonId)
      )?.name || null,
  },
  questions: shuffledQuestions,
  user: currentUser,
  ...(kilovia && { kilovia }),
});

  };

  return (
    <div style={{ position: "relative", padding: 16, borderRadius: 8 }}>
      {error && (
        <div style={{ color: "red" }}>
          Lỗi: {error}
          <button onClick={() => setError(null)}>OK</button>
        </div>
      )}

      {/* Giao diện chọn game */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: "bold" }}>Chọn giao diện game:</label>
        <select
          value={selectedGameInterface}
          onChange={(e) => setSelectedGameInterface(e.target.value)}
          style={{
            marginLeft: 8,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #f7f7f7ff",
            fontFamily: "inherit",
          }}
        >
          {gameOptions.map((game) => (
            <option key={game.id} value={game.id}>
              {game.label}
            </option>
          ))}
        </select>
      </div>

      {/* Danh sách lớp — hàng ngang dạng mũi tên nối nhau */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            marginBottom: 12,
            color: "#1a1a1a",
            fontFamily: "inherit",
          }}
        >
          Chọn khối lớp bạn muốn học nhé 
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: "100%",
            maxWidth: "100%",
            fontFamily: "inherit",
          }}
        >
          {chunkArray(grades, GRADES_PER_ROW).map((rowGrades, rowIndex) => (
            <div
              key={rowIndex}
              className="grade-chevron-row"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
                width: "100%",
                minHeight: GRADE_CHEVRON_HEIGHT_PX,
                fontFamily: "inherit",
                paddingLeft: 2,
                boxSizing: "border-box",
              }}
            >
              {rowGrades.map((g, index) => {
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectGrade(g.id)}
                    className="grade-chevron-btn"
                    style={{
                      position: "relative",
                      zIndex: index + 1,
                      flex: `0 0 ${GRADE_CHEVRON_WIDTH_PX}px`,
                      width: GRADE_CHEVRON_WIDTH_PX,
                      height: GRADE_CHEVRON_HEIGHT_PX,
                      minWidth: GRADE_CHEVRON_WIDTH_PX,
                      maxWidth: GRADE_CHEVRON_WIDTH_PX,
                      minHeight: GRADE_CHEVRON_HEIGHT_PX,
                      maxHeight: GRADE_CHEVRON_HEIGHT_PX,
                      boxSizing: "border-box",
                      marginLeft: index === 0 ? 0 : -18,
                      padding: "10px 20px 10px 24px",
                      background:
                        selectedGrade === g.id ? "#0f4c75" : "#ffffff",
                      color: selectedGrade === g.id ? "#fff" : "#1a1a1a",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      lineHeight: 1.2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      clipPath: GRADE_CHEVRON_CLIP,
                      WebkitClipPath: GRADE_CHEVRON_CLIP,
                      boxShadow:
                        selectedGrade === g.id
                          ? "0 4px 14px #0f4c75"
                          : "0 2px 8px rgba(0,0,0,0.1)",
                      transition:
                        "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
                      fontFamily: "inherit",
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        minWidth: 0,
                      }}
                    >
                      {g.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .grade-chevron-row {
          overflow-x: auto;
          overflow-y: visible;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
          font-family: inherit;
        }
        .grade-chevron-btn:hover {
          background: #3282b8 !important;
          color: white !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgb(15, 76, 117) !important;
          z-index: 40 !important;
        }

        .play-button:hover {
          transform: scale(1.05);
          background: #3282b8 !important;
          color: white !important;
        }
      `}</style>


      {/* Hiển thị các bài học */}
      {selectedGrade && cache.types[selectedGrade] && (
        <div style={{ marginLeft: 20 }}>
          {cache.types[selectedGrade].map((t, idx) => (
            <div key={t.id} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                {idx + 1}. {t.name}
              </div>
              <div style={{ marginLeft: 20 }}>
                {cache.lessons[t.id]?.map((o, i) => (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <span>{i + 1}. {o.name}</span>
                    <button className="play-button"
                      onClick={() => handleStartGame(selectedGrade, t.id, o.id)}
                      style={{
                        background: "#0f4c75",
                        color: "white",
                        border: "none",
                        borderRadius: 0,
                        padding: "4px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ▶ Chơi 
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      
    </div>
  );
}
