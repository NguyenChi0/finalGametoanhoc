import React, { useState, useEffect, useRef, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getContestById, submitContestScore } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

function buildSampleQuestions(count) {
  const n = Math.max(1, Math.min(Number(count) || 10, 100));
  const qs = [];
  for (let i = 1; i <= n; i++) {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    qs.push({
      id: i,
      question: `${a} + ${b} = ?`,
      correctAnswer: a + b,
    });
  }
  return qs;
}

function getOptions(correctAnswer) {
  const options = new Set();
  options.add(correctAnswer);
  options.add(correctAnswer + 1);
  options.add(correctAnswer - 1);
  options.add(correctAnswer + 2);
  let validOptions = Array.from(options).filter((val) => val >= 0 && val <= 20);
  while (validOptions.length < 4) {
    let newVal = correctAnswer + validOptions.length;
    if (newVal >= 0 && newVal <= 20 && !validOptions.includes(newVal)) {
      validOptions.push(newVal);
    } else {
      newVal = correctAnswer - validOptions.length;
      if (newVal >= 0 && newVal <= 20 && !validOptions.includes(newVal)) {
        validOptions.push(newVal);
      } else {
        validOptions.push(correctAnswer + 3);
      }
    }
  }
  return validOptions.sort(() => Math.random() - 0.5);
}

