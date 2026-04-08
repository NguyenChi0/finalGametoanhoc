// Game 3: đáp án trên bóng bay trượt ngang; phi tiêu dưới bắn lên; sai → explode, đúng → pop
import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

const BALLOON_SRC = [
  "game3-ballon1.png",
  "game3-ballon4.png",
  "game3-balloon2.png",
  "game3-balloon3.png",
];

function balloonUrl(i) {
  return `${publicUrl}/game-images/${BALLOON_SRC[i % BALLOON_SRC.length]}`;
}

/** Ô trúng tâm ngắm: chỉ số đáp án + chỉ số ô trong track (bản nhân đôi) */
function findHitInfo(blockEls, centerScreenX) {
  for (let i = 0; i < blockEls.length; i++) {
    const r = blockEls[i].getBoundingClientRect();
    if (centerScreenX >= r.left && centerScreenX <= r.right) {
      return {
        ansIdx: parseInt(blockEls[i].dataset.idx || "0", 10),
        loopIndex: parseInt(blockEls[i].dataset.loopIndex || String(i), 10),
      };
    }
  }
  let bestI = 0;
  let bestDist = Infinity;
  for (let i = 0; i < blockEls.length; i++) {
    const r = blockEls[i].getBoundingClientRect();
    const mid = (r.left + r.right) / 2;
    const d = Math.abs(centerScreenX - mid);
    if (d < bestDist) {
      bestDist = d;
      bestI = i;
    }
  }
  const el = blockEls[bestI];
  return {
    ansIdx: parseInt(el.dataset.idx || "0", 10),
    loopIndex: parseInt(el.dataset.loopIndex || String(bestI), 10),
  };
}

