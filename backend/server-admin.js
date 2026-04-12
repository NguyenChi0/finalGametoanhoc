/**
 * CRUD API dành cho admin: users, grades, types, lessons.
 * Gắn vào app Express: mountAdminCrud(app, pool);
 *
 * Tiền tố: /api/admin
 */
const bcrypt = require('bcryptjs');

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

module.exports = function mountAdminCrud(app, pool) {
  // ---------- USERS ----------
  app.get('/api/admin/users', async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 200, 500);
      const offset = Number(req.query.offset) || 0;
      const [rows] = await pool.query(
        'SELECT * FROM users ORDER BY id ASC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM users');
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
      const fk = fkError(err);
      if (fk) return res.status(fk.statusCode).json({ message: fk.message });
      sendErr(res, err, 'Lỗi khi xóa lesson');
    }
  });
};
