import React, { useState, useEffect, useRef, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import { API_ORIGIN, getExamById } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ảnh câu hỏi / đáp án: DB lưu path bắt đầu bằng `/` */
function staticAssetUrl(path) {
  if (path == null || String(path).trim() === "") return "";
  const s = String(path).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const origin = API_ORIGIN.replace(/\/$/, "");
  return s.startsWith("/") ? `${origin}${s}` : `${origin}/${s}`;
}

/**
 * Chuẩn hóa câu hỏi từ API → dùng cho UI làm bài (giống luồng contestDetailPage).
 */
function mapApiQuestionsToQuiz(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((q) => {
      const answers = Array.isArray(q.answers) ? q.answers : [];
      const correct = answers.find((a) => a.correct);
      const correctAnswerId = correct?.id ?? null;
      if (!correctAnswerId || answers.length === 0) return null;
      const options = shuffle(answers);
      return {
        id: q.id,
        question: q.question_text?.trim() || `Câu hỏi #${q.id}`,
        question_image: q.question_image || null,
        options,
        correctAnswerId,
      };
    })
    .filter(Boolean);
}

export default function ExamDetailPage() {
  const { examId } = useParams();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [examLoading, setExamLoading] = useState(true);
  const [examErr, setExamErr] = useState("");

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const questionsRef = useRef(questions);
  const answersRef = useRef(answers);
  const isFinalizingRef = useRef(false);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  /** Luyện đề: chỉ chấm điểm cục bộ, không gọi API lưu điểm. */
  const finalizeQuiz = useCallback(() => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    const qs = questionsRef.current;
    const ans = answersRef.current;
    const totalQ = qs.length || 1;
    const correctCount = qs.reduce(
      (acc, q) => acc + (ans[q.id] === q.correctAnswerId ? 1 : 0),
      0
    );
    setScore(correctCount);
    setSubmitted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const id = Number(examId);
    if (!Number.isFinite(id) || id <= 0) {
      setExamErr("Đề thi không hợp lệ.");
      setExamLoading(false);
      return undefined;
    }

    setExamLoading(true);
    setExamErr("");
    getExamById(id)
      .then((data) => {
        if (cancelled) return;
        if (Number(data?.status) !== 1) {
          setExamErr("Đề thi này chưa được công khai.");
          setQuestions([]);
          return;
        }
        setExam(data);
        const qs = mapApiQuestionsToQuiz(data?.questions);
        setQuestions(qs);
        const durationMin = Number(data?.duration_time) || 30;
        setTimeLeft(Math.max(1, durationMin) * 60);
        setCurrentQuestion(0);
        setAnswers({});
        setSubmitted(false);
        setScore(0);
        isFinalizingRef.current = false;
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setExamErr(
            err.response?.data?.message || "Không tải được đề luyện tập."
          );
          setQuestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setExamLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [examId]);

  useEffect(() => {
    if (submitted || timeLeft <= 0 || examLoading || questions.length === 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finalizeQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted, timeLeft, examLoading, questions.length, finalizeQuiz]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleAnswerChange = (answerId) => {
    const q = questions[currentQuestion];
    if (!q) return;
    setAnswers({
      ...answers,
      [q.id]: answerId,
    });
  };

  const handlePrev = () => {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleSubmit = () => {
    finalizeQuiz();
  };

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

  const numberButtonStyle = (isCurrent, isAnswered) => ({
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isCurrent
      ? "#0f4c75"
      : isAnswered
        ? "#c6e6f5"
        : "#f0f6fa",
    color: isCurrent ? "#fff" : "#455a64",
    border: isCurrent ? "2px solid #0f4c75" : "1px solid #d0dfe8",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    padding: 0,
    margin: "2px",
  });

  if (examErr && !examLoading) {
    return (
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <div style={bgFixedLayer} aria-hidden />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 520,
            margin: "0 auto",
            padding: 24,
          }}
        >
          <main>
            <section
              style={{
                background: "#ffffff",
                borderRadius: 16,
                padding: "32px 24px",
                textAlign: "center",
                boxShadow: "0 10px 36px rgba(0,0,0,0.08)",
              }}
            >
              <p style={{ color: "#c62828", marginBottom: 20 }}>{examErr}</p>
              <button
                type="button"
                onClick={() => window.history.back()}
                style={{
                  backgroundColor: "#0f4c75",
                  border: "none",
                  borderRadius: 40,
                  padding: "12px 32px",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Quay lại
              </button>
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (examLoading) {
    return (
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <div style={bgFixedLayer} aria-hidden />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 520,
            margin: "48px auto",
            padding: 24,
            textAlign: "center",
            color: "#455a64",
            fontSize: 16,
          }}
        >
          Đang tải đề luyện tập…
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <div style={bgFixedLayer} aria-hidden />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 520,
            margin: "48px auto",
            padding: 24,
            textAlign: "center",
            color: "#c62828",
          }}
        >
          Không có câu hỏi cho đề này.
        </div>
      </div>
    );
  }

  if (submitted) {
    const totalQ = questions.length || 1;
    const ratio = score / totalQ;
    return (
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <div style={bgFixedLayer} aria-hidden />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 800,
            margin: "0 auto",
            padding: 24,
          }}
        >
          <main>
            <section
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: "48px 32px",
                textAlign: "center",
                boxShadow: "0 10px 36px rgba(0,0,0,0.08)",
              }}
            >
              <h1 style={{ color: "#0f4c75" }}>Kết quả luyện tập</h1>
              {exam && (
                <p style={{ color: "#455a64", marginBottom: 8 }}>
                  {exam.grade_name} — {exam.name}
                </p>
              )}
              <p style={{ fontSize: 48, fontWeight: 700, color: "#3282b8" }}>
                {score}/{totalQ}
              </p>
              <p>
                Bạn trả lời đúng {score} trên {totalQ} câu.
              </p>
              <div
                style={{
                  width: "100%",
                  height: 12,
                  backgroundColor: "#e8f1f5",
                  borderRadius: 6,
                  margin: "24px 0",
                }}
              >
                <div
                  style={{
                    width: `${ratio * 100}%`,
                    height: "100%",
                    backgroundColor: ratio >= 0.7 ? "#4caf50" : "#ff9800",
                    borderRadius: 6,
                  }}
                />
              </div>
              <p>
                {ratio >= 0.7 ? "✨ Tuyệt vời!" : "Cố gắng lần sau nhé!"}
              </p>
              <p
                style={{
                  color: "#607d8b",
                  fontSize: 15,
                  marginTop: 16,
                  lineHeight: 1.5,
                }}
              >
                Đây là bài <strong>luyện tập</strong>. Kết quả không được lưu
                vào hệ thống (khác với cuộc thi).
              </p>
              <button
                type="button"
                onClick={() => window.history.back()}
                style={{
                  backgroundColor: "#0f4c75",
                  border: "none",
                  borderRadius: 40,
                  padding: "12px 32px",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 16,
                }}
              >
                Quay lại
              </button>
            </section>
          </main>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={bgFixedLayer} aria-hidden />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1000,
          margin: "0 auto",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <main>
          <style>{`
            .exam-detail-answer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            @media (max-width: 640px) {
              .exam-detail-answer-grid {
                grid-template-columns: 1fr;
              }
            }
          `}</style>
          {exam && (
            <p
              style={{
                color: "#0f4c75",
                fontWeight: 600,
                margin: "0 0 12px 0",
                fontSize: 17,
              }}
            >
              <span style={{ color: "#3282b8", marginRight: 8 }}>
                [Luyện tập]
              </span>
              {exam.grade_name} — {exam.name}
            </p>
          )}

          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: "10px 12px",
              marginBottom: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestion(idx)}
                    style={numberButtonStyle(
                      idx === currentQuestion,
                      answers[q.id] !== undefined
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                padding: "6px 14px",
                backgroundColor: timeLeft < 300 ? "#ffe6e6" : "#e8f1f5",
                borderRadius: 12,
                minWidth: 90,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: timeLeft < 300 ? "#c41c3b" : "#0f4c75",
                }}
              >
                {formatTime(timeLeft)}
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>Thời gian</div>
            </div>
          </div>

          <section
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: "28px 24px",
              boxShadow: "0 10px 36px rgba(0,0,0,0.08)",
            }}
          >
            <h2
              style={{
                marginBottom: 16,
                color: "#0f4c75",
                fontSize: 28,
                textAlign: "center",
                lineHeight: 1.35,
              }}
            >
              {currentQ.question}
            </h2>

            {currentQ.question_image && (
              <div style={{ marginBottom: 24, textAlign: "center" }}>
                <img
                  src={staticAssetUrl(currentQ.question_image)}
                  alt=""
                  style={{
                    maxWidth: "100%",
                    maxHeight: 280,
                    objectFit: "contain",
                    borderRadius: 12,
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: 32 }}>
              <div className="exam-detail-answer-grid">
                {currentQ.options.map((opt) => {
                  const selected = currentAnswer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleAnswerChange(opt.id)}
                      style={{
                        padding: "12px 16px",
                        backgroundColor: selected ? "#0f4c75" : "#f0f6fa",
                        color: selected ? "#fff" : "#0f4c75",
                        border: selected
                          ? "2px solid #0f4c75"
                          : "2px solid #d0dfe8",
                        borderRadius: 40,
                        fontSize: 18,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        minHeight: 48,
                      }}
                    >
                      {opt.text && <span>{opt.text}</span>}
                      {opt.image && (
                        <img
                          src={staticAssetUrl(opt.image)}
                          alt=""
                          style={{
                            maxHeight: 44,
                            maxWidth: "100%",
                            objectFit: "contain",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                paddingTop: 20,
                borderTop: "1px solid #e8f1f5",
              }}
            >
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                style={{
                  padding: "10px 24px",
                  backgroundColor: currentQuestion === 0 ? "#d0dfe8" : "#fff",
                  color: currentQuestion === 0 ? "#999" : "#0f4c75",
                  border: "2px solid #d0dfe8",
                  borderRadius: 40,
                  fontWeight: 600,
                  cursor: currentQuestion === 0 ? "not-allowed" : "pointer",
                }}
              >
                ← Trước
              </button>
              {currentQuestion === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{
                    padding: "10px 32px",
                    backgroundColor: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: 40,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✓ Nộp bài
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    padding: "10px 24px",
                    backgroundColor: "#0f4c75",
                    color: "white",
                    border: "none",
                    borderRadius: 40,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Sau →
                </button>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
