/**
 * Autotest runner #2 — các endpoint cần auth (user + admin) và CRUD.
 * Tự ký JWT bằng JWT_SECRET trong .env (giống signAccessToken).
 * Chạy: node backend/scripts/autotest-runner2.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');
const pool = require('../db');

const API_BASE = (process.env.API_BASE || 'http://localhost:5050/api').replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'ae123oi34t89ujh9876543210';

const results = [];
function rec(id, name, pass, detail = '') {
  results.push({ id, name, pass, detail });
  const mark = pass === true ? 'PASS' : pass === 'WARN' ? 'WARN' : 'FAIL';
  console.log(`[${mark}] ${id} ${name}${detail ? ` — ${detail}` : ''}`);
}
function sign(user) {
  return jwt.sign(
    { sub: Number(user.id), username: String(user.username || ''), role: Number(user.role || 0) },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}
async function api(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, options);
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: null, error: e.message };
  }
}
const jhead = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

async function main() {
  console.log(`API_BASE=${API_BASE}\n`);

  // --- Lấy id mẫu ---
  const [[adminRow]] = await pool.query('SELECT id, username, role FROM users WHERE role = 1 LIMIT 1');
  const [[uRow]] = await pool.query('SELECT id, username FROM users WHERE role = 0 OR role IS NULL ORDER BY id DESC LIMIT 1');
  const [[gtl]] = await pool.query('SELECT grade_id, type_id, lesson_id FROM questions WHERE lesson_id IS NOT NULL LIMIT 1');
  const [[cheapItem]] = await pool.query('SELECT id, require_score FROM items ORDER BY require_score ASC LIMIT 1');
  const [[contest]] = await pool.query('SELECT id, status FROM contests ORDER BY id DESC LIMIT 1');
  const [[examT]] = await pool.query('SELECT id FROM exam_templates LIMIT 1');

  if (!adminRow) { console.log('Không có admin — dừng.'); await pool.end(); return; }
  const adminToken = sign(adminRow);
  const userToken = uRow ? sign(uRow) : null;
  console.log('admin=', adminRow.id, 'user=', uRow?.id, 'gtl=', JSON.stringify(gtl), '\n');

  // ===== USER-AUTH ENDPOINTS =====
  if (userToken && gtl) {
    const prog = await api('/lesson-progress', {
      method: 'POST', headers: jhead(userToken),
      body: JSON.stringify({
        lessonId: gtl.lesson_id, gradeId: gtl.grade_id, typeId: gtl.type_id,
        correctCount: 3, totalCount: 5, gameId: 'game1',
      }),
    });
    rec('TC-PROG-POST', 'POST lesson-progress lưu sao',
      prog.status === 200 && prog.body?.success === true,
      `status=${prog.status} stars=${prog.body?.progress?.stars}`);

    const progBad = await api('/lesson-progress', {
      method: 'POST', headers: jhead(userToken),
      body: JSON.stringify({ lessonId: gtl.lesson_id, gradeId: gtl.grade_id, typeId: gtl.type_id, correctCount: 9, totalCount: 5 }),
    });
    rec('TC-PROG-007', 'POST lesson-progress correctCount>total → 400', progBad.status === 400, `status=${progBad.status}`);

    const completed = await api('/lesson-progress/completed', { headers: jhead(userToken) });
    rec('TC-PROG-003', 'GET lesson-progress/completed', completed.status === 200, `status=${completed.status}`);

    const last = await api('/lesson-progress/last', { headers: jhead(userToken) });
    rec('TC-PROG-004', 'GET lesson-progress/last', last.status === 200, `status=${last.status}`);

    const byGrade = await api(`/lesson-progress?grade_id=${gtl.grade_id}`, { headers: jhead(userToken) });
    rec('TC-PROG-005', 'GET lesson-progress?grade_id', byGrade.status === 200, `status=${byGrade.status}`);

    const inc = await api('/score/increment', {
      method: 'POST', headers: jhead(userToken), body: JSON.stringify({ delta: 1 }),
    });
    rec('TC-PROG-INC', 'POST score/increment (self)', inc.status === 200 && inc.body?.success === true,
      `status=${inc.status} score=${inc.body?.score}`);
  }

  // ===== ITEMS / SHOP =====
  const items = await api('/items');
  rec('TC-SHOP-001', 'GET /items (public)', items.status === 200 && Array.isArray(items.body),
    `status=${items.status} count=${Array.isArray(items.body) ? items.body.length : '?'}`);

  if (userToken) {
    const eff = await api('/item-effects', { headers: jhead(userToken) });
    rec('TC-SHOP-005', 'GET /item-effects', eff.status === 200, `status=${eff.status}`);

    const myItems = await api(`/my-items/${uRow.id}`, { headers: jhead(userToken) });
    rec('TC-SHOP-006', 'GET /my-items/:userId (self)', myItems.status === 200, `status=${myItems.status}`);

    const myItemsOther = await api(`/my-items/${adminRow.id}`, { headers: jhead(userToken) });
    rec('TC-SEC-MYITEMS', 'GET /my-items người khác → 403', myItemsOther.status === 403, `status=${myItemsOther.status}`);

    if (cheapItem) {
      // user mới điểm 0 → mua item 5000 phải bị từ chối
      const buy = await api('/buy', {
        method: 'POST', headers: jhead(userToken),
        body: JSON.stringify({ userId: uRow.id, itemId: cheapItem.id }),
      });
      rec('TC-SHOP-003', 'Mua thiếu điểm bị từ chối',
        buy.status === 400 || buy.status === 403 || (buy.body && buy.body.success === false),
        `status=${buy.status}`);
    }
  }

  // ===== CONTEST detail / leaderboard (auth) =====
  if (userToken && contest) {
    const cd = await api(`/contests/${contest.id}`, { headers: jhead(userToken) });
    rec('TC-CONTEST-005', 'GET /contests/:id chi tiết', cd.status === 200, `status=${cd.status}`);
    const lb = await api(`/contests/${contest.id}/leaderboard`, { headers: jhead(userToken) });
    rec('TC-CONTEST-010', 'GET /contests/:id/leaderboard', lb.status === 200, `status=${lb.status}`);
    // contest status=0 (ended) → submit phải 403
    const sub = await api(`/contests/${contest.id}/submit`, {
      method: 'POST', headers: jhead(userToken), body: JSON.stringify({ score: 1, times: 10 }),
    });
    rec('TC-CONTEST-008', 'Submit cuộc thi đã kết thúc → 403', sub.status === 403, `status=${sub.status} (contest status=${contest.status})`);
  }

  // ===== ADMIN: dashboard / lists =====
  const dash = await api('/admin/dashboard', { headers: jhead(adminToken) });
  rec('TC-ADM-001', 'GET /admin/dashboard', dash.status === 200, `status=${dash.status}`);
  const perf = await api('/admin/dashboard/performance', { headers: jhead(adminToken) });
  rec('TC-ADM-002', 'GET /admin/dashboard/performance', perf.status === 200, `status=${perf.status}`);
  const ausers = await api('/admin/users', { headers: jhead(adminToken) });
  const noPw = Array.isArray(ausers.body?.data || ausers.body)
    ? (ausers.body?.data || ausers.body).every((u) => !('password' in u)) : true;
  rec('TC-ADM-003', 'GET /admin/users (không lộ password)', ausers.status === 200 && noPw, `status=${ausers.status}`);
  const agrades = await api('/admin/grades', { headers: jhead(adminToken) });
  rec('TC-ADM-GRADES-LIST', 'GET /admin/grades', agrades.status === 200, `status=${agrades.status}`);
  const atypes = await api('/admin/types', { headers: jhead(adminToken) });
  rec('TC-ADM-TYPES-LIST', 'GET /admin/types', atypes.status === 200, `status=${atypes.status}`);
  const alessons = await api('/admin/lessons', { headers: jhead(adminToken) });
  rec('TC-ADM-LESSONS-LIST', 'GET /admin/lessons', alessons.status === 200, `status=${alessons.status}`);
  const aitems = await api('/admin/items', { headers: jhead(adminToken) });
  rec('TC-ADM-ITEMS-LIST', 'GET /admin/items', aitems.status === 200, `status=${aitems.status}`);
  const aet = await api('/admin/exam-templates', { headers: jhead(adminToken) });
  rec('TC-ADM-EXAMT-LIST', 'GET /admin/exam-templates', aet.status === 200, `status=${aet.status}`);
  const acon = await api('/admin/contests', { headers: jhead(adminToken) });
  rec('TC-ADM-CONTEST-LIST', 'GET /admin/contests', acon.status === 200, `status=${acon.status}`);

  // ===== ADMIN: GRADES CRUD (create→update→delete) =====
  let newGradeId = null;
  const [[{ gmax }]] = await pool.query('SELECT COALESCE(MAX(id),0) AS gmax FROM grades');
  const gradeIdToCreate = Number(gmax) + 1;
  const cg = await api('/admin/grades', {
    method: 'POST', headers: jhead(adminToken), body: JSON.stringify({ id: gradeIdToCreate, name: `QA${gradeIdToCreate}` }),
  });
  newGradeId = cg.body?.id ?? gradeIdToCreate;
  if (cg.status !== 200 && cg.status !== 201) newGradeId = null;
  rec('TC-ADM-005a', 'POST /admin/grades tạo khối', (cg.status === 200 || cg.status === 201) && newGradeId != null, `status=${cg.status} id=${newGradeId}`);
  if (newGradeId) {
    const ug = await api(`/admin/grades/${newGradeId}`, {
      method: 'PUT', headers: jhead(adminToken), body: JSON.stringify({ name: `QA${newGradeId}b` }),
    });
    rec('TC-ADM-005b', 'PUT /admin/grades/:id sửa khối', ug.status === 200, `status=${ug.status}`);
    const dg = await api(`/admin/grades/${newGradeId}`, { method: 'DELETE', headers: jhead(adminToken) });
    rec('TC-ADM-005c', 'DELETE /admin/grades/:id xóa khối', dg.status === 200, `status=${dg.status}`);
  }

  // ===== ADMIN: ITEMS CRUD (JSON, dùng item_image_path) =====
  let newItemId = null;
  const ci = await api('/admin/items', {
    method: 'POST', headers: jhead(adminToken),
    body: JSON.stringify({ name: `QA Item ${Date.now()}`, require_score: 10, item_image_path: '/items-images/placeholder.png', level: 1 }),
  });
  newItemId = ci.body?.id ?? ci.body?.insertId ?? ci.body?.item?.id ?? null;
  rec('TC-ADM-015a', 'POST /admin/items tạo vật phẩm', (ci.status === 200 || ci.status === 201) && newItemId != null, `status=${ci.status} id=${newItemId}`);
  const ciNoName = await api('/admin/items', {
    method: 'POST', headers: jhead(adminToken), body: JSON.stringify({ require_score: 10, item_image_path: '/items-images/x.png' }),
  });
  rec('TC-ADM-016', 'POST /admin/items thiếu name → 400', ciNoName.status === 400, `status=${ciNoName.status}`);
  if (newItemId) {
    const di = await api(`/admin/items/${newItemId}`, { method: 'DELETE', headers: jhead(adminToken) });
    rec('TC-ADM-015c', 'DELETE /admin/items/:id', di.status === 200, `status=${di.status}`);
  }

  // ===== ADMIN/QUESTIONS CRUD =====
  if (gtl) {
    const base = { grade_id: gtl.grade_id, type_id: gtl.type_id, lesson_id: gtl.lesson_id, question_text: `QA Q ${Date.now()}` };
    // 3 đúng + 3 sai (max)
    const c33 = await api('/questions', {
      method: 'POST', headers: jhead(adminToken),
      body: JSON.stringify({ ...base, answers: [
        { text: 'd1', correct: true }, { text: 'd2', correct: true }, { text: 'd3', correct: true },
        { text: 's1', correct: false }, { text: 's2', correct: false }, { text: 's3', correct: false },
      ] }),
    });
    const newQId = c33.body?.id ?? c33.body?.insertId ?? null;
    rec('TC-Q-002', 'POST /questions 3 đúng + 3 sai (max)', (c33.status === 200 || c33.status === 201) && newQId != null, `status=${c33.status} id=${newQId}`);

    // 4 đúng → 400
    const c4 = await api('/questions', {
      method: 'POST', headers: jhead(adminToken),
      body: JSON.stringify({ ...base, answers: [
        { text: 'd1', correct: true }, { text: 'd2', correct: true }, { text: 'd3', correct: true }, { text: 'd4', correct: true },
        { text: 's1', correct: false },
      ] }),
    });
    rec('TC-Q-003', 'POST /questions 4 đúng → 400', c4.status === 400, `status=${c4.status} msg=${c4.body?.message || ''}`);

    // toàn sai → 400 (cần ít nhất 1 đúng)
    const cAllWrong = await api('/questions', {
      method: 'POST', headers: jhead(adminToken),
      body: JSON.stringify({ ...base, answers: [{ text: 's1', correct: false }, { text: 's2', correct: false }] }),
    });
    rec('TC-Q-005', 'POST /questions không có đáp đúng → 400', cAllWrong.status === 400, `status=${cAllWrong.status}`);

    if (newQId) {
      // usage
      const usage = await api(`/questions/${newQId}/usage`, { headers: jhead(adminToken) });
      rec('TC-Q-010', 'GET /questions/:id/usage (admin)', usage.status === 200, `status=${usage.status}`);
      // PUT sửa
      const put = await api(`/questions/${newQId}`, {
        method: 'PUT', headers: jhead(adminToken),
        body: JSON.stringify({ ...base, question_text: 'QA Q updated', answers: [{ text: 'a', correct: true }, { text: 'b', correct: false }] }),
      });
      rec('TC-Q-008', 'PUT /questions/:id sửa câu', put.status === 200, `status=${put.status}`);
      // DELETE
      const del = await api(`/questions/${newQId}`, { method: 'DELETE', headers: jhead(adminToken) });
      rec('TC-Q-011', 'DELETE /questions/:id (ngoài mẫu đề)', del.status === 200, `status=${del.status}`);
    }
  }

  // ===== SUMMARY =====
  const pass = results.filter((r) => r.pass === true).length;
  const fail = results.filter((r) => r.pass === false).length;
  const warn = results.filter((r) => r.pass === 'WARN').length;
  console.log(`\n==== RUNNER#2 TỔNG: ${pass} PASS / ${fail} FAIL / ${warn} WARN (tổng ${results.length}) ====`);
  await pool.end();
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
