import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api, { itemImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

const PAGE_SIZE = 5;

export default function Shop() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [showSeller, setShowSeller] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/items");
        if (!cancelled) setItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const seller = document.getElementById("shop-seller");
    if (!seller || !showSeller) return undefined;
    seller.style.opacity = "0";
    seller.style.transform = "translateY(50px)";
    const t = window.setTimeout(() => {
      seller.style.transition = "all 2s ease-out";
      seller.style.opacity = "1";
      seller.style.transform = "translateY(0)";
    }, 200);
    return () => window.clearTimeout(t);
  }, [showSeller]);

  const handleBuy = async (itemId, requireScore) => {
    if (!user) return;
    if (user.score < requireScore) {
      setMessage("Bạn không đủ điểm để mua vật phẩm này.");
      return;
    }
    try {
      const res = await api.post("/buy", { userId: user.id, itemId });
      setMessage(res.data.message || "Mua thành công!");

      const newUser = { ...user, score: user.score - requireScore };
      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
    } catch (err) {
      setMessage(err.response?.data?.error || "Lỗi khi mua vật phẩm");
    }
  };

  const getAuraColor = (score) => {
    if (score >= 20000) return "rgba(255, 0, 0, 0.8)";
    if (score >= 10000) return "rgba(128, 0, 128, 0.8)";
    if (score >= 5000) return "rgba(255, 215, 0, 0.8)";
    if (score >= 1000) return "rgba(0, 255, 0, 0.8)";
    return "rgba(255, 255, 255, 0.3)";
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={bgFixedLayer} aria-hidden />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 960,
          margin: "0 auto",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <main>
          <section style={{ padding: "28px 24px" }}>
            <h1 style={{ marginBottom: 14, color: "#0f4c75" }}>Cửa hàng vật phẩm</h1>
            <p style={{ lineHeight: 1.75, color: "#263238", marginBottom: 8 }}>
              Dùng điểm tích lũy để đổi vật phẩm trong game.
            </p>
            <p style={{ lineHeight: 1.75, color: "#263238", marginBottom: 24 }}>
              Điểm hiện tại của bạn: <strong>{user.score ?? 0}</strong>
            </p>

            {message && (
              <p
                style={{
                  color: message.includes("Lỗi") || message.includes("không đủ") ? "#c62828" : "#2e7d32",
                  marginBottom: 16,
                }}
              >
                {message}
              </p>
            )}

            {loading && <p style={{ color: "#455a64" }}>Đang tải danh sách vật phẩm…</p>}

            <div className="shop-list">
              {!loading &&
                pageItems.map((item) => {
                  const price = Number(item.require_score) || 0;
                  const canAfford = (user.score ?? 0) >= price;
                  return (
                    <div key={item.id} className="shop-card">
                      <div className="card-content">
                        <div className="shop-card-thumb">
                          <img
                            src={itemImageUrl(item.link)}
                            alt={item.name}
                            style={{
                              filter: `
                                drop-shadow(0 0 6px ${getAuraColor(price)})
                                drop-shadow(0 0 12px ${getAuraColor(price)})
                              `,
                            }}
                          />
                        </div>
                        <div className="card-info">
                          <h3 className="shop-title">{item.name}</h3>
                          <p className="shop-desc">
                            {item.description?.trim() || "Vật phẩm dùng trong trò chơi."}
                          </p>
                          <div className="meta">
                            <span>💎 Giá: {price} điểm</span>
                            <span>{canAfford ? "✅ Đủ điểm" : "❌ Chưa đủ điểm"}</span>
                          </div>
                        </div>
                        <div className="card-button">
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleBuy(item.id, price)}
                            style={{ fontFamily: "inherit" }}
                          >
                            Mua
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {!loading && items.length === 0 && (
              <p style={{ color: "#455a64" }}>Chưa có vật phẩm nào. Vui lòng quay lại sau.</p>
            )}

            {!loading && items.length > 0 && (
              <div className="shop-pagination">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Trang trước
                </button>
                <span>
                  Trang {page}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Trang sau
                </button>
              </div>
            )}

            <style>{`
              .shop-list { display: flex; flex-direction: column; gap: 20px; }
              .shop-card { border: 1px solid #e0e7ed; border-radius: 16px; padding: 18px 20px; transition: all 0.2s; background-color: #fefefe; }
              .card-content { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
              .shop-card-thumb {
                flex-shrink: 0;
                width: 72px;
                height: 72px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.85);
                border-radius: 12px;
                border: 1px solid #e8eef3;
              }
              .shop-card-thumb img { width: 56px; height: 56px; object-fit: contain; }
              .card-info { flex: 1; min-width: 0; }
              .card-info h3.shop-title { margin: 0 0 8px 0; color: #3282b8; font-weight: 600; font-size: 1.15rem; }
              .shop-desc { margin: 0 0 10px 0; color: #4a627a; line-height: 1.5; }
              .meta { display: flex; flex-wrap: wrap; gap: 12px 16px; font-size: 14px; color: #2c6e9e; }
              .card-button { flex-shrink: 0; }
              .card-button button {
                background-color: #0f4c75;
                border: none;
                border-radius: 40px;
                padding: 10px 24px;
                color: white;
                font-weight: 600;
                font-size: 15px;
                cursor: pointer;
                transition: background 0.2s;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
              }
              .card-button button:hover:not(:disabled) { background-color: #3282b8; }
              .card-button button:disabled { opacity: 0.5; cursor: not-allowed; }
              .shop-pagination { margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap; }
              .shop-pagination button { border: 1px solid #c5d3dd; background: #fff; color: #0f4c75; border-radius: 999px; padding: 8px 14px; cursor: pointer; font-weight: 600; font-family: inherit; }
              .shop-pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
              .shop-pagination span { color: #2c3e50; font-size: 14px; }
              @media (max-width: 768px) {
                .card-content { flex-direction: column; align-items: stretch; }
                .shop-card-thumb { margin: 0 auto; }
                .card-button { margin-top: 12px; }
                .card-button button { width: 100%; }
              }
            `}</style>
          </section>
        </main>
      </div>

      {showSeller && (
        <div
          style={{
            position: "fixed",
            bottom: 10,
            right: 12,
            zIndex: 10,
            textAlign: "center",
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setShowSeller(false)}
            style={{
              position: "absolute",
              top: -10,
              right: -6,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 25,
              height: 25,
              cursor: "pointer",
              fontWeight: "bold",
            }}
            aria-label="Ẩn người bán"
          >
            ×
          </button>
          <img
            id="shop-seller"
            src={`${publicUrl}/component-images/shop-seller.png`}
            alt="Shop Seller"
            style={{
              width: "min(280px, 40vw)",
              height: "auto",
              maxWidth: 280,
              transition: "all 1s ease-out",
            }}
          />
        </div>
      )}
    </div>
  );
}
