// src/components/games/game2.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Game1({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];

  const [selected, setSelected] = useState({});
  const [userScore, setUserScore] = useState(payload?.user?.score ?? null);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
const fliesRef = useRef([]);
const [, forceRender] = useState(0); // chỉ để render

  const [showFarmer, setShowFarmer] = useState(false);
  const [showQuestionBox, setShowQuestionBox] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const gameAreaRef = useRef(null);
  const hitSoundRef = useRef(null);

  // Khởi tạo âm thanh
  useEffect(() => {
    hitSoundRef.current = new Audio(`${publicUrl}/game-noises/dap.mp3`);
  }, []);

  // Hàm xử lý đường dẫn ảnh - ĐÃ SỬA ĐỒNG BỘ
  const getImageSrc = (imgPath) => {
  if (!imgPath) return null;
  if (/^https?:\/\//i.test(imgPath)) return imgPath;
  if (imgPath.startsWith("/")) return imgPath;
  if (imgPath.startsWith("game-images/")) return `${publicUrl}/${imgPath}`;
  return `${publicUrl}/game-images/${imgPath}`;
};


const getQuestionImageSrc = (imgPath) => {
  if (!imgPath) return null;
  if (/^https?:\/\//i.test(imgPath)) return imgPath;
  return `http://210.245.52.119/gametoanhoc/${imgPath}`;
};


  // Shuffle câu trả lời, giới hạn tối đa 15 câu hỏi mỗi bài
  const qs = useMemo(() => {
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const total = (questions || []).length;
    const limit = Math.min(15, total);

    return (questions || []).slice(0, limit).map((q) => {
      const answers = Array.isArray(q.answers) ? shuffle(q.answers) : [];
      return { ...q, answers };
    });
  }, [questions]);

  const currentQuestion = qs[currentQuestionIndex];

  // Hiệu ứng khi bắt đầu game
  useEffect(() => {
    if (!gameStarted) return;

    // Reset hiệu ứng
    setShowFarmer(false);
    setShowQuestionBox(false);

    // Hiển thị background ngay lập tức
    // Sau 1s, farmer trôi vào
    const farmerTimer = setTimeout(() => {
      setShowFarmer(true);
    }, 0);

    // Sau 2s, hiển thị câu hỏi và ong
    const questionTimer = setTimeout(() => {
      setShowQuestionBox(true);
    }, 2000);

    return () => {
      clearTimeout(farmerTimer);
      clearTimeout(questionTimer);
    };
  }, [gameStarted, currentQuestionIndex]);

  // Khởi tạo vị trí và hướng di chuyển cho các con ong
  useEffect(() => {
  if (!showQuestionBox || !currentQuestion) return;

  fliesRef.current = currentQuestion.answers.map((answer, idx) => ({
    id: answer.id || idx,
    answer,
    answerIndex: idx,
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
    dx: (Math.random() - 0.5) * 0.6,
    dy: (Math.random() - 0.5) * 0.6,
    size: 80,
  }));

  forceRender(n => n + 1); // render 1 lần
}, [showQuestionBox, currentQuestionIndex]);


  // Di chuyển các con ong
  useEffect(() => {
  if (!showQuestionBox || selected[currentQuestion?.id] !== undefined) return;

  let rafId;

  const move = () => {
    const margin = 5;

    fliesRef.current.forEach(fly => {
      fly.x += fly.dx;
      fly.y += fly.dy;

      if (fly.x <= margin || fly.x >= 100 - margin) fly.dx *= -1;
      if (fly.y <= margin || fly.y >= 100 - margin) fly.dy *= -1;
    });

    forceRender(n => n + 1);
    rafId = requestAnimationFrame(move);
  };

  rafId = requestAnimationFrame(move);
  return () => cancelAnimationFrame(rafId);
}, [showQuestionBox, selected, currentQuestion]);


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

  function hitFly(fly) {
    const qId = currentQuestion.id;
    if (selected[qId] !== undefined) return; // already answered

    // Phát âm thanh đập ong
    if (hitSoundRef.current) {
      hitSoundRef.current.currentTime = 0;
      hitSoundRef.current.play().catch(e => console.log("Lỗi phát âm thanh:", e));
    }

    setSelected((prev) => ({ ...prev, [qId]: fly.answerIndex }));

    const isCorrect = fly.answer.correct;
  const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    if (isCorrect) {
      setCorrectCount(newCorrectCount);
    } else {
      setCorrectCount(newCorrectCount);
    }

    // Chuyển câu hỏi sau 1.5s
    setTimeout(() => {
      if (currentQuestionIndex < qs.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setShowQuestionBox(false);
        
        // Hiển thị lại câu hỏi sau 0.5s
        setTimeout(() => {
          setShowQuestionBox(true);
        }, 500);
      } else {
        // Kết thúc game: cộng tổng điểm một lần
        const userId =
          payload?.user?.id ||
          (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

        if (!userId) {
          console.warn("Người dùng chưa login — không thể cộng điểm trên server.");
        } else if (newCorrectCount > 0) {
          incrementScoreOnServer(userId, newCorrectCount).then((data) => {
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

            setGameStarted(false);
            setGameEnded(true);
          });
          onLessonComplete?.(newCorrectCount);
          return;
        }

        setGameStarted(false);
        setGameEnded(true);
        onLessonComplete?.(newCorrectCount);
      }
    }, 1500);
  }

  function startGame() {
    setGameStarted(true);
    setGameEnded(false);
    setSelected({});
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setShowFarmer(false);
    setShowQuestionBox(false);
  }

  function restartGame() {
    setGameStarted(true);
    setGameEnded(false);
    setSelected({});
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setShowFarmer(false);
    setShowQuestionBox(false);
  }

  function goHome() {
    window.location.href = "/gametoanhoc";
  }

  // Màn hình bắt đầu (responsive mobile)
  if (!gameStarted && !gameEnded) {
    return (
      <div
        className="game2-start-root"
        style={{
          width: "100%",
          minHeight: "70vh",
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
          .game2-start-card {
            width: 100%;
            max-width: min(600px, calc(100vw - 24px));
            box-sizing: border-box;
            background: white;
            padding: clamp(16px, 5vw, 36px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .game2-start-title {
            margin: 0 0 clamp(12px, 3vw, 20px);
            color: #2c3e50;
            font-size: clamp(1.1rem, 4.2vw, 1.65rem);
            line-height: 1.25;
            word-wrap: break-word;
          }
          .game2-start-scores {
            margin-bottom: clamp(12px, 3vw, 18px);
            font-size: clamp(0.85rem, 3.2vw, 1rem);
            line-height: 1.45;
            word-wrap: break-word;
          }
          .game2-start-rules {
            background: #ecf0f1;
            padding: clamp(12px, 3.5vw, 20px);
            border-radius: 12px;
            margin: 0 auto clamp(14px, 3vw, 20px);
            text-align: left;
          }
          .game2-start-rules h3 {
            margin: 0 0 8px;
            color: #34495e;
            font-size: clamp(0.95rem, 3.4vw, 1.1rem);
          }
          .game2-start-rules ul {
            margin: 0;
            padding-left: 1.15rem;
            line-height: 1.65;
            font-size: clamp(0.8rem, 2.8vw, 0.95rem);
          }
          .game2-start-btn {
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
        <div className="game2-start-card">
          <h2 className="game2-start-title">🪰 Game Đập Ruồi 🪰</h2>

          {userScore !== null && (
            <div className="game2-start-scores">
              <span style={{ marginRight: "clamp(8px, 2vw, 16px)" }}>
                Điểm tổng: <b style={{ color: "#e74c3c" }}>{userScore}</b>
              </span>
              <span>
                Điểm tuần: <b style={{ color: "#3498db" }}>{weekScore}</b>
              </span>
            </div>
          )}

          <div className="game2-start-rules">
            <h3>📜 Cách chơi:</h3>
            <ul>
              <li>Bạn hãy trả lời câu hỏi hiển thị trên màn hình</li>
              <li>Đập vào con ong có câu trả lời đúng</li>
              <li>Hãy cẩn thận không đập phải ong có câu trả lời sai</li>
              <li>
                Chủ đề gồm <b>{qs.length}</b> câu hỏi
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="game2-start-btn"
            onClick={startGame}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            🎮 Bắt đầu chơi
          </button>
        </div>
      </div>
    );
  }

  // Màn hình kết thúc (responsive — không tràn màn hình mobile)
  if (gameEnded) {
    return (
      <div
        className="game2-end-root"
        style={{
          width: "100%",
          minHeight: "70vh",
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
          .game2-end-card {
            width: 100%;
            max-width: min(600px, calc(100vw - 24px));
            box-sizing: border-box;
          }
          .game2-end-title {
            margin: 0 0 clamp(12px, 3vw, 20px);
            color: #2c3e50;
            font-size: clamp(1.15rem, 4.5vw, 1.75rem);
            line-height: 1.25;
            word-wrap: break-word;
          }
          .game2-end-score {
            margin: 0 0 clamp(16px, 4vw, 28px);
            font-size: clamp(0.95rem, 3.8vw, 1.35rem);
            line-height: 1.35;
            font-weight: bold;
            word-wrap: break-word;
            padding: 0 2px;
          }
          .game2-end-actions {
            display: flex;
            gap: clamp(10px, 2.5vw, 16px);
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
          }
          .game2-end-actions button {
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
            .game2-end-actions {
              flex-direction: column;
              align-items: stretch;
            }
            .game2-end-actions button {
              min-width: 0;
              width: 100%;
            }
          }
        `}</style>
        <div
          className="game2-end-card"
          style={{
            background: "white",
            padding: "clamp(16px, 5vw, 36px)",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <h2 className="game2-end-title">🏆 Kết thúc game! 🏆</h2>

          <div
            className="game2-end-score"
            style={{
              background: "linear-gradient(135deg, #ffd89b 0%, #19547b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Bạn đã trả lời đúng: {correctCount}/{qs.length} câu hỏi
          </div>

          <div className="game2-end-actions">
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
              🔄 Chơi lại
            </button>

            <button
              type="button"
              onClick={goHome}
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

  if (!currentQuestion) {
    return <div style={{ padding: 20 }}>Không có câu hỏi nào!</div>;
  }

  const isAnswered = selected[currentQuestion.id] !== undefined;
  const selectedAnswer = isAnswered ? currentQuestion.answers[selected[currentQuestion.id]] : null;

  return (
    <div
      style={{
        width: "100%",
        height: "70vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        .game2-farmer {
          position: absolute;
          bottom: 15px;
          right: clamp(12px, 4vw, 50px);
          width: 25%;
          height: auto;
          z-index: 2;
          pointer-events: none;
        }
        @media (max-width: 480px) {
          .game2-farmer {
            width: min(46vw, 200px);
            min-width: 130px;
            bottom: 8px;
            right: 6px;
          }
        }
        .game2-feedback {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          border-radius: 16px;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          z-index: 1000;
          text-align: center;
          box-sizing: border-box;
          max-width: min(92vw, 380px);
          width: max-content;
          padding: clamp(12px, 3vw, 22px) clamp(14px, 4vw, 28px);
          font-size: clamp(0.95rem, 3.6vw, 1.35rem);
          line-height: 1.35;
          word-wrap: break-word;
        }
        @media (max-width: 480px) {
          .game2-feedback {
            max-width: calc(100vw - 20px);
            width: auto;
            font-size: clamp(0.78rem, 3.4vw, 0.95rem);
            padding: 12px 14px;
            line-height: 1.4;
          }
        }
      `}</style>
      {/* Background chính - SỬA DÙNG getImageSrc */}
      <img
        src={getImageSrc("game2-background.png")}
        alt="background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0
        }}
      />

      {/* Người nông dân - SỬA DÙNG getImageSrc */}
      {showFarmer && (
        <img
          className="game2-farmer"
          src={getImageSrc("game2-farmer.png")}
          alt="farmer"
        />
      )}

      {/* Nền câu hỏi - SỬA DÙNG getImageSrc */}
      {showQuestionBox && (
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '5%',
          transform: 'translateY(-50%)',
          width: '90%',
          height: '60%',
          backgroundImage: `url(${getImageSrc("game2-nencauhoi.png")})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 15,
          boxSizing: 'border-box',
          zIndex: 3
        }}>
          {/* Hiển thị số câu */}
          <div style={{
            position: 'absolute',
            top: 5,
            left: 20,
            background: "rgba(207, 207, 207, 0.95)",
            color: "white",
            padding: "5px 15px",
            borderRadius: 5,
            fontSize: 16,
            fontWeight: 'bold'
          }}>
            Câu {currentQuestionIndex + 1}/{qs.length}
          </div>

          {/* Nội dung câu hỏi */}
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            
            
            margin: "20px",
            color: "#310808",
            maxWidth: '90%'
          }}>
            {currentQuestion.question_text}
          </div>

          {/* Ảnh câu hỏi - SỬA DÙNG getImageSrc */}
          {currentQuestion.question_image && (
            <img
  src={getQuestionImageSrc(currentQuestion.question_image)} // dùng riêng cho question
  alt="Minh họa câu hỏi"
  onError={(e) => {
    console.error(`Không thể tải ảnh: ${currentQuestion.question_image}`);
    e.currentTarget.onerror = null;
    e.currentTarget.style.display = "none";
  }}
  style={{
    maxWidth: "35%",
    maxHeight: "200px",
    borderRadius: 8,
    objectFit: "contain",
    marginTop: "10px",
    border: "2px solid #310808",
    backgroundColor: "white",
    padding: "5px"
  }}
/>

          )}
        </div>
      )}

      {/* Các con ong - SỬA DÙNG getImageSrc */}
      {showQuestionBox && fliesRef.current.map((fly) => (
  <div
    key={fly.id}
    onClick={() => !isAnswered && hitFly(fly)}
    style={{
      position: "absolute",
      left: `${fly.x}%`,
      top: `${fly.y}%`,
      width: fly.size,
      height: fly.size,
      transform: "translate(-50%, -50%)",
      cursor: isAnswered ? "default" : "pointer",
      opacity: isAnswered ? 0.6 : 1,
      pointerEvents: isAnswered ? "none" : "auto",
      zIndex: 4
    }}
  >
          <div style={{
            position: "relative",
            width: "100%",
            height: "100%",
          }}>
            {/* Con ong - SỬA DÙNG getImageSrc */}
            <img
              src={getImageSrc("game2-fly.gif")}
              alt="fly"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "300%",
                height: "300%",
                objectFit: "contain",
                filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))",
                pointerEvents: "none",
              }}
            />
            
            {/* Câu trả lời */}
            <div style={{
              position: "absolute",
              bottom: -10,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255, 255, 255, 0.2)",
              padding: "4px 8px",
              borderRadius: 6,
              
              fontSize: 20,
              fontWeight: 600,
              whiteSpace: "nowrap",
              maxWidth: 150,
              overflow: "hidden",
              textOverflow: "ellipsis",
              
            }}>
              {fly.answer.text || (fly.answer.image ? "🖼️" : "—")}
            </div>
          </div>
        </div>
      ))}

      {/* Hiển thị kết quả khi trả lời */}
      {isAnswered && (
        <div
          className="game2-feedback"
          style={{
            background: selectedAnswer?.correct
              ? "rgba(46, 204, 113, 0.95)"
              : "rgba(231, 76, 60, 0.95)",
          }}
        >
          {selectedAnswer?.correct
            ? "✅ Bạn đã đập trúng ruồi!"
            : "❌ Ôi không, bạn đập trúng ong rồi!"}
        </div>
      )}
    </div>
  );
}