import React, { useMemo } from "react";
import { buildPageRange } from "../lib/buildPageRange";
import "../styles/numberPagination.css";

const DEFAULT_ACCENT = "#6C7EE1";
const DEFAULT_INK = "#4A5080";

/**
 * Phân trang dạng: Trang [1] [2] [3] … [10] — nút số hình tròn.
 */
export default function NumberPagination({
  page,
  totalPages,
  onPageChange,
  ariaLabel = "Phân trang",
  className = "",
  accentColor = DEFAULT_ACCENT,
  inkColor = DEFAULT_INK,
}) {
  const total = Math.max(1, Number(totalPages) || 1);
  const current = Math.min(Math.max(1, Number(page) || 1), total);

  const items = useMemo(() => {
    const siblings = total > 7 ? 2 : 1;
    return buildPageRange(current, total, siblings);
  }, [current, total]);

  if (total <= 0) return null;

  const rootClass = ["number-pagination", className].filter(Boolean).join(" ");

  return (
    <nav
      className={rootClass}
      aria-label={ariaLabel}
      style={{
        "--np-accent": accentColor,
        "--np-ink": inkColor,
      }}
    >
      <span className="number-pagination__label">Trang</span>
      <div className="number-pagination__list">
        {items.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="number-pagination__ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            );
          }
          const isActive = item === current;
          return (
            <button
              key={item}
              type="button"
              className={
                isActive
                  ? "number-pagination__page number-pagination__page--active"
                  : "number-pagination__page"
              }
              onClick={() => onPageChange(item)}
              aria-label={`Trang ${item}`}
              aria-current={isActive ? "page" : undefined}
              disabled={isActive}
            >
              {item}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
