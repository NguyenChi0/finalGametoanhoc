import React, { useState, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { publicUrl } from "../../lib/publicUrl";

export default function ContestDetailPage() {
  const { contestId } = useParams();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Tạo 20 câu hỏi toán lớp 1 (chỉ 1 lần)
  const [questions] = useState(() => {
    const qs = [];
    for (let i = 1; i <= 20; i++) {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      qs.push({
        id: i,
        question: `${a} + ${b} = ?`,
        correctAnswer: a + b,
      });
    }
    return qs;
  });

  // Sinh 4 đáp án trắc nghiệm (nhiễu hợp lý)
  const getOptions = (correctAnswer) => {
    let options = new Set();
    options.add(correctAnswer);
    options.add(correctAnswer + 1);
    options.add(correctAnswer - 1);
    options.add(correctAnswer + 2);
    let validOptions = Array.from(options).filter(
      (val) => val >= 0 && val <= 20
    );
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
  };

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const currentQ = questions[currentQuestion];
    if (currentQ) {
      setOptions(getOptions(currentQ.correctAnswer));
    }
  }, [currentQuestion, questions]);

  useEffect(() => {
    if (submitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleAnswerChange = (value) => {
    setAnswers({
      ...answers,
      [questions[currentQuestion].id]: value,
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
    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) correctCount++;
    });
    setScore(correctCount);
    setSubmitted(true);
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

  if (submitted) {
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
              <h1 style={{ color: "#0f4c75" }}>🎉 Kết quả bài kiểm tra</h1>
              <p style={{ fontSize: 48, fontWeight: 700, color: "#3282b8" }}>
                {score}/{questions.length}
              </p>
              <p>
                Bạn trả lời đúng {score} trên {questions.length} câu.
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
                    width: `${(score / questions.length) * 100}%`,
                    height: "100%",
                    backgroundColor: score / questions.length >= 0.7 ? "#4caf50" : "#ff9800",
                    borderRadius: 6,
                  }}
                />
              </div>
              <p>
                {score / questions.length >= 0.7
                  ? "✨ Tuyệt vời!"
                  : "Cố gắng lần sau nhé!"}
              </p>
              <button
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