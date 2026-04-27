-- Used by `distributeEndedContestPrizes` in `server.js`: one-time add `prize` to top-3
-- users' `users.score` after contest end.
ALTER TABLE `contests`
  ADD COLUMN `prize_distributed` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '0=pending prize payout, 1=done'
  AFTER `prize`;
