/**
 * CRUD API dành cho admin: users, grades, types, lessons, exam_templates, contests, items.
 * Gắn vào app Express: mountAdminCrud(app, pool);
 *
 * Tiền tố: /api/admin
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const ITEMS_IMAGES_DIR = path.join(__dirname, 'items-images');
fs.mkdirSync(ITEMS_IMAGES_DIR, { recursive: true });

const itemImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ITEMS_IMAGES_DIR),
  filename: (req, file, cb) => {
    const extRaw = path.extname(file.originalname || '').toLowerCase();
    let suffix = '.png';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extRaw)) {
      suffix = extRaw === '.jpeg' ? '.jpg' : extRaw;
    } else if (file.mimetype === 'image/jpeg') suffix = '.jpg';
    else if (file.mimetype === 'image/png') suffix = '.png';
    else if (file.mimetype === 'image/gif') suffix = '.gif';
    else if (file.mimetype === 'image/webp') suffix = '.webp';
    cb(null, `${crypto.randomUUID()}${suffix}`);
  },
});

const uploadItemImage = multer({
  storage: itemImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WebP'));
    }
  },
});

function resolveItemImagePath(req) {
  if (req.file && req.file.filename) {
    return `/items-images/${req.file.filename}`;
  }
  const p = req.body && req.body.item_image_path;
  if (p != null && String(p).trim() !== '') {
    const s = String(p).trim();
    if (s.startsWith('/items-images/')) return s;
    return `/items-images/${s.replace(/^\/+/, '')}`;
  }
  const legacy = req.body && req.body.link;
  if (legacy != null && String(legacy).trim() !== '') {
    const s = String(legacy).trim();
    if (s.startsWith('/items-images/')) return s;
    return `/items-images/${s.replace(/^\/+/, '')}`;
  }
  return null;
}

function unlinkItemImageFile(link) {
  if (link == null || String(link).trim() === '') return;
  let base = String(link).trim();
  if (base.startsWith('/items-images/')) {
    base = base.slice('/items-images/'.length);
  }
  const safe = path.basename(base);
  if (!safe || safe === '.' || safe === '..') return;
  fs.unlink(path.join(ITEMS_IMAGES_DIR, safe), () => {});
}

function sendErr(res, err, fallback) {
  console.error('[admin]', err);
  const status = err.statusCode || 500;
  const msg = err.message || fallback || 'Lỗi server';
  res.status(status).json({ message: msg, error: err.message });
}

function fkError(err) {
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    const e = new Error('Không xóa/sửa được: dữ liệu đang được tham chiếu');
    e.statusCode = 409;
    return e;
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
    const e = new Error('Tham chiếu không tồn tại (khối/chủ đề/…)');
    e.statusCode = 400;
    return e;
  }
  return null;
}

function stripPassword(row) {
  if (!row || typeof row !== 'object') return row;
  const { password, ...rest } = row;
  return rest;
}

const DEFAULT_EXAM_TEMPLATE_DURATION_MINUTES = 30;
const MAX_EXAM_TEMPLATE_DURATION_MINUTES = 9999;

/**
 * Chuẩn hoá `duration_time` (phút) cho exam_templates.
 * - Nếu không gửi: trả về default (30) khi optional; hoặc throw khi required.
 * - Giới hạn 1..9999.
 */
function normalizeExamTemplateDurationMinutes(raw, { required = false } = {}) {
  if (raw === undefined || raw === null || raw === '') {
    if (required) {
      const e = new Error('duration_time là bắt buộc');
      e.statusCode = 400;
      throw e;
    }
    return DEFAULT_EXAM_TEMPLATE_DURATION_MINUTES;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_EXAM_TEMPLATE_DURATION_MINUTES) {
    const e = new Error(
      `duration_time phải là số phút từ 1 đến ${MAX_EXAM_TEMPLATE_DURATION_MINUTES}`
    );
    e.statusCode = 400;
    throw e;
  }
  return n;
}

