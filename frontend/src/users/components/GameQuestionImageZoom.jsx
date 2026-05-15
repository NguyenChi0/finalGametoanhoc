import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 100000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0, 0, 0, 0.88)",
  padding: 16,
  boxSizing: "border-box",
};

const closeBtnStyle = {
  position: "absolute",
  top: "max(12px, env(safe-area-inset-top, 0px))",
  right: "max(12px, env(safe-area-inset-right, 0px))",
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: "2px solid rgba(255, 255, 255, 0.9)",
  background: "rgba(0, 0, 0, 0.55)",
  color: "#fff",
  fontSize: 28,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const fullImgPanelStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "min(96vw, 920px)",
  maxHeight: "min(92vh, 820px)",
  padding: 16,
  background: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
  boxSizing: "border-box",
};

const fullImgStyle = {
  display: "block",
  maxWidth: "100%",
  maxHeight: "min(80vh, 760px)",
  objectFit: "contain",
  userSelect: "none",
};

export default function GameQuestionImageZoom({
  src,
  alt = "Minh họa câu hỏi",
  thumbClassName,
  thumbStyle,
  onThumbError,
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Phóng to ảnh câu hỏi"
        style={{
          border: "none",
          padding: 0,
          margin: 0,
          background: "transparent",
          cursor: "zoom-in",
          display: "block",
          maxWidth: "100%",
          lineHeight: 0,
        }}
      >
        <img
          className={thumbClassName}
          src={src}
          alt={alt}
          draggable={false}
          onError={onThumbError}
          style={{
            display: "block",
            maxWidth: "100%",
            ...thumbStyle,
          }}
        />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
              role="dialog"
              aria-modal="true"
              aria-label="Ảnh câu hỏi phóng to"
              style={overlayStyle}
              onClick={close}
            >
              <button
                type="button"
                aria-label="Đóng"
                style={closeBtnStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                }}
              >
                ×
              </button>
              <div
                style={fullImgPanelStyle}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={src}
                  alt={alt}
                  draggable={false}
                  style={fullImgStyle}
                />
              </div>
          </div>,
          document.body,
        )}
    </>
  );
}
