// src/components/games/game10.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Game1({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("menu"); // menu, playing, ended
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userScore, setUserScore] = useState(payload?.user?.score ?? null);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 200, y: 150 });
  const [answered, setAnswered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [totalCorrect, setTotalCorrect] = useState(0);
  const finishSentRef = useRef(false);

  // Load images và audio
  const backgroundImage = useRef(new Image());
  const dartImage = useRef(new Image());
  const shootSound = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        setImagesLoaded(true);
      }
    };

    backgroundImage.current.onload = checkAllLoaded;
    dartImage.current.onload = checkAllLoaded;

    backgroundImage.current.src = `${publicUrl}/game-images/game10-background.png`;
    dartImage.current.src = `${publicUrl}/game-images/game10-dart.png`;

    // Khởi tạo âm thanh
    shootSound.current = new Audio(`${publicUrl}/game-noises/game10-shooting.mp3`);

    shootSound.current.preload = "auto";
    shootSound.current.volume = 0.7;

    // Fallback in case images are already cached
    if (backgroundImage.current.complete && dartImage.current.complete) {
      setImagesLoaded(true);
    }

    return () => {
      // Dọn dẹp khi component unmount
      if (shootSound.current) {
        shootSound.current.pause();
        shootSound.current = null;
      }
    };
  }, []);

  // Shuffle câu hỏi, giới hạn tối đa 15 câu
  const shuffledQuestions = useMemo(() => {
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
    return shuffle((questions || []).slice(0, limit));
  }, [questions]);

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  
  // Shuffle answers cho câu hỏi hiện tại
  const shuffledAnswers = useMemo(() => {
    if (!currentQuestion?.answers) return [];
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    return shuffle(currentQuestion.answers);
  }, [currentQuestion]);

  // Theo dõi vị trí chuột
  useEffect(() => {
    const handleMouseMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMousePos({ x, y });
      
      if (isZooming) {
        setZoomPosition({ x, y });
      }
    };

    if (gameState === "playing") {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isZooming, gameState]);

  // Vẽ các bia mục tiêu (4 đáp án)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentQuestion || !imagesLoaded || gameState !== "playing") return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas và vẽ background
    if (backgroundImage.current.complete) {
      ctx.drawImage(backgroundImage.current, 0, 0, width, height);
    } else {
      // Fallback background
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, width, height);
    }
    
    // Vẽ 4 bia ở 4 vị trí khác nhau
    const targetRadius = 30;
    const positions = [
      { x: width * 0.25, y: height * 0.3 },  // Trên trái
      { x: width * 0.75, y: height * 0.3 },  // Trên phải
      { x: width * 0.25, y: height * 0.7 },  // Dưới trái
      { x: width * 0.75, y: height * 0.7 }   // Dưới phải
    ];

    shuffledAnswers.forEach((answer, index) => {
      const pos = positions[index];
      if (!pos) return;

      // Vẽ bia bằng hình ảnh
      if (dartImage.current.complete) {
        const size = targetRadius * 2;
        ctx.drawImage(dartImage.current, pos.x - targetRadius, pos.y - targetRadius, size, size);
      } else {
        // Fallback: vẽ bia màu đỏ
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, targetRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FF6B6B';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Vẽ nội dung đáp án (text hoặc số)
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      
      if (answer.text) {
        // Hiển thị text, nếu dài quá thì cắt ngắn
        const displayText = answer.text.length > 10 
          ? answer.text.substring(0, 10) + '...' 
          : answer.text;
        ctx.strokeText(displayText, pos.x, pos.y);
        ctx.fillText(displayText, pos.x, pos.y);
      } else {
        // Hiển thị số thứ tự nếu không có text
        ctx.strokeText((index + 1).toString(), pos.x, pos.y);
        ctx.fillText((index + 1).toString(), pos.x, pos.y);
      }

      // Lưu vị trí và thông tin cho xử lý click
      answer.canvasPos = { ...pos, radius: targetRadius };
    });

    // Vẽ ống nhòm nếu đang zoom
    if (isZooming) {
      const zoomRadius = 60;
      const zoomLevel = 2;
      
      // Tạo mask cho ống nhòm
      ctx.save();
      
      // Vẽ phần tối xung quanh
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);
      
      // Tạo lỗ tròn cho ống nhòm
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(zoomPosition.x, zoomPosition.y, zoomRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      // Vẽ lại nội dung bên trong ống nhòm với zoom
      ctx.save();
      
      // Tạo clipping path cho ống nhòm
      ctx.beginPath();
      ctx.arc(zoomPosition.x, zoomPosition.y, zoomRadius, 0, Math.PI * 2);
      ctx.clip();
      
      // Áp dụng transform zoom
      ctx.translate(zoomPosition.x, zoomPosition.y);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.translate(-zoomPosition.x, -zoomPosition.y);
      
      // Vẽ lại background với zoom
      if (backgroundImage.current.complete) {
        ctx.drawImage(backgroundImage.current, 0, 0, width, height);
      } else {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, width, height);
      }
      
      // Vẽ lại các bia với zoom
      shuffledAnswers.forEach((answer, index) => {
        const pos = positions[index];
        if (!pos) return;

        // Tính toán vị trí mới cho zoom
        const scaledRadius = targetRadius * zoomLevel;

        // Vẽ bia zoom bằng hình ảnh
        if (dartImage.current.complete) {
          const size = scaledRadius * 2;
          ctx.drawImage(dartImage.current, pos.x - scaledRadius, pos.y - scaledRadius, size, size);
        } else {
          // Fallback
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, scaledRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#FF6B6B';
          ctx.fill();
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2 * zoomLevel;
          ctx.stroke();
        }

        // Text với font lớn hơn
        ctx.fillStyle = 'white';
        ctx.font = `bold ${14 * zoomLevel}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1 * zoomLevel;
        
        if (answer.text) {
          const displayText = answer.text.length > 10 
            ? answer.text.substring(0, 10) + '...' 
            : answer.text;
          ctx.strokeText(displayText, pos.x, pos.y);
          ctx.fillText(displayText, pos.x, pos.y);
        } else {
          ctx.strokeText((index + 1).toString(), pos.x, pos.y);
          ctx.fillText((index + 1).toString(), pos.x, pos.y);
        }
      });
      
      ctx.restore();
      
      // Vẽ viền ống nhòm
      ctx.beginPath();
      ctx.arc(zoomPosition.x, zoomPosition.y, zoomRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

  }, [currentQuestion, shuffledAnswers, isZooming, zoomPosition, answered, imagesLoaded, gameState]);

  // Phát âm thanh bắn
  const playShootSound = () => {
    if (shootSound.current) {
      // Reset âm thanh về đầu để có thể phát lại ngay lập tức
      shootSound.current.currentTime = 0;
      shootSound.current.play().catch(error => {
        console.log("Không thể phát âm thanh:", error);
      });
    }
  };

  // Xử lý click chuột để bắn bia
  const handleCanvasClick = (e) => {
    if (answered || !currentQuestion || gameState !== "playing") return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x = (e.clientX - rect.left) * scaleX;
    let y = (e.clientY - rect.top) * scaleY;
    
    // Nếu đang zoom, điều chỉnh tọa độ click
    if (isZooming) {
      const zoomRadius = 60;
      const zoomLevel = 2;
      
      // Kiểm tra xem click có trong vùng ống nhòm không
      const dx = x - zoomPosition.x;
      const dy = y - zoomPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= zoomRadius) {
        // Chuyển đổi tọa độ từ zoom về bình thường
        x = zoomPosition.x + (x - zoomPosition.x) / zoomLevel;
        y = zoomPosition.y + (y - zoomPosition.y) / zoomLevel;
      } else {
        // Click ngoài vùng ống nhòm - không làm gì
        return;
      }
    }
    
    // Tìm bia được bắn trúng
    const hitAnswer = shuffledAnswers.find(answer => {
      const pos = answer.canvasPos;
      if (!pos) return false;
      
      const dx = x - pos.x;
      const dy = y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) <= pos.radius;
    });
    
    if (hitAnswer) {
      // Phát âm thanh bắn khi có mục tiêu trúng
      playShootSound();
      handleAnswer(hitAnswer);
    } else {
      // Vẫn phát âm thanh bắn ngay cả khi không trúng mục tiêu
      playShootSound();
    }
  };

  // Xử lý click chuột phải để bật/tắt ống nhòm
  const handleRightClick = (e) => {
    e.preventDefault();
    if (answered || gameState !== "playing") return;
    
    setIsZooming(!isZooming);
  };

  // Gọi API cộng điểm (gộp một lần)
  async function incrementScoreOnServer(userId, delta = 1) {
    try {
      const resp = await api.post("/score/increment", { userId, delta });
      return resp.data;
    } catch (e) {
      console.warn("Lỗi gọi API cộng điểm:", e);
      return null;
    }
  }

  function handleAnswer(selectedAnswer) {
    if (!currentQuestion || answered || gameState !== "playing") return;

    setAnswered(true);
    const correct = selectedAnswer.correct;
    setIsCorrect(correct);
    
    if (correct) {
      setResultMessage("Chính xác! +1 điểm");
      setTotalCorrect(prev => prev + 1);
    } else {
      setResultMessage("Sai rồi! Thử câu tiếp theo nhé");
    }

    setShowResult(true);

    // Ẩn popup sau 2 giây và chuyển câu hỏi
    setTimeout(() => {
      setShowResult(false);
      
      if (currentQuestionIndex < shuffledQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setAnswered(false);
        setIsZooming(false);
      } else {
        // Đã hết câu hỏi
        setTimeout(() => {
          setGameState("ended");
        }, 500);
      }
    }, 2000);
  }

  // Bắt đầu game
  const startGame = () => {
    setGameState("playing");
    setCurrentQuestionIndex(0);
    setAnswered(false);
    setIsZooming(false);
    setShowResult(false);
    setTotalCorrect(0);
  };

  // Chơi lại
  const restartGame = () => {
    startGame();
  };

  // Khi kết thúc lần đầu, cộng tổng điểm một lần
  useEffect(() => {
    if (gameState === "ended" && !finishSentRef.current && totalCorrect > 0) {
      finishSentRef.current = true;
      const userId = payload?.user?.id ||
        (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

      onLessonComplete?.(totalCorrect);
      if (!userId) return;

      incrementScoreOnServer(userId, totalCorrect).then((data) => {
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
      });
    }
  }, [gameState, totalCorrect, payload]);

  // Render menu bắt đầu
  if (gameState === "menu") {
    return (
      <div style={{ 
        width: '800px', 
        margin: '0 auto', 
        textAlign: 'center', 
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        color: 'white',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>🎯 Xạ thủ tập bắn</h1>
        <p style={{ fontSize: '18px', marginBottom: '30px', maxWidth: '600px', margin: '0 auto 30px' }}>
          Hãy luyện tập để trở thành 1 xạ thủ giỏi bạn nhé!
        </p>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          marginBottom: '40px',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center', margin: '10px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>🎯</div>
            <div>Click trái để bắn bia</div>
          </div>
          <div style={{ textAlign: 'center', margin: '10px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>🔍</div>
            <div>Click phải để dùng ống nhòm</div>
          </div>
          <div style={{ textAlign: 'center', margin: '10px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>🏆</div>
            <div>Bắn trúng đáp án đúng để ghi điểm</div>
          </div>
        </div>

        <button
          onClick={startGame}
          style={{
            padding: '15px 40px',
            fontSize: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#45a049';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#4CAF50';
            e.target.style.transform = 'scale(1)';
          }}
        >
          BẮT ĐẦU CHƠI
        </button>

        {userScore !== null && (
          <div style={{ marginTop: '30px', fontSize: '16px', opacity: 0.8 }}>
            Điểm hiện tại: <b>{userScore}</b> | Điểm tuần: <b>{weekScore}</b>
          </div>
        )}
      </div>
    );
  }

  // Render màn hình kết thúc
  if (gameState === "ended") {
    return (
      <div style={{ 
        width: '800px', 
        margin: '0 auto', 
        textAlign: 'center', 
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        borderRadius: '12px',
        color: '#333',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>🎉 Hoàn Thành!</h1>
        
        <div style={{ 
          fontSize: '24px', 
          marginBottom: '30px',
          background: 'rgba(255,255,255,0.7)',
          padding: '20px',
          borderRadius: '10px',
          display: 'inline-block'
        }}>
          Số câu đúng: <b>{totalCorrect}</b> / <b>{shuffledQuestions.length}</b>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <button
            onClick={restartGame}
            style={{
              padding: '15px 40px',
              fontSize: '20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
              marginRight: '20px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#1976D2';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#2196F3';
              e.target.style.transform = 'scale(1)';
            }}
          >
            CHƠI LẠI
          </button>
        </div>

        {userScore !== null && (
          <div style={{ fontSize: '18px', marginTop: '20px' }}>
            Điểm tổng: <b>{userScore}</b> | Điểm tuần: <b>{weekScore}</b>
          </div>
        )}
      </div>
    );
  }

  // Render game đang chơi
  return (
    <div style={{ 
      width: '800px', 
      margin: '0 auto', 
      textAlign: 'center', 
      padding: '20px',
      background: '#f5f5f5',
      borderRadius: '12px',
      boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px',
        flexWrap: 'wrap'
      }}>
        <h3 style={{ margin: 0 }}>🎯 Game Bắn Bia</h3>
        <div style={{ fontSize: '14px' }}>
          Câu {currentQuestionIndex + 1}/{shuffledQuestions.length}
          {userScore !== null && (
            <span style={{ marginLeft: '15px' }}>
              Điểm: <b>{userScore}</b> | Tuần: <b>{weekScore}</b>
            </span>
          )}
        </div>
      </div>

      {/* Hiển thị câu hỏi */}
      {currentQuestion && (
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px',
          border: '2px solid #ddd',
          textAlign: 'left'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '16  px' }}>{currentQuestion.question_text}</h4>
          {currentQuestion.question_image && (
            <img
  src={
    currentQuestion.question_image.startsWith("http")
      ? currentQuestion.question_image // nếu đã là link đầy đủ
      : `http://210.245.52.119/gametoanhoc${currentQuestion.question_image}` // ghép IP + path DB
  }
  alt=""
  style={{ maxWidth: '100%', maxHeight: '150px', marginBottom: '10px' }}
/>

          )}
        </div>
      )}

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={760}
          height={400}
          onClick={handleCanvasClick}
          onContextMenu={handleRightClick}
          style={{
            border: '2px solid #333',
            borderRadius: '8px',
            cursor: answered ? 'default' : 'crosshair',
            backgroundColor: '#87CEEB'
          }}
        />
        
        {isZooming && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            🔍 Chế độ Ống nhòm - Click phải để thoát
          </div>
        )}

        {showResult && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: isCorrect ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)',
            color: 'white',
            padding: '15px 30px',
            borderRadius: '10px',
            fontSize: '20px',
            fontWeight: 'bold',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 100,
            textAlign: 'center',
            minWidth: '250px'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>
              {isCorrect ? '✓' : '✗'}
            </div>
            {resultMessage}
          </div>
        )}

        {answered && !showResult && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            Đang chuyển câu tiếp theo...
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: '15px', 
        fontSize: '12px', 
        color: '#666',
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap'
      }}>
        <div>• Click chuột trái để bắn bia</div>
        <div>• Click chuột phải để bật/tắt ống nhòm</div>
        <div>• Di chuyển chuột để di chuyển ống nhòm</div>
      </div>
    </div>
  );
}