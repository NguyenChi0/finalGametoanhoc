/**
 * Chuyển dữ liệu từ 8 cột đáp án cũ → answers_json (một lần).
 * Chạy sau migration 20260601_questions_answers_json.sql:
 *   node backend/scripts/migrate-questions-answers-json.js
 */
const pool = require('../db');
const { buildAnswersFromLegacyColumns } = require('../lib/questionAnswers');

async function main() {
  const [rows] = await pool.query(
    `SELECT id, answers_json,
            answercorrect_text, answercorrect_image,
            answer2_text, answer2_image,
            answer3_text, answer3_image,
            answer4_text, answer4_image
     FROM questions
     WHERE answers_json IS NULL`
  );

  let updated = 0;
  for (const row of rows) {
    const answers = buildAnswersFromLegacyColumns(row);
    if (!answers.length) continue;
    await pool.query('UPDATE questions SET answers_json = ? WHERE id = ?', [
      JSON.stringify(answers),
      row.id,
    ]);
    updated += 1;
  }

  console.log(`Đã ghi answers_json cho ${updated}/${rows.length} câu (bỏ qua câu không có đáp án).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
