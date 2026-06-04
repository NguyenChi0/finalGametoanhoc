/**
 * Smoke test: questions API + SQL sanity.
 * Chạy khi server đang bật:
 *   node backend/scripts/smoke-questions-api.js
 *
 * Env (tùy chọn):
 *   API_BASE=http://localhost:5050/api
 *   ADMIN_TOKEN=<jwt admin>
 *   USER_TOKEN=<jwt user role=0> — để test 403 POST
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = require('../db');
const API_BASE = (process.env.API_BASE || 'http://localhost:5050/api').replace(/\/$/, '');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function runApiTests() {
  const r1 = await fetchJson('/questions?lesson_id=61&scope=play&limit=5');
  const data1 = r1.body?.data;
  const ok1 =
    r1.status === 200 &&
    Array.isArray(data1) &&
    (data1.length === 0 ||
      (data1[0].answers?.length >= 2 && data1[0].id != null));
  record(
    'GET play scope + lesson_id',
    ok1,
    `status=${r1.status} count=${data1?.length ?? 0}`
  );

  const r2 = await fetchJson('/questions?limit=99999');
  const ok2 = r2.status === 200 && (r2.body?.data?.length ?? 0) <= 500;
  record('GET limit clamped', ok2, `returned=${r2.body?.data?.length ?? 0}`);

  const r3 = await fetchJson('/questions?grade_id=abc');
  const ok3 = r3.status === 400;
  record('GET invalid grade_id → 400', ok3, `status=${r3.status}`);

  const r4 = await fetchJson('/questions?limit=1');
  const row4 = r4.body?.data?.[0];
  const ok4 =
    r4.status === 200 &&
    row4 &&
    ('hierarchy_path' in row4 || row4.grade_name != null) &&
    'in_exam_template' in row4;
  record('GET admin list fields', ok4, `status=${r4.status}`);

  const r5 = await fetchJson('/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  record('POST without token → 401', r5.status === 401, `status=${r5.status}`);

  const userToken = process.env.USER_TOKEN;
  if (userToken) {
    const r6 = await fetchJson('/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        grade_id: 1,
        type_id: 1,
        lesson_id: 1,
        question_text: 'smoke',
        answers: ['a', 'b'],
        correct_index: 0,
      }),
    });
    record('POST user token → 403', r6.status === 403, `status=${r6.status}`);
  } else {
    record('POST user token → 403', true, 'SKIP (set USER_TOKEN to verify)');
  }

  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken) {
    const r7 = await fetchJson('/questions?scope=evil');
    record('GET invalid scope → 400', r7.status === 400, `status=${r7.status}`);
  } else {
    const r7 = await fetchJson('/questions?scope=evil');
    record('GET invalid scope → 400', r7.status === 400, `status=${r7.status}`);
  }
}

async function runSqlTests() {
  try {
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS n FROM questions WHERE answers_json IS NULL'
    );
    const n = Number(row?.n ?? 0);
    record('SQL answers_json NULL count', true, `null_rows=${n}`);
  } catch (e) {
    record('SQL answers_json NULL count', false, e.message);
  }
}

async function main() {
  console.log(`API_BASE=${API_BASE}\n`);
  try {
    await runApiTests();
  } catch (e) {
    record('API tests', false, e.message);
  }
  try {
    await runSqlTests();
  } finally {
    await pool.end();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
