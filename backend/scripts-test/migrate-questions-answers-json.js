/**
 * Chuyển dữ liệu từ 8 cột đáp án cũ → answers_json (một lần).
 * Chạy sau migration 20260601_questions_answers_json.sql:
 *   node backend/scripts/migrate-questions-answers-json.js
 *
 * Nếu DB đã chỉ có answers_json (dump mới) — script báo và thoát.
 */
const pool = require('../db');
const { buildAnswersFromLegacyColumns } = require('../lib/questionAnswers');

const LEGACY_COLUMNS = [
  'answercorrect_text',
  'answercorrect_image',
  'answer2_text',
  'answer2_image',
  'answer3_text',
  'answer3_image',
  'answer4_text',
  'answer4_image',
];

async function hasLegacyAnswerColumns(conn) {
  const placeholders = LEGACY_COLUMNS.map(() => '?').join(', ');
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'questions'
       AND COLUMN_NAME IN (${placeholders})`,
    LEGACY_COLUMNS
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

async function main() {
  const conn = await pool.getConnection();
  try {
    const legacy = await hasLegacyAnswerColumns(conn);
    if (!legacy) {
      const [[pending]] = await conn.query(
        `SELECT COUNT(*) AS n FROM questions WHERE answers_json IS NULL`
      );
      const n = Number(pending?.n ?? 0);
      if (n === 0) {
        console.log('DB đã dùng answers_json; không có cột legacy — không cần migrate.');
      } else {
        console.log(
          `Cảnh báo: ${n} câu có answers_json NULL nhưng không có cột legacy để backfill. Cần nhập đáp án thủ công hoặc import dump.`
        );
      }
      return;
    }

    const legacyList = LEGACY_COLUMNS.join(', ');
    const [rows] = await conn.query(
      `SELECT id, answers_json, ${legacyList}
       FROM questions
       WHERE answers_json IS NULL`
    );

    let updated = 0;
    const batch = [];
    for (const row of rows) {
      const answers = buildAnswersFromLegacyColumns(row);
      if (!answers.length) continue;
      batch.push([JSON.stringify(answers), row.id]);
      if (batch.length >= 100) {
        for (const [json, id] of batch) {
          await conn.query('UPDATE questions SET answers_json = ? WHERE id = ?', [json, id]);
        }
        updated += batch.length;
        batch.length = 0;
      }
    }
    for (const [json, id] of batch) {
      await conn.query('UPDATE questions SET answers_json = ? WHERE id = ?', [json, id]);
    }
    updated += batch.length;

    console.log(
      `Đã ghi answers_json cho ${updated}/${rows.length} câu (bỏ qua câu không có đáp án).`
    );
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
