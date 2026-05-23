// src/components/games/game8.jsx
import React, { useMemo, useState } from "react";
import api, { questionImageUrl } from "../../api";
import GameQuestionImageZoom from "./GameQuestionImageZoom";
import LessonCompleteScreen from "./LessonCompleteScreen";
import { prepareSessionQuestions } from "../lib/lessonQuestions";

export default function Game1({ payload, onReturnHome, onLessonComplete }) {
  const questions = payload?.questions || [];
  const questionsPerPage = 5;

  const [gameState, setGameState] = useState('playing'); // 'playing', 'finished'
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [finalScore, setFinalScore] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Lấy thông tin người dùng
  const userName = payload?.user?.name || 
                   (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).name) || 
                   "Học sinh";
  const userClass = payload?.user?.class || "Chưa có lớp";

  const qs = useMemo(
    () => prepareSessionQuestions(questions),
    [questions, shuffleSeed]
  );

  const totalPages = Math.ceil(qs.length / questionsPerPage);
  const startIndex = currentPage * questionsPerPage;
  const currentQuestions = qs.slice(startIndex, startIndex + questionsPerPage);

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

  // Tính điểm và gửi lên server, sau đó chuyển sang màn hình kết thúc
  async function handleSubmit() {
    // Tính số câu đúng
    let correctAnswers = 0;
    Object.keys(answers).forEach(questionId => {
      const question = qs.find(q => q.id === parseInt(questionId));
      const answerIndex = answers[questionId];
      if (question && question.answers[answerIndex]?.correct) {
        correctAnswers++;
      }
    });

    setFinalScore(correctAnswers);

    // Lấy userId
    const userId =
      payload?.user?.id ||
      (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

    onLessonComplete?.(correctAnswers);

    if (userId && correctAnswers > 0) {
      const data = await incrementScoreOnServer(userId, correctAnswers);
      if (data && data.success) {
        setUserScore(data.score);
        setWeekScore(data.week_score ?? 0);

        // Cập nhật localStorage
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
    }

    // Chuyển sang màn hình kết thúc
    setGameState('finished');
  }

  function choose(qId, ansIdx) {
    if (gameState !== 'playing') return;
    setAnswers(prev => ({ ...prev, [qId]: ansIdx }));
  }

  function goToNextPage() {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  }

  function goToPrevPage() {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }

  function startGame() {
    setGameState('playing');
  }

  function restartGame() {
    setShuffleSeed((s) => s + 1);
    setGameState('playing');
    setAnswers({});
    setCurrentPage(0);
    setFinalScore(0);
  }

  function handleReturnHome() {
    if (onReturnHome) {
      onReturnHome();
    }
  }

  // Gradient backgrounds
  const gradientStart = {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  };

  const gradientFinish = {
    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  };

  // Container styles
  const containerStyle = {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  };

  const paperStyle = {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    border: "1px solid #ddd",
    marginBottom: "20px",
    position: "relative"
  };

  const headerStyle = {
    textAlign: "center",
    marginBottom: "30px",
    borderBottom: "2px solid #333",
    paddingBottom: "15px"
  };

  const titleStyle = {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
    color: "#333"
  };

  

  const questionTextStyle = {
    fontSize: "16px",
    lineHeight: "1.5",
    marginBottom: "15px",
    fontWeight: "normal"
  };

  const answersStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  };

  const answerStyle = {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    border: "1px solid #999",
    borderRadius: "4px",
    backgroundColor: "white",
    cursor: "pointer",
    transition: "all 0.2s"
  };

  const answerHoverStyle = {
    backgroundColor: "#f0f0f0"
  };

  const answerSelectedStyle = {
    backgroundColor: "#e6f7ff",
    borderColor: "#1890ff"
  };

  const answerPrefixStyle = {
    marginRight: "10px",
    fontWeight: "bold",
    minWidth: "20px"
  };

  const navigationStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    padding: "15px 0",
    borderTop: "2px solid #333"
  };

  const pageInfoStyle = {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "16px"
  };

  const buttonStyle = {
    padding: "8px 16px",
    border: "1px solid #333",
    borderRadius: "4px",
    backgroundColor: "white",
    cursor: "pointer",
    fontSize: "14px"
  };

  const submitButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#1890ff",
    color: "white",
    border: "none",
    padding: "10px 20px"
  };

  // Start Screen styles - gradient background, không ảnh
  const startScreenStyle = {
    ...gradientStart,
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column"
  };

  const startButtonStyle = {
    padding: "15px 40px",
    fontSize: "20px",
    backgroundColor: "#ff6b6b",
    color: "white",
    border: "none",
    borderRadius: "25px",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
    transition: "transform 0.2s, background-color 0.2s"
  };

  // Finish Screen styles - gradient background, không ảnh
  const finishScreenStyle = {
    ...gradientFinish,
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px"
  };

  const finishContentStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: "40px",
    borderRadius: "15px",
    textAlign: "center",
    maxWidth: "500px",
    width: "90%",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
  };

  const finishButtonStyle = {
    padding: "12px 25px",
    fontSize: "16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    margin: "0 10px",
    fontWeight: "bold",
    transition: "transform 0.2s"
  };

  const homeButtonStyle = {
    ...finishButtonStyle,
    backgroundColor: "#2196F3"
  };
  if (gameState === "finished") {
    return (
      <LessonCompleteScreen
        payload={payload}
        correctCount={finalScore}
        totalQuestions={qs.length}
        onReplay={restartGame}
        onHome={handleReturnHome}
        height="75vh"
      />
    );
  }
  // Giao diện bài kiểm tra (gameState === 'playing')
  return (
    <div style={containerStyle}>
      <div style={paperStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>BÀI KIỂM TRA</h1>
          
        </div>

        {/* Questions */}
        <div>
          {currentQuestions.map((q, index) => {
            const globalIndex = startIndex + index;
            const selectedAnswer = answers[q.id];
            
            return (
              <div key={q.id} style={{ marginBottom: "30px" }}>
                <div style={questionTextStyle}>
                  <strong>Câu {globalIndex + 1}:</strong> {q.question_text}
                </div>
                {q.question_image && (
                  <GameQuestionImageZoom
                    src={questionImageUrl(q.question_image) || undefined}
                    alt="Hình câu hỏi"
                    thumbStyle={{ maxWidth: "200px", margin: "10px 0" }}
                  />
                )}
                <div style={answersStyle}>
                  {q.answers.map((a, ai) => {
                    const isSelected = selectedAnswer === ai;
                    const answerStyleFinal = {
                      ...answerStyle,
                      ...(isSelected ? answerSelectedStyle : {})
                    };

                    return (
                      <div
                        key={a.id || ai}
                        style={answerStyleFinal}
                        onClick={() => choose(q.id, ai)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            Object.assign(e.target.style, answerHoverStyle);
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = answerStyle.backgroundColor;
                          }
                        }}
                      >
                        <span style={answerPrefixStyle}>
                          {String.fromCharCode(65 + ai)}.
                        </span>
                        <span>{a.text || (a.image ? "Xem hình" : "")}</span>
                        {a.image && (
                          <img
                            src={questionImageUrl(a.image) || undefined}
                            alt=""
                            style={{ maxWidth: "100px", marginLeft: "10px" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={navigationStyle}>
          <div>
            {currentPage > 0 && (
              <button style={buttonStyle} onClick={goToPrevPage}>
                ← Trang trước
              </button>
            )}
          </div>
          
          <div style={pageInfoStyle}>
            Trang {currentPage + 1} / {totalPages}
          </div>
          
          <div>
            {currentPage < totalPages - 1 ? (
              <button style={buttonStyle} onClick={goToNextPage}>
                Trang sau →
              </button>
            ) : (
              <button style={submitButtonStyle} onClick={handleSubmit}>
                Nộp bài
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .answers-grid {
            grid-template-columns: 1fr !important;
          }
          .exam-stats {
            flex-direction: column;
            gap: 10px;
          }
          .nobita-profile {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}