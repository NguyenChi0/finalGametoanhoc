import React, { useEffect, useState } from "react";
import api, { itemImageUrl } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

const ITEMS_PER_PAGE = 4;

export default function Shop() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [message, setMessage] = useState("");
  const [showSeller, setShowSeller] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const pageItems = items.slice(
    currentPage * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  useEffect(() => {
    api.get("/items").then((res) => setItems(res.data));

    const seller = document.getElementById("shop-seller");
    if (seller) {
      seller.style.opacity = "0";
      seller.style.transform = "translateY(50px)";
      setTimeout(() => {
        seller.style.transition = "all 2s ease-out";
        seller.style.opacity = "1";
        seller.style.transform = "translateY(0)";
      }, 200);
    }
  }, []);

  const handleBuy = async (itemId, requireScore) => {
    if (user.score < requireScore) {
      setMessage("❌ Bạn không đủ điểm để mua vật phẩm này!");
      return;
    }
    try {
      const res = await api.post("/buy", { userId: user.id, itemId });
      setMessage(res.data.message);

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

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={bgFixedLayer} aria-hidden />
      <div
        className="shop-page"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <style>{`
          .shop-page {
            box-sizing: border-box;
            touch-action: manipulation;
            overscroll-behavior: auto;
          }
          .shop-frame {
            max-width: 960px;
            margin: 0 auto 10%;
            padding: 36px 40px 80px;
            min-height: 380px;
            /* Đã bỏ background và backdrop-filter */
            transform: scale(1.55);
            transform-origin: top center;
            box-sizing: border-box;
          }
          .shop-header-block {
            margin-left: 20%;
          }
          .shop-items-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 110px));
            justify-content: center;
            gap: 12px;
            padding: 24px 56px 32px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          .shop-item-card {
            position: relative;
            border: 1px solid rgba(255,255,255,0.5);
            border-radius: 8px;
            padding: 8px;
            min-width: 0;
            width: 100%;
            max-width: 110px;
            margin: 0 auto;
            text-align: center;
            background: rgba(255,255,255,0.4);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            overflow: hidden;
            box-sizing: border-box;
          }
          .shop-seller-img {
            width: 400px;
            height: auto;
            max-width: min(90vw, 400px);
            transition: all 1s ease-out;
          }
          @media (max-width: 768px) {
            .shop-page {
              padding: 12px !important;
            }
            .shop-frame {
              transform: none !important;
              margin: 0 auto 24px !important;
              padding: 12px 10px 64px !important;
              width: 100% !important;
              max-width: 420px !important;
              min-height: min(520px, 72vh) !important;
              /* Đã bỏ background và backdrop-filter trên mobile */
            }
            .shop-header-block {
              margin-left: 0 !important;
              padding: 0 8px;
              text-align: center;
            }
            .shop-items-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 8px !important;
              padding: 12px 14px 20px !important;
              justify-items: stretch;
            }
            .shop-item-card {
              max-width: none !important;
              padding: 6px !important;
            }
            .shop-seller-img {
              width: min(72vw, 260px) !important;
              max-width: 260px !important;
            }
          }
        `}</style>

        <div className="shop-frame">
          <div className="shop-header-block">
            <h2 style={{ marginTop: 0, marginBottom: 8, color: "#0F4C75", fontSize: "1.25rem" }}>
              Cửa hàng vật phẩm
            </h2>
            <p style={{ color: "#004F8D", marginBottom: 12, fontSize: "0.9rem" }}>
              Điểm hiện tại của bạn: <strong>{user?.score ?? 0}</strong>
            </p>
            {message && (
              <p style={{ color: "red", marginBottom: 8, fontSize: "0.85rem" }}>{message}</p>
            )}
          </div>

          <div className="shop-items-grid">
            {pageItems.map((item) => (
              <div key={item.id} className="shop-item-card">
                <img
                  src={itemImageUrl(item.link)}
                  alt={item.name}
                  style={{
                    width: "100%",
                    height: 56,
                    objectFit: "contain",
                    position: "relative",
                    zIndex: 1,
                    filter: `
                      drop-shadow(0 0 8px ${getAuraColor(item.require_score)})
                      drop-shadow(0 0 14px ${getAuraColor(item.require_score)})
                    `,
                    transition: "filter 0.3s ease-in-out",
                  }}
                />
                <h4 style={{ margin: "4px 0 2px", fontSize: "0.75rem", wordBreak: "break-word" }}>
                  {item.name}
                </h4>
                <p style={{ margin: 0, fontSize: "0.7rem" }}>Giá: {item.require_score} điểm</p>
                <button
                  type="button"
                  onClick={() => handleBuy(item.id, item.require_score)}
                  style={{
                    background: "#ff9800",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "0.7rem",
                    marginTop: 4,
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  Mua
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #0B79B4",
                  background: currentPage === 0 ? "#ccc" : "#fff",
                  color: "#0B79B4",
                  cursor: currentPage === 0 ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                }}
              >
                ← Trước
              </button>
              <span style={{ color: "#004F8D", fontSize: "0.9rem" }}>
                Trang {currentPage + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #0B79B4",
                  background: currentPage >= totalPages - 1 ? "#ccc" : "#fff",
                  color: "#0B79B4",
                  cursor: currentPage >= totalPages - 1 ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Sau →
              </button>
            </div>
          )}
        </div>

        {showSeller && (
          <div
            style={{
              position: "fixed",
              bottom: "10px",
              right: "12px",
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
                top: "-10px",
                right: "-6px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "25px",
                height: "25px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ×
            </button>
            <img
              id="shop-seller"
              className="shop-seller-img"
              src={`${publicUrl}/component-images/shop-seller.png`}
              alt="Shop Seller"
            />
          </div>
        )}
      </div>
    </div>
  );
}