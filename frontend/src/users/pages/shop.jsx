import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api, { itemImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";
import "../styles/userCtaFlashShine.css";

const PAGE_SIZE = 5;

/** Màu chủ đề giống Exam.jsx — chỉ dùng cho chữ / nút / viền nhẹ */
const CL = {
  periwinkle: "#6C7EE1",
  sky: "#92B9E3",
  peach: "#FFC4A4",
  pink: "#FBA2D0",
  lavender: "#C688EB",
  ink: "#4A5080",
  inkMuted: "#6B7099",
};

function DiamondIcon() {
  return (
    <svg
      className="shop-diamond-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 4.5 18.2 11 12 19.5 5.8 11 12 4.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

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
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

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
      setMessage("Không đủ điểm để mua vật phẩm này.");
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
            <h1 className="shop-page-title">Cửa hàng vật phẩm</h1>
            <p className="shop-page-lead">
              Dùng điểm tích lũy để đổi vật phẩm trong game.
            </p>
            <p className="shop-page-score">
              Điểm hiện tại của bạn: <strong>{user.score ?? 0}</strong>
            </p>

            {message && (
              <p
                className={
                  message.includes("Lỗi") ||
                  message.includes("không đủ") ||
                  message.includes("Không đủ")
                    ? "shop-message shop-message--error"
                    : "shop-message shop-message--ok"
                }
              >
                {message}
              </p>
            )}

            {loading && <p className="shop-loading">Đang tải danh sách vật phẩm…</p>}

            <div className="shop-list">
              {!loading &&
                pageItems.map((item) => {
                  const price = Number(item.require_score) || 0;
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
                            <span className="shop-price-row">
                              <DiamondIcon />
                              Giá: {price} điểm
                            </span>
                          </div>
                        </div>
                        <div className="card-button">
                          <button
                            type="button"
                            className="shop-buy-cta user-cta-flash"
                            onClick={() => handleBuy(item.id, price)}
                          >
                            <span className="user-cta-flash__label">Mua</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {!loading && items.length === 0 && (
              <p className="shop-loading">Chưa có vật phẩm nào. Vui lòng quay lại sau.</p>
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
              .shop-page-title {
                margin-bottom: 14px;
                font-size: clamp(1.5rem, 3vw, 1.85rem);
                font-weight: 800;
                color: ${CL.periwinkle};
              }
              .shop-page-lead {
                line-height: 1.75;
                color: ${CL.ink};
                margin-bottom: 8px;
              }
              .shop-page-score {
                line-height: 1.75;
                color: ${CL.ink};
                margin-bottom: 24px;
              }
              .shop-page-score strong {
                color: ${CL.lavender};
              }
              .shop-message {
                margin-bottom: 16px;
                font-weight: 600;
              }
              .shop-message--ok {
                color: #2e7d32;
              }
              .shop-message--error {
                color: #c62828;
              }
              .shop-loading {
                color: ${CL.inkMuted};
                margin: 0;
              }
              .shop-list {
                display: flex;
                flex-direction: column;
                gap: 20px;
              }
              .shop-card {
                border: 1px solid rgba(146, 185, 227, 0.45);
                border-radius: 16px;
                padding: 18px 20px;
                transition: all 0.2s;
                background-color: rgba(255, 255, 255, 0.96);
                box-shadow: 0 4px 14px rgba(108, 126, 225, 0.12);
              }
              .shop-card:hover {
                box-shadow: 0 8px 22px rgba(108, 126, 225, 0.2);
              }
              .card-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
              }
              .shop-card-thumb {
                flex-shrink: 0;
                width: 72px;
                height: 72px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .shop-card-thumb img {
                width: 56px;
                height: 56px;
                object-fit: contain;
              }
              .card-info {
                flex: 1;
                min-width: 0;
              }
              .card-info h3.shop-title {
                margin: 0 0 8px 0;
                color: ${CL.periwinkle};
                font-weight: 700;
                font-size: 1.15rem;
              }
              .shop-desc {
                margin: 0 0 10px 0;
                color: ${CL.inkMuted};
                line-height: 1.5;
              }
              .meta {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                font-size: 14px;
                font-weight: 600;
              }
              .shop-price-row {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                color: ${CL.periwinkle};
                background: none;
                padding: 0;
                border: none;
              }
              .shop-diamond-icon {
                flex-shrink: 0;
                color: ${CL.periwinkle};
              }
              .card-button {
                flex-shrink: 0;
              }
              .card-button .shop-buy-cta {
                border: none;
                border-radius: 40px;
                padding: 10px 24px;
                color: #fff;
                font-weight: 700;
                font-size: 15px;
                cursor: pointer;
                transition: filter 0.2s, transform 0.15s;
                font-family: inherit;
                background: linear-gradient(135deg, ${CL.periwinkle}, ${CL.lavender});
                box-shadow: 0 4px 12px rgba(108, 126, 225, 0.35);
              }
              .card-button .shop-buy-cta:hover {
                filter: brightness(1.06);
                transform: translateY(-1px);
              }
              .shop-pagination {
                margin-top: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
              }
              .shop-pagination button {
                border: 2px solid ${CL.periwinkle};
                background: #fff;
                color: ${CL.periwinkle};
                border-radius: 999px;
                padding: 8px 16px;
                cursor: pointer;
                font-weight: 700;
                font-family: inherit;
                transition: background 0.2s, color 0.2s;
              }
              .shop-pagination button:hover:not(:disabled) {
                background: ${CL.periwinkle};
                color: #fff;
              }
              .shop-pagination button:disabled {
                opacity: 0.45;
                cursor: not-allowed;
                border-color: #ccc;
                color: #999;
              }
              .shop-pagination span {
                color: ${CL.ink};
                font-size: 14px;
                font-weight: 600;
              }
              @media (max-width: 768px) {
                .card-content {
                  flex-direction: column;
                  align-items: stretch;
                }
                .shop-card-thumb {
                  margin: 0 auto;
                }
                .card-button {
                  margin-top: 12px;
                }
                .card-button .shop-buy-cta {
                  width: 100%;
                }
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
