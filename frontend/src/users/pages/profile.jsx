// src/pages/profile.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function Profile() {
  const { username: paramUsername } = useParams();
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const [userData, setUserData] = useState(null);

  const viewedUsername = paramUsername || storedUser?.username;

  useEffect(() => {
    if (!viewedUsername) return;
    api.get(`/user/${viewedUsername}`)
      .then(res => setUserData(res.data))
      .catch(err => console.error(err));
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

  if (!storedUser && !viewedUsername) {
    return pageShell(<p>Bạn cần đăng nhập để xem trang cá nhân.</p>);
  }
  if (!userData) {
    return pageShell(<p>Đang tải thông tin...</p>);
  }

  return pageShell(
    <div style={styles.container}>
        <h2>👤 {userData.username}</h2>
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

        {/* Danh sách vật phẩm */}
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>🎁 Vật phẩm đã mua</h3>
          {userData.itemsOwned && userData.itemsOwned.length > 0 ? (
            <div style={styles.itemsGrid}>
              {userData.itemsOwned.map((item, idx) => {
                const key = `${item.id}-${idx}-${item.purchased_at}`;
                return (
                  <div key={key} style={styles.itemCard}>
                    <img
                      src={`${publicUrl}/images-items/${item.link}`}
                      alt={item.name}
                      style={styles.itemImage}
                      onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder-item.png"; }}
                    />
                    <div style={{ marginTop: 8, textAlign: "center" }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.description && <div style={{ fontSize: 12 }}>{item.description}</div>}
                      <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>
                        Mua: {item.purchased_at ? new Date(item.purchased_at).toLocaleString() : "—"}
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
    background: "rgba(255, 255, 255, 0.25)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    boxSizing: "border-box",
  },
  itemsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 12,
  },
  itemCard: {
    padding: 10,
    border: "1px solid #e6e6e6",
    borderRadius: 8,
    backgroundColor: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  itemImage: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
};