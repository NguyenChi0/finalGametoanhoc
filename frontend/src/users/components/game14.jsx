// src/components/games/game14.jsx
import React, { useMemo, useState } from "react";
import api from "../../api";

export default function Game1({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];

  const [selected, setSelected] = useState({});
  const [userScore, setUserScore] = useState(payload?.user?.score ?? null);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [correctCount, setCorrectCount] = useState(0);
  const [scoreSent, setScoreSent] = useState(false);

  // Shuffle câu trả lời
  const qs = useMemo(() => {
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    return questions.map((q) => {
      const answers = Array.isArray(q.answers) ? shuffle(q.answers) : [];
      return { ...q, answers };
    });
  }, [questions]);

  // Gọi API cộng điểm
  async function incrementScoreOnServer(userId, delta = 1) {
    try {
      const resp = await api.post("/score/increment", { userId, delta });
      return resp.data;
    } catch (e) {
      console.warn("Lỗi gọi API cộng điểm:", e);
      return null;
    }
  }

  function choose(qId, ansIdx) {
    if (selected[qId] !== undefined) return; // lock once chosen
    setSelected((prev) => ({ ...prev, [qId]: ansIdx }));

    const q = qs.find((x) => x.id === qId);
    const a = q?.answers?.[ansIdx];
    if (a && a.correct) {
      setCorrectCount((prev) => prev + 1);
    }
  }

  // Khi tất cả câu đã chọn lần đầu, cộng tổng điểm một lần
  React.useEffect(() => {
    const answeredCount = Object.keys(selected).length;
    if (!scoreSent && answeredCount === qs.length && answeredCount > 0 && correctCount > 0) {
      const userId =
        payload?.user?.id ||
        (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

      if (!userId) {
        setScoreSent(true);
        onLessonComplete?.(correctCount);
        return;
      }

      incrementScoreOnServer(userId, correctCount).then((data) => {
        if (data && data.success) {
          setUserScore(data.score);
          setWeekScore(data.week_score ?? 0);

          const raw = localStorage.getItem("user");
          if (raw) {
            try {
              const u = JSON.parse(raw);
              u.score = data.score;
              u.week_score = data.week_score;
              localStorage.setItem("user", JSON.stringify(u));
            } catch (err) {
              console.warn("Không cập nhật được user trong localStorage:", err);
            }
          }
        }
        setScoreSent(true);
      });
      onLessonComplete?.(correctCount);
    }
  }, [selected, qs.length, correctCount, scoreSent, payload]);

  return (
    <div>
      <h3>Game 1 — giao diện mẫu</h3>
      <div>
        Số câu: {qs.length}{" "}
        {userScore !== null && (
          <span>
            — Điểm tổng: <b>{userScore}</b> | Điểm tuần: <b>{weekScore}</b>
          </span>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {qs.map((q, idx) => {
          const sel = selected[q.id];
          return (
            <div
              key={q.id}
              style={{
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                {idx + 1}. {q.question_text}
              </div>
              {q.question_image && (
                <img
                  src={q.question_image}
                  alt=""
                  style={{ maxWidth: 360, display: "block", marginBottom: 8 }}
                />
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {q.answers.map((a, ai) => {
                  let style = {
                    minWidth: 120,
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: sel === undefined ? "pointer" : "default",
                  };

                  if (sel !== undefined) {
                    const chosen = sel === ai;
                    if (chosen && a.correct) {
                      style.background = "#d4f7d8";
                      style.border = "1px solid #48b24a";
                    } else if (chosen && !a.correct) {
                      style.background = "#ffd6d6";
                      style.border = "1px solid #e05b5b";
                    } else if (!chosen && a.correct) {
                      style.background = "#d4f7d8";
                      style.border = "1px solid #48b24a";
                    } else {
                      style.background = "#f9f9f9";
                    }
                  }

                  return (
                    <button
                      key={a.id || ai}
                      onClick={() => choose(q.id, ai)}
                      disabled={sel !== undefined}
                      style={style}
                    >
                      <div>
                        {a.text ||
                          (a.image ? (
                            <img src={a.image} alt="" style={{ maxWidth: 120 }} />
                          ) : (
                            "—"
                          ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
