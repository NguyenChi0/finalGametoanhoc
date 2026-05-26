import React, { useCallback, useEffect, useRef, useState } from "react";
import { publicUrl } from "../../lib/publicUrl";

const CARD_WIDTH = 180;
const CARD_GAP = 16;
/** Ảnh tỉ lệ 3:2 (rộng hơn cao) */
const VISUAL_HEIGHT = Math.round((CARD_WIDTH * 2) / 3);
const TEXT_BLOCK_HEIGHT = 52;
const CARD_SLOT_HEIGHT = VISUAL_HEIGHT + TEXT_BLOCK_HEIGHT;
const TRACK_VERTICAL_PADDING = 16;
const ACTIVE_SCALE = 1.14;
const INACTIVE_SCALE = 0.86;

function ImagePlaceholderIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
      <circle cx="9" cy="10" r="1.5" fill="rgba(255,255,255,0.85)" />
      <path
        d="M3 16l5-5 4 4 3-3 6 6"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GameGuideModal({ game, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!game) return null;

  return (
    <div className="game-guide-overlay" onClick={onClose} role="presentation">
      <div
        className="game-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-guide-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="game-guide-title" className="game-guide-title">
          {game.label}
        </h3>
        <p className="game-guide-kicker">Giới thiệu &amp; hướng dẫn</p>
        <p className="game-guide-body">
          {game.guide || "Chưa có mô tả cho chế độ chơi này."}
        </p>
        <button type="button" className="game-guide-close" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
}

function GameCarouselCard({ game, isActive, index, cardRefs, onSelect, onGuide }) {
  const [imgFailed, setImgFailed] = useState(false);
  const previewSrc =
    game.previewImage && !imgFailed
      ? `${publicUrl}/${String(game.previewImage).replace(/^\//, "")}`
      : null;

  const openGuide = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onGuide(game);
  };

  const onGuideKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onGuide(game);
    }
  };

  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      aria-label={game.label}
      className={`game-carousel-card${isActive ? " is-active" : ""}`}
      ref={(el) => {
        cardRefs.current[index] = el;
      }}
      data-game-id={game.id}
      onClick={() => onSelect(index)}
    >
      <div className="game-carousel-card-inner">
        <div
          className="game-carousel-visual"
          style={{ background: game.color || "#C4B5FD" }}
        >
          {previewSrc ? (
            <img
              src={previewSrc}
              alt=""
              loading="lazy"
              draggable={false}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <ImagePlaceholderIcon />
          )}
        </div>
        <div className="game-carousel-text">
          <p className="game-carousel-label-wrap">
            <span className="game-carousel-label">{game.label}</span>
            <span
              className="game-carousel-help"
              role="button"
              tabIndex={0}
              aria-label={`Hướng dẫn ${game.label}`}
              title="Hướng dẫn & giới thiệu"
              onClick={openGuide}
              onKeyDown={onGuideKeyDown}
            >
              ?
            </span>
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * Carousel chọn giao diện game — kích thước cố định, bấm thẻ để chọn.
 */
