// src/pages/leaderboard2.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Leaderboard() {
  const [tab, setTab] = useState("all");
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await api.get(`/leaderboard/${tab}`);
        setLeaders(res.data.slice(0, 5));
      } catch (err) {
        console.error("Lỗi khi lấy leaderboard:", err);
      }
    };
    fetchLeaders();
  }, [tab]);

  const getRankStyle = (index) => {
    const base = {
      ...styles.row,
      position: "relative",
      overflow: "hidden",
    };

    switch (index) {
      case 0:
        return {
          ...base,
          borderRadius: 0,
          padding: 0,
          border: "1px solid rgba(210, 165, 35, 0.95)",
          background: "#f0c14a",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          color: "#1a2433",
        };
      case 1:
        return {
          ...base,
          borderRadius: 0,
          padding: 0,
          border: "1px solid rgba(45, 120, 165, 0.92)",
          background: "#4a9ec4",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          color: "#fff",
        };
      case 2:
        return {
          ...base,
          borderRadius: 0,
          padding: 0,
          border: "1px solid rgba(180, 195, 210, 0.95)",
          background: "#e8edf2",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          color: "#1a2433",
        };
      case 3:
      case 4:
        return {
          ...base,
          border: "1px solid rgba(130, 82, 48, 0.92)",
          background: "#a86b3a",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          color: "#fff",
        };
      default:
        return {
          ...base,
          border: "1px solid rgba(255, 255, 255, 0.55)",
          background: "rgba(255, 255, 255, 0.42)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#1a2433",
        };
    }
  };

  // Hàm lấy đường dẫn ảnh cho từng hạng
  const getRankImage = (index) => {
    const baseUrl = publicUrl;
    
    switch (index) {
      case 0:
        return `${baseUrl}/ranking-images/leaderboard-top1.png`;
      case 1:
        return `${baseUrl}/ranking-images/leaderboard-top2.png`;
      case 2:
        return `${baseUrl}/ranking-images/leaderboard-top3.png`;
      case 3:
        return `${baseUrl}/ranking-images/leaderboard-top4.png`;
      case 4:
        return `${baseUrl}/ranking-images/leaderboard-top5.png`;
      default:
        return null;
    }
  };

  return (
    <div className="leaderboard2-root" style={styles.container}>
      {/* CSS Styles */}
      <style>
        {`
          .leaderboard-item {
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .leaderboard-item:not(.top1):not(.top2):not(.top3):not(.top4):not(.top5):hover {
            transform: translateX(3px);
            background: rgba(255, 255, 255, 0.58) !important;
          }

          .top1:hover,
          .top2:hover,
          .top3:hover,
          .top4:hover,
          .top5:hover {
            transform: translateX(3px);
            filter: brightness(1.04);
          }

          /* Top 1 — vàng */
          .top1 {
            background: #f0c14a !important;
            border: 1px solid rgba(210, 165, 35, 0.95) !important;
          }

          .top1::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.65),
              transparent
            );
            animation: rowShineSweep 3s ease-in-out infinite;
            z-index: 1;
          }

          /* Container cho các chấm sáng vàng bay top1 */
          .top1::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            pointer-events: none;
          }

          .stars-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }

          .star {
            position: absolute;
            width: 4px;
            height: 4px;
            background: radial-gradient(circle at 35% 35%, #fff 0%, #FFD700 50%, #e8b00c 100%);
            border-radius: 50%;
            box-shadow: 0 0 4px #FFD700, 0 0 10px rgba(255, 215, 0, 0.85);
            opacity: 0;
            animation: starFloat 4s ease-in-out infinite;
          }

          .star:nth-child(1) { top: 20%; left: 10%; animation-delay: 0s; }
          .star:nth-child(2) { top: 60%; left: 80%; animation-delay: 1s; }
          .star:nth-child(3) { top: 80%; left: 30%; animation-delay: 2s; }
          .star:nth-child(4) { top: 30%; left: 70%; animation-delay: 3s; }
          .star:nth-child(5) { top: 70%; left: 20%; animation-delay: 1.5s; }

          /* Top 2 — xanh nước biển */
          .top2 {
            background: #4a9ec4 !important;
            border: 1px solid rgba(45, 120, 165, 0.92) !important;
          }

          .top2 .silver-crystal {
            background: #fff;
            box-shadow: 0 0 6px #fff, 0 0 12px rgba(180, 230, 255, 0.95);
          }

          .top2::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.6),
              transparent
            );
            animation: rowShineSweep 3s ease-in-out infinite;
            z-index: 1;
          }

          /* Container cho các chấm sáng bạc bay top2 */
          .top2-effects {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }

          .silver-crystal {
            position: absolute;
            width: 2px;
            height: 2px;
            background: #C0C0C0;
            border-radius: 50%;
            box-shadow: 0 0 4px #C0C0C0, 0 0 8px #C0C0C0;
            opacity: 0;
            animation: crystalFloat 3s ease-in-out infinite;
          }

          .silver-crystal:nth-child(1) { top: 10%; left: 15%; animation-delay: 0s; }
          .silver-crystal:nth-child(2) { top: 70%; left: 85%; animation-delay: 1s; }
          .silver-crystal:nth-child(3) { top: 85%; left: 25%; animation-delay: 2s; }
          .silver-crystal:nth-child(4) { top: 25%; left: 75%; animation-delay: 1.5s; }

          /* Top 3 — trắng bạc */
          .top3 {
            background: #e8edf2 !important;
            border: 1px solid rgba(180, 195, 210, 0.95) !important;
          }

          .top3 .silver-mote {
            position: absolute;
            width: 2px;
            height: 2px;
            background: #eceff1;
            border-radius: 50%;
            box-shadow: 0 0 4px #fff, 0 0 8px rgba(144, 164, 174, 0.9);
            opacity: 0;
            animation: crystalFloat 3.5s ease-in-out infinite;
          }

          .top3 .silver-mote:nth-child(1) { top: 12%; left: 12%; animation-delay: 0s; }
          .top3 .silver-mote:nth-child(2) { top: 72%; left: 88%; animation-delay: 0.8s; }
          .top3 .silver-mote:nth-child(3) { top: 88%; left: 22%; animation-delay: 1.6s; }
          .top3 .silver-mote:nth-child(4) { top: 28%; left: 78%; animation-delay: 2.2s; }

          .top3::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.5),
              transparent
            );
            animation: rowShineSweep 3s ease-in-out infinite;
            z-index: 1;
          }

          .top3-effects {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }

          .bronze-leaf {
            position: absolute;
            width: 2px;
            height: 2px;
            background: #CD7F32;
            border-radius: 50%;
            box-shadow: 0 0 4px #CD7F32, 0 0 8px #CD7F32;
            opacity: 0;
            animation: leafFloat 4s ease-in-out infinite;
          }

          .bronze-leaf:nth-child(1) { top: 15%; left: 10%; animation-delay: 0s; }
          .bronze-leaf:nth-child(2) { top: 65%; left: 90%; animation-delay: 1.2s; }
          .bronze-leaf:nth-child(3) { top: 80%; left: 20%; animation-delay: 2.4s; }
          .bronze-leaf:nth-child(4) { top: 30%; left: 80%; animation-delay: 1.8s; }

          /* Top 4–5 — đồng */
          .top4,
          .top5 {
            background: #a86b3a !important;
            border: 1px solid rgba(130, 82, 48, 0.92) !important;
          }

          .top4::before,
          .top5::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.5),
              transparent
            );
            animation: rowShineSweep 3s ease-in-out infinite;
            z-index: 1;
          }

          .top4-effects,
          .top5-effects {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }

          /* Một nhịp flash chung (Top 1–5 có ::before) */
          @keyframes rowShineSweep {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
          }

          /* Sao top 1: bay lên → sáng mạnh giữa đường → biến mất */
          @keyframes starFloat {
            0% {
              transform: translateY(0) translateX(0) rotate(0deg);
              opacity: 0;
              filter: brightness(1);
              box-shadow: 0 0 4px #FFD700, 0 0 8px rgba(255, 215, 0, 0.5);
            }
            22% {
              opacity: 1;
              filter: brightness(1.25);
              box-shadow:
                0 0 6px #fff,
                0 0 14px #FFD700,
                0 0 22px rgba(255, 215, 0, 0.95);
            }
            50% {
              transform: translateY(-15px) translateX(8px) rotate(180deg);
              opacity: 1;
              filter: brightness(1.45);
              box-shadow:
                0 0 8px #fff,
                0 0 20px #FFD700,
                0 0 28px rgba(255, 255, 255, 0.9);
            }
            72% {
              opacity: 0.4;
              filter: brightness(1.05);
              box-shadow: 0 0 6px rgba(255, 215, 0, 0.45);
            }
            100% {
              transform: translateY(-30px) translateX(15px) rotate(360deg);
              opacity: 0;
              filter: brightness(0.85);
              box-shadow: 0 0 2px rgba(255, 215, 0, 0.15);
            }
          }

          @keyframes crystalFloat {
            0% {
              transform: translateY(0) translateX(0) rotate(0deg);
              opacity: 0;
            }
            25% { opacity: 0.8; }
            50% {
              transform: translateY(-12px) translateX(6px) rotate(120deg);
              opacity: 0.6;
            }
            75% { opacity: 0.4; }
            100% {
              transform: translateY(-24px) translateX(12px) rotate(240deg);
              opacity: 0;
            }
          }

          @keyframes leafFloat {
            0% {
              transform: translateY(0) translateX(0) rotate(0deg);
              opacity: 0;
            }
            20% { opacity: 0.7; }
            40% {
              transform: translateY(-10px) translateX(4px) rotate(90deg);
              opacity: 0.5;
            }
            60% { opacity: 0.3; }
            80% {
              transform: translateY(-20px) translateX(8px) rotate(180deg);
              opacity: 0.1;
            }
            100% {
              transform: translateY(-24px) translateX(10px) rotate(270deg);
              opacity: 0;
            }
          }

          /* Đảm bảo nội dung hiển thị trên cùng các hiệu ứng nền */
          .rank,
          .name,
          .score {
            position: relative;
            z-index: 2;
          }

          /* Top 1–3: thẻ ticket — không bo góc, điểm vùng khía chữ V */
          .top1,
          .top2,
          .top3 {
            border-radius: 0 !important;
          }

          .lb-top-body {
            display: flex;
            flex-direction: row;
            align-items: stretch;
            width: 100%;
            min-height: 56px;
            position: relative;
            z-index: 2;
          }

          .lb-top-main {
            flex: 1;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 12px;
            min-width: 0;
            padding: 10px 6px 10px 12px;
          }

          .lb-top-main .rank {
            flex-shrink: 0;
            width: 48px;
            min-width: 48px;
          }

          .lb-top-main .name {
            flex: 1;
            min-width: 0;
          }

          .lb-top-score {
            flex: 0 0 96px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.95rem;
            line-height: 1.2;
            text-align: center;
            clip-path: polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%);
            -webkit-clip-path: polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%);
            padding: 8px 10px 8px 14px;
            box-sizing: border-box;
            position: relative;
            z-index: 2;
          }

          .top1 .lb-top-score {
            background: rgba(0, 0, 0, 0.1);
            color: #1a2433;
          }

          .top2 .lb-top-score {
            background: rgba(0, 0, 0, 0.14);
            color: #fff;
          }

          .top3 .lb-top-score {
            background: rgba(0, 0, 0, 0.06);
            color: #1a2433;
          }

          
        `}
      </style>

      <h2 style={styles.title}>🏆 Bảng xếp hạng</h2>

      <div style={styles.tabs}>
        <button
          style={tab === "week" ? styles.activeTab : styles.tab}
          onClick={() => setTab("week")}
        >
          Top Tuần
        </button>
        <button
          style={tab === "all" ? styles.activeTab : styles.tab}
          onClick={() => setTab("all")}
        >
          Top Tất Cả
        </button>
      </div>

      <div style={styles.table}>
        {leaders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "8px", color: "rgba(26, 36, 51, 0.65)", fontSize: "0.9rem" }}>
            Không có dữ liệu
          </div>
        ) : (
          leaders.map((user, index) => (
            <div
              key={user.username ?? index}
              className={`leaderboard-item ${
                index === 0
                  ? "top1"
                  : index === 1
                    ? "top2"
                    : index === 2
                      ? "top3"
                      : index === 3
                        ? "top4"
                        : index === 4
                          ? "top5"
                          : ""
              }`}
              style={getRankStyle(index)}
            >
              {/* Hiệu ứng sao cho top1 */}
              {index === 0 && (
                <div className="stars-container">
                  <div className="star"></div>
                  <div className="star"></div>
                  <div className="star"></div>
                  <div className="star"></div>
                  <div className="star"></div>
                </div>
              )}

              {/* Hiệu ứng crystal cho top2 */}
              {index === 1 && (
                <div className="top2-effects">
                  <div className="silver-crystal"></div>
                  <div className="silver-crystal"></div>
                  <div className="silver-crystal"></div>
                  <div className="silver-crystal"></div>
                </div>
              )}

              {/* Hiệu ứng bạc cho top 3 */}
              {index === 2 && (
                <div className="top3-effects">
                  <div className="silver-mote"></div>
                  <div className="silver-mote"></div>
                  <div className="silver-mote"></div>
                  <div className="silver-mote"></div>
                </div>
              )}

              {/* Hạt đồng cho top 4–5 */}
              {index === 3 && (
                <div className="top4-effects">
                  <div className="bronze-leaf"></div>
                  <div className="bronze-leaf"></div>
                  <div className="bronze-leaf"></div>
                  <div className="bronze-leaf"></div>
                </div>
              )}
              {index === 4 && (
                <div className="top5-effects">
                  <div className="bronze-leaf"></div>
                  <div className="bronze-leaf"></div>
                  <div className="bronze-leaf"></div>
                  <div className="bronze-leaf"></div>
                </div>
              )}

              {index < 3 ? (
                <div className="lb-top-body">
                  <div className="lb-top-main">
                    <div className="rank" style={styles.rank}>
                      {index < 5 ? (
                        <img
                          src={getRankImage(index)}
                          alt={`Top ${index + 1}`}
                          className="rankImage"
                          style={styles.rankImage}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "block";
                          }}
                        />
                      ) : (
                        `#${index + 1}`
                      )}
                      {index < 5 && (
                        <span
                          style={{
                            display: "none",
                            fontSize: "14px",
                            fontWeight: "bold",
                          }}
                        >
                          #{index + 1}
                        </span>
                      )}
                    </div>
                    <div className="name" style={styles.name}>
                      <Link
                        to={`/profile/${user.username}`}
                        style={styles.profileLink}
                      >
                        {user.username}
                      </Link>
                    </div>
                  </div>
                  <div className="lb-top-score">
                    {tab === "week"
                      ? user.week_score ?? 0
                      : user.score ?? 0}
                  </div>
                </div>
              ) : (
                <>
                  <div className="rank" style={styles.rank}>
                    {index < 5 ? (
                      <img
                        src={getRankImage(index)}
                        alt={`Top ${index + 1}`}
                        className="rankImage"
                        style={styles.rankImage}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "block";
                        }}
                      />
                    ) : (
                      `#${index + 1}`
                    )}
                    {index < 5 && (
                      <span
                        style={{
                          display: "none",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        #{index + 1}
                      </span>
                    )}
                  </div>
                  <div className="name" style={styles.name}>
                    <Link
                      to={`/profile/${user.username}`}
                      style={styles.profileLink}
                    >
                      {user.username}
                    </Link>
                  </div>
                  <div className="score" style={styles.score}>
                    {tab === "week"
                      ? user.week_score ?? 0
                      : user.score ?? 0}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    margin: "20px auto",
    width: "100%",
    maxWidth: "420px",
    boxSizing: "border-box",
    background: "rgba(255, 255, 255, 0.38)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.65)",
    padding: "15px",
    boxShadow: "0 8px 32px rgba(74, 158, 196, 0.18)",
  },
  title: {
    textAlign: "center",
    color: "#1a4a5c",
    marginBottom: "15px",
    fontSize: "1.5rem",
    fontWeight: "700",
    textShadow: "none",
  },
  tabs: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "15px",
    gap: "0.5rem",
  },
  tab: {
    background: "rgba(255, 255, 255, 0.55)",
    border: "1px solid rgba(74, 158, 196, 0.35)",
    padding: "8px 16px",
    borderRadius: "0px",
    cursor: "pointer",
    fontWeight: "600",
    color: "#2c5f73",
    transition: "all 0.3s ease",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    fontSize: "0.9rem",
  },
  activeTab: {
    background: "linear-gradient(45deg, #ff6b6b, #ee5a24)",
    color: "#fff",
    border: "none",
    padding: "8px 16px", // Giảm từ 12px 24px
    borderRadius: "0px", // Giảm từ 12px
    cursor: "pointer",
    fontWeight: "600",
    transform: "translateY(-1px)", // Giảm hiệu ứng nâng
    boxShadow: "0 4px 12px rgba(255, 107, 107, 0.4)", // Giảm shadow
    fontSize: "0.9rem", // Thêm font size nhỏ hơn
  },
  table: {
    display: "flex",
    flexDirection: "column",
    gap: "8px", // Giảm từ 12px
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: "0px", // Giảm từ 12px
    padding: "1px 3px", // Giảm padding
    position: "relative",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)",
    minHeight: "45px", // Thêm chiều cao tối thiểu để đảm bảo tỷ lệ
  },
  rank: {
    width: "50px", // Giảm từ 70px
    fontWeight: "bold",
    fontSize: "14px", // Giảm từ 16px
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px", // Giảm từ 8px
  },
  rankImage: {
    width: "40px", // Giảm từ 60px
    height: "40px", // Giảm từ 60px
    objectFit: "contain",
  },
  name: {
    flex: 1,
    fontWeight: "200",
    textAlign: "left",
    fontSize: "1rem", // Giảm từ 1.1rem
    padding: "0 8px", // Thêm padding nhỏ
  },
  score: {
    width: "50px",
    textAlign: "right",
    fontWeight: "bold",
    color: "inherit",
    opacity: 0.95,
    fontSize: "0.9rem",
  },
  profileLink: {
    textDecoration: "none",
    color: "inherit",
    transition: "color 0.2s ease",
    fontSize: "0.95rem",
  },
};