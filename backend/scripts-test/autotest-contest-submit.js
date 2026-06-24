/**
 * Test luồng nộp cuộc thi (cần 1 cuộc thi ĐANG active).
 * Tự tạo cuộc thi tạm (prize=0, end_time tương lai), test submit, rồi DỌN sạch.
 * Chạy: node backend/scripts/autotest-contest-submit.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const API_BASE = (process.env.API_BASE || 'http://localhost:5050/api').replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'ae123oi34t89ujh9876543210';

const results = [];
function rec(id, name, pass, detail = '') {
  results.push({ id, pass });
  const mark = pass === true ? 'PASS' : pass === 'WARN' ? 'WARN' : 'FAIL';
  console.log(`[${mark}] ${id} ${name}${detail ? ` — ${detail}` : ''}`);
}
function sign(u) {
  return jwt.sign({ sub: Number(u.id), username: String(u.username), role: Number(u.role || 0) }, JWT_SECRET, { expiresIn: '1d' });
}
async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  let body = null; try { body = await res.json(); } catch {}
  return { status: res.status, body };
}
const jhead = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

async function main() {
  let contestId = null, userId = null;
  try {
    // 1) Template + số câu
    const [[tpl]] = await pool.query('SELECT id FROM exam_templates LIMIT 1');
    if (!tpl) { console.log('Không có template — dừng.'); return; }
    const [[qc]] = await pool.query('SELECT COUNT(*) n FROM exam_template_questions WHERE template_id = ?', [tpl.id]);
    const numQ = Number(qc.n) || 0;

    // 2) Tạo cuộc thi active tạm: start quá khứ, end tương lai, status=2, prize=0
    const [[{ mx }]] = await pool.query('SELECT COALESCE(MAX(id),0) mx FROM contests');
    contestId = Number(mx) + 1;
    await pool.query(
      `INSERT INTO contests (id, name, template_id, grade_id, start_time, end_time, status, prize, prize_distributed, duration_time)
       VALUES (?, ?, ?, 1, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 2 HOUR), 2, 0, 0, 30)`,
      [contestId, `QA Active Contest ${Date.now()}`, tpl.id]
    );
    console.log(`Seeded contest id=${contestId} (template ${tpl.id}, ${numQ} câu)\n`);

    // 3) User tạm
    const uname = `qa_contest_${Date.now()}`;
    const hashed = bcrypt.hashSync('pass1234', 8);
    const [ins] = await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [uname, hashed]);
    userId = ins.insertId;
    const token = sign({ id: userId, username: uname, role: 0 });

    // 4) GET chi tiết khi active
    const detail = await api(`/contests/${contestId}`, { headers: jhead(token) });
    rec('TC-CONTEST-003', 'Cuộc thi active — xem chi tiết', detail.status === 200, `status=${detail.status}`);

    // 5) Submit hợp lệ → 201
    const okScore = Math.min(numQ || 1, 1);
    const sub1 = await api(`/contests/${contestId}/submit`, {
      method: 'POST', headers: jhead(token), body: JSON.stringify({ score: okScore, times: 12 }),
    });
    rec('TC-CONTEST-006', 'Submit khi active → 201', sub1.status === 201, `status=${sub1.status}`);

    // 6) Submit lần 2 → 409
    const sub2 = await api(`/contests/${contestId}/submit`, {
      method: 'POST', headers: jhead(token), body: JSON.stringify({ score: okScore, times: 15 }),
    });
    rec('TC-CONTEST-007', 'Submit lần 2 → 409', sub2.status === 409, `status=${sub2.status}`);

    // 7) Điểm vượt số câu → 400 (dùng user khác để không vướng 409)
    const uname2 = `qa_contest2_${Date.now()}`;
    const [ins2] = await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [uname2, hashed]);
    const token2 = sign({ id: ins2.insertId, username: uname2, role: 0 });
    if (numQ > 0) {
      const subOver = await api(`/contests/${contestId}/submit`, {
        method: 'POST', headers: jhead(token2), body: JSON.stringify({ score: numQ + 999, times: 10 }),
      });
      rec('TC-CONTEST-009', 'Điểm vượt số câu → 400', subOver.status === 400, `status=${subOver.status}`);
    } else {
      rec('TC-CONTEST-009', 'Điểm vượt số câu → 400', 'WARN', 'template không có câu hỏi');
    }
    await pool.query('DELETE FROM users WHERE id = ?', [ins2.insertId]);

    // 8) Leaderboard chứa user vừa nộp
    const lb = await api(`/contests/${contestId}/leaderboard`, { headers: jhead(token) });
    const arr = Array.isArray(lb.body) ? lb.body : (lb.body?.data || lb.body?.leaderboard || []);
    const found = Array.isArray(arr) && arr.some((r) => Number(r.user_id) === Number(userId) || r.username === uname);
    rec('TC-CONTEST-010b', 'Leaderboard chứa user vừa nộp', lb.status === 200 && found,
      `status=${lb.status} rows=${Array.isArray(arr) ? arr.length : '?'}`);
  } catch (e) {
    console.log('ERR', e.code, '-', e.sqlMessage || e.message);
    results.push({ id: 'EXC', pass: false });
  } finally {
    // DỌN sạch
    if (contestId) {
      await pool.query('DELETE FROM user_contests WHERE contest_id = ?', [contestId]).catch(() => {});
      await pool.query('DELETE FROM contests WHERE id = ?', [contestId]).catch(() => {});
    }
    if (userId) await pool.query('DELETE FROM users WHERE id = ?', [userId]).catch(() => {});
    const pass = results.filter((r) => r.pass === true).length;
    const fail = results.filter((r) => r.pass === false).length;
    const warn = results.filter((r) => r.pass === 'WARN').length;
    console.log(`\n==== CONTEST SUBMIT: ${pass} PASS / ${fail} FAIL / ${warn} WARN ====`);
    console.log('Đã dọn cuộc thi tạm + user tạm.');
    await pool.end();
    if (fail > 0) process.exitCode = 1;
  }
}
main();
