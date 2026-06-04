# Kiểm tra questions / answers_json

> **Audít đầy đủ (SQL, bảo mật, ma trận test, smoke):** [`questions-api-audit-and-tests.md`](questions-api-audit-and-tests.md)

Tài liệu kiểm tra sau khi import dump (ví dụ `niuuuuuuuuuuuuuuuuuuuuuu.sql`) và tối ưu API.

---

## A. Các trường cần kiểm tra

| Trường | Vị trí | Tiêu chí pass |
|--------|--------|----------------|
| `answers_json` | DB `questions` | JSON array 2–6 phần tử; mỗi phần tử có `id`, `text`, `image`, `correct` (boolean) |
| `answers[]` | API response | Khớp `answers_json`; ít nhất một `correct: true`; `text` hoặc `image` không rỗng |
| `question_text` | DB / API | Không rỗng |
| `question_image` | DB / API | `null` hoặc path `/questions-images/...` |
| `grade_id`, `type_id`, `lesson_id` | DB / API (admin) | FK hợp lệ tới `grades`, `types`, `lessons` |
| `hierarchy_path` | API list (admin, không `scope=play`) | Chuỗi `Khối > Chủ đề > Bài` hoặc null nếu thiếu tên |
| `in_exam_template` | API list (admin) | `true` iff có dòng `exam_template_questions.question_id` |

### Cấu trúc `answers_json` mẫu

```json
[
  {"id": "a0", "text": "7", "image": null, "correct": true},
  {"id": "a1", "text": "6", "image": null, "correct": false}
]
```

---

## B. Hạng mục kiểm tra (theo luồng)

### 1. Schema / import dump

- [ ] Bảng `questions` có cột `answers_json` (JSON)
- [ ] Không còn cột legacy (`answercorrect_text`, `answer2_text`, …) nếu đã migrate xong
- [ ] (Tùy chọn) Đã chạy `20260603_questions_query_indexes.sql`

### 2. Toàn vẹn dữ liệu

```sql
SELECT COUNT(*) FROM questions WHERE answers_json IS NULL;
SELECT id FROM questions WHERE answers_json IS NOT NULL
  AND JSON_LENGTH(answers_json) < 2 LIMIT 20;
```

- [ ] Không có (hoặc chấp nhận được số lượng) câu `answers_json IS NULL`
- [ ] Mỗi câu có ≥ 2 đáp án trong JSON

### 3. API list — admin (`GET /api/questions`)

- [ ] Lọc `grade_id`, `type_id`, `lesson_id`
- [ ] `search` theo nội dung / id
- [ ] `total`, `count`, phân trang `limit` / `offset`
- [ ] `in_exam_template`, `hierarchy_path` hiển thị đúng

### 4. API list — game (`GET /api/questions?scope=play`)

- [ ] Chỉ trả `id`, `question_text`, `question_image`, `answers`
- [ ] `random=1` trộn câu cho bài học
- [ ] Lesson / game load nhanh, không lỗi thiếu field

### 5. Admin CRUD

- [ ] `POST /api/questions` — 2–6 đáp án, `correct_indices`
- [ ] `PUT /api/questions/:id` — cập nhật text / ảnh
- [ ] Multipart upload `question_image`

### 6. Đề / cuộc thi

- [ ] `GET /api/exams/:id` — `questions[]` có `answers`
- [ ] `GET /api/contests/:id` — cùng format

### 7. Giao diện game

- [ ] 2–6 đáp án hiển thị, chọn đúng/sai
- [ ] Ảnh câu hỏi và ảnh đáp án (nếu có) resolve URL đúng

### 8. Xóa câu hỏi

- [ ] Xóa câu không trong mẫu đề — thành công
- [ ] Xóa câu trong mẫu đề — 409, `GET .../usage` liệt kê đề
- [ ] `DELETE ?force=1` — gỡ khỏi đề rồi xóa

---

## C. Đã tối ưu (round 1 + round 2)

Round 2 (SQL/bảo mật): xem [`questions-api-audit-and-tests.md`](questions-api-audit-and-tests.md) §5–§6.

### Round 1

| Hạng mục | Thay đổi |
|----------|----------|
| `questionAnswers.js` | `buildAnswers()` chỉ đọc `answers_json`; hỗ trợ Buffer/object từ mysql2; legacy chỉ trong `buildAnswersFromLegacyColumns` cho script migrate |
| `GET /api/questions` | Bỏ 3 query phụ `grades` / `types` / `lessons`; dùng JOIN; `EXISTS` thay `COUNT(*)` cho `in_exam_template` |
| `GET /api/questions?scope=play` | Không JOIN curriculum, không kiểm tra mẫu đề — payload nhỏ cho game |
| `GET /api/questions/:id`, exams, contests | `SELECT` cột cụ thể (`QUESTION_*_SELECT`) thay `*` / `q.*` |
| Frontend | `lessonPage`, `nextLesson` gọi `scope: 'play'` |
| Script migrate | Kiểm tra `information_schema` trước khi đọc cột legacy; batch UPDATE 100 dòng |
| SQL (tùy chọn) | `idx_questions_lesson_id`, `idx_questions_filters` |

---

## Кратко (RU)

**Поля:** `answers_json` в БД → `answers[]` в API; для игры — `scope=play`.

**Проверки:** импорт дампа, NULL/пустые ответы, admin list, play list, CRUD, экзамены/конкурсы, UI игры, удаление с force.

**Оптимизации:** убраны лишние запросы и legacy в hot-path, EXISTS вместо COUNT, узкий SELECT, `scope=play` на фронте для уроков.
