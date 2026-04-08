// src/components/games/game8.jsx
import React, { useMemo, useState, useEffect } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Game1({ payload, onReturnHome, onLessonComplete }) {
  const questions = payload?.questions || [];
  const questionsPerPage = 5;

  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'finished'
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [userScore, setUserScore] = useState(payload?.user?.score ?? 0);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [timeLeft, setTimeLeft] = useState(3);
  const [finalScore, setFinalScore] = useState(0);

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

  // Đếm ngược khi đã nộp bài
  useEffect(() => {
    if (submitted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (submitted && timeLeft === 0) {
      setShowScore(true);
      calculateAndSubmitScore();
    }
  }, [submitted, timeLeft]);

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

  // Tính điểm và gửi lên server
  async function calculateAndSubmitScore() {
    let correctAnswers = 0;
    
    // Đếm số câu trả lời đúng
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
  }

  function choose(qId, ansIdx) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: ansIdx }));
  }

  function handleSubmit() {
    setSubmitted(true);
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
    setSubmitted(false);
    setShowScore(false);
    setTimeLeft(3);
    setFinalScore(0);
  }

  function handleReturnHome() {
    if (onReturnHome) {
      onReturnHome();
    }
  }

  // Container styles
  const containerStyle = {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  };

  // Paper styles (tờ giấy bài kiểm tra)
  const paperStyle = {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    border: "1px solid #ddd",
    marginBottom: "20px",
    position: "relative"
  };

  // Header styles
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

  const studentInfoStyle = {
    fontSize: "16px",
    margin: "5px 0"
  };

  // Question styles
  const questionStyle = {
    marginBottom: "25px",
    paddingBottom: "15px",
    borderBottom: "1px dashed #ccc"
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

  // Navigation styles
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

  // Start Screen styles
  const startScreenStyle = {
    backgroundImage: `url(${publicUrl}/game-images/game8-startgame.png)`,
    
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    width: "100%",
    height: "500px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingBottom: "100px"
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
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)"
  };

  // Result styles
  const resultContainerStyle = {
    textAlign: "center",
    padding: "40px 20px"
  };

  const checkingImageStyle = {
    maxWidth: "300px",
    margin: "20px auto",
    display: "block"
  };

  const timerStyle = {
    fontSize: "18px",
    fontWeight: "bold",
    margin: "20px 0",
    color: "#1890ff"
  };

  const scoreStyle = {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#1890ff",
    margin: "20px 0"
  };

  // Finish Screen styles
  const finishScreenStyle = {
    backgroundImage: `url(${publicUrl}/game-images/game8-finish.png)`,

    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    width: "100%",
    height: "600px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px"
  };

  const finishContentStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: "40px",
    borderRadius: "15px",
    textAlign: "center",
    maxWidth: "500px",
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
    fontWeight: "bold"
  };

  const homeButtonStyle = {
    ...finishButtonStyle,
    backgroundColor: "#2196F3"
  };

  // Màn hình Start
  if (gameState === 'start') {
    return (
      <div style={startScreenStyle}>
        <button 
          style={startButtonStyle}
          onClick={startGame}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.05)";
            e.target.style.backgroundColor = "#ff5252";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.backgroundColor = "#ff6b6b";
          }}
        >
          Bắt Đầu
        </button>
      </div>
    );
  }

  // Nếu đang chấm bài
  if (submitted && !showScore) {
    return (
      <div style={containerStyle}>
        <div style={paperStyle}>
          <div style={resultContainerStyle}>
            <h2 style={titleStyle}>Cô giáo đang chấm bài bạn vui lòng chờ nhé....</h2>
            <img 
              src={`${publicUrl}/game-images/game8-chambai.png`}
              alt="Đang chấm bài" 
              style={checkingImageStyle}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div style={timerStyle}>Sẽ có kết quả sau: {timeLeft} giây</div>
          </div>
        </div>
      </div>
    );
  }

  // Màn hình kết thúc
  if (gameState === 'finished') {
    return (
      <div style={finishScreenStyle}>
        <div style={finishContentStyle}>
          <h2 style={titleStyle}>Nhờ sự nỗ lực của bạn Nobita được:</h2>
          <div style={scoreStyle}>{finalScore} / {qs.length}</div>
          <div style={studentInfoStyle}>Điểm tổng: {userScore}</div>
          <div style={studentInfoStyle}>Điểm tuần: {weekScore}</div>
          <div style={{ marginTop: "30px" }}>
            <button 
              style={finishButtonStyle}
              onClick={restartGame}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
              }}
            >
              Làm Lại
            </button>
            <button 
              style={homeButtonStyle}
              onClick={handleReturnHome}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
              }}
            >
              Trang Chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Giao diện bài kiểm tra bình thường
  return (
    <div style={containerStyle}>
      <div style={paperStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>BÀI KIỂM TRA</h1>
          <div style={studentInfoStyle}>Mã đề : <strong>10</strong></div>
          <div style={studentInfoStyle}>Lớp : Hạt giống</div>
          <div style={studentInfoStyle}>Mã học sinh : 0123456</div>
        </div>

        {/* Questions */}
        <div style={questionStyle}>
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
              <button 
                style={submitButtonStyle} 
                onClick={() => {
                  handleSubmit();
                  setTimeout(() => setGameState('finished'), 10000);
                }}
              >
                Nộp bài
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSS cho responsive */}
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