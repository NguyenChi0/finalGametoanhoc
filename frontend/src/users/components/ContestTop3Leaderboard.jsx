import React, { useCallback, useEffect, useState } from "react";
import { getContestLeaderboard } from "../../api";

function formatDurationSeconds(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/**
 * Bảng xếp hạng Top 3 một cuộc thi (client).
 * @param {{ contestId: number|string, questionCount?: number, defaultOpen?: boolean }} props
 */
export default function ContestTop3Leaderboard({
  contestId,
  questionCount: questionCountProp,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const [questionCount, setQuestionCount] = useState(
    () => Number(questionCountProp) || 0
  );
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const cid = Number(contestId);
    if (!Number.isFinite(cid) || cid <= 0) return;
    setLoading(true);
    setError("");
    try {
      const data = await getContestLeaderboard(cid);
      setEntries(Array.isArray(data?.leaderboard) ? data.leaderboard : []);
      const q = Number(data?.question_count);
      if (Number.isFinite(q) && q > 0) setQuestionCount(q);
      else if (questionCountProp) setQuestionCount(Number(questionCountProp) || 0);
      setLoaded(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không tải được bảng xếp hạng."
      );
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [contestId, questionCountProp]);

  useEffect(() => {
    if (defaultOpen && !loaded) void load();
  }, [defaultOpen, loaded, load]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const totalQ = questionCount > 0 ? questionCount : null;

  return (
    <div className="contest-top3-wrap">
      <button
        type="button"
        className="contest-top3-toggle"
        onClick={toggle}
        aria-expanded={open}
      >
        {open ? "Ẩn bảng xếp hạng" : "Bảng xếp hạng"}
      </button>
      {open && (
        <div className="contest-top3-panel" role="region" aria-live="polite">
          {loading && <p className="contest-top3-muted">Đang tải…</p>}
          {!loading && error && (
            <p className="contest-top3-error">
              {error}{" "}
              <button type="button" className="contest-top3-retry" onClick={() => void load()}>
                Thử lại
              </button>
            </p>
          )}
          {!loading && !error && entries.length === 0 && (
            <p className="contest-top3-muted">Chưa có ai nộp bài trong cuộc thi này.</p>
          )}
          {!loading && !error && entries.length > 0 && (
            <ul className="contest-top3-list">
              {entries.map((row) => (
                <li
                  key={`${row.user_id}-${row.rank}`}
                  className="contest-top3-item"
                >
                  <span className="contest-top3-rank">{row.rank}</span>
                  <span className="contest-top3-name">{row.username || `User #${row.user_id}`}</span>
                  <span className="contest-top3-score">
                    {row.score}
                    {totalQ != null ? `/${totalQ}` : ""}
                  </span>
                  <span className="contest-top3-time">{formatDurationSeconds(row.times)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <style>{`
        .contest-top3-wrap {
          margin-top: 0;
          padding-top: 0;
        }
        .contest-top3-toggle {
          display: inline;
          border: none;
          background: none;
          padding: 0;
          margin: 0;
          color: #6c7ee1;
          font-weight: 600;
          font-size: 14px;
          line-height: 1.5;
          cursor: pointer;
          font-family: inherit;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.15s ease;
        }
        .contest-top3-toggle:hover {
          color: #4a5080;
        }
        .contest-top3-panel {
          margin-top: 10px;
          padding: 0;
        }
        .contest-top3-muted {
          margin: 0;
          color: #6b7099;
          font-size: 14px;
        }
        .contest-top3-error {
          margin: 0;
          color: #c62828;
          font-size: 14px;
        }
        .contest-top3-retry {
          border: none;
          background: none;
          color: #6c7ee1;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          font-family: inherit;
          padding: 0;
        }
        .contest-top3-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .contest-top3-item {
          display: grid;
          grid-template-columns: 32px 1fr auto auto;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          background: transparent;
          font-size: 14px;
          transition: box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
        }
        .contest-top3-item:hover {
          background: #fff;
          box-shadow: 0 6px 18px rgba(74, 80, 128, 0.12);
          transform: translateY(-2px);
        }
        .contest-top3-rank {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          background: transparent;
          color: #6b7099;
        }
        .contest-top3-name {
          font-weight: 600;
          color: #4a5080;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .contest-top3-score {
          font-weight: 700;
          color: #4a5080;
          white-space: nowrap;
        }
        .contest-top3-time {
          font-weight: 500;
          color: #6b7099;
          font-size: 13px;
          white-space: nowrap;
        }
        @media (max-width: 520px) {
          .contest-top3-item {
            grid-template-columns: 32px 1fr;
            grid-template-rows: auto auto;
          }
          .contest-top3-score,
          .contest-top3-time {
            grid-column: 2;
          }
        }
      `}</style>
    </div>
  );
}
