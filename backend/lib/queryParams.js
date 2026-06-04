/**
 * Валидация query/body параметров для безопасных SQL-запросов (без конкатенации пользовательского ввода).
 */

function parsePositiveInt(raw, { default: defaultVal = null, max = null } = {}) {
  if (raw == null || raw === '') return defaultVal;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  if (max != null && n > max) return max;
  return n;
}

function clampLimitOffset(limitRaw, offsetRaw, { maxLimit = 500, maxOffset = 100000, defaultLimit = 200 } = {}) {
  let limit = Number(limitRaw);
  if (!Number.isFinite(limit) || limit <= 0) limit = defaultLimit;
  limit = Math.min(Math.floor(limit), maxLimit);

  let offset = Number(offsetRaw);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  offset = Math.min(Math.floor(offset), maxOffset);

  return { limit, offset };
}

/** Whitelist scope для GET /api/questions. */
function parseScope(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (s === 'play') return 'play';
  return null;
}

/** IN (?,?,?) — только placeholders, значения в params. */
function sqlInPlaceholders(ids) {
  const list = Array.isArray(ids) ? ids.filter((id) => Number.isFinite(id) && id > 0) : [];
  if (!list.length) return { clause: '', params: [] };
  return {
    clause: list.map(() => '?').join(','),
    params: list,
  };
}

module.exports = {
  parsePositiveInt,
  clampLimitOffset,
  parseScope,
  sqlInPlaceholders,
};