export default function Game3({ payload, onLessonComplete }) {
  const questions = payload?.questions || [];

  const [selected, setSelected] = useState({});
  const [userScore, setUserScore] = useState(payload?.user?.score ?? null);
  const [weekScore, setWeekScore] = useState(payload?.user?.week_score ?? 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  /** idle: sẵn sàng | flying: bay lên | hit: trúng bóng — dừng và ẩn, không bay tiếp */
  const [dartPhase, setDartPhase] = useState("idle");
  const [trackPaused, setTrackPaused] = useState(false);
  /** hiệu ứng tại ô vừa trúng: nổ bom / nổ bóng */
  const [hitEffect, setHitEffect] = useState(null);

  const viewportRef = useRef(null);
  const fireTimersRef = useRef([]);
  /** Số vòng lặp full `answers` trong mỗi đoạn — đủ rộng để luôn phủ kín khung (không bị trắng một nửa) */
  const [segmentRepeat, setSegmentRepeat] = useState(3);

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

  useEffect(() => {
    return () => {
      fireTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    setDartPhase("idle");
  }, [currentQuestionIndex]);

  const currentQuestion = qs[currentQuestionIndex];
  const answers = currentQuestion?.answers || [];

  const segmentItems = useMemo(() => {
    const items = [];
    const reps = Math.max(2, segmentRepeat);
    for (let t = 0; t < reps; t++) {
      answers.forEach((answer, origIdx) => {
        items.push({ answer, origIdx, tile: t });
      });
    }
    return items;
  }, [answers, segmentRepeat]);

  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !answers.length) return;

    function compute() {
      const w = vp.clientWidth;
      const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 480px)").matches;
      const cell = narrow ? 80 : 96;
      const gap = 18;
      const L = answers.length;
      const oneRound = L * cell + Math.max(0, L - 1) * gap;
      const repeats = Math.max(2, Math.ceil((w + gap) / Math.max(oneRound, 1)) + 1);
      setSegmentRepeat(repeats);
    }

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(vp);
    return () => ro.disconnect();
  }, [answers, currentQuestionIndex]);

  async function incrementScoreOnServer(userId, delta = 1) {
    try {
      const resp = await api.post("/score/increment", { userId, delta });
      return resp.data;
    } catch (e) {
      console.warn("Lỗi gọi API cộng điểm:", e);
      return null;
    }
  }

  const handleFireClick = () => {
    const cq = qs[currentQuestionIndex];
    if (!cq || selected[cq.id] !== undefined || dartPhase !== "idle") return;

    const vp = viewportRef.current;
    if (!vp) return;

    const blocks = vp.querySelectorAll(".game3-answer-block");
    if (blocks.length === 0) return;

    const rect = vp.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const { ansIdx: rawAns, loopIndex: hitLoopIndex } = findHitInfo(blocks, centerX);
    const n = cq.answers?.length ?? 0;
    const ansIdx = n > 0 ? ((rawAns % n) + n) % n : 0;

    const qId = cq.id;
    const isLast = currentQuestionIndex >= qs.length - 1;

    fireTimersRef.current.forEach(clearTimeout);
    fireTimersRef.current = [];

    setTrackPaused(true);
    setDartPhase("flying");

    const t1 = setTimeout(() => {
      const q = qs.find((x) => x.id === qId);
      const a = q?.answers?.[ansIdx];
      const isCorrect = !!(a && a.correct);

      setSelected((prev) => ({ ...prev, [qId]: ansIdx }));
      setHitEffect({
        loopIndex: hitLoopIndex,
        kind: isCorrect ? "pop" : "explode",
      });
      setDartPhase("hit");

      let nextScore = 0;
      setCorrectCount((prev) => {
        nextScore = isCorrect ? prev + 1 : prev;
        return nextScore;
      });

      const t2 = setTimeout(() => {
        setHitEffect(null);
        setTrackPaused(false);

        if (!isLast) {
          setCurrentQuestionIndex((i) => i + 1);
          setSelected({});
        } else {
          const userId =
            payload?.user?.id ||
            (localStorage.getItem("user") && JSON.parse(localStorage.getItem("user")).id);

          if (!userId) {
            console.warn("Người dùng chưa login — không thể cộng điểm trên server.");
            setGameEnded(true);
            setGameStarted(false);
            onLessonComplete?.(nextScore);
          } else if (nextScore > 0) {
            incrementScoreOnServer(userId, nextScore).then((data) => {
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
              setGameEnded(true);
              setGameStarted(false);
            });
            onLessonComplete?.(nextScore);
          } else {
            setGameEnded(true);
            setGameStarted(false);
            onLessonComplete?.(nextScore);
          }
        }
      }, 1000);
      fireTimersRef.current.push(t2);
    }, 420);
    fireTimersRef.current.push(t1);
  };

  function startGame() {
    setGameStarted(true);
    setGameEnded(false);
    setCurrentQuestionIndex(0);
    setSelected({});
    setCorrectCount(0);
    setHitEffect(null);
    setDartPhase("idle");
  }

  function restartGame() {
    startGame();
  }

  function goHome() {
    window.location.href = "/gametoanhoc";
  }

  if (qs.length === 0) {
    return <div style={{ padding: 20 }}>Không có câu hỏi</div>;
  }

  // Màn bắt đầu — template giống game 2
  if (!gameStarted && !gameEnded) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "70vh",
          padding: "clamp(10px, 3vw, 24px)",
          boxSizing: "border-box",
          textAlign: "center",
          background: "linear-gradient(135deg, #e67e22 0%, #2980b9 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <style>{`
          .game3-start-card {
            width: 100%;
            max-width: min(600px, calc(100vw - 24px));
            box-sizing: border-box;
            background: white;
            padding: clamp(16px, 5vw, 36px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .game3-start-title {
            margin: 0 0 clamp(12px, 3vw, 20px);
            color: #2c3e50;
            font-size: clamp(1.1rem, 4.2vw, 1.65rem);
            line-height: 1.25;
          }
          .game3-start-rules {
            background: #ecf0f1;
            padding: clamp(12px, 3.5vw, 20px);
            border-radius: 12px;
            margin: 0 auto clamp(14px, 3vw, 20px);
            text-align: left;
          }
          .game3-start-rules h3 { margin: 0 0 8px; color: #34495e; font-size: clamp(0.95rem, 3.4vw, 1.1rem); }
          .game3-start-rules ul { margin: 0; padding-left: 1.15rem; line-height: 1.65; font-size: clamp(0.8rem, 2.8vw, 0.95rem); }
          .game3-start-btn {
            width: 100%;
            max-width: 320px;
            padding: clamp(12px, 3vw, 16px) clamp(20px, 5vw, 40px);
            font-size: clamp(0.95rem, 3.5vw, 1.15rem);
            font-weight: 700;
            background: linear-gradient(135deg, #e67e22 0%, #2980b9 100%);
            color: white;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            box-sizing: border-box;
          }
        `}</style>
        <div className="game3-start-card">
          <h2 className="game3-start-title">🎯 Ném phi tiêu 🎯</h2>
          <div className="game3-start-rules">
            <h3>📜 Cách chơi</h3>
            <ul>
              <li>Đọc câu hỏi, đáp án trên các <strong>bóng bay</strong> chạy ngang.</li>
              <li>Ô <strong>giữa khung</strong> là ô bạn chọn khi bấm <strong>Bắn</strong>.</li>
              <li>Trúng đáp án đúng để ghi điểm — hết <strong>{qs.length}</strong> câu là xong.</li>
            </ul>
          </div>
          <button type="button" className="game3-start-btn" onClick={startGame}>
            🎮 Bắt đầu chơi
          </button>
        </div>
      </div>
    );
  }

  // Màn kết thúc — template giống game 2
  if (gameEnded) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "70vh",
          padding: "clamp(10px, 3vw, 24px)",
          boxSizing: "border-box",
          textAlign: "center",
          background: "linear-gradient(135deg, #e67e22 0%, #2980b9 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <style>{`
          .game3-end-card { width: 100%; max-width: min(600px, calc(100vw - 24px)); box-sizing: border-box; }
          .game3-end-title { margin: 0 0 clamp(12px, 3vw, 20px); color: #2c3e50; font-size: clamp(1.15rem, 4.5vw, 1.75rem); }
          .game3-end-score { margin: 0 0 clamp(16px, 4vw, 28px); font-size: clamp(0.95rem, 3.8vw, 1.35rem); font-weight: bold; }
          .game3-end-actions { display: flex; gap: clamp(10px, 2.5vw, 16px); justify-content: center; flex-wrap: wrap; width: 100%; }
          .game3-end-actions button {
            box-sizing: border-box;
            padding: clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 28px);
            font-size: clamp(0.9rem, 3.2vw, 1.05rem);
            font-weight: 700;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            flex: 1 1 auto;
            min-width: min(100%, 140px);
            max-width: 100%;
          }
          @media (max-width: 480px) {
            .game3-end-actions { flex-direction: column; align-items: stretch; }
            .game3-end-actions button { min-width: 0; width: 100%; }
          }
        `}</style>
        <div
          className="game3-end-card"
          style={{
            background: "white",
            padding: "clamp(16px, 5vw, 36px)",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <h2 className="game3-end-title">🏆 Kết thúc game! 🏆</h2>
          <div
            className="game3-end-score"
            style={{
              background: "linear-gradient(135deg, #e67e22 0%, #2980b9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Bạn đã trả lời đúng: {correctCount}/{qs.length} câu hỏi
          </div>
          <div className="game3-end-actions">
            <button
              type="button"
              onClick={restartGame}
              style={{ background: "linear-gradient(135deg, #e67e22 0%, #2980b9 100%)", color: "white" }}
            >
              🔄 Chơi lại
            </button>
            <button
              type="button"
              onClick={goHome}
              style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", color: "white" }}
            >
              🏠 Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedAnswerIndex = selected[currentQuestion.id];
  const canFire = selectedAnswerIndex === undefined && dartPhase === "idle";

  /** Vùng chơi rộng/cao hơn template game 2 (70vh) để component thoáng hơn */
  const gameShellStyle = {
    width: "100%",
    height: "82vh",
    minHeight: "82vh",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  return (
    <div style={gameShellStyle}>
    <div style={styles.dartGame}>
      <style>{`
        @keyframes game3scroll {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        .game3-square {
          width: 100%;
          max-width: min(98vw, 960px);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          min-height: 0;
          height: 100%;
          box-sizing: border-box;
          --game3-play-gap: clamp(16px, 2.5vmin, 26px);
          --game3-balloon-gap: 18px;
        }
        .game3-play-column {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: var(--game3-play-gap);
          width: 100%;
          flex: 0 0 auto;
        }
        .game3-dart-wrap {
          flex: 0 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 88px;
          width: 100%;
          pointer-events: none;
        }
        .game3-dart-launcher {
          position: relative;
          left: auto;
          bottom: auto;
          width: 88px;
          height: 88px;
          margin-left: 0;
          z-index: 6;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game3-dart-launcher img {
          width: 78px;
          height: 78px;
          object-fit: contain;
          transform: rotate(0deg);
          transform-origin: center center;
          filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.4));
          /* Không transition khi về chỗ cũ — tránh hiệu ứng “bay ngược” xấu */
          transition: none;
        }
        .game3-dart-launcher.shooting img {
          transform: rotate(0deg) translateY(calc(-1 * min(38vw, 180px)));
          transition: transform 0.38s cubic-bezier(0.33, 1, 0.68, 1);
        }
        .game3-dart-launcher.dart-hit img {
          transform: rotate(0deg) translateY(calc(-1 * min(38vw, 180px)));
          opacity: 0;
          visibility: hidden;
          transition: none;
        }
        .game3-viewport {
          position: relative;
          flex: 0 0 auto;
          min-height: 132px;
          overflow: hidden;
          width: 100%;
          background: transparent;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: stretch;
        }
        .game3-track {
          display: flex;
          flex-direction: row;
          width: max-content;
          height: auto;
          flex: 0 0 auto;
          align-items: center;
          gap: var(--game3-balloon-gap);
          padding: 8px 0;
          box-sizing: border-box;
          animation: game3scroll 14s linear infinite;
          will-change: transform;
          backface-visibility: hidden;
        }
        .game3-track.paused {
          animation-play-state: paused;
        }
        /* Hai đoạn giống hệt nhau → -50% khớp mép nối, không bị “mất” bóng giữa chừng */
        .game3-track-seg {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: var(--game3-balloon-gap);
          flex: 0 0 auto;
          box-sizing: border-box;
        }
        .game3-answer-block {
          flex: 0 0 auto;
          position: relative;
          width: 96px;
          height: 118px;
          border-radius: 14px;
          overflow: hidden;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .game3-balloon-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center bottom;
          pointer-events: none;
        }
        .game3-hit-fx {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          z-index: 2;
          pointer-events: none;
        }
        .game3-answer-label {
          position: relative;
          z-index: 1;
          font-weight: 800;
          font-size: 1.42rem;
          line-height: 1;
          color: #fff;
          text-shadow: 0 1px 3px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.5);
          padding: 0 4px;
          margin-bottom: 10px;
        }
        .game3-answer-label img {
          max-width: 100%;
          max-height: 56px;
          object-fit: contain;
          vertical-align: middle;
        }
        @media (max-width: 480px) {
          .game3-square { max-width: min(98vw, 560px); --game3-play-gap: 14px; }
          .game3-answer-block {
            width: 80px;
            height: 100px;
          }
          .game3-answer-label { font-size: 1.2rem; }
          .game3-viewport { min-height: 110px; }
          .game3-dart-launcher {
            width: 76px;
            height: 76px;
          }
          .game3-dart-launcher img {
            width: 68px;
            height: 68px;
          }
          .game3-dart-wrap {
            min-height: 76px;
          }
          .game3-dart-launcher.shooting img {
            transform: rotate(0deg) translateY(calc(-1 * min(34vw, 168px)));
          }
          .game3-dart-launcher.dart-hit img {
            transform: rotate(0deg) translateY(calc(-1 * min(34vw, 168px)));
          }
        }
      `}</style>

      <h3 style={styles.heading}>Game Ném Phi Tiêu</h3>
      <p style={styles.hint}>
        Đáp án trên <strong>bóng bay</strong> chạy ngang. Bấm <strong>Bắn</strong> — ô giữa khung là ô chọn.
      </p>

      <div style={styles.gameInfo}>
        <span>
          Câu {currentQuestionIndex + 1}/{qs.length}
        </span>
      </div>

      <div style={styles.gameSquare} className="game3-square">
        <div style={styles.questionInSquare}>
          <div style={styles.questionTextCompact}>{currentQuestion.question_text}</div>
          {currentQuestion.question_image && (
            <img src={currentQuestion.question_image} alt="" style={styles.questionImageCompact} />
          )}
        </div>

        <div className="game3-play-column">
          <div ref={viewportRef} className="game3-viewport">
            <div className={`game3-track${trackPaused || dartPhase !== "idle" ? " paused" : ""}`}>
              {[0, 1].map((seg) => (
                <div key={seg} className="game3-track-seg" aria-hidden={seg === 1 ? true : undefined}>
                  {segmentItems.map((item, j) => {
                    const { answer, origIdx } = item;
                    const loopIndex = seg * segmentItems.length + j;
                    const showFx =
                      hitEffect &&
                      hitEffect.loopIndex === loopIndex &&
                      (hitEffect.kind === "explode" || hitEffect.kind === "pop");
                    const fxSrc =
                      hitEffect?.kind === "explode"
                        ? `${publicUrl}/game-images/game3-explode.png`
                        : `${publicUrl}/game-images/game3-pop.png`;

                    return (
                      <div
                        key={`${seg}-${j}`}
                        className="game3-answer-block"
                        data-idx={origIdx}
                        data-loop-index={loopIndex}
                      >
                        {!showFx && (
                          <>
                            <img
                              className="game3-balloon-bg"
                              src={balloonUrl(origIdx)}
                              alt=""
                              draggable={false}
                            />
                            <span className="game3-answer-label">
                              {answer.text ? (
                                answer.text
                              ) : answer.image ? (
                                <img src={answer.image} alt="" />
                              ) : (
                                "—"
                              )}
                            </span>
                          </>
                        )}
                        {showFx && <img className="game3-hit-fx" src={fxSrc} alt="" draggable={false} />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="game3-dart-wrap">
            <div
              key={`dart-${currentQuestion.id}-${currentQuestionIndex}`}
              className={`game3-dart-launcher${dartPhase === "flying" ? " shooting" : ""}${
                dartPhase === "hit" ? " dart-hit" : ""
              }`}
            >
              <img src={`${publicUrl}/game-images/game3-dart.png`} alt="" />
            </div>
          </div>

          <div style={styles.fireWrap} className="game3-fire-wrap">
            <button
              type="button"
              disabled={!canFire}
              onClick={handleFireClick}
              style={{
                ...styles.fireBtn,
                opacity: canFire ? 1 : 0.55,
                cursor: canFire ? "pointer" : "not-allowed",
              }}
            >
              {dartPhase === "flying" ? "Đang bắn…" : "Bắn"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

const styles = {
  dartGame: {
    position: "relative",
    textAlign: "center",
    padding: "clamp(12px, 2vw, 20px) clamp(10px, 2.5vw, 24px)",
    width: "100%",
    maxWidth: "100%",
    height: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  heading: {
    margin: "0 0 4px",
    fontSize: "clamp(1.05rem, 3.2vw, 1.3rem)",
    fontWeight: 700,
  },
  hint: {
    fontSize: "clamp(0.78rem, 2.1vw, 0.88rem)",
    color: "#555",
    margin: "0 0 8px",
    padding: "0 4px",
    lineHeight: 1.35,
  },
  gameInfo: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "10px",
    padding: "2px 6px",
    fontSize: "clamp(0.8rem, 2.2vw, 0.92rem)",
    fontWeight: 600,
  },
  gameSquare: {
    background: "transparent",
    border: "none",
    boxShadow: "none",
    padding: 0,
  },
  questionInSquare: {
    flex: "0 0 auto",
    flexShrink: 0,
    paddingBottom: "clamp(14px, 3.5vmin, 24px)",
  },
  questionTextCompact: {
    fontSize: "clamp(0.95rem, 3.8vmin, 1.35rem)",
    fontWeight: "bold",
    lineHeight: 1.2,
    marginBottom: "6px",
  },
  questionImageCompact: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "min(48vw, 220px)",
    height: "auto",
    marginTop: "6px",
    marginLeft: "auto",
    marginRight: "auto",
    borderRadius: "8px",
    objectFit: "contain",
  },
  fireWrap: {
    flex: "0 0 auto",
    textAlign: "center",
    marginTop: 0,
    paddingTop: 0,
  },
  fireBtn: {
    background: "linear-gradient(180deg, #e67e22, #d35400)",
    color: "#fff",
    border: "none",
    padding: "12px 40px",
    borderRadius: "999px",
    fontSize: "clamp(1rem, 3vw, 1.2rem)",
    fontWeight: "800",
    boxShadow: "0 4px 14px rgba(211, 84, 0, 0.45)",
  },
  gameOver: {
    textAlign: "center",
    padding: "40px 20px",
  },
  gameWon: {
    textAlign: "center",
    padding: "40px 20px",
  },
  finalScores: {
    fontSize: "1rem",
    marginTop: "12px",
    marginBottom: "8px",
  },
  playAgainBtn: {
    background: "#3498db",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "20px",
    transition: "background 0.3s ease",
  },
};
