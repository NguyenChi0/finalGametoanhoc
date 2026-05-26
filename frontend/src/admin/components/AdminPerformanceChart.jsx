import React, { useEffect, useMemo, useState } from "react";
import { getAdminDashboardPerformance } from "../../api";

function fmt(n) {
  return Number(n || 0).toLocaleString("vi-VN");
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthInputValue(dateISO) {
  return String(dateISO || todayISO()).slice(0, 7);
}

function addDaysISO(dateISO, days) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, "0");
  const nd = String(dt.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function monthISOFromInput(monthValue) {
  return `${monthValue}-01`;
}

const TRACK_HEIGHT = 180;

export default function AdminPerformanceChart() {
  const [mode, setMode] = useState("week");
  const [refDate, setRefDate] = useState(todayISO);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const res = await getAdminDashboardPerformance({ mode, date: refDate });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.response?.data?.message || e?.message || "Không tải được biểu đồ hiệu suất."
          );
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, refDate]);

  const seriesByKey = useMemo(() => {
    const map = new Map();
    for (const s of data?.series || []) {
      map.set(s.key, s);
    }
    return map;
  }, [data]);

  const maxTotal = useMemo(() => {
    const cols = data?.columns || [];
    const max = Math.max(0, ...cols.map((c) => Number(c.total) || 0));
    return max || 1;
  }, [data]);

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "month") {
      setRefDate(monthISOFromInput(monthInputValue(refDate)));
    }
  };

  const shiftWeek = (delta) => {
    setRefDate((prev) => addDaysISO(prev, delta * 7));
  };

  return (
    <div style={styles.card}>
      <div style={styles.toolbar}>
        <div style={styles.segment}>
          <button
            type="button"
            style={{
              ...styles.segmentBtn,
              ...(mode === "week" ? styles.segmentBtnActive : {}),
            }}
            onClick={() => handleModeChange("week")}
          >
            Theo tuần
          </button>
          <button
            type="button"
            style={{
              ...styles.segmentBtn,
              ...(mode === "month" ? styles.segmentBtnActive : {}),
            }}
            onClick={() => handleModeChange("month")}
          >
            Theo tháng
          </button>
        </div>

        {mode === "week" ? (
          <div style={styles.weekNav}>
            <button type="button" style={styles.navBtn} onClick={() => shiftWeek(-1)}>
              ← Tuần trước
            </button>
            <span style={styles.rangeLabel}>{data?.rangeLabel || "…"}</span>
            <button type="button" style={styles.navBtn} onClick={() => shiftWeek(1)}>
              Tuần sau →
            </button>
            <input
              type="date"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value || todayISO())}
              style={styles.dateInput}
              aria-label="Chọn ngày trong tuần"
            />
          </div>
        ) : (
          <div style={styles.monthNav}>
            <label style={styles.monthLabel}>
              Tháng
              <input
                type="month"
                value={monthInputValue(refDate)}
                onChange={(e) =>
                  setRefDate(monthISOFromInput(e.target.value || monthInputValue(todayISO())))
                }
                style={styles.monthInput}
              />
            </label>
            {data?.rangeLabel ? (
              <span style={styles.rangeLabelMuted}>{data.rangeLabel}</span>
            ) : null}
          </div>
        )}
      </div>

      {loading ? (
        <p style={styles.muted}>Đang tải biểu đồ…</p>
      ) : error ? (
        <p style={styles.error} role="alert">
          {error}
        </p>
      ) : (
        <>
          <div style={styles.summaryRow}>
            <p style={styles.summary}>
              Tổng lượt làm bài: <b>{fmt(data?.total)}</b>
            </p>
          </div>

          <div style={styles.chartLayout}>
            <div style={styles.chartArea}>
              <div style={styles.yAxis}>
                <span>{fmt(maxTotal)}</span>
                <span>{fmt(Math.round(maxTotal / 2))}</span>
                <span>0</span>
              </div>
              <div style={styles.chartBody}>
                <div style={styles.gridLines}>
                  <span style={styles.gridLine} />
                  <span style={styles.gridLine} />
                  <span style={styles.gridLine} />
                </div>
                <div style={styles.chartWrap}>
                  {(data?.columns || []).map((col) => {
                    const total = Number(col.total) || 0;
                    const columnHeightPx =
                      total > 0 ? Math.max(2, (total / maxTotal) * TRACK_HEIGHT) : 0;
                    const labelLines = String(col.label || "").split("\n");
                    return (
                      <div key={col.key} style={styles.barCol}>
                        <span style={styles.barValue}>{fmt(total)}</span>
                        <div style={{ ...styles.barTrack, height: TRACK_HEIGHT }}>
                          {total > 0 ? (
                            <div
                              style={{
                                ...styles.barStack,
                                height: columnHeightPx,
                              }}
                            >
                              {(col.segments || []).map((seg) => {
                                const count = Number(seg.count) || 0;
                                if (count <= 0) return null;
                                const series = seriesByKey.get(seg.seriesKey);
                                const segHeightPx = Math.max(
                                  2,
                                  (count / maxTotal) * TRACK_HEIGHT
                                );
                                const title = `${series?.label || seg.seriesKey} · ${col.label}: ${fmt(count)} lượt`;
                                return (
                                  <div
                                    key={`${col.key}-${seg.seriesKey}`}
                                    title={title}
                                    style={{
                                      ...styles.barSegment,
                                      height: segHeightPx,
                                      background: series?.color || "#2d5a76",
                                    }}
                                  />
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                        <div style={styles.barLabel}>
                          {labelLines.map((line, i) => (
                            <span key={i} style={styles.barLabelLine}>
                              {line}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={styles.legend}>
              {(data?.series || []).map((s) => (
                <div key={s.key} style={styles.legendItem}>
                  <span
                    style={{
                      ...styles.legendSwatch,
                      background: s.color || "#2d5a76",
                    }}
                  />
                  <span style={styles.legendText}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 12,
    padding: "18px 16px",
    boxShadow: "0 1px 3px rgba(31, 35, 40, 0.06)",
    gridColumn: "1 / -1",
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  segment: {
    display: "inline-flex",
    padding: 3,
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    borderRadius: 999,
  },
  segmentBtn: {
    border: "none",
    background: "transparent",
    color: "#57606a",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 999,
    cursor: "pointer",
  },
  segmentBtnActive: {
    background: "#ffffff",
    color: "#2d5a76",
    boxShadow: "0 1px 2px rgba(31, 35, 40, 0.08)",
  },
  weekNav: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  monthNav: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  navBtn: {
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    color: "#24292f",
    fontSize: "0.82rem",
    fontWeight: 600,
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
  },
  rangeLabel: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#1f2328",
    minWidth: 140,
    textAlign: "center",
  },
  rangeLabelMuted: {
    fontSize: "0.88rem",
    color: "#57606a",
    fontWeight: 600,
  },
  dateInput: {
    border: "1px solid #d0d7de",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: "0.85rem",
    color: "#24292f",
    background: "#ffffff",
  },
  monthLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#57606a",
  },
  monthInput: {
    border: "1px solid #d0d7de",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: "0.85rem",
    color: "#24292f",
    background: "#ffffff",
  },
  summaryRow: {
    marginBottom: 12,
  },
  summary: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#57606a",
  },
  chartLayout: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    alignItems: "flex-start",
  },
  chartArea: {
    flex: "1 1 320px",
    minWidth: 0,
    display: "flex",
    gap: 8,
  },
  yAxis: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: TRACK_HEIGHT + 52,
    paddingTop: 28,
    paddingBottom: 34,
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#57606a",
    textAlign: "right",
    minWidth: 28,
  },
  chartBody: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  gridLines: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 28,
    height: TRACK_HEIGHT,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    pointerEvents: "none",
  },
  gridLine: {
    borderTop: "1px dashed #d0d7de",
    width: "100%",
  },
  chartWrap: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    minHeight: TRACK_HEIGHT + 52,
    paddingTop: 28,
    position: "relative",
    zIndex: 1,
  },
  barCol: {
    flex: "1 1 0",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  barValue: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#2d5a76",
    lineHeight: 1.2,
    textAlign: "center",
    minHeight: 16,
  },
  barTrack: {
    width: "100%",
    maxWidth: 64,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    background: "#f6f8fa",
    borderRadius: "8px 8px 4px 4px",
    border: "1px solid #eaeef2",
    overflow: "hidden",
  },
  barStack: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  barSegment: {
    width: "100%",
    transition: "height 0.25s ease",
    borderTop: "1px solid rgba(255,255,255,0.35)",
  },
  barLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    minHeight: 34,
  },
  barLabelLine: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#57606a",
    textAlign: "center",
    lineHeight: 1.25,
  },
  legend: {
    flex: "0 0 180px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "8px 0",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    flexShrink: 0,
  },
  legendText: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#57606a",
    lineHeight: 1.3,
  },
  muted: {
    margin: 0,
    color: "#57606a",
    fontSize: "0.9rem",
  },
  error: {
    margin: 0,
    color: "#cf222e",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
};
