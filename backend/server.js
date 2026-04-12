// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const pool = require('./db'); // Import cấu hình database
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const mountAdminCrud = require('./server-admin');

const QUESTIONS_IMAGES_DIR = path.join(__dirname, 'questions-images');
fs.mkdirSync(QUESTIONS_IMAGES_DIR, { recursive: true });

const ITEMS_IMAGES_DIR = path.join(__dirname, 'items-images');
fs.mkdirSync(ITEMS_IMAGES_DIR, { recursive: true });

const questionImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, QUESTIONS_IMAGES_DIR),
  filename: (req, file, cb) => {
    const extRaw = path.extname(file.originalname || '').toLowerCase();
    let suffix = '.png';
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(extRaw)) {
      suffix = extRaw === '.jpeg' ? '.jpg' : extRaw;
    } else if (file.mimetype === 'image/jpeg') suffix = '.jpg';
    else if (file.mimetype === 'image/png') suffix = '.png';
    else if (file.mimetype === 'image/gif') suffix = '.gif';
    cb(null, `${crypto.randomUUID()}${suffix}`);
  },
});

const uploadQuestionImage = multer({
  storage: questionImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc GIF'));
    }
  },
});

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());// serve file nhạc tĩnh (ví dụ public/music/nhac1.mp3)
app.use('/music', express.static(path.join(__dirname, 'public', 'music')));
app.use('/questions-images', express.static(QUESTIONS_IMAGES_DIR));
app.use('/items-images', express.static(ITEMS_IMAGES_DIR));

/** CRUD admin: /api/admin/users|grades|types|lessons */
mountAdminCrud(app, pool);