module.exports = function mountAdminCrud(app, pool) {
  const CONTEST_STATUS_ENDED = 0;
  const CONTEST_STATUS_SCHEDULED = 1;
  const CONTEST_STATUS_ACTIVE = 2;

  async function syncContestStatuses() {
    await pool.query(
      `UPDATE contests
       SET status = CASE
         WHEN end_time <= NOW() THEN ?
         WHEN start_time <= NOW() AND end_time > NOW() THEN ?
         ELSE ?
       END`,
      [CONTEST_STATUS_ENDED, CONTEST_STATUS_ACTIVE, CONTEST_STATUS_SCHEDULED]
    );
  }

  function parseContestTimeMs(v) {
    if (v == null || v === '') return null;
    const d = v instanceof Date ? v : new Date(v);
    const t = d.getTime();
    return Number.isNaN(t) ? null : t;
  }

  function computeContestStatusByTime(startTime, endTime, nowMs = Date.now()) {
    const startMs = parseContestTimeMs(startTime);
    const endMs = parseContestTimeMs(endTime);
    if (startMs == null || endMs == null) return CONTEST_STATUS_SCHEDULED;
    if (nowMs >= endMs) return CONTEST_STATUS_ENDED;
    if (nowMs >= startMs) return CONTEST_STATUS_ACTIVE;
    return CONTEST_STATUS_SCHEDULED;
  }

  // ---------- USERS ----------
  app.get('/api/admin/users', async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 200, 500);
      const offset = Number(req.query.offset) || 0;
      const rawSearch =
        req.query.search != null && String(req.query.search).trim() !== ''
          ? String(req.query.search).trim()
          : '';

      const params = [];
      let whereSql = '';
      if (rawSearch) {
        whereSql = 'WHERE username LIKE ?';
        params.push(`%${rawSearch}%`);
      }

      const [[{ cnt }]] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM users ${whereSql}`,
        [...params]
      );

      const [rows] = await pool.query(
        `SELECT * FROM users ${whereSql} ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({
        count: Number(cnt),
        data: rows.map(stripPassword),
      });
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy danh sách user');
    }
  });

  app.get('/api/admin/users/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy user' });
      res.json(stripPassword(rows[0]));
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy user');
    }
  });

  app.post('/api/admin/users', async (req, res) => {
    try {
      const {
        username,
        password,
        ma_tre_em,
        email,
        phone,
        role,
        score,
        week_score,
      } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ message: 'username và password là bắt buộc' });
      }
      const hashed = bcrypt.hashSync(String(password), 8);
      const sql = `
        INSERT INTO users (username, password, ma_tre_em, email, phone, role, score, week_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        String(username).trim(),
        hashed,
        ma_tre_em != null && String(ma_tre_em).trim() !== '' ? String(ma_tre_em).trim() : null,
        email != null && String(email).trim() !== '' ? String(email).trim() : null,
        phone != null && String(phone).trim() !== '' ? String(phone).trim() : null,
        role != null && role !== '' ? Number(role) : 0,
        score != null && score !== '' ? Number(score) : 0,
        week_score != null && week_score !== '' ? Number(week_score) : null,
      ];
      const [result] = await pool.query(sql, params);
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      res.status(201).json(stripPassword(rows[0]));
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Trùng username, email, phone hoặc mã trẻ em' });
      }
      sendErr(res, err, 'Lỗi khi tạo user');
    }
  });

  app.put('/api/admin/users/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const {
        username,
        password,
        ma_tre_em,
        email,
        phone,
        role,
        score,
        week_score,
        items,
      } = req.body || {};

      const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
      if (!existing.length) return res.status(404).json({ message: 'Không tìm thấy user' });

      const updates = [];
      const params = [];

      if (username != null) {
        updates.push('username = ?');
        params.push(String(username).trim());
      }
      if (password != null && String(password) !== '') {
        updates.push('password = ?');
        params.push(bcrypt.hashSync(String(password), 8));
      }
      if (ma_tre_em !== undefined) {
        updates.push('ma_tre_em = ?');
        params.push(ma_tre_em === '' ? null : ma_tre_em);
      }
      if (email !== undefined) {
        updates.push('email = ?');
        params.push(email === '' ? null : email);
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        params.push(phone === '' ? null : phone);
      }
      if (role !== undefined && role !== '') {
        updates.push('role = ?');
        params.push(Number(role));
      }
      if (score !== undefined && score !== '') {
        updates.push('score = ?');
        params.push(Number(score));
      }
      if (week_score !== undefined && week_score !== '') {
        updates.push('week_score = ?');
        params.push(Number(week_score));
      }
      if (items !== undefined) {
        updates.push('items = ?');
        params.push(items === '' || items === null ? null : Number(items));
      }

      if (!updates.length) {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        return res.json(stripPassword(rows[0]));
      }

      params.push(id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      res.json(stripPassword(rows[0]));
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Trùng username, email, phone hoặc mã trẻ em' });
      }
      sendErr(res, err, 'Lỗi khi cập nhật user');
    }
  });

  app.delete('/api/admin/users/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [r] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
      if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy user' });
      res.json({ message: 'Đã xóa user', id });
    } catch (err) {
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi xóa user');
    }
  });

  // ---------- GRADES ----------
  app.get('/api/admin/grades', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM grades ORDER BY id');
      res.json(rows);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy grades');
    }
  });

  app.get('/api/admin/grades/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [rows] = await pool.query('SELECT * FROM grades WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy grade' });
      res.json(rows[0]);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy grade');
    }
  });

  app.post('/api/admin/grades', async (req, res) => {
    try {
      const { id, name, description } = req.body || {};
      if (id == null || !name) {
        return res.status(400).json({ message: 'id và name là bắt buộc' });
      }
      await pool.query(
        'INSERT INTO grades (id, name, description) VALUES (?, ?, ?)',
        [Number(id), String(name).trim(), description != null ? description : null]
      );
      const [rows] = await pool.query('SELECT * FROM grades WHERE id = ?', [Number(id)]);
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Đã tồn tại khối với id này' });
      }
      sendErr(res, err, 'Lỗi khi tạo grade');
    }
  });

  app.put('/api/admin/grades/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const { name, description } = req.body || {};
      const updates = [];
      const params = [];
      if (name != null) {
        updates.push('name = ?');
        params.push(String(name).trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (!updates.length) {
        const [rows] = await pool.query('SELECT * FROM grades WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy grade' });
        return res.json(rows[0]);
      }
      params.push(id);
      const [r] = await pool.query(`UPDATE grades SET ${updates.join(', ')} WHERE id = ?`, params);
      if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy grade' });
      const [rows] = await pool.query('SELECT * FROM grades WHERE id = ?', [id]);
      res.json(rows[0]);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi cập nhật grade');
    }
  });

  app.delete('/api/admin/grades/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [r] = await pool.query('DELETE FROM grades WHERE id = ?', [id]);
      if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy grade' });
      res.json({ message: 'Đã xóa grade', id });
    } catch (err) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
        return res.status(409).json({
          message:
            'Không xóa được: khối này đã có chủ đề hoặc câu hỏi liên quan. Hãy xóa hoặc chuyển dữ liệu trước.',
        });
      }
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi xóa grade');
    }
  });

  // ---------- TYPES (chủ đề / dạng toán) ----------
  app.get('/api/admin/types', async (req, res) => {
    try {
      const gradeId = req.query.grade_id != null ? Number(req.query.grade_id) : null;
      let sql = 'SELECT * FROM types';
      const params = [];
      if (gradeId) {
        sql += ' WHERE grade_id = ?';
        params.push(gradeId);
      }
      sql += ' ORDER BY grade_id, id';
      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy types');
    }
  });

  app.get('/api/admin/types/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [rows] = await pool.query('SELECT * FROM types WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy type' });
      res.json(rows[0]);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy type');
    }
  });

  app.post('/api/admin/types', async (req, res) => {
    try {
      const { grade_id, name, description } = req.body || {};
      const gid = Number(grade_id);
      if (!gid || !name) {
        return res.status(400).json({ message: 'grade_id và name là bắt buộc' });
      }
      const [result] = await pool.query(
        'INSERT INTO types (grade_id, name, description) VALUES (?, ?, ?)',
        [gid, String(name).trim(), description != null ? description : null]
      );
      const [rows] = await pool.query('SELECT * FROM types WHERE id = ?', [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Đã tồn tại tên chủ đề trong khối này' });
      }
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi tạo type');
    }
  });

  app.put('/api/admin/types/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const { grade_id, name, description } = req.body || {};
      const updates = [];
      const params = [];
      if (grade_id != null) {
        updates.push('grade_id = ?');
        params.push(Number(grade_id));
      }
      if (name != null) {
        updates.push('name = ?');
        params.push(String(name).trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (!updates.length) {
        const [rows] = await pool.query('SELECT * FROM types WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy type' });
        return res.json(rows[0]);
      }
      params.push(id);
      await pool.query(`UPDATE types SET ${updates.join(', ')} WHERE id = ?`, params);
      const [rows] = await pool.query('SELECT * FROM types WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy type' });
      res.json(rows[0]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Trùng tên chủ đề trong khối' });
      }
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi cập nhật type');
    }
  });

  app.delete('/api/admin/types/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [r] = await pool.query('DELETE FROM types WHERE id = ?', [id]);
      if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy type' });
      res.json({ message: 'Đã xóa type', id });
    } catch (err) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
        return res.status(409).json({
          message:
            'Không xóa được: chủ đề này đang được dùng bởi câu hỏi. Hãy xóa hoặc chuyển câu hỏi trước.',
        });
      }
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi xóa type');
    }
  });

  // ---------- LESSONS ----------
  app.get('/api/admin/lessons', async (req, res) => {
    try {
      const typeId = req.query.type_id != null ? Number(req.query.type_id) : null;
      let sql = 'SELECT * FROM lessons';
      const params = [];
      if (typeId) {
        sql += ' WHERE type_id = ?';
        params.push(typeId);
      }
      sql += ' ORDER BY type_id, id';
      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy lessons');
    }
  });

  app.get('/api/admin/lessons/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy lesson' });
      res.json(rows[0]);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy lesson');
    }
  });

  app.post('/api/admin/lessons', async (req, res) => {
    try {
      const { type_id, name } = req.body || {};
      const tid = Number(type_id);
      if (!tid || !name) {
        return res.status(400).json({ message: 'type_id và name là bắt buộc' });
      }
      const [result] = await pool.query(
        'INSERT INTO lessons (type_id, name) VALUES (?, ?)',
        [tid, String(name).trim()]
      );
      const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Đã tồn tại bài học cùng tên trong chủ đề này' });
      }
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi tạo lesson');
    }
  });

  app.put('/api/admin/lessons/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const { type_id, name } = req.body || {};
      const updates = [];
      const params = [];
      if (type_id != null) {
        updates.push('type_id = ?');
        params.push(Number(type_id));
      }
      if (name != null) {
        updates.push('name = ?');
        params.push(String(name).trim());
      }
      if (!updates.length) {
        const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy lesson' });
        return res.json(rows[0]);
      }
      params.push(id);
      await pool.query(`UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`, params);
      const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy lesson' });
      res.json(rows[0]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Trùng tên bài học trong chủ đề' });
      }
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi cập nhật lesson');
    }
  });

  app.delete('/api/admin/lessons/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [r] = await pool.query('DELETE FROM lessons WHERE id = ?', [id]);
      if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy lesson' });
      res.json({ message: 'Đã xóa lesson', id });
    } catch (err) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
        return res.status(409).json({
          message:
            'Không xóa được: bài học này đang được dùng bởi câu hỏi. Hãy xóa hoặc chuyển câu hỏi trước.',
        });
      }
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi xóa lesson');
    }
  });

  // ---------- EXAM TEMPLATES (exam_templates + exam_template_questions) ----------
  app.get('/api/admin/exam-templates', async (req, res) => {
    try {
      const rawG = req.query.grade_id;
      const gradeId =
        rawG != null && String(rawG).trim() !== '' ? Number(rawG) : null;
      let sql = `
        SELECT t.*, g.name AS grade_name,
          (SELECT COUNT(*) FROM exam_template_questions etq WHERE etq.template_id = t.id) AS question_count
        FROM exam_templates t
        LEFT JOIN grades g ON g.id = t.grade_id
      `;
      const params = [];
      if (gradeId != null && !Number.isNaN(gradeId) && gradeId > 0) {
        sql += ' WHERE t.grade_id = ?';
        params.push(gradeId);
      }
      sql += ' ORDER BY t.id DESC';
      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy exam templates');
    }
  });

  app.get('/api/admin/exam-templates/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [templates] = await pool.query(
        `SELECT t.*, g.name AS grade_name FROM exam_templates t
         LEFT JOIN grades g ON g.id = t.grade_id WHERE t.id = ?`,
        [id]
      );
      if (!templates.length) {
        return res.status(404).json({ message: 'Không tìm thấy exam template' });
      }
      const t = templates[0];
      const [qrows] = await pool.query(
        `SELECT q.id, q.question_text, q.grade_id
         FROM exam_template_questions etq
         JOIN questions q ON q.id = etq.question_id
         WHERE etq.template_id = ?
         ORDER BY etq.id ASC`,
        [id]
      );
      const questions = qrows.map((q) => ({
        id: q.id,
        text: q.question_text,
        grade_id: q.grade_id,
      }));
      res.json({ ...t, questions });
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy exam template');
    }
  });

  app.post('/api/admin/exam-templates', async (req, res) => {
    const { name, grade_id, description, question_ids, status, duration_time } = req.body || {};
    const gid = Number(grade_id);
    const normalizedStatus = Number(status) === 1 ? 1 : 0;
    let durationMinutes;
    try {
      durationMinutes = normalizeExamTemplateDurationMinutes(duration_time, { required: false });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ message: e.message });
    }
    if (!name || !String(name).trim() || !gid || Number.isNaN(gid)) {
      return res.status(400).json({ message: 'name và grade_id là bắt buộc' });
    }
    const rawIds = Array.isArray(question_ids) ? question_ids : [];
    const qids = [
      ...new Set(
        rawIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
      ),
    ];
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'INSERT INTO exam_templates (name, grade_id, description, status, duration_time) VALUES (?, ?, ?, ?, ?)',
        [
          String(name).trim(),
          gid,
          description != null ? description : null,
          normalizedStatus,
          durationMinutes,
        ]
      );
      const tid = result.insertId;
      if (qids.length) {
        const ph = qids.map(() => '?').join(',');
        const [found] = await conn.query(
          `SELECT id FROM questions WHERE id IN (${ph}) AND grade_id = ?`,
          [...qids, gid]
        );
        if (found.length !== qids.length) {
          await conn.rollback();
          return res.status(400).json({
            message:
              'Một hoặc nhiều câu hỏi không tồn tại hoặc không cùng khối (grade_id) với đề.',
          });
        }
        const values = qids.map((qid) => [tid, qid]);
        await conn.query(
          'INSERT INTO exam_template_questions (template_id, question_id) VALUES ?',
          [values]
        );
      }
      await conn.commit();
      const [rows] = await pool.query(
        `SELECT t.*, g.name AS grade_name FROM exam_templates t
         LEFT JOIN grades g ON g.id = t.grade_id WHERE t.id = ?`,
        [tid]
      );
      const [qrows] = await pool.query(
        `SELECT q.id, q.question_text, q.grade_id FROM exam_template_questions etq
         JOIN questions q ON q.id = etq.question_id WHERE etq.template_id = ? ORDER BY etq.id ASC`,
        [tid]
      );
      res.status(201).json({
        ...rows[0],
        questions: qrows.map((q) => ({
          id: q.id,
          text: q.question_text,
          grade_id: q.grade_id,
        })),
      });
    } catch (err) {
      await conn.rollback();
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi tạo exam template');
    } finally {
      conn.release();
    }
  });

  app.put('/api/admin/exam-templates/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    const { name, grade_id, description, question_ids, status, duration_time } = req.body || {};
    const conn = await pool.getConnection();
    try {
      const [existingRows] = await conn.query(
        'SELECT * FROM exam_templates WHERE id = ?',
        [id]
      );
      if (!existingRows.length) {
        return res.status(404).json({ message: 'Không tìm thấy exam template' });
      }
      const template = existingRows[0];
      let effectiveGrade = Number(template.grade_id);
      if (grade_id !== undefined && grade_id !== null) {
        const ng = Number(grade_id);
        if (Number.isNaN(ng) || ng <= 0) {
          return res.status(400).json({ message: 'grade_id không hợp lệ' });
        }
        effectiveGrade = ng;
      }

      if (grade_id !== undefined && Number(grade_id) !== Number(template.grade_id)) {
        if (question_ids === undefined) {
          const [[{ cnt }]] = await conn.query(
            `SELECT COUNT(*) AS cnt FROM exam_template_questions etq
             JOIN questions q ON q.id = etq.question_id
             WHERE etq.template_id = ? AND q.grade_id != ?`,
            [id, effectiveGrade]
          );
          if (Number(cnt) > 0) {
            return res.status(400).json({
              message:
                'Không đổi khối khi đề còn câu hỏi khối khác. Hãy cập nhật danh sách câu (question_ids) trước.',
            });
          }
        }
      }

      let durationMinutesForUpdate = null;
      if (duration_time !== undefined && duration_time !== null) {
        try {
          durationMinutesForUpdate = normalizeExamTemplateDurationMinutes(duration_time, {
            required: true,
          });
        } catch (e) {
          return res.status(e.statusCode || 400).json({ message: e.message });
        }
      }

      await conn.beginTransaction();

      const updates = [];
      const params = [];
      if (name != null) {
        updates.push('name = ?');
        params.push(String(name).trim());
      }
      if (grade_id !== undefined && grade_id !== null) {
        updates.push('grade_id = ?');
        params.push(effectiveGrade);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (status !== undefined && status !== null) {
        updates.push('status = ?');
        params.push(Number(status) === 1 ? 1 : 0);
      }
      if (durationMinutesForUpdate != null) {
        updates.push('duration_time = ?');
        params.push(durationMinutesForUpdate);
      }
      if (updates.length) {
        params.push(id);
        await conn.query(
          `UPDATE exam_templates SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }

      if (question_ids !== undefined) {
        const rawIds = Array.isArray(question_ids) ? question_ids : [];
        const qids = [
          ...new Set(
            rawIds
              .map((x) => Number(x))
              .filter((x) => Number.isFinite(x) && x > 0)
          ),
        ];
        const ph = qids.length ? qids.map(() => '?').join(',') : '';
        if (qids.length) {
          const [found] = await conn.query(
            `SELECT id FROM questions WHERE id IN (${ph}) AND grade_id = ?`,
            [...qids, effectiveGrade]
          );
          if (found.length !== qids.length) {
            await conn.rollback();
            return res.status(400).json({
              message:
                'Một hoặc nhiều câu hỏi không tồn tại hoặc không cùng khối với đề.',
            });
          }
        }
        await conn.query('DELETE FROM exam_template_questions WHERE template_id = ?', [
          id,
        ]);
        if (qids.length) {
          const values = qids.map((qid) => [id, qid]);
          await conn.query(
            'INSERT INTO exam_template_questions (template_id, question_id) VALUES ?',
            [values]
          );
        }
      }

      await conn.commit();

      const [rows] = await pool.query(
        `SELECT t.*, g.name AS grade_name FROM exam_templates t
         LEFT JOIN grades g ON g.id = t.grade_id WHERE t.id = ?`,
        [id]
      );
      const [qrows] = await pool.query(
        `SELECT q.id, q.question_text, q.grade_id FROM exam_template_questions etq
         JOIN questions q ON q.id = etq.question_id WHERE etq.template_id = ? ORDER BY etq.id ASC`,
        [id]
      );
      res.json({
        ...rows[0],
        questions: qrows.map((q) => ({
          id: q.id,
          text: q.question_text,
          grade_id: q.grade_id,
        })),
      });
    } catch (err) {
      await conn.rollback();
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi cập nhật exam template');
    } finally {
      conn.release();
    }
  });

  app.delete('/api/admin/exam-templates/:id/questions/:questionId', async (req, res) => {
    const id = Number(req.params.id);
    const qid = Number(req.params.questionId);
    if (!id || !qid) {
      return res.status(400).json({ message: 'id không hợp lệ' });
    }
    try {
      const [r] = await pool.query(
        'DELETE FROM exam_template_questions WHERE template_id = ? AND question_id = ?',
        [id, qid]
      );
      if (!r.affectedRows) {
        return res.status(404).json({ message: 'Không tìm thấy liên kết câu hỏi trong đề' });
      }
      res.json({ message: 'Đã gỡ câu hỏi khỏi đề', template_id: id, question_id: qid });
    } catch (err) {
      sendErr(res, err, 'Lỗi khi gỡ câu hỏi');
    }
  });

  app.delete('/api/admin/exam-templates/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [r] = await pool.query('DELETE FROM exam_templates WHERE id = ?', [id]);
      if (!r.affectedRows) {
        return res.status(404).json({ message: 'Không tìm thấy exam template' });
      }
      res.json({ message: 'Đã xóa exam template', id });
    } catch (err) {
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi xóa exam template');
    }
  });

  // ---------- CONTESTS (theo gui.sql: name, prize, template_id; khối = exam_templates.grade_id)
  // status: 0 đã kết thúc, 1 đã lên lịch, 2 đang kích hoạt ----------
  const DEFAULT_CONTEST_DURATION_MINUTES = 30;
  app.get('/api/admin/contests', async (req, res) => {
    try {
      await syncContestStatuses();
      const [rows] = await pool.query(
        `SELECT c.id, c.name, c.prize, c.template_id, c.created_at, c.start_time, c.end_time, c.status, c.description,
                c.duration_time,
                t.grade_id AS grade_id, g.name AS grade_name, t.name AS template_name
         FROM contests c
         INNER JOIN exam_templates t ON t.id = c.template_id
         INNER JOIN grades g ON g.id = t.grade_id
         ORDER BY c.start_time DESC, c.id DESC`
      );
      res.json(rows);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy danh sách contest');
    }
  });

  app.get('/api/admin/contests/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      await syncContestStatuses();
      const [rows] = await pool.query(
        `SELECT c.id, c.name, c.prize, c.template_id, c.created_at, c.start_time, c.end_time, c.status, c.description,
                c.duration_time,
                t.grade_id AS grade_id, g.name AS grade_name, t.name AS template_name
         FROM contests c
         INNER JOIN exam_templates t ON t.id = c.template_id
         INNER JOIN grades g ON g.id = t.grade_id
         WHERE c.id = ?`,
        [id]
      );
      if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy contest' });
      res.json(rows[0]);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy contest');
    }
  });

  function parseContestDateTime(v) {
    if (v == null || v === '') return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  app.post('/api/admin/contests', async (req, res) => {
    const body = req.body || {};
    const gradeId = Number(body.grade_id);
    const templateId = Number(body.template_id);
    const rawName = body.name != null ? String(body.name).trim() : '';
    const startD = parseContestDateTime(body.start_time);
    const endD = parseContestDateTime(body.end_time);
    const status = computeContestStatusByTime(startD, endD);
    let prize = Number(body.prize);
    if (!Number.isFinite(prize) || prize < 0) prize = 0;
    prize = Math.min(Math.floor(prize), 65535);
    const description =
      body.description != null && String(body.description).trim() !== ''
        ? String(body.description).trim().slice(0, 500)
        : null;

    if (!rawName) {
      return res.status(400).json({ message: 'name (tên cuộc thi) là bắt buộc' });
    }
    const name = rawName.slice(0, 255);
    if (!gradeId || Number.isNaN(gradeId)) {
      return res.status(400).json({ message: 'grade_id là bắt buộc (chọn khối trùng với mẫu đề)' });
    }
    if (!templateId || Number.isNaN(templateId)) {
      return res.status(400).json({ message: 'template_id (mẫu đề) là bắt buộc' });
    }
    if (!startD || !endD) {
      return res.status(400).json({ message: 'start_time và end_time là bắt buộc (định dạng ngày giờ hợp lệ)' });
    }
    if (endD.getTime() <= startD.getTime()) {
      return res.status(400).json({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
    }

    try {
      await syncContestStatuses();
      const [templates] = await pool.query(
        'SELECT id, grade_id FROM exam_templates WHERE id = ?',
        [templateId]
      );
      if (!templates.length) {
        return res.status(400).json({ message: 'Mẫu đề không tồn tại' });
      }
      if (Number(templates[0].grade_id) !== gradeId) {
        return res.status(400).json({
          message: 'Mẫu đề phải thuộc cùng khối đã chọn (grade_id)',
        });
      }

      let durationTime = Number(body.duration_time);
      if (!Number.isFinite(durationTime) || durationTime <= 0) {
        durationTime = DEFAULT_CONTEST_DURATION_MINUTES;
      }
      durationTime = Math.min(Math.floor(durationTime), 65535);

      const [result] = await pool.query(
        `INSERT INTO contests (name, template_id, start_time, end_time, status, description, prize, duration_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, templateId, startD, endD, status, description, prize, durationTime]
      );
      const insertId = result.insertId;
      const [rows] = await pool.query(
        `SELECT c.id, c.name, c.prize, c.template_id, c.created_at, c.start_time, c.end_time, c.status, c.description,
                c.duration_time,
                t.grade_id AS grade_id, g.name AS grade_name, t.name AS template_name
         FROM contests c
         INNER JOIN exam_templates t ON t.id = c.template_id
         INNER JOIN grades g ON g.id = t.grade_id
         WHERE c.id = ?`,
        [insertId]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi tạo contest');
    }
  });

  app.patch('/api/admin/contests/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    const body = req.body || {};

    try {
      await syncContestStatuses();
      const [existing] = await pool.query(
        `SELECT c.id, c.template_id, t.grade_id AS grade_id
         FROM contests c
         INNER JOIN exam_templates t ON t.id = c.template_id
         WHERE c.id = ?`,
        [id]
      );
      if (!existing.length) return res.status(404).json({ message: 'Không tìm thấy contest' });
      const row = existing[0];
      const gradeId = Number(row.grade_id);

      const updates = [];
      const params = [];

      if (body.name !== undefined && body.name !== null) {
        const nm = String(body.name).trim();
        if (!nm) {
          return res.status(400).json({ message: 'name không được để trống' });
        }
        updates.push('name = ?');
        params.push(nm.slice(0, 255));
      }

      if (body.prize !== undefined && body.prize !== null) {
        let pr = Number(body.prize);
        if (!Number.isFinite(pr) || pr < 0) pr = 0;
        pr = Math.min(Math.floor(pr), 65535);
        updates.push('prize = ?');
        params.push(pr);
      }

      if (body.template_id !== undefined && body.template_id !== null) {
        const tid = Number(body.template_id);
        if (!tid || Number.isNaN(tid)) {
          return res.status(400).json({ message: 'template_id không hợp lệ' });
        }
        const [templates] = await pool.query(
          'SELECT id, grade_id FROM exam_templates WHERE id = ?',
          [tid]
        );
        if (!templates.length) {
          return res.status(400).json({ message: 'Mẫu đề không tồn tại' });
        }
        if (Number(templates[0].grade_id) !== gradeId) {
          return res.status(400).json({
            message: 'Mẫu đề phải thuộc cùng khối với contest',
          });
        }
        updates.push('template_id = ?');
        params.push(tid);
      }

      if (body.start_time !== undefined) {
        const startD = parseContestDateTime(body.start_time);
        if (!startD) {
          return res.status(400).json({ message: 'start_time không hợp lệ' });
        }
        updates.push('start_time = ?');
        params.push(startD);
      }

      if (body.end_time !== undefined) {
        const endD = parseContestDateTime(body.end_time);
        if (!endD) {
          return res.status(400).json({ message: 'end_time không hợp lệ' });
        }
        updates.push('end_time = ?');
        params.push(endD);
      }

      if (body.description !== undefined) {
        const desc =
          body.description != null && String(body.description).trim() !== ''
            ? String(body.description).trim().slice(0, 500)
            : null;
        updates.push('description = ?');
        params.push(desc);
      }

      if (body.duration_time !== undefined && body.duration_time !== null) {
        let dt = Number(body.duration_time);
        if (!Number.isFinite(dt) || dt <= 0) {
          return res.status(400).json({ message: 'duration_time phải là số phút dương' });
        }
        dt = Math.min(Math.floor(dt), 65535);
        updates.push('duration_time = ?');
        params.push(dt);
      }

      if (!updates.length) {
        return res.status(400).json({ message: 'Không có trường nào để cập nhật' });
      }

      const [[current]] = await pool.query(
        'SELECT start_time, end_time FROM contests WHERE id = ?',
        [id]
      );
      let newStart = current.start_time;
      let newEnd = current.end_time;
      if (body.start_time !== undefined) newStart = parseContestDateTime(body.start_time);
      if (body.end_time !== undefined) newEnd = parseContestDateTime(body.end_time);
      const sTime =
        newStart instanceof Date ? newStart.getTime() : new Date(newStart).getTime();
      const eTime = newEnd instanceof Date ? newEnd.getTime() : new Date(newEnd).getTime();
      if (Number.isNaN(sTime) || Number.isNaN(eTime) || eTime <= sTime) {
        return res.status(400).json({
          message: 'Thời gian kết thúc phải sau thời gian bắt đầu (kiểm tra start_time / end_time)',
        });
      }

      const computedStatus = computeContestStatusByTime(newStart, newEnd);
      updates.push('status = ?');
      params.push(computedStatus);

      params.push(id);
      await pool.query(`UPDATE contests SET ${updates.join(', ')} WHERE id = ?`, params);

      const [rows] = await pool.query(
        `SELECT c.id, c.name, c.prize, c.template_id, c.created_at, c.start_time, c.end_time, c.status, c.description,
                c.duration_time,
                t.grade_id AS grade_id, g.name AS grade_name, t.name AS template_name
         FROM contests c
         INNER JOIN exam_templates t ON t.id = c.template_id
         INNER JOIN grades g ON g.id = t.grade_id
         WHERE c.id = ?`,
        [id]
      );
      res.json(rows[0]);
    } catch (err) {
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi cập nhật contest');
    }
  });

  app.delete('/api/admin/contests/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [r] = await pool.query('DELETE FROM contests WHERE id = ?', [id]);
      if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy contest' });
      res.json({ message: 'Đã xóa contest', id });
    } catch (err) {
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi xóa contest');
    }
  });

  // ---------- ITEMS (cửa hàng / vật phẩm; ảnh: backend/items-images; DB link = /items-images/...) ----------
  app.get('/api/admin/items', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM items ORDER BY id ASC');
      res.json(rows);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy danh sách item');
    }
  });

  app.get('/api/admin/items/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy item' });
      res.json(rows[0]);
    } catch (err) {
      sendErr(res, err, 'Lỗi khi lấy item');
    }
  });

  app.post(
    '/api/admin/items',
    (req, res, next) => {
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('multipart/form-data')) {
        return uploadItemImage.single('item_image')(req, res, (err) => {
          if (err) {
            const msg =
              err.code === 'LIMIT_FILE_SIZE'
                ? 'Ảnh vượt quá 5MB'
                : err.message || 'Tải ảnh lên không thành công';
            return res.status(400).json({ message: msg });
          }
          next();
        });
      }
      next();
    },
    async (req, res) => {
      try {
        const { name, description, require_score } = req.body || {};
        if (!name || String(name).trim() === '') {
          if (req.file && req.file.path) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (_) {}
          }
          return res.status(400).json({ message: 'name là bắt buộc' });
        }
        const linkVal = resolveItemImagePath(req);
        if (!linkVal) {
          if (req.file && req.file.path) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (_) {}
          }
          return res.status(400).json({
            message:
              'Cần ảnh: kéo thả / paste / chọn file, hoặc gửi item_image_path (đường dẫn /items-images/...)',
          });
        }
        const score =
          require_score != null && require_score !== '' ? Number(require_score) : 0;
        if (Number.isNaN(score) || score < 0) {
          if (req.file && req.file.path) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (_) {}
          }
          return res.status(400).json({ message: 'require_score phải là số ≥ 0' });
        }
        /** Một số DB `items.id` không AUTO_INCREMENT — gán id = MAX(id)+1 */
        const [[{ mx }]] = await pool.query('SELECT COALESCE(MAX(id), 0) AS mx FROM items');
        const nextId = Number(mx) + 1;
        await pool.query(
          'INSERT INTO items (id, name, description, link, require_score) VALUES (?, ?, ?, ?, ?)',
          [
            nextId,
            String(name).trim(),
            description != null && String(description).trim() !== ''
              ? String(description).trim()
              : null,
            linkVal,
            score,
          ]
        );
        const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [nextId]);
        res.status(201).json(rows[0]);
      } catch (err) {
        if (req.file && req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
        sendErr(res, err, 'Lỗi khi tạo item');
      }
    }
  );

  app.put(
    '/api/admin/items/:id',
    (req, res, next) => {
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('multipart/form-data')) {
        return uploadItemImage.single('item_image')(req, res, (err) => {
          if (err) {
            const msg =
              err.code === 'LIMIT_FILE_SIZE'
                ? 'Ảnh vượt quá 5MB'
                : err.message || 'Tải ảnh lên không thành công';
            return res.status(400).json({ message: msg });
          }
          next();
        });
      }
      next();
    },
    async (req, res) => {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
      try {
        const [existingRows] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);
        if (!existingRows.length) {
          if (req.file && req.file.path) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (_) {}
          }
          return res.status(404).json({ message: 'Không tìm thấy item' });
        }
        const existing = existingRows[0];
        const isMultipart = (req.headers['content-type'] || '')
          .toLowerCase()
          .includes('multipart/form-data');

        const updates = [];
        const params = [];

        if (isMultipart) {
          const clearRaw =
            req.body &&
            (req.body.clear_item_image === true ||
              req.body.clear_item_image === '1' ||
              req.body.clear_item_image === 'true');
          if (clearRaw) {
            updates.push('link = ?');
            params.push(null);
            unlinkItemImageFile(existing.link);
          } else if (req.file && req.file.filename) {
            const newLink = `/items-images/${req.file.filename}`;
            updates.push('link = ?');
            params.push(newLink);
            if (existing.link && String(existing.link).trim() !== '' && existing.link !== newLink) {
              unlinkItemImageFile(existing.link);
            }
          } else if (
            req.body &&
            req.body.item_image_path != null &&
            String(req.body.item_image_path).trim() !== ''
          ) {
            const s = String(req.body.item_image_path).trim();
            const newLink = s.startsWith('/items-images/')
              ? s
              : `/items-images/${s.replace(/^\/+/, '')}`;
            updates.push('link = ?');
            params.push(newLink);
            if (existing.link && String(existing.link).trim() !== '' && existing.link !== newLink) {
              unlinkItemImageFile(existing.link);
            }
          }

          const { name, description, require_score } = req.body || {};
          if (name != null && String(name).trim() !== '') {
            updates.push('name = ?');
            params.push(String(name).trim());
          }
          if (description !== undefined) {
            updates.push('description = ?');
            params.push(
              description === '' || description === null ? null : String(description).trim()
            );
          }
          if (require_score !== undefined && require_score !== '') {
            const s = Number(require_score);
            if (Number.isNaN(s) || s < 0) {
              if (req.file && req.file.path) {
                try {
                  fs.unlinkSync(req.file.path);
                } catch (_) {}
              }
              return res.status(400).json({ message: 'require_score phải là số ≥ 0' });
            }
            updates.push('require_score = ?');
            params.push(s);
          }
        } else {
          const { name, description, link, require_score } = req.body || {};
          if (name != null) {
            updates.push('name = ?');
            params.push(String(name).trim());
          }
          if (description !== undefined) {
            updates.push('description = ?');
            params.push(
              description === '' || description === null ? null : String(description).trim()
            );
          }
          if (link != null) {
            const newL = String(link).trim();
            if (existing.link && existing.link !== newL) {
              unlinkItemImageFile(existing.link);
            }
            updates.push('link = ?');
            params.push(newL);
          }
          if (require_score !== undefined && require_score !== '') {
            const s = Number(require_score);
            if (Number.isNaN(s) || s < 0) {
              return res.status(400).json({ message: 'require_score phải là số ≥ 0' });
            }
            updates.push('require_score = ?');
            params.push(s);
          }
        }

        if (!updates.length) {
          const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);
          return res.json(rows[0]);
        }
        params.push(id);
        await pool.query(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, params);
        const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);
        res.json(rows[0]);
      } catch (err) {
        if (req.file && req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
        sendErr(res, err, 'Lỗi khi cập nhật item');
      }
    }
  );

  app.delete('/api/admin/items/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'id không hợp lệ' });
    try {
      const [rows] = await pool.query('SELECT link FROM items WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy item' });
      const [[{ refCnt }]] = await pool.query(
        'SELECT COUNT(*) AS refCnt FROM user_items WHERE item_id = ?',
        [id]
      );
      if (Number(refCnt) > 0) {
        return res.status(409).json({
          message:
            'Không xóa được: đã có người chơi mua hoặc phát sinh giao dịch với vật phẩm này (bảng user_items).',
        });
      }
      const link = rows[0].link;
      const [r] = await pool.query('DELETE FROM items WHERE id = ?', [id]);
      if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy item' });
      if (link) {
        unlinkItemImageFile(link);
      }
      res.json({ message: 'Đã xóa item', id });
    } catch (err) {
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi xóa item');
    }
  });
};
