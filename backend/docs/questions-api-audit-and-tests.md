# Questions API — аудит SQL, безопасность, тесты

> Tài liệu tổng hợp (round 1 + round 2). Checklist ngắn: [`questions-answers-checklist.md`](questions-answers-checklist.md).

---

## 1. Bảng trường kiểm tra (DB + API)

| Trường | Vị trí | Tiêu chí pass |
|--------|--------|----------------|
| `answers_json` | DB `questions` | JSON array 2–6 phần tử `{id,text,image,correct}` |
| `answers[]` | API | Khớp JSON; ≥1 `correct: true` |
| `question_text` | DB / API | Không rỗng |
| `question_image` | DB / API | `null` hoặc `/questions-images/...` |
| `grade_id`, `type_id`, `lesson_id` | Admin list | FK hợp lệ |
| `hierarchy_path` | Admin list (không `scope=play`) | `Khối > Chủ đề > Bài` |
| `in_exam_template` | Admin list | `true` ↔ `exam_template_questions` |

---

## 2. SQL injection & an toàn truy vấn

### Quy tắc dự án

| Quy tắc | Trạng thái |
|---------|------------|
| Giá trị user → luôn `?` (prepared) | Áp dụng `server.js`, `server-admin.js` |
| Ghép SQL động chỉ là mệnh đề cố định (`WHERE`, `AND`) | OK |
| `IN (...)` chỉ từ `?` placeholders | OK (`exam_template` question_ids) |
| `UPDATE SET col = ?` — tên cột từ whitelist trong code | OK (users, types, lessons, …) |
| `SELECT` cột — hằng trong code (`QUESTION_*_SELECT`, `USER_LIST_COLUMNS`) | OK |
| `scope`, `limit`, `offset`, id lọc — validate qua [`queryParams.js`](../lib/queryParams.js) | Round 2 |

### Endpoint — đánh giá

| Endpoint | SQL injection | Ghi chú |
|----------|---------------|---------|
| `GET /api/questions` | An toàn | `LIKE ?`, filter id `parsePositiveInt`, `clampLimitOffset` |
| `GET /api/questions/:id` | An toàn | `id` số, cột cố định |
| `POST/PUT/DELETE /api/questions` | An toàn | Body → `answersTextsToJson` / `?` |
| `GET /api/admin/users` | An toàn | `LIKE ?`, không SELECT `password` list |
| `POST/PUT exam-templates` | An toàn | `IN (?,?,?)` + `Number` ids |
| `PUT users` dynamic SET | An toàn | Chỉ cột hardcode |

### Rủi ro còn lại (chấp nhận / ghi nhận)

- `GET /api/questions` **public** — cần cho game không login; `answers[].correct` lộ cho client (game check local).
- `ORDER BY RAND()` — không dùng index; OK với ít câu/bài.
- `%search%` — full scan ~3k rows; chấp nhận được.

---

## 3. Phân quyền API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/questions` | Public |
| GET | `/api/questions/:id` | Public |
| GET | `/api/questions/:id/usage` | Token + **admin** |
| POST | `/api/questions` | Token + **admin** (round 2) |
| PUT | `/api/questions/:id` | Token + **admin** (round 2) |
| DELETE | `/api/questions/:id` | Token + **admin** |
| * | `/api/admin/*` | Token + **admin** (middleware mount) |

---

## 4. Ma trận test chức năng

| # | Hạng mục | Cách test | Pass |
|---|----------|-----------|------|
| 1 | Schema `answers_json` | Import dump / `DESCRIBE questions` | Manual |
| 2 | Data NULL / &lt;2 answers | SQL trong checklist | Manual |
| 3 | Admin list + filter + search | UI `/admin/questions` | Manual |
| 4 | Play `scope=play` + random | Lesson / game | Manual |
| 5 | Admin CRUD POST/PUT | Create/edit question (admin login) | Manual |
| 6 | Exam / contest questions | `/exams/:id`, contest detail | Manual |
| 7 | Game UI 2–6 answers | Chơi 1 bài | Manual |
| 8 | Delete + force | Xóa câu trong/ngoài mẫu đề | Manual |
| A | Smoke script | `node backend/scripts/smoke-questions-api.js` | Xem §6 |

---

## 5. Đã tối ưu

### Round 1

- `answers_json` only trong `buildAnswers()`
- `scope=play`, `EXISTS`, bỏ 3 query phụ grades/types/lessons
- `QUESTION_*_SELECT`, frontend `scope: 'play'`
- Migrate script + indexes SQL (tùy chọn)

### Round 2

| File | Thay đổi |
|------|----------|
| [`queryParams.js`](../lib/queryParams.js) | `parsePositiveInt`, `clampLimitOffset`, `parseScope`, `sqlInPlaceholders` |
| [`server.js`](../server.js) | Validate query; `requireAdminRole` POST/PUT; `Promise.all` COUNT+SELECT |
| [`server-admin.js`](../server-admin.js) | `clampLimitOffset` users; `USER_LIST_COLUMNS`; validate `grade_id` contests |
| [`smoke-questions-api.js`](../scripts/smoke-questions-api.js) | Smoke tự động |

---

## 6. Kết quả smoke (`node backend/scripts/smoke-questions-api.js`)

Chạy: **2026-06-01** (server mới restart sau round 2).

| Test | Kết quả | Ghi chú |
|------|---------|---------|
| GET play scope + lesson_id | **PASS** | status=200, count=5 |
| GET limit clamped | **PASS** | `limit=99999` → trả tối đa 500 dòng |
| GET invalid grade_id → 400 | **PASS** | status=400 |
| GET admin list fields | **PASS** | `hierarchy_path`, `in_exam_template` |
| POST without token → 401 | **PASS** | status=401 |
| POST user token → 403 | **SKIP** | Cần `USER_TOKEN` (role=0) để xác nhận 403 |
| GET invalid scope → 400 | **PASS** | `scope=evil` → 400 |
| SQL answers_json NULL count | **PASS** | `null_rows=0` |

**Tổng:** 8/8 passed (1 skip tùy chọn).

**Lệnh:** từ thư mục repo, server đang chạy port 5050:

```bash
node backend/scripts/smoke-questions-api.js
```

Env tùy chọn: `API_BASE`, `USER_TOKEN`, `ADMIN_TOKEN`.

---

## Кратко (RU)

**Безопасность:** параметризованные запросы; round 2 — валидация `limit`/`offset`/id/`scope`, POST/PUT questions только для admin.

**Файл:** полный аудит здесь; smoke — `backend/scripts/smoke-questions-api.js`.

**Ручные тесты:** таблица §4 (admin UI, game, exam, delete).
