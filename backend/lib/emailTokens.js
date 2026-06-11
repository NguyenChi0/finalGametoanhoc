const crypto = require('crypto');

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

/** Sinh mã OTP 6 chữ số (000000–999999). */
function generateOtp6() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

/**
 * Invalidate unused tokens of the same type for a user.
 */
async function invalidateExistingTokens(pool, userId, type) {
  await pool.query(
    `UPDATE email_tokens SET used_at = NOW()
     WHERE user_id = ? AND type = ? AND used_at IS NULL`,
    [userId, type]
  );
}

/**
 * Create a new 6-digit OTP. Returns plaintext OTP (send via email only).
 * @param {import('mysql2/promise').Pool} pool
 * @param {{ userId: number, type: 'verify_email'|'reset_password', ttlMinutes?: number }} opts
 */
async function createEmailOtp(pool, { userId, type, ttlMinutes = 10 }) {
  await invalidateExistingTokens(pool, userId, type);

  const otp = generateOtp6();
  const tokenHash = hashToken(otp);
  const minutes = Math.max(1, Number(ttlMinutes) || 10);

  await pool.query(
    `INSERT INTO email_tokens (user_id, token_hash, type, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [userId, tokenHash, type, minutes]
  );

  return otp;
}

/**
 * Verify and consume OTP for a user email. Returns userId or null.
 * @param {import('mysql2/promise').Pool} pool
 * @param {{ email: string, otp: string, type: 'verify_email'|'reset_password' }} opts
 */
async function consumeEmailOtp(pool, { email, otp, type }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedOtp = String(otp || '').trim().replace(/\D/g, '');
  if (!normalizedEmail || normalizedOtp.length !== 6) return null;

  const [users] = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
    [normalizedEmail]
  );
  if (!users.length) return null;

  const userId = Number(users[0].id);
  const tokenHash = hashToken(normalizedOtp);
  const [rows] = await pool.query(
    `SELECT id FROM email_tokens
     WHERE user_id = ? AND token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [userId, tokenHash, type]
  );

  if (!rows.length) return null;

  await pool.query('UPDATE email_tokens SET used_at = NOW() WHERE id = ?', [rows[0].id]);
  return userId;
}

/** @deprecated alias — dùng createEmailOtp */
const createEmailToken = createEmailOtp;

/** @deprecated alias — dùng consumeEmailOtp với email */
async function consumeEmailToken(pool, { rawToken, type, email }) {
  if (email) {
    return consumeEmailOtp(pool, { email, otp: rawToken, type });
  }
  if (!rawToken) return null;
  const tokenHash = hashToken(String(rawToken).trim());
  const [rows] = await pool.query(
    `SELECT id, user_id FROM email_tokens
     WHERE token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash, type]
  );
  if (!rows.length) return null;
  await pool.query('UPDATE email_tokens SET used_at = NOW() WHERE id = ?', [rows[0].id]);
  return Number(rows[0].user_id);
}

module.exports = {
  hashToken,
  generateOtp6,
  createEmailOtp,
  consumeEmailOtp,
  createEmailToken,
  consumeEmailToken,
};
