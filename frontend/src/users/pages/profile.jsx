// src/pages/profile.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { itemImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import { levelItemAuraFilter, levelLabel, levelLabelColor } from "../lib/itemRarity";

function formatCompletedAt(isoLike) {
  if (!isoLike) return "—";
  const d = new Date(String(isoLike).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(isoLike);
  const datePart = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("vi-VN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${timePart} ${datePart}`;
}

export default function Profile() {
  const { username: paramUsername } = useParams();
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const [userData, setUserData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const viewedUsername = paramUsername || storedUser?.username;
  const isOwnProfile = !paramUsername || paramUsername === storedUser?.username;

  useEffect(() => {
    if (!viewedUsername) return;
    setLoadError(null);
    api.get(`/user/${viewedUsername}`)
      .then((res) => setUserData(res.data))
      .catch((err) => {
        console.error(err);
        setUserData(null);
        setLoadError(
          err?.response?.data?.message || "Không tải được thông tin người dùng."
        );
      });
  }, [viewedUsername]);

  const pageBg = `${publicUrl}/component-images/home-background.png`;
  const bgFixedLayer = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    backgroundColor: "#9ed3e7ff",
    backgroundImage: `url(${pageBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    transform: "translateZ(0)",
    backfaceVisibility: "hidden",
  };

  const pageShell = (children) => (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={bgFixedLayer} aria-hidden />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );

  if (!viewedUsername) {
    return pageShell(<p>Bạn cần đăng nhập để xem trang cá nhân.</p>);
  }
  if (loadError) {
    return pageShell(<p>{loadError}</p>);
  }
  if (!userData) {
    return pageShell(<p>Đang tải thông tin...</p>);
  }

  const recentLessons = Array.isArray(userData.recentLessons) ? userData.recentLessons : [];

  return pageShell(
    <div style={styles.container}>
        <h2>👤 {userData.username}</h2>
        {!isOwnProfile && (
          <p style={styles.viewingHint}>Đang xem hồ sơ công khai của người chơi khác</p>
        )}
        <p><strong>Điểm tổng:</strong> {userData.score ?? 0}</p>

        {/* Phần Thành tích – tên nằm cùng dòng với label */}
        <div style={{ marginTop: 12 }}>
          <strong>Thành tích:</strong>{" "}
          {userData.achievement ? (
            <>
              <span style={{ fontWeight: 600 }}>{userData.achievement.name}</span>
              {userData.achievement.description && (
                <div style={{ marginTop: 4 }}>{userData.achievement.description}</div>
              )}
              {userData.achievement.link && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={`${publicUrl}/images-achievement/${userData.achievement.link}`}
                    alt={userData.achievement.name}
                    style={{ maxWidth: 120 }}
                  />
                </div>
              )}
            </>
          ) : (
            <span>Chưa có</span>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Bài học gần nhất</h3>
          {recentLessons.length > 0 ? (
            <div style={styles.historyList}>
              {recentLessons.map((item, idx) => (
                <article
                  key={`${item.lessonName}-${item.completedAt}-${idx}`}
                  style={styles.historyCard}
                >
                  <div style={styles.historyTitle}>{item.lessonName || "Bài học"}</div>
                  <div style={styles.historyMeta}>
                    <span style={styles.historyPoints}>+{item.pointsAdded ?? 0} điểm</span>
                    <span>
                      {item.correctCount ?? 0}/{item.totalCount ?? 0} câu đúng
                      {item.stars ? ` · ${item.stars} sao` : ""}
                    </span>
                  </div>
                  <div style={styles.historyTime}>
                    Hoàn thành lúc {formatCompletedAt(item.completedAt)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={styles.emptyHint}>Chưa có bài học nào được ghi nhận.</p>
          )}
        </div>

        {/* Danh sách vật phẩm */}
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Vật phẩm</h3>
          {userData.itemsOwned && userData.itemsOwned.length > 0 ? (
            <div style={styles.itemsGrid}>
              {userData.itemsOwned.map((item, idx) => {
                const key = `${item.id}-${idx}-${item.purchased_at}`;
                return (
                  <div key={key} style={styles.itemCard}>
                    <img
                      src={itemImageUrl(item.link)}
                      alt={item.name}
                      style={{
                        ...styles.itemImage,
                        filter: levelItemAuraFilter(item.level),
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/placeholder-item.png";
                      }}
                    />
                    <div style={{ marginTop: 8, textAlign: "center" }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          marginTop: 4,
                          color: levelLabelColor(item.level),
                        }}
                      >
                        {levelLabel(item.level)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontStyle: "italic", color: "#666" }}>Người dùng chưa mua vật phẩm nào.</p>
          )}
        </div>

        {/* Ngày tham gia đặt ở cuối cùng */}
        <p style={{ marginTop: 16 }}>
          <strong>Ngày tham gia:</strong> {new Date(userData.created_at).toLocaleString()}
        </p>
      </div>
  );
}

const styles = {
  container: {
    maxWidth: 800,
    width: "100%",
    margin: "0 auto",
    padding: 24,
    borderRadius: 16,
    boxSizing: "border-box",
  },
  viewingHint: {
    margin: "0 0 8px",
    fontSize: "0.9rem",
    color: "#57606a",
    fontStyle: "italic",
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  historyCard: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255, 255, 255, 0.45)",
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  historyTitle: {
    fontWeight: 700,
    fontSize: "1rem",
    color: "#1f2328",
    marginBottom: 6,
  },
  historyMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 14px",
    fontSize: "0.92rem",
    color: "#454038",
    marginBottom: 4,
  },
  historyPoints: {
    fontWeight: 700,
    color: "#1a7f37",
  },
  historyTime: {
    fontSize: "0.88rem",
    color: "#57606a",
  },
  emptyHint: {
    fontStyle: "italic",
    color: "#666",
    margin: 0,
  },
  itemsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 12,
  },
  itemCard: {
    padding: 10,
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "default",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  itemImage: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
};