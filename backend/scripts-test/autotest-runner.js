/**
 * Autotest runner — thực thi các kịch bản API/logic trong autotest.txt.
 * Chạy: node backend/scripts/autotest-runner.js
 * Yêu cầu: server đang chạy port 5050 + DB gametoanhoc.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db');

const API_BASE = (process.env.API_BASE || 'http://localhost:5050/api').replace(/\/$/, '');

const results = [];
function rec(id, name, pass, detail = '') {
  results.push({ id, name, pass, detail });
  const mark = pass === true ? 'PASS' : pass === 'WARN' ? 'WARN' : 'FAIL';
  console.log(`[${mark}] ${id} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  let res, body = null;
  try {
    res = await fetch(url, options);
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: null, error: e.message };
  }
}

// ---- full_set logic (sao chép từ frontend/src/users/lib/questionScoring.js) ----
function normalizeSelectedIndices(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0))];
  }
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? [n] : [];
}
function getCorrectIndices(options) {
  const opts = Array.isArray(options) ? options : [];
  return opts.map((a, i) => (a && a.correct ? i : -1)).filter((i) => i >= 0);
}
function fullSet(selected, options) {
  const sel = new Set(normalizeSelectedIndices(selected));
  const correct = new Set(getCorrectIndices(options));
  if (sel.size !== correct.size) return false;
  for (const i of correct) if (!sel.has(i)) return false;
  return true;
}

async function findSampleData() {
  const out = { playLessonId: null, gradeId: null, questionId: null };
  try {
    const [rows] = await pool.query(
      `SELECT lesson_id, grade_id, COUNT(*) n
       FROM questions
       WHERE answers_json IS NOT NULL AND lesson_id IS NOT NULL
       GROUP BY lesson_id, grade_id
       ORDER BY n DESC LIMIT 1`
    );
    if (rows.length) {
      out.playLessonId = rows[0].lesson_id;
      out.gradeId = rows[0].grade_id;
    }
    const [q] = await pool.query(
      `SELECT id FROM questions WHERE answers_json IS NOT NULL ORDER BY id LIMIT 1`
    );
    if (q.length) out.questionId = q[0].id;
  } catch (e) {
    console.log('findSampleData error:', e.message);
  }
  return out;
}

async function main() {
  console.log(`API_BASE=${API_BASE}\n`);
  const sample = await findSampleData();
  console.log('Sample data:', JSON.stringify(sample), '\n');

  // ===== SMOKE =====
  const grades = await api('/grades');
  rec('TC-SMOKE-002', 'GET /api/grades', grades.status === 200 && Array.isArray(grades.body),
    `status=${grades.status} count=${Array.isArray(grades.body) ? grades.body.length : 'n/a'}`);

  const lid = sample.playLessonId;
  if (lid) {
    const play = await api(`/questions?scope=play&lesson_id=${lid}&limit=5`);
    const d = play.body?.data;
    const ok = play.status === 200 && Array.isArray(d) &&
      (d.length === 0 || (Array.isArray(d[0].answers) && d[0].answers[0] && 'correct' in d[0].answers[0]));
    rec('TC-SMOKE-003', 'questions scope=play trả answers[]', ok,
      `status=${play.status} count=${d?.length ?? 0}`);
  } else {
    rec('TC-SMOKE-003', 'questions scope=play trả answers[]', 'WARN', 'Không tìm thấy lesson có câu hỏi');
  }

  const lbAll = await api('/leaderboard/all');
  const lbWeek = await api('/leaderboard/week');
  rec('TC-SMOKE-008', 'leaderboard all/week',
    lbAll.status === 200 && lbWeek.status === 200,
    `all=${lbAll.status} week=${lbWeek.status}`);

  // ===== AUTH =====
  const uname = `qa_${Date.now()}`;
  const reg = await api('/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, password: 'pass1234' }),
  });
  rec('TC-AUTH-001', 'Đăng ký thành công', reg.status === 200 && reg.body?.userId != null,
    `status=${reg.status}`);

  const regDup = await api('/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, password: 'pass1234' }),
  });
  rec('TC-AUTH-002', 'Đăng ký trùng username → 409', regDup.status === 409, `status=${regDup.status}`);

  const regMissing = await api('/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'no_pass_user' }),
  });
  rec('TC-AUTH-004', 'Đăng ký thiếu password → 400', regMissing.status === 400, `status=${regMissing.status}`);

  const login = await api('/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, password: 'pass1234' }),
  });
  const userToken = login.body?.token;
  rec('TC-AUTH-005', 'Đăng nhập đúng', login.status === 200 && !!userToken, `status=${login.status}`);

  const loginBad = await api('/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, password: 'wrongpass' }),
  });
  rec('TC-AUTH-006', 'Đăng nhập sai mật khẩu → 401', loginBad.status === 401, `status=${loginBad.status}`);

  const loginNoUser = await api('/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'khong_ton_tai_zzz', password: 'x' }),
  });
  rec('TC-AUTH-007', 'Đăng nhập username không tồn tại → 401', loginNoUser.status === 401, `status=${loginNoUser.status}`);

  if (userToken) {
    const me = await api('/auth/me', { headers: { Authorization: `Bearer ${userToken}` } });
    rec('TC-AUTH-008', '/auth/me phiên hợp lệ',
      me.status === 200 && me.body?.user?.username === uname, `status=${me.status}`);
  } else {
    rec('TC-AUTH-008', '/auth/me phiên hợp lệ', 'WARN', 'Không có token');
  }

  const meBad = await api('/auth/me', { headers: { Authorization: 'Bearer invalid.token.here' } });
  rec('TC-AUTH-009', '/auth/me token sai → 401', meBad.status === 401, `status=${meBad.status}`);

  // Kilovia
  const ma = `QA${Date.now()}`;
  const k1 = await api('/external-login-child', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maTreEm: ma, fullname: 'QA Kid' }),
  });
  rec('TC-AUTH-010', 'Kilovia lần đầu → created:true',
    k1.status === 200 && k1.body?.created === true, `status=${k1.status} created=${k1.body?.created}`);
  const k2 = await api('/external-login-child', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maTreEm: ma }),
  });
  rec('TC-AUTH-011', 'Kilovia lần sau → created:false',
    k2.status === 200 && k2.body?.created === false, `status=${k2.status} created=${k2.body?.created}`);
  const k3 = await api('/external-login-child', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  rec('TC-AUTH-012', 'Kilovia thiếu maTreEm → 400', k3.status === 400, `status=${k3.status}`);

  // ===== NAV =====
  if (sample.gradeId) {
    const types = await api(`/types/${sample.gradeId}`);
    rec('TC-NAV-002', 'types theo grade_id', types.status === 200, `status=${types.status}`);
  }
  const labels = await api('/hierarchy-labels');
  rec('TC-NAV-005', 'hierarchy-labels', labels.status === 200, `status=${labels.status}`);

  // ===== QUESTIONS API =====
  if (lid) {
    const playScope = await api(`/questions?scope=play&lesson_id=${lid}&limit=3`);
    const row = playScope.body?.data?.[0];
    const noHierarchy = row ? !('hierarchy_path' in row) : true;
    rec('TC-Q-013', 'scope=play payload nhẹ (không hierarchy_path)',
      playScope.status === 200 && noHierarchy, `status=${playScope.status}`);

    const listAdmin = await api(`/questions?lesson_id=${lid}&limit=1`);
    const arow = listAdmin.body?.data?.[0];
    rec('TC-Q-014', 'list admin-style có hierarchy_path/in_exam_template',
      listAdmin.status === 200 && arow && ('hierarchy_path' in arow) && ('in_exam_template' in arow),
      `status=${listAdmin.status}`);
  }
  const evil = await api('/questions?scope=evil');
  rec('TC-Q-015', 'scope không hợp lệ → 400', evil.status === 400, `status=${evil.status}`);

  const clamp = await api('/questions?limit=99999');
  rec('TC-Q-018', 'limit clamp ≤500', clamp.status === 200 && (clamp.body?.data?.length ?? 0) <= 500,
    `returned=${clamp.body?.data?.length ?? 0}`);

  const badGrade = await api('/questions?grade_id=abc');
  rec('TC-Q-019', 'grade_id không hợp lệ → 400', badGrade.status === 400, `status=${badGrade.status}`);

  const inj = await api(`/questions?search=${encodeURIComponent("' OR '1'='1")}`);
  rec('TC-SEC-003', 'SQL injection search không crash',
    inj.status === 200 || inj.status === 400, `status=${inj.status}`);

  // ===== SECURITY: questions write =====
  const postNoToken = await api('/questions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  rec('TC-SEC-001', 'POST /questions không token → 401', postNoToken.status === 401, `status=${postNoToken.status}`);

  if (userToken) {
    const postUser = await api('/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ grade_id: 1, type_id: 1, lesson_id: 1, question_text: 'x', answers: [] }),
    });
    rec('TC-SEC-002', 'POST /questions token user → 403', postUser.status === 403, `status=${postUser.status}`);

    const admNoRole = await api('/admin/users', { headers: { Authorization: `Bearer ${userToken}` } });
    rec('TC-ADM-017', 'User token gọi /api/admin/* → 403', admNoRole.status === 403, `status=${admNoRole.status}`);
  }
  const admNoToken = await api('/admin/users');
  rec('TC-ADM-018', 'Không token gọi /api/admin/* → 401', admNoToken.status === 401, `status=${admNoToken.status}`);

  // ===== EXAM / CONTEST (cần token) =====
  if (userToken) {
    const exams = await api('/exams?page=1&page_size=5', { headers: { Authorization: `Bearer ${userToken}` } });
    rec('TC-EXAM-001', 'Danh sách đề (auth)', exams.status === 200 && Array.isArray(exams.body?.data),
      `status=${exams.status} total=${exams.body?.pagination?.total ?? '?'}`);
    const examsNoAuth = await api('/exams');
    rec('TC-EXAM-003', 'exams không token → 401', examsNoAuth.status === 401, `status=${examsNoAuth.status}`);

    const contests = await api('/contests', { headers: { Authorization: `Bearer ${userToken}` } });
    rec('TC-CONTEST-001', 'Danh sách cuộc thi', contests.status === 200, `status=${contests.status}`);

    const firstExam = exams.body?.data?.[0];
    if (firstExam) {
      const detail = await api(`/exams/${firstExam.id}`, { headers: { Authorization: `Bearer ${userToken}` } });
      const hasQ = Array.isArray(detail.body?.questions);
      const ansOk = hasQ && detail.body.questions.every((q) => Array.isArray(q.answers));
      rec('TC-EXAM-004', 'Chi tiết đề có questions[].answers[]',
        detail.status === 200 && hasQ && ansOk, `status=${detail.status} q=${detail.body?.question_count ?? 0}`);
    } else {
      rec('TC-EXAM-004', 'Chi tiết đề có questions[].answers[]', 'WARN', 'Không có đề active để test');
    }
  }

  // ===== FULL_SET LOGIC (TC-Q-020..026) =====
  const opt1 = [{ correct: true }, { correct: false }, { correct: false }];
  rec('TC-Q-020', '1 đúng — chọn đúng → PASS', fullSet([0], opt1) === true);
  rec('TC-Q-021', '1 đúng — chọn sai → FAIL(đúng kỳ vọng)', fullSet([1], opt1) === false);

  const opt2 = [{ correct: true }, { correct: true }, { correct: false }, { correct: false }];
  rec('TC-Q-022', '2 đúng — chọn đủ 2 → PASS', fullSet([0, 1], opt2) === true);
  rec('TC-Q-023', '2 đúng — chỉ 1 → FAIL(đúng kỳ vọng)', fullSet([0], opt2) === false);
  rec('TC-Q-024', '2 đúng — 2 đúng + 1 sai → FAIL(đúng kỳ vọng)', fullSet([0, 1, 2], opt2) === false);

  const opt3 = [{ correct: true }, { correct: true }, { correct: true }, { correct: false }, { correct: false }, { correct: false }];
  rec('TC-Q-025', '3 đúng — chọn đủ 3 → PASS', fullSet([0, 1, 2], opt3) === true);
  rec('TC-Q-026', '3 đúng — chọn 2/3 → FAIL(đúng kỳ vọng)', fullSet([0, 1], opt3) === false);

  // ===== SQL sanity =====
  try {
    const [[r]] = await pool.query('SELECT COUNT(*) n FROM questions WHERE answers_json IS NULL');
    rec('TC-Q-DB', 'answers_json NULL count', true, `null_rows=${r.n}`);
    const [[r2]] = await pool.query('SELECT COUNT(*) n FROM questions');
    rec('TC-Q-DB2', 'tổng số câu hỏi', true, `total=${r2.n}`);
  } catch (e) {
    rec('TC-Q-DB', 'answers_json NULL count', false, e.message);
  }

  // ===== SUMMARY =====
  const pass = results.filter((r) => r.pass === true).length;
  const fail = results.filter((r) => r.pass === false).length;
  const warn = results.filter((r) => r.pass === 'WARN').length;
  console.log(`\n==== TỔNG: ${pass} PASS / ${fail} FAIL / ${warn} WARN (tổng ${results.length}) ====`);
  await pool.end();
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
