import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getMyItems, itemImageUrl } from "../../api";
import { levelItemAuraFilter } from "../lib/itemRarity";
import {
  dedupeItemsById,
  formatItemEffectDescription,
  formatLoadoutPreviewSummary,
} from "../lib/itemEffects";

const MAX_SELECT = 3;

export default function ItemLoadoutModal({
  open,
  userId,
  initialSelectedIds = [],
  onClose,
  onConfirm,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }
    const initial = Array.isArray(initialSelectedIds)
      ? initialSelectedIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      : [];
    setSelectedIds(new Set(initial));
    if (!userId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const list = dedupeItemsById(await getMyItems(userId));
        if (!cancelled) setItems(list);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || e?.message || "Không tải được kho vật phẩm.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId, initialSelectedIds]);

  const selectedCount = selectedIds.size;
  const atMax = selectedCount >= MAX_SELECT;

  const selectedItems = useMemo(
    () => items.filter((it) => selectedIds.has(Number(it.id))),
    [items, selectedIds]
  );

  const previewSummary = useMemo(
    () => formatLoadoutPreviewSummary(selectedItems),
    [selectedItems]
  );

  const toggleItem = useCallback((itemId) => {
    const id = Number(itemId);
    if (!Number.isFinite(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECT) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleConfirm = () => {
    onConfirm?.([...selectedIds]);
  };

  if (!open) return null;

  return (
    <div className="item-loadout-overlay" onClick={onClose} role="presentation">
      <div
        className="item-loadout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-loadout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="item-loadout-title" className="item-loadout-title">
          Chọn vật phẩm mang vào bài
        </h2>
        <p className="item-loadout-lead">
          Chọn tối đa {MAX_SELECT} vật phẩm từ kho của bạn. Chỉ vật phẩm được chọn mới có hiệu
          lực trong lần chơi này.
        </p>

        {loading && <p className="item-loadout-muted">Đang tải kho vật phẩm…</p>}
        {error && (
          <p className="item-loadout-error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="item-loadout-muted">Bạn chưa có vật phẩm nào. Vào cửa hàng để mua thêm.</p>
        )}

        {!loading && items.length > 0 && (
          <div className="item-loadout-grid">
            {items.map((it) => {
              const id = Number(it.id);
              const isSelected = selectedIds.has(id);
              const disabled = !isSelected && atMax;
              const effectDesc = formatItemEffectDescription(it);
              return (
                <button
                  key={it.id}
                  type="button"
                  className={`item-loadout-card${isSelected ? " item-loadout-card--selected" : ""}${
                    disabled ? " item-loadout-card--disabled" : ""
                  }`}
                  disabled={disabled}
                  onClick={() => toggleItem(id)}
                  aria-pressed={isSelected}
                >
                  <span className="item-loadout-check" aria-hidden>
                    {isSelected ? "✓" : ""}
                  </span>
                  <img
                    src={itemImageUrl(it.link)}
                    alt=""
                    className="item-loadout-thumb"
                    style={{ filter: levelItemAuraFilter(it.level) }}
                  />
                  <span className="item-loadout-name">{it.name}</span>
                  {effectDesc ? (
                    <span className="item-loadout-effect">{effectDesc}</span>
                  ) : (
                    <span className="item-loadout-effect item-loadout-effect--muted">
                      Trang trí
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="item-loadout-footer">
          <p className="item-loadout-count">
            Đã chọn: <strong>{selectedCount}</strong>/{MAX_SELECT}
          </p>
          <p className="item-loadout-preview">{previewSummary}</p>
          <div className="item-loadout-actions">
            <button type="button" className="item-loadout-btn item-loadout-btn--ghost" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className="item-loadout-btn item-loadout-btn--ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedCount === 0}
            >
              Bỏ chọn tất cả
            </button>
            <button
              type="button"
              className="item-loadout-btn item-loadout-btn--primary"
              onClick={handleConfirm}
            >
              Xác nhận và chơi
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .item-loadout-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          background: rgba(15, 35, 55, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }
        .item-loadout-modal {
          width: min(560px, 100%);
          max-height: min(90vh, 720px);
          overflow: auto;
          background: #fff;
          border-radius: 16px;
          padding: 20px 22px 18px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
        }
        .item-loadout-title {
          margin: 0 0 8px;
          font-size: 1.25rem;
          color: #0f4c75;
        }
        .item-loadout-lead {
          margin: 0 0 16px;
          font-size: 0.92rem;
          line-height: 1.5;
          color: #57606a;
        }
        .item-loadout-muted {
          margin: 0 0 12px;
          color: #6b7280;
        }
        .item-loadout-error {
          margin: 0 0 12px;
          color: #c62828;
          font-weight: 600;
        }
        .item-loadout-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .item-loadout-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 10px;
          border: 2px solid #d0dfe8;
          border-radius: 12px;
          background: #f8fbfd;
          cursor: pointer;
          text-align: center;
          font-family: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .item-loadout-card:hover:not(:disabled) {
          border-color: #3282b8;
        }
        .item-loadout-card--selected {
          border-color: #3282b8;
          background: #e8f4fc;
          box-shadow: 0 0 0 2px rgba(50, 130, 184, 0.25);
        }
        .item-loadout-card--disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .item-loadout-check {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #3282b8;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .item-loadout-card:not(.item-loadout-card--selected) .item-loadout-check {
          background: #e0e7ee;
          color: transparent;
        }
        .item-loadout-thumb {
          width: 52px;
          height: 52px;
          object-fit: contain;
        }
        .item-loadout-name {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f4c75;
          line-height: 1.25;
        }
        .item-loadout-effect {
          font-size: 0.75rem;
          color: #3282b8;
          line-height: 1.3;
        }
        .item-loadout-effect--muted {
          color: #90a4ae;
        }
        .item-loadout-footer {
          border-top: 1px solid #e8eef2;
          padding-top: 14px;
        }
        .item-loadout-count {
          margin: 0 0 6px;
          font-size: 0.9rem;
          color: #37474f;
        }
        .item-loadout-preview {
          margin: 0 0 14px;
          font-size: 0.85rem;
          color: #57606a;
          line-height: 1.45;
        }
        .item-loadout-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }
        .item-loadout-btn {
          padding: 10px 16px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
          font-family: inherit;
        }
        .item-loadout-btn--ghost {
          background: #eef2f6;
          color: #455a64;
        }
        .item-loadout-btn--ghost:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .item-loadout-btn--primary {
          background: linear-gradient(135deg, #3282b8, #0f4c75);
          color: #fff;
        }
      `}</style>
    </div>
  );
}