export default function ContestDetailPage() {
  const { contestId } = useParams();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const [contest, setContest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [contestLoading, setContestLoading] = useState(true);
  const [contestErr, setContestErr] = useState("");
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [saveResultError, setSaveResultError] = useState("");
  const [saveResultOk, setSaveResultOk] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState([]);

  const questionsRef = useRef(questions);
  const answersRef = useRef(answers);
  const timeLeftRef = useRef(timeLeft);
  const isFinalizingRef = useRef(false);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const finalizeQuiz = useCallback(async () => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    const qs = questionsRef.current;
    const ans = answersRef.current;
    const totalQ = qs.length || 1;
    const correctCount = qs.reduce(
      (acc, q) => acc + (ans[q.id] === q.correctAnswer ? 1 : 0),
      0
    );
    setScore(correctCount);
    setSubmitted(true);
    setSaveResultError("");
    setSaveResultOk(false);
    const cid = Number(contestId);
    const durationSeconds =
      Math.max(1, Math.floor(Number(contest?.exam_duration_minutes) || 30)) * 60;
    const solvedSeconds = Math.max(0, durationSeconds - Math.max(0, Number(timeLeftRef.current) || 0));
    try {
      await submitContestScore(cid, { score: correctCount, times: solvedSeconds });
      setSaveResultOk(true);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        "Kh\u00F4ng l\u01B0u \u0111\u01B0\u1EE3c k\u1EBFt qu\u1EA3. Th\u1EED l\u1EA1i sau.";
      setSaveResultError(msg);
    }
  }, [contestId, contest?.exam_duration_minutes]);

  useEffect(() => {
    let cancelled = false;
    const id = Number(contestId);
    if (!Number.isFinite(id) || id <= 0) {
      setContestErr("Cu\u1ED9c thi kh\u00F4ng h\u1EE3p l\u1EC7.");
      setContestLoading(false);
      return undefined;
    }
    setContestLoading(true);
    setContestErr("");
    getContestById(id)
      .then((c) => {
        if (cancelled) return;
        setContest(c);
        if (c.completed) {
          setAlreadyCompleted(true);
          setQuestions([]);
          isFinalizingRef.current = false;
          return;
        }
        setAlreadyCompleted(false);
        const qn = Number(c.question_count) || 10;
        const durationMin = Number(c.exam_duration_minutes) || 30;
        setQuestions(buildSampleQuestions(qn));
        setTimeLeft(durationMin * 60);
        setCurrentQuestion(0);
        setAnswers({});
        setSubmitted(false);
        setScore(0);
        isFinalizingRef.current = false;
        setSaveResultError("");
        setSaveResultOk(false);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setContestErr(
            err.response?.data?.message ||
              "Kh\u00F4ng t\u1EA3i \u0111\u01B0\u1EE3c \u0111\u1EC1 thi."
          );
          setQuestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setContestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contestId]);

  useEffect(() => {
    const currentQ = questions[currentQuestion];
    if (currentQ) {
      setOptions(getOptions(currentQ.correctAnswer));
    }
  }, [currentQuestion, questions]);

  useEffect(() => {
    if (submitted || timeLeft <= 0 || contestLoading || questions.length === 0) {
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
  }, [submitted, timeLeft, contestLoading, questions.length, finalizeQuiz]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleAnswerChange = (value) => {
    const q = questions[currentQuestion];
    if (!q) return;
    setAnswers({
      ...answers,
      [q.id]: value,
    });
  };

  const handlePrev = () => {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1)
      setCurrentQuestion(currentQuestion + 1);
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

  // Style cho nút số - nhỏ gọn, khoảng cách 2px
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

  if (contestErr && !contestLoading) {
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
              <p style={{ color: "#c62828", marginBottom: 20 }}>{contestErr}</p>
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

  if (contestLoading) {
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
          {"\u0110ang t\u1EA3i \u0111\u1EC1 thi\u2026"}
        </div>
      </div>
    );
  }

  if (alreadyCompleted && contest) {
    const totalQ = Number(contest.question_count) || 1;
    const sc =
      contest.my_score != null && contest.my_score !== ""
        ? Number(contest.my_score)
        : 0;
    const ratio = totalQ > 0 ? sc / totalQ : 0;
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
              <h1 style={{ color: "#0f4c75" }}>
                {"\u0110\u00E3 ho\u00E0n th\u00E0nh cu\u1ED9c thi"}
              </h1>
              <p style={{ color: "#455a64", marginBottom: 8 }}>
                {contest.grade_name} — {contest.name}
              </p>
              <p style={{ fontSize: 48, fontWeight: 700, color: "#3282b8" }}>
                {sc}/{totalQ}
              </p>
              <p>
                {"K\u1EBFt qu\u1EA3 \u0111\u00E3 l\u01B0u: "} {sc}{" "}
                {"c\u00E2u \u0111\u00FAng tr\u00EAn t\u1ED5ng "} {totalQ}.
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
                    width: `${Math.min(100, ratio * 100)}%`,
                    height: "100%",
                    backgroundColor: ratio >= 0.7 ? "#4caf50" : "#ff9800",
                    borderRadius: 6,
                  }}
                />
              </div>
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

  if (!alreadyCompleted && questions.length === 0) {
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
          {"Kh\u00F4ng c\u00F3 c\u00E2u h\u1ECFi cho cu\u1ED9c thi n\u00E0y."}
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
              <h1 style={{ color: "#0f4c75" }}>Điểm của bạn</h1>
              <p style={{ fontSize: 48, fontWeight: 700, color: "#3282b8" }}>
                {score}/{totalQ}
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
              {saveResultOk && (
                <p style={{ color: "#2e7d32", fontWeight: 600, marginTop: 12 }}>
                  {"Nộp bài thi thành công!"}
                </p>
              )}
              {saveResultError && (
                <p style={{ color: "#c62828", marginTop: 12 }}>{saveResultError}</p>
              )}
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
  const currentAnswer = answers[currentQ.id];

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
          {contest && (
            <p
              style={{
                color: "#0f4c75",
                fontWeight: 600,
                margin: "0 0 12px 0",
                fontSize: 17,
              }}
            >
              {contest.grade_name} — {contest.name}
            </p>
          )}
          {/* Header: các nút câu hỏi và timer cùng dòng */}
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
            {/* Khu vực nút số 1-20 - dùng flex wrap, tự động xuống dòng */}
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
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    style={numberButtonStyle(
                      idx === currentQuestion,
                      answers[idx + 1] !== undefined
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer - nằm cùng dòng */}
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

          {/* Câu hỏi và đáp án */}
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
                marginBottom: 28,
                color: "#0f4c75",
                fontSize: 28,
                textAlign: "center",
              }}
            >
              {currentQ.question}
            </h2>

            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerChange(opt)}
                    style={{
                      padding: "12px 16px",
                      backgroundColor:
                        currentAnswer === opt ? "#0f4c75" : "#f0f6fa",
                      color: currentAnswer === opt ? "#fff" : "#0f4c75",
                      border:
                        currentAnswer === opt
                          ? "2px solid #0f4c75"
                          : "2px solid #d0dfe8",
                      borderRadius: 40,
                      fontSize: 18,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {opt}
                  </button>
                ))}
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