export default function GameInterfaceCarousel({ options, value, onChange }) {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const initialScrollDone = useRef(false);
  const [guideGame, setGuideGame] = useState(null);

  const scrollToIndex = useCallback((index, behavior = "auto") => {
    const track = trackRef.current;
    const card = cardRefs.current[index];
    if (!track || !card) return;
    const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior });
  }, []);

  const activateIndex = useCallback(
    (index) => {
      const game = options[index];
      if (!game) return;
      if (game.id !== value) onChange(game.id);
      scrollToIndex(index, "smooth");
    },
    [onChange, options, scrollToIndex, value]
  );

  useEffect(() => {
    if (initialScrollDone.current) return;
    const idx = options.findIndex((o) => o.id === value);
    if (idx < 0) return;
    const raf = window.requestAnimationFrame(() => {
      scrollToIndex(idx, "auto");
      initialScrollDone.current = true;
    });
    return () => window.cancelAnimationFrame(raf);
  }, [options, value, scrollToIndex]);

  const trackMinHeight =
    Math.ceil(CARD_SLOT_HEIGHT * ACTIVE_SCALE) + TRACK_VERTICAL_PADDING * 2;

  return (
    <div className="game-carousel">
      <style>{`
        .game-carousel {
          width: 100%;
          box-sizing: border-box;
          background: transparent;
        }
        .game-carousel-title {
          margin: 0 0 16px;
          text-align: left;
          color: #1a1d26;
          font-size: 0.9rem;
          font-weight: 700;
        }
        .game-carousel-track {
          display: flex;
          align-items: center;
          gap: ${CARD_GAP}px;
          overflow-x: auto;
          overflow-y: visible;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          min-height: ${trackMinHeight}px;
          padding: ${TRACK_VERTICAL_PADDING}px 0;
          scroll-padding-left: calc(50% - ${CARD_WIDTH / 2}px);
          scroll-padding-right: calc(50% - ${CARD_WIDTH / 2}px);
          padding-left: calc(50% - ${CARD_WIDTH / 2}px);
          padding-right: calc(50% - ${CARD_WIDTH / 2}px);
        }
        .game-carousel-track::-webkit-scrollbar {
          display: none;
        }
        .game-carousel-card {
          flex: 0 0 ${CARD_WIDTH}px;
          width: ${CARD_WIDTH}px;
          height: ${CARD_SLOT_HEIGHT}px;
          scroll-snap-align: center;
          box-sizing: border-box;
          padding: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .game-carousel-card:focus-visible .game-carousel-card-inner {
          outline: 3px solid #6c7ee1;
          outline-offset: 2px;
        }
        .game-carousel-card-inner {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          background: #faf8fc;
          border-radius: 0;
          overflow: hidden;
          border: 2px solid transparent;
          box-shadow: 0 4px 14px rgba(74, 80, 128, 0.1);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease,
            opacity 0.25s ease;
          box-sizing: border-box;
          transform: scale(${INACTIVE_SCALE});
          opacity: 0.72;
          pointer-events: none;
        }
        .game-carousel-card.is-active {
          z-index: 2;
        }
        .game-carousel-card.is-active .game-carousel-card-inner {
          border-color: #6c7ee1;
          box-shadow: 0 10px 28px rgba(108, 126, 225, 0.28);
          transform: scale(${ACTIVE_SCALE});
          opacity: 1;
        }
        .game-carousel-card.is-active .game-carousel-label {
          font-size: 0.9rem;
          color: #1a1d26;
        }
        .game-carousel-visual {
          flex: 0 0 ${VISUAL_HEIGHT}px;
          width: 100%;
          aspect-ratio: 3 / 2;
          height: ${VISUAL_HEIGHT}px;
          max-height: ${VISUAL_HEIGHT}px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .game-carousel-visual img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          pointer-events: none;
        }
        .game-carousel-text {
          flex: 0 0 ${TEXT_BLOCK_HEIGHT}px;
          height: ${TEXT_BLOCK_HEIGHT}px;
          padding: 8px 10px 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .game-carousel-label-wrap {
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          max-width: 100%;
          pointer-events: none;
        }
        .game-carousel-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #3d3a55;
          line-height: 1.25;
          text-align: center;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-width: 0;
        }
        .game-carousel-help {
          pointer-events: auto;
          flex: 0 0 auto;
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(108, 126, 225, 0.14);
          color: #6c7ee1;
          font-size: 0.72rem;
          font-weight: 800;
          line-height: 1;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .game-carousel-help:hover {
          background: rgba(108, 126, 225, 0.24);
          color: #5a6ed4;
        }
        .game-carousel-help:focus-visible {
          outline: 2px solid #6c7ee1;
          outline-offset: 2px;
        }
        .game-guide-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(26, 29, 38, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .game-guide-modal {
          width: min(420px, 100%);
          background: #fff;
          border-radius: 16px;
          padding: 22px 20px 18px;
          box-shadow: 0 16px 48px rgba(26, 29, 38, 0.2);
          border: 1px solid #e8eaed;
        }
        .game-guide-title {
          margin: 0 0 6px;
          font-size: 1.15rem;
          font-weight: 800;
          color: #1a1d26;
        }
        .game-guide-kicker {
          margin: 0 0 10px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #6c7ee1;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .game-guide-body {
          margin: 0 0 18px;
          font-size: 0.92rem;
          line-height: 1.55;
          color: #4a5080;
        }
        .game-guide-close {
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-radius: 10px;
          background: #6c7ee1;
          color: #fff;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          font-family: inherit;
        }
        .game-guide-close:hover {
          background: #5a6ed4;
        }
      `}</style>

      <h2 className="game-carousel-title">Chế độ chơi </h2>

      <div
        className="game-carousel-track"
        ref={trackRef}
        role="listbox"
        aria-label="Chọn giao diện game"
      >
        {options.map((game, index) => (
          <GameCarouselCard
            key={game.id}
            game={game}
            index={index}
            isActive={value === game.id}
            cardRefs={cardRefs}
            onSelect={activateIndex}
            onGuide={setGuideGame}
          />
        ))}
      </div>

      <GameGuideModal game={guideGame} onClose={() => setGuideGame(null)} />
    </div>
  );
}
