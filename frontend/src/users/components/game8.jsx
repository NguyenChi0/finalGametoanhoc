// src/components/games/game8.jsx
import React, { useMemo, useState } from "react";
import api from "../../api";

export default function Game1({ payload, onReturnHome, onLessonComplete }) {
  const questions = payload?.questions || [];
  const questionsPerPage = 5;

  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'finished'
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [finalScore, setFinalScore] = useState(0);

  // Lấy thông tin người dùng
  const userName = payload?.user?.name || 
                   (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).name) || 
                   "Học sinh";
  const userClass = payload?.user?.class || "Chưa có lớp";

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
  // Màn hình Start (giống template game2)
  if (gameState === 'start') {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          padding: "clamp(10px, 3vw, 24px)",
          boxSizing: "border-box",
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <style>{`
          .game8-start-card {
            width: 100%;
            max-width: min(600px, calc(100vw - 24px));
            box-sizing: border-box;
            background: white;
            padding: clamp(16px, 5vw, 36px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .game8-start-title {
            margin: 0 0 clamp(12px, 3vw, 20px);
            color: #2c3e50;
            font-size: clamp(1.1rem, 4.2vw, 1.65rem);
            line-height: 1.25;
            word-wrap: break-word;
          }
          .game8-start-scores {
            margin-bottom: clamp(12px, 3vw, 18px);
            font-size: clamp(0.85rem, 3.2vw, 1rem);
            line-height: 1.45;
            word-wrap: break-word;
          }
          .game8-start-rules {
            background: #ecf0f1;
            padding: clamp(12px, 3.5vw, 20px);
            border-radius: 12px;
            margin: 0 auto clamp(14px, 3vw, 20px);
            text-align: left;
          }
          .game8-start-rules h3 {
            margin: 0 0 8px;
            color: #34495e;
            font-size: clamp(0.95rem, 3.4vw, 1.1rem);
          }
          .game8-start-rules ul {
            margin: 0;
            padding-left: 1.15rem;
            line-height: 1.65;
            font-size: clamp(0.8rem, 2.8vw, 0.95rem);
          }
          .game8-start-btn {
            width: 100%;
            max-width: 320px;
            padding: clamp(12px, 3vw, 16px) clamp(20px, 5vw, 40px);
            font-size: clamp(0.95rem, 3.5vw, 1.15rem);
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s;
            box-sizing: border-box;
          }
        `}</style>
        <div className="game8-start-card">
          <h2 className="game8-start-title">📝 BÀI KIỂM TRA</h2>

          {/* Hiển thị điểm tổng và điểm tuần nếu có */}
          {userScore !== null && (
            <div className="game8-start-scores">
              <span style={{ marginRight: "clamp(8px, 2vw, 16px)" }}>
                Điểm tổng: <b style={{ color: "#e74c3c" }}>{userScore}</b>
              </span>
              <span>
                Điểm tuần: <b style={{ color: "#3498db" }}>{weekScore}</b>
              </span>
            </div>
          )}

          <div className="game8-start-rules">
            <h3>📜 Cách chơi:</h3>
            <ul>
              <li>Trả lời các câu hỏi trắc nghiệm</li>
              <li>Chọn đáp án đúng nhất</li>
              <li>Mỗi câu chỉ được chọn một lần</li>
              <li>
                Bài gồm <b>{qs.length}</b> câu hỏi
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="game8-start-btn"
            onClick={startGame}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            🎮 Bắt đầu làm bài
          </button>
        </div>
      </div>
    );
  }

  // Màn hình kết thúc (giống template game2)
  if (gameState === 'finished') {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          padding: "clamp(10px, 3vw, 24px)",
          boxSizing: "border-box",
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <style>{`
          .game8-end-card {
            width: 100%;
            max-width: min(600px, calc(100vw - 24px));
            box-sizing: border-box;
          }
          .game8-end-title {
            margin: 0 0 clamp(12px, 3vw, 20px);
            color: #2c3e50;
            font-size: clamp(1.15rem, 4.5vw, 1.75rem);
            line-height: 1.25;
            word-wrap: break-word;
          }
          .game8-end-score {
            margin: 0 0 clamp(16px, 4vw, 28px);
            font-size: clamp(0.95rem, 3.8vw, 1.35rem);
            line-height: 1.35;
            font-weight: bold;
            word-wrap: break-word;
            padding: 0 2px;
          }
          .game8-end-actions {
            display: flex;
            gap: clamp(10px, 2.5vw, 16px);
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
          }
          .game8-end-actions button {
            box-sizing: border-box;
            padding: clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 28px);
            font-size: clamp(0.9rem, 3.2vw, 1.05rem);
            font-weight: 700;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s;
            flex: 1 1 auto;
            min-width: min(100%, 140px);
            max-width: 100%;
          }
          @media (max-width: 480px) {
            .game8-end-actions {
              flex-direction: column;
              align-items: stretch;
            }
            .game8-end-actions button {
              min-width: 0;
              width: 100%;
            }
          }
        `}</style>
        <div
          className="game8-end-card"
          style={{
            background: "white",
            padding: "clamp(16px, 5vw, 36px)",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <h2 className="game8-end-title">🏆 Kết thúc bài kiểm tra! 🏆</h2>

          <div
            className="game8-end-score"
            style={{
              background: "linear-gradient(135deg, #ffd89b 0%, #19547b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Bạn đã trả lời đúng: {finalScore}/{qs.length} câu hỏi
          </div>

          <div className="game8-end-actions">
            <button
              type="button"
              onClick={restartGame}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              🔄 Làm lại
            </button>

            <button
              type="button"
              onClick={handleReturnHome}
              style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              🏠 Trang chủ
            </button>
          </div>
        </div>
      </div>
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
                  <img
                    src={q.question_image}
                    alt="Hình câu hỏi"
                    style={{ maxWidth: "200px", margin: "10px 0" }}
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
                            src={a.image}
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