// ==========================
//  API: ĐĂNG KÝ
// ==========================
app.post('/api/register', async (req, res) => {
  const { username, password, fullname } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Thiếu username hoặc password' });
  }

  try {
    const hashed = bcrypt.hashSync(password, 8);
    const sql = 'INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)';
    const [result] = await pool.execute(sql, [username, hashed, fullname || null]);

    res.json({ message: 'Đăng ký thành công', userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username đã tồn tại' });
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==========================
//  API: ĐĂNG NHẬP
// ==========================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Thiếu username hoặc password' });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Sai username hoặc password' });
    }

    const user = rows[0];
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Sai username hoặc password' });
    }

    const { password: _pw, ...safeUser } = user;
    res.json({ message: 'Đăng nhập thành công', user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Helper: build answers array from question row (DB columns: answercorrect_*, answer2_*, ...)
function buildAnswers(row) {
  const answers = [];

  if (row.answercorrect_text || row.answercorrect_image) {
    answers.push({
      id: 'correct',
      text: row.answercorrect_text || null,
      image: row.answercorrect_image || null,
      correct: true
    });
  }

  if (row.answer2_text || row.answer2_image) {
    answers.push({ id: 'a2', text: row.answer2_text || null, image: row.answer2_image || null, correct: false });
  }
  if (row.answer3_text || row.answer3_image) {
    answers.push({ id: 'a3', text: row.answer3_text || null, image: row.answer3_image || null, correct: false });
  }
  if (row.answer4_text || row.answer4_image) {
    answers.push({ id: 'a4', text: row.answer4_text || null, image: row.answer4_image || null, correct: false });
  }

  return answers;
}

// ====== Endpoints ======

// 1) Lấy danh sách lớp (grades)
app.get('/api/grades', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM grades ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy grades', error: err.message });
  }
});

/** Toàn bộ grades + types + lessons — admin map id→tên (đủ phân cấp ngay cả khi chưa lọc). */
app.get('/api/hierarchy-labels', async (req, res) => {
  try {
    const [gradeRows] = await pool.query('SELECT id, name FROM grades ORDER BY id');
    const [typeRows] = await pool.query(
      'SELECT id, grade_id, name FROM types ORDER BY grade_id, id'
    );
    const [lessonRows] = await pool.query(
      'SELECT id, type_id, name FROM lessons ORDER BY type_id, id'
    );
    res.json({ grades: gradeRows, types: typeRows, lessons: lessonRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy hierarchy-labels', error: err.message });
  }
});

// 2) Lấy danh sách types theo grade_id
app.get('/api/types/:grade_id', async (req, res) => {
  const grade_id = Number(req.params.grade_id);
  if (!grade_id) return res.status(400).json({ message: 'grade_id không hợp lệ' });

  try {
    const [rows] = await pool.query(
      'SELECT id, grade_id, name, description FROM types WHERE grade_id = ? ORDER BY id',
      [grade_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy types', error: err.message });
  }
});

// 3) Lấy danh sách bài học (lessons) theo type_id
async function lessonsByTypeHandler(req, res) {
  const type_id = Number(req.params.type_id);
  if (!type_id) return res.status(400).json({ message: 'type_id không hợp lệ' });

  try {
    const [rows] = await pool.query(
      'SELECT id, type_id, name FROM lessons WHERE type_id = ? ORDER BY id',
      [type_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy lessons', error: err.message });
  }
}
app.get('/api/lessons/:type_id', lessonsByTypeHandler);
/** @deprecated dùng /api/lessons — giữ tạm cho client cũ */
app.get('/api/operations/:type_id', lessonsByTypeHandler);

// 4) Lấy câu hỏi theo bộ lọc: grade_id, type_id, lesson_id
//    (lesson_id thay operation_id; vẫn chấp nhận operation_id trong query để tương thích)
app.get('/api/questions', async (req, res) => {
  try {
    const {
      grade_id,
      type_id,
      lesson_id,
      operation_id,
      limit = 200,
      offset = 0,
      random = '0',
      search: searchRaw,
    } = req.query;
    const lessonFilter = lesson_id ?? operation_id;
    const search =
      searchRaw != null && String(searchRaw).trim() !== ''
        ? String(searchRaw).trim()
        : '';

    const where = [];
    const params = [];

    if (search) {
      where.push('(q.question_text LIKE ? OR CAST(q.id AS CHAR) LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like);
    }

    if (grade_id) {
      where.push('q.grade_id = ?');
      params.push(Number(grade_id));
    }
    if (type_id) {
      where.push('q.type_id = ?');
      params.push(Number(type_id));
    }
    if (lessonFilter) {
      where.push('q.lesson_id = ?');
      params.push(Number(lessonFilter));
    }

    const countSql = `SELECT COUNT(*) AS total FROM questions q${where.length ? ' WHERE ' + where.join(' AND ') : ''}`;
    const [[countRow]] = await pool.query(countSql, [...params]);
    const totalMatching = Number(countRow?.total ?? 0);

    let sql = `
  SELECT q.id, q.grade_id, q.type_id, q.lesson_id,
         q.question_text, q.question_image,
         q.answercorrect_text, q.answer2_text, q.answer3_text, q.answer4_text,
         q.answercorrect_image, q.answer2_image, q.answer3_image, q.answer4_image,
         g.name AS grade_name, t.name AS type_name, l.name AS lesson_name,
         TRIM(CONCAT_WS(' > ',
           NULLIF(TRIM(g.name), ''),
           NULLIF(TRIM(t.name), ''),
           NULLIF(TRIM(l.name), '')
         )) AS hierarchy_path
  FROM questions q
  LEFT JOIN grades g ON g.id = q.grade_id
  LEFT JOIN types t ON t.id = q.type_id
  LEFT JOIN lessons l ON l.id = q.lesson_id
`;
    if (where.length) sql += ' WHERE ' + where.join(' AND ');

    // random option
    if (random === '1') {
      sql += ' ORDER BY RAND()';
    } else {
      sql += ' ORDER BY q.id';
    }

    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit));
    params.push(Number(offset));

    const [rows] = await pool.query(sql, params);

    const asStr = (v) => {
      if (v == null) return null;
      const s = String(v).trim();
      return s === '' ? null : s;
    };

    /** Tra cứu tên theo id — phòng JOIN không ra tên (MySQL/collation/phiên bản) nhưng FK vẫn đúng. */
    const [[allGrades], [allTypes], [allLessons]] = await Promise.all([
      pool.query('SELECT id, name FROM grades'),
      pool.query('SELECT id, name FROM types'),
      pool.query('SELECT id, name FROM lessons'),
    ]);
    const gradeNameById = new Map(
      allGrades.map((g) => [Number(g.id), asStr(g.name)])
    );
    const typeNameById = new Map(
      allTypes.map((t) => [Number(t.id), asStr(t.name)])
    );
    const lessonNameById = new Map(
      allLessons.map((l) => [Number(l.id), asStr(l.name)])
    );

    // map answers to array for easier frontend use
    const mapped = rows.map((r) => {
      const grade_name =
        asStr(r.grade_name) || gradeNameById.get(Number(r.grade_id)) || null;
      const type_name =
        asStr(r.type_name) || typeNameById.get(Number(r.type_id)) || null;
      const lesson_name =
        asStr(r.lesson_name) || lessonNameById.get(Number(r.lesson_id)) || null;
      const hierarchyParts = [grade_name, type_name, lesson_name].filter(Boolean);
      const hierarchy_path =
        hierarchyParts.length > 0
          ? hierarchyParts.join(' > ')
          : asStr(r.hierarchy_path);
      return {
        id: r.id,
        grade_id: r.grade_id,
        type_id: r.type_id,
        lesson_id: r.lesson_id,
        grade_name,
        type_name,
        lesson_name,
        hierarchy_path,
        question_text: r.question_text,
        question_image: r.question_image,
        answers: buildAnswers(r),
      };
    });

    res.json({
      count: mapped.length,
      total: totalMatching,
      data: mapped,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy questions', error: err.message });
  }
});

// 5) Lấy một câu hỏi chi tiết theo id
app.get('/api/questions/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'id không hợp lệ' });

  try {
    const [rows] = await pool.query(
      `SELECT * FROM questions WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy question' });

    const r = rows[0];
    res.json({
      id: r.id,
      grade_id: r.grade_id,
      type_id: r.type_id,
      lesson_id: r.lesson_id,
      question_text: r.question_text,
      question_image: r.question_image,
      answers: buildAnswers(r)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy question theo id', error: err.message });
  }
});

/**
 * POST /api/questions — tạo câu hỏi trắc nghiệm 4 đáp án
 * multipart/form-data: grade_id, type_id, lesson_id, question_text, answers (JSON string), correct_index,
 *   optional file field question_image, optional text question_image_path (khi không gửi file)
 * Hoặc JSON (application/json) như cũ — question_image là chuỗi path/URL nếu có
 */
function mapFourAnswersToColumns(answers, correctIndex) {
  const a = (answers || []).map((x) => (x != null ? String(x).trim() : ''));
  if (a.length !== 4) {
    throw new Error('Cần đúng 4 đáp án');
  }
  if (a.some((x) => !x)) {
    throw new Error('Mỗi đáp án không được để trống');
  }
  const ci = Number(correctIndex);
  if (!Number.isInteger(ci) || ci < 0 || ci > 3) {
    throw new Error('Đáp án đúng không hợp lệ');
  }
  const rest = a.filter((_, i) => i !== ci);
  return {
    answercorrect_text: a[ci],
    answer2_text: rest[0],
    answer3_text: rest[1],
    answer4_text: rest[2],
  };
}

function parseAnswersBody(rawAnswers) {
  if (rawAnswers == null) return null;
  if (Array.isArray(rawAnswers)) return rawAnswers;
  if (typeof rawAnswers === 'string') {
    try {
      const parsed = JSON.parse(rawAnswers);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function resolveQuestionImagePath(req) {
  if (req.file && req.file.filename) {
    return `/questions-images/${req.file.filename}`;
  }
  const fromPath = req.body && req.body.question_image_path;
  if (fromPath != null && String(fromPath).trim() !== '') {
    return String(fromPath).trim();
  }
  const legacy = req.body && req.body.question_image;
  if (legacy != null && String(legacy).trim() !== '') {
    return String(legacy).trim();
  }
  return null;
}

async function insertQuestionRow(req, res) {
  const {
    grade_id,
    type_id,
    lesson_id,
    question_text,
    answers: answersRaw,
    correct_index,
  } = req.body;

  const answers = parseAnswersBody(answersRaw);
  const gid = Number(grade_id);
  const tid = Number(type_id);
  const lid = Number(lesson_id);
  if (!gid || !tid || !lid) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return res.status(400).json({ message: 'grade_id, type_id, lesson_id là bắt buộc' });
  }
  const qtext = question_text != null ? String(question_text).trim() : '';
  if (!qtext) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return res.status(400).json({ message: 'Nội dung câu hỏi không được để trống' });
  }

  let cols;
  try {
    cols = mapFourAnswersToColumns(answers, correct_index);
  } catch (e) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return res.status(400).json({ message: e.message || 'Đáp án không hợp lệ' });
  }

  const qimg = resolveQuestionImagePath(req);

  const sql = `
      INSERT INTO questions (
        grade_id, type_id, lesson_id,
        question_text, question_image,
        answercorrect_text, answer2_text, answer3_text, answer4_text,
        answercorrect_image, answer2_image, answer3_image, answer4_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)
    `;
  const params = [
    gid,
    tid,
    lid,
    qtext,
    qimg,
    cols.answercorrect_text,
    cols.answer2_text,
    cols.answer3_text,
    cols.answer4_text,
  ];

  try {
    const [result] = await pool.query(sql, params);
    res.status(201).json({
      message: 'Đã tạo câu hỏi',
      id: result.insertId,
      question_image: qimg,
    });
  } catch (err) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    throw err;
  }
}

async function updateQuestionRow(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return res.status(400).json({ message: 'id không hợp lệ' });
  }

  const [[existing]] = await pool.query(
    'SELECT id, question_image FROM questions WHERE id = ? LIMIT 1',
    [id]
  );
  if (!existing) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
  }

  const {
    grade_id,
    type_id,
    lesson_id,
    question_text,
    answers: answersRaw,
    correct_index,
  } = req.body;

  const answers = parseAnswersBody(answersRaw);
  const gid = Number(grade_id);
  const tid = Number(type_id);
  const lid = Number(lesson_id);
  if (!gid || !tid || !lid) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return res.status(400).json({ message: 'grade_id, type_id, lesson_id là bắt buộc' });
  }
  const qtext = question_text != null ? String(question_text).trim() : '';
  if (!qtext) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return res.status(400).json({ message: 'Nội dung câu hỏi không được để trống' });
  }

  let cols;
  try {
    cols = mapFourAnswersToColumns(answers, correct_index);
  } catch (e) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return res.status(400).json({ message: e.message || 'Đáp án không hợp lệ' });
  }

  let qimg;
  if (req.file && req.file.filename) {
    qimg = `/questions-images/${req.file.filename}`;
  } else if (req.body && req.body.question_image_path != null && String(req.body.question_image_path).trim() !== '') {
    qimg = String(req.body.question_image_path).trim();
  } else if (req.body && req.body.question_image != null && String(req.body.question_image).trim() !== '') {
    qimg = String(req.body.question_image).trim();
  } else if (
    req.body &&
    (req.body.clear_question_image === true ||
      req.body.clear_question_image === '1' ||
      req.body.clear_question_image === 'true')
  ) {
    qimg = null;
  } else {
    qimg = existing.question_image;
  }

  const sql = `
      UPDATE questions SET
        grade_id = ?, type_id = ?, lesson_id = ?,
        question_text = ?, question_image = ?,
        answercorrect_text = ?, answer2_text = ?, answer3_text = ?, answer4_text = ?
      WHERE id = ?
    `;
  const params = [
    gid,
    tid,
    lid,
    qtext,
    qimg,
    cols.answercorrect_text,
    cols.answer2_text,
    cols.answer3_text,
    cols.answer4_text,
    id,
  ];

  try {
    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
    }
    res.json({
      message: 'Đã cập nhật câu hỏi',
      id,
      question_image: qimg,
    });
  } catch (err) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    throw err;
  }
}

app.post(
  '/api/questions',
  (req, res, next) => {
    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (ct.includes('multipart/form-data')) {
      return uploadQuestionImage.single('question_image')(req, res, (err) => {
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
      await insertQuestionRow(req, res);
    } catch (err) {
      console.error(err);
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
        return res.status(400).json({
          message: 'Khối / chủ đề / bài học không khớp hoặc không tồn tại',
        });
      }
      res.status(500).json({ message: 'Lỗi khi tạo câu hỏi', error: err.message });
    }
  }
);

app.put(
  '/api/questions/:id',
  (req, res, next) => {
    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (ct.includes('multipart/form-data')) {
      return uploadQuestionImage.single('question_image')(req, res, (err) => {
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
      await updateQuestionRow(req, res);
    } catch (err) {
      console.error(err);
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
        return res.status(400).json({
          message: 'Khối / chủ đề / bài học không khớp hoặc không tồn tại',
        });
      }
      res.status(500).json({ message: 'Lỗi khi cập nhật câu hỏi', error: err.message });
    }
  }
);

//=========Lưu điểm=========================
app.post('/api/score/increment', async (req, res) => {
  try {
    const { userId, delta = 1 } = req.body;

    if (!userId || typeof userId !== 'number') {
      return res.status(400).json({ success: false, message: 'userId (number) required' });
    }

    // Tăng cả score và week_score cùng lúc (nếu week_score là NULL thì set về 0 trước khi cộng)
    await pool.query(
      'UPDATE users SET score = score + ?, week_score = COALESCE(week_score, 0) + ? WHERE id = ?',
      [delta, delta, userId]
    );

    // Lấy lại score & week_score hiện tại
    const [rows] = await pool.query('SELECT score, week_score FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      score: rows[0].score,
      week_score: rows[0].week_score,
    });
  } catch (err) {
    console.error('Error /api/score/increment', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/user/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // 1) Lấy user
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    let user = rows[0];

    // 2) Tính rank tuần
    const userWeekScore = Number(user.week_score) || 0;

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM users WHERE week_score > ?',
      [userWeekScore]
    );

    const rank = Number(countRows[0].cnt) + 1;

    // 3) Xác định achievement (KHÔNG lưu DB)
    let achievement = null;

    if (userWeekScore > 0 && rank >= 1 && rank <= 5) {
      const [achRows] = await pool.execute(
        'SELECT id, name, description, link FROM achievements WHERE id = ?',
        [rank] // top1 → id=1, top2 → id=2,...
      );
      achievement = achRows[0] || null;
    }

    // 4) Lấy items
    const [itemRows] = await pool.execute(
      `SELECT i.id, i.name, i.description, i.link, i.require_score, ui.purchased_at
       FROM user_items ui
       JOIN items i ON ui.item_id = i.id
       WHERE ui.user_id = ?`,
      [user.id]
    );

    // 5) Trả về
    user.week_rank = rank;
    user.achievement = achievement;
    user.itemsOwned = itemRows;

    return res.json(user);

  } catch (err) {
    console.error('Lỗi khi lấy user:', err);
    return res.status(500).json({ message: 'Lỗi server khi lấy thông tin người dùng' });
  }
});


// ==========================
// API: LEADERBOARD
// ==========================
app.get("/api/leaderboard/all", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT username, score FROM users ORDER BY score DESC LIMIT 10"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi leaderboard all:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

app.get("/api/leaderboard/week", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT username, week_score FROM users ORDER BY week_score DESC LIMIT 10"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi leaderboard week:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});


// GET /api/items
app.get('/api/items', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/buy
app.post('/api/buy', async (req, res) => {
  const { userId, itemId } = req.body;

  try {
    // Lấy thông tin vật phẩm
    const [itemRows] = await pool.query('SELECT require_score FROM items WHERE id = ?', [itemId]);
    if (itemRows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const requireScore = itemRows[0].require_score;

    // Lấy điểm hiện tại của user
    const [userRows] = await pool.query('SELECT score FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

    const currentScore = userRows[0].score;

    if (currentScore < requireScore) {
      return res.status(400).json({ error: 'Không đủ điểm để mua vật phẩm này' });
    }

    // Trừ điểm
    await pool.query('UPDATE users SET score = score - ? WHERE id = ?', [requireScore, userId]);

    // Ghi vào bảng user_items
    await pool.query('INSERT INTO user_items (user_id, item_id) VALUES (?, ?)', [userId, itemId]);

    res.json({ success: true, message: 'Mua vật phẩm thành công!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/my-items/:userId
app.get('/api/my-items/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT items.* FROM items
       JOIN user_items ON items.id = user_items.item_id
       WHERE user_items.user_id = ?`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================
//  API: LẤY DANH SÁCH NHẠC
// ==========================
app.get('/api/music', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, link FROM music ORDER BY id ASC');
    // Nếu link trong DB dạng '/music/nhac1.mp3' thì client có thể dùng trực tiếp
    res.json(rows);
  } catch (err) {
    console.error('Error fetching music list:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách nhạc' });
  }
});

// ==========================
//  API: LẤY CHI TIẾT MỘT ĐOẠN NHẠC
// ==========================
app.get('/api/music/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute('SELECT id, name, link FROM music WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy nhạc' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching music by id:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==========================
// API: EXTERNAL LOGIN CHILD (KILOVIA)
// ==========================
app.post('/api/external-login-child', async (req, res) => {
  const { maTreEm, fullname, school } = req.body || {};

  if (!maTreEm) {
    return res.status(400).json({ message: 'maTreEm is required' });
  }

  try {
    // 1. Tìm user theo ma_tre_em
    const [rows] = await pool.execute('SELECT * FROM users WHERE ma_tre_em = ?', [maTreEm]);
    if (rows.length > 0) {
      return res.json({ user: rows[0], created: false });
    }

    // 2. Nếu chưa có thì tạo user mới
    const username = `kid_${maTreEm}`;
    // Dùng chuỗi cố định cho password, không dùng để đăng nhập thủ công
    const hashed = bcrypt.hashSync(`EXTERNAL_${maTreEm}`, 8);

    const sql = 'INSERT INTO users (username, password, fullname, school, ma_tre_em) VALUES (?, ?, ?, ?, ?)';
    const [result] = await pool.execute(sql, [
      username,
      hashed,
      fullname || null,
      school || null,
      maTreEm,
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    if (!createdRows.length) {
      return res.status(500).json({ message: 'Không lấy được user sau khi tạo' });
    }

    return res.json({ user: createdRows[0], created: true });
  } catch (err) {
    console.error('Error /api/external-login-child:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      // Trường hợp race-condition: ma_tre_em đã được tạo ở request khác
      try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE ma_tre_em = ?', [maTreEm]);
        if (rows.length > 0) {
          return res.json({ user: rows[0], created: false });
        }
      } catch (e2) {
        console.error('Error re-fetching user after ER_DUP_ENTRY:', e2);
      }
    }
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});


// ==========================
//  KHỞI ĐỘNG SERVER
// ==========================
const PORT = process.env.PORT || 5050;
const HOST = '0.0.0.0'; // Cho phép truy cập từ mọi địa chỉ IP (LAN, Internet)

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server đang chạy tại http://${HOST}:${PORT}`);
});
