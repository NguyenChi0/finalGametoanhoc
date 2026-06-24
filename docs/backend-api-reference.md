# Tài liệu API Back-end — Game Toán Học

> Đối chiếu với mã nguồn `backend/server.js` và `backend/server-admin.js`.  
> Base URL: `{host}` (ví dụ `http://localhost:3000`).

---

## 2.2.3.1. Phân loại đối tượng người dùng

Hệ thống phân quyền API theo **3 nhóm**:

| Nhóm | Mô tả |
|------|--------|
| **Public** | Không cần JWT |
| **Authenticated User** | Header `Authorization: Bearer <JWT>` |
| **Admin** | JWT + `users.role = 1`; toàn bộ route `/api/admin/*` |

**Header chung (JSON):** `Content-Type: application/json`

**Lưu ý đặc biệt:**

- `GET /api/user/{username}` — **Public**, nhưng nếu có JWT hợp lệ và xem **hồ sơ của chính mình** (hoặc admin) thì trả thêm trường riêng tư.
- `GET /api/questions` — **Public** khi `scope=play`; **Admin** khi không có `scope=play` (cần JWT admin).
- CRUD câu hỏi admin nằm tại **`/api/questions`**, không phải `/api/admin/questions`.
- Admin đăng nhập qua **`POST /api/login`** (không có `/api/admin/login` riêng).

---

## 2.2.3.1.1. Người dùng chưa đăng nhập (Public)

### 2.2.3.1.1.1. Đăng ký tài khoản

| | |
|---|---|
| **Chức năng** | Tạo tài khoản mới và gửi mã OTP xác minh email |
| **URL** | `{host}/api/register` |
| **Phương thức** | `POST` |
| **Authorization** | Public |

**Request Body:**

| Tên trường | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `username` | String | Có | Tên đăng nhập (duy nhất) |
| `password` | String | Có | Mật khẩu |
| `email` | String | Có | Email (duy nhất, đúng định dạng) |
| `phone` | String | Không | Số điện thoại (duy nhất nếu có) |

**Response (200):**

| Tên trường | Kiểu | Mô tả |
|------------|------|--------|
| `message` | String | Thông báo kết quả |
| `needsVerification` | Boolean | `true` — cần xác minh email |
| `userId` | Number | ID tài khoản vừa tạo |

**Lỗi thường gặp:** `409` trùng username/email/phone; `400` email không hợp lệ.

---

### 2.2.3.1.1.2. Xác thực email

| | |
|---|---|
| **Chức năng** | Xác minh email bằng OTP 6 số |
| **URL** | `{host}/api/auth/verify-email` |
| **Phương thức** | `POST` |
| **Authorization** | Public |

**Request Body:**

| Tên trường | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `email` | String | Có | Email cần xác thực |
| `otp` | String | Có | Mã OTP 6 chữ số |

**Response (200):**

| Tên trường | Kiểu | Mô tả |
|------------|------|--------|
| `message` | String | `"Xác minh email thành công. Bạn có thể đăng nhập."` |

**Lưu ý:** API **không trả JWT**; người dùng đăng nhập ở bước riêng.

---

### 2.2.3.1.1.3. Gửi lại mã xác minh

| | |
|---|---|
| **Chức năng** | Gửi lại OTP xác minh email |
| **URL** | `{host}/api/auth/resend-verification` |
| **Phương thức** | `POST` |
| **Authorization** | Public |

**Request Body:** `{ "email": "..." }`  
**Response:** `{ "message": "..." }`  
**Rate limit:** `429` nếu gửi quá nhiều lần.

---

### 2.2.3.1.1.4. Đăng nhập

| | |
|---|---|
| **Chức năng** | Đăng nhập hệ thống (User và Admin dùng chung) |
| **URL** | `{host}/api/login` |
| **Phương thức** | `POST` |
| **Authorization** | Public |

**Request Body:**

| Tên trường | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `username` | String | Có | Tên đăng nhập |
| `password` | String | Có | Mật khẩu |

**Response (200):**

| Tên trường | Kiểu | Mô tả |
|------------|------|--------|
| `message` | String | Thông báo kết quả |
| `token` | String | JWT access token |
| `user` | Object | Thông tin user (không có `password`) |

**Response (403) — chưa xác minh email:**

```json
{
  "message": "Tài khoản chưa được xác minh.",
  "code": "EMAIL_NOT_VERIFIED",
  "email": "user@example.com"
}
```

*Miễn trừ: tài khoản Kilovia (`ma_tre_em`) hoặc không có email.*

---

### 2.2.3.1.1.5. Quên mật khẩu

| | |
|---|---|
| **Chức năng** | Gửi OTP đặt lại mật khẩu qua email |
| **URL** | `{host}/api/auth/forgot-password` |
| **Phương thức** | `POST` |
| **Authorization** | Public |

**Request Body:** `{ "email": "..." }`  
**Response:** `{ "message": "..." }` — thông báo chung, không lộ email có/không tồn tại.

---

### 2.2.3.1.1.6. Đặt lại mật khẩu

| | |
|---|---|
| **Chức năng** | Đặt mật khẩu mới bằng OTP |
| **URL** | `{host}/api/auth/reset-password` |
| **Phương thức** | `POST` |
| **Authorization** | Public |

**Request Body:**

| Tên trường | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `email` | String | Có | Email tài khoản |
| `otp` | String | Có | Mã OTP 6 số |
| `newPassword` | String | Có | Mật khẩu mới (≥ 4 ký tự) |

**Response:** `{ "message": "..." }`

---

### 2.2.3.1.1.7. Lấy danh sách khối/lớp

| | |
|---|---|
| **Chức năng** | Lấy danh sách khối/lớp (cấp cao nhất của nội dung học) |
| **URL** | `{host}/api/grades` |
| **Phương thức** | `GET` |
| **Authorization** | Public |

**Response:** Mảng `{ id, name, image }`

---

### 2.2.3.1.1.8. Lấy danh sách chủ đề theo khối

| | |
|---|---|
| **Chức năng** | Lấy chủ đề toán thuộc một khối/lớp |
| **URL** | `{host}/api/types/{grade_id}` |
| **Phương thức** | `GET` |
| **Authorization** | Public |

**Response:** Mảng `{ id, grade_id, name, description, image, sort_order }`

---

### 2.2.3.1.1.9. Lấy danh sách bài học theo chủ đề

| | |
|---|---|
| **Chức năng** | Lấy bài học thuộc một chủ đề |
| **URL** | `{host}/api/lessons/{type_id}` |
| **Phương thức** | `GET` |
| **Authorization** | Public |

**Response:** Mảng `{ id, type_id, name, description, status, image, sort_order }`

**Alias cũ (deprecated):** `GET /api/operations/{type_id}` — tương đương `/api/lessons/{type_id}`.

---

### 2.2.3.1.1.10. Lấy toàn bộ phân cấp (labels)

| | |
|---|---|
| **Chức năng** | Map id → tên cho grades, types, lessons (UI/admin) |
| **URL** | `{host}/api/hierarchy-labels` |
| **Phương thức** | `GET` |
| **Authorization** | Public |

**Response:**

```json
{
  "grades": [{ "id", "name" }],
  "types": [{ "id", "grade_id", "name" }],
  "lessons": [{ "id", "type_id", "name", "description", "status" }]
}
```

---

### 2.2.3.1.1.11. Lấy câu hỏi để chơi game

| | |
|---|---|
| **Chức năng** | Lấy câu hỏi cho minigame (payload nhẹ) |
| **URL** | `{host}/api/questions` |
| **Phương thức** | `GET` |
| **Authorization** | Public |

**Query Parameters:**

| Tên trường | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `grade_id` | Int | Nên có* | ID khối |
| `type_id` | Int | Nên có* | ID chủ đề |
| `lesson_id` | Int | Nên có* | ID bài học |
| `operation_id` | Int | Không | Alias cũ của `lesson_id` |
| `randomize` | `0`\|`1` | Không | `1` — xáo trộn câu hỏi |
| `scope` | String | Không | `play` — payload game (bắt buộc cho client chơi game) |
| `limit` | Int | Không | Mặc định 200, tối đa 200 (play) |
| `offset` | Int | Không | Phân trang |

*\*Backend không bắt buộc cứng 3 tham số, nhưng client chơi game nên truyền đủ.*

**Response:**

```json
{
  "count": 10,
  "total": 10,
  "data": [
    {
      "id": 1,
      "question_text": "...",
      "question_image": "/questions-images/...",
      "answers": [{ "id", "text", "image" }]
    }
  ]
}
```

**Lưu ý:** Payload `scope=play` **không trả** cờ `correct` trên đáp án.

---

### 2.2.3.1.1.12. Lấy chi tiết một câu hỏi

| | |
|---|---|
| **URL** | `{host}/api/questions/{id}` |
| **Phương thức** | `GET` |
| **Authorization** | Public |

**Response:** `{ id, grade_id, type_id, lesson_id, question_text, question_image, answers[] }`

---

### 2.2.3.1.1.13. Lấy danh sách vật phẩm (cửa hàng)

| | |
|---|---|
| **Chức năng** | Xem vật phẩm đang bán (chưa cần đăng nhập) |
| **URL** | `{host}/api/items` |
| **Phương thức** | `GET` |
| **Authorization** | Public |

**Response:** Mảng toàn bộ cột bảng `items` (`SELECT *`), gồm: `id`, `name`, `description`, `require_score`, `level`, `effect_type`, `link`, …

---

### 2.2.3.1.1.14. Bảng xếp hạng

| | |
|---|---|
| **Authorization** | Public |

| URL | Mô tả | Response |
|-----|--------|----------|
| `GET /api/leaderboard/all` | Top 10 điểm tổng | `[{ username, score }]` |
| `GET /api/leaderboard/week` | Top 10 điểm tuần | `[{ username, week_score }]` |

---

### 2.2.3.1.1.15. Đăng nhập Kilovia (tích hợp ngoài)

| | |
|---|---|
| **URL** | `{host}/api/external-login-child` |
| **Phương thức** | `POST` |
| **Authorization** | Public |

**Request Body:** `{ "maTreEm": "..." }`  
**Response:** `{ message, token, user }` (tài khoản con Kilovia).

---

## 2.2.3.1.2. Người dùng đã đăng nhập (Authenticated User)

**Header:** `Authorization: Bearer <JWT>`

---

### 2.2.3.1.2.1. Lấy thông tin phiên hiện tại

| | |
|---|---|
| **URL** | `{host}/api/auth/me` |
| **Phương thức** | `GET` |

**Response:**

```json
{
  "user": {
    "id", "username", "ma_tre_em", "created_at",
    "score", "items", "week_score", "role", "email", "phone"
  }
}
```

---

### 2.2.3.1.2.2. Đổi mật khẩu

| | |
|---|---|
| **URL** | `{host}/api/auth/change-password` |
| **Phương thức** | `POST` |

**Request Body:**

| Tên trường | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `currentPassword` | String | Có | Mật khẩu hiện tại |
| `newPassword` | String | Có | Mật khẩu mới (≥ 4 ký tự, khác mật khẩu cũ) |

**Response:** `{ "message": "..." }`

---

### 2.2.3.1.2.3. Lưu tiến độ bài học

| | |
|---|---|
| **Chức năng** | Ghi nhận kết quả sau khi chơi game |
| **URL** | `{host}/api/lesson-progress` |
| **Phương thức** | `POST` |

**Request Body:**

| Tên trường | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `lessonId` | Int | Có | ID bài học |
| `gradeId` | Int | Có | ID khối |
| `typeId` | Int | Có | ID chủ đề |
| `correctCount` | Int | Có | Số câu đúng (0 … totalCount) |
| `totalCount` | Int | Có | Tổng số câu |
| `gameId` | String | Không | Game đã chơi (`game1` … `game11`, tối đa 32 ký tự) |

**Response (200):**

```json
{
  "success": true,
  "progress": {
    "lesson_id", "grade_id", "type_id",
    "correct_count", "total_count", "stars",
    "attempt_count", "completed_at", "game_id"
  }
}
```

---

### 2.2.3.1.2.4. Lấy tiến độ theo khối

| | |
|---|---|
| **URL** | `{host}/api/lesson-progress?grade_id={id}` |
| **Phương thức** | `GET` |

**Response:** `{ "items": [ ... ] }`

---

### 2.2.3.1.2.5. Lấy bài học vừa chơi gần nhất

| | |
|---|---|
| **URL** | `{host}/api/lesson-progress/last` |
| **Phương thức** | `GET` |

**Response:** `{ "progress": null | { ... } }`

---

### 2.2.3.1.2.6. Lấy lịch sử / bài đã hoàn thành (ôn tập)

| | |
|---|---|
| **Chức năng** | Lấy bài đã học gần đây để ôn tập |
| **URL** | `{host}/api/lesson-progress/completed` |
| **Phương thức** | `GET` |

**Query:**

| Tên trường | Kiểu | Mô tả |
|------------|------|--------|
| `days` | Int | `3` hoặc `7` (mặc định `7`) |

**Response:**

```json
{
  "items": [
    {
      "lesson_id", "grade_id", "type_id",
      "lesson_name", "type_name", "grade_name",
      "correct_count", "total_count", "stars",
      "attempt_count", "completed_at", "game_id"
    }
  ]
}
```

---

### 2.2.3.1.2.7. Cộng điểm sau game

| | |
|---|---|
| **URL** | `{host}/api/score/increment` |
| **Phương thức** | `POST` |

**Request Body:**

| Tên trường | Kiểu | Mô tả |
|------------|------|--------|
| `userId` | Int | ID user (user thường chỉ cộng cho chính mình; admin có thể chỉ định) |
| `delta` | Int | Số điểm cộng (mặc định 1) |

**Response:** `{ success, score, week_score }`

---

### 2.2.3.1.2.8. Lấy danh sách đề thi (luyện đề)

| | |
|---|---|
| **URL** | `{host}/api/exams` |
| **Phương thức** | `GET` |

**Query:** `grade_id`, `page`, `page_size` (mặc định page=1, page_size=10, tối đa 100)

**Response:**

```json
{
  "data": [{ "id", "name", "grade_id", "grade_name", "description", "duration_time", "start_date", "status", "question_count", ... }],
  "pagination": { "page", "page_size", "total", "total_pages" }
}
```

*Chỉ trả đề có `status = 1`.*

---

### 2.2.3.1.2.9. Lấy chi tiết đề thi

| | |
|---|---|
| **URL** | `{host}/api/exams/{id}` |
| **Phương thức** | `GET` |

**Response:** Thông tin đề + `question_count` + `questions[]` (câu hỏi và đáp án đầy đủ).

---

### 2.2.3.1.2.10. Lấy danh sách cuộc thi

| | |
|---|---|
| **URL** | `{host}/api/contests` |
| **Phương thức** | `GET` |

**Query:** `grade_id`, `page`, `page_size` (mặc định page_size=5)

**Response:**

```json
{
  "data": [{
    "id", "name", "prize", "template_id", "start_time", "end_time",
    "status", "description", "duration_time", "grade_id", "grade_name",
    "template_name", "question_count", "my_score", "completed"
  }],
  "pagination": { "page", "page_size", "total", "total_pages" }
}
```

---

### 2.2.3.1.2.11. Chi tiết cuộc thi

| | |
|---|---|
| **URL** | `{host}/api/contests/{id}` |
| **Phương thức** | `GET` |

**Response:** Một object cuộc thi (cùng các trường như phần tử trong danh sách).

---

### 2.2.3.1.2.12. Bảng xếp hạng cuộc thi

| | |
|---|---|
| **URL** | `{host}/api/contests/{id}/leaderboard` |
| **Phương thức** | `GET` |

**Response:** Danh sách xếp hạng theo điểm cuộc thi.

---

### 2.2.3.1.2.13. Nộp điểm cuộc thi

| | |
|---|---|
| **URL** | `{host}/api/contests/{id}/submit` |
| **Phương thức** | `POST` |

**Request Body:**

| Tên trường | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `score` | Int | Có | Số câu đúng / điểm |
| `times` | Int | Có | Thời gian làm bài (giây) |

**Response (201):**

```json
{ "message": "Đã lưu kết quả", "score", "times", "contest_id" }
```

**Lỗi:** `409` — mỗi user chỉ nộp **1 lần**/cuộc thi; `403` — cuộc thi chưa bắt đầu hoặc đã kết thúc.

---

### 2.2.3.1.2.14. Hiệu ứng vật phẩm mang vào bài

| | |
|---|---|
| **URL** | `{host}/api/item-effects?itemIds=1,2,3` |
| **Phương thức** | `GET` |

**Response:**

```json
{
  "lessonBonusPerComplete": 0,
  "hintQuestionsPerLesson": 0
}
```

*Tối đa 3 `itemId`; chỉ tính vật phẩm user **đã sở hữu**.*

---

### 2.2.3.1.2.15. Mua vật phẩm

| | |
|---|---|
| **URL** | `{host}/api/buy` |
| **Phương thức** | `POST` |

**Request Body:**

| Tên trường | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `userId` | Int | Có | ID người mua (phải là chính mình hoặc admin) |
| `itemId` | Int | Có | ID vật phẩm |

**Response (200):** `{ "success": true, "message": "Mua vật phẩm thành công!" }`  
**Lỗi:** `400` không đủ điểm; `403` không có quyền; `404` item/user không tồn tại.

---

### 2.2.3.1.2.16. Vật phẩm đã sở hữu

| | |
|---|---|
| **URL** | `{host}/api/my-items/{userId}` |
| **Phương thức** | `GET` |

**Response:** Mảng thông tin vật phẩm (`items.*`) user đã mua.

---

### 2.2.3.1.2.17. Xem hồ sơ cá nhân

| | |
|---|---|
| **URL** | `{host}/api/user/{username}` |
| **Phương thức** | `GET` |
| **Authorization** | Public (JWT tùy chọn) |

**Response (công khai):**

```json
{
  "id", "username", "score", "week_score", "created_at",
  "week_rank", "achievement", "itemsOwned": [],
  "recentLessons": []
}
```

**Trường bổ sung khi xem hồ sơ của chính mình hoặc admin:**  
`email`, `phone`, `role`, `email_verified`, `ma_tre_em`, `items`

---

## 2.2.3.1.3. Admin (Quản trị viên)

**Tiền tố:** `{host}/api/admin/*`  
**Authorization:** `Authorization: Bearer <JWT>` và `users.role = 1`

---

### 2.2.3.1.3.1. Dashboard thống kê

| | |
|---|---|
| **URL** | `{host}/api/admin/dashboard` |
| **Phương thức** | `GET` |

**Response (trích):**

| Tên trường | Kiểu | Mô tả |
|------------|------|--------|
| `counts` | Object | users, students, admins, questions, grades, types, lessons, examTemplates, contests, items |
| `alerts` | Object | Bài thiếu câu hỏi, đề trống, cuộc thi sắp/kết thúc |
| `activity` | Object | Hoạt động 7 ngày, user mới, top điểm tuần |

**Bổ sung:** `GET /api/admin/dashboard/performance` — thống kê hiệu năng.

---

### 2.2.3.1.3.2. Quản lý người dùng

| Thao tác | URL | Phương thức |
|----------|-----|-------------|
| Danh sách | `/api/admin/users` | `GET` |
| Chi tiết | `/api/admin/users/{id}` | `GET` |
| Tạo | `/api/admin/users` | `POST` |
| Cập nhật | `/api/admin/users/{id}` | `PUT` |
| Xóa | `/api/admin/users/{id}` | `DELETE` |

**Query (list):** `search`, `role` (`0`|`1`), `limit`, `offset`  
**Response (list):** `{ count, data[] }` — **không trả** trường `password`  
**Cột list:** gồm `email_verified`

**Body tạo (trích):** `{ username, password, email?, phone?, role?, score?, week_score?, email_verified? }`

---

### 2.2.3.1.3.3. Quản lý khối lớp

| Thao tác | URL |
|----------|-----|
| List | `GET /api/admin/grades` |
| Detail | `GET /api/admin/grades/{id}` |
| Create | `POST /api/admin/grades` |
| Update | `PUT /api/admin/grades/{id}` |
| Delete | `DELETE /api/admin/grades/{id}` |
| Upload ảnh | `POST /api/admin/grades-images` (multipart, field `image`) |

---

### 2.2.3.1.3.4. Quản lý chủ đề

| Thao tác | URL |
|----------|-----|
| List | `GET /api/admin/types?grade_id=` |
| Detail | `GET /api/admin/types/{id}` |
| Create | `POST /api/admin/types` |
| Update | `PUT /api/admin/types/{id}` |
| Delete | `DELETE /api/admin/types/{id}` |
| Upload ảnh | `POST /api/admin/types-images` (multipart) |

---

### 2.2.3.1.3.5. Quản lý bài học

| Thao tác | URL |
|----------|-----|
| List | `GET /api/admin/lessons?type_id=` |
| Detail | `GET /api/admin/lessons/{id}` |
| Create | `POST /api/admin/lessons` |
| Update | `PUT /api/admin/lessons/{id}` |
| Delete | `DELETE /api/admin/lessons/{id}` |
| Upload ảnh | `POST /api/admin/lessons-images` (multipart) |

---

### 2.2.3.1.3.6. Quản lý câu hỏi

> Route nằm tại **`/api/questions`**, không phải `/api/admin/questions`.

| Thao tác | URL | Auth |
|----------|-----|------|
| Danh sách + lọc | `GET /api/questions` | Admin JWT (không dùng `scope=play`) |
| Chi tiết | `GET /api/questions/{id}` | Public |
| Usage trong đề | `GET /api/questions/{id}/usage` | Admin JWT |
| Tạo | `POST /api/questions` | Admin JWT |
| Cập nhật | `PUT /api/questions/{id}` | Admin JWT |
| Xóa | `DELETE /api/questions/{id}` | Admin JWT |

**Query (list admin):** `grade_id`, `type_id`, `lesson_id`, `search`, `limit`, `offset`, `random`

**Body tạo/sửa (trích):**

```json
{
  "grade_id", "type_id", "lesson_id",
  "question_text",
  "answers": [
    { "text": "...", "correct": true },
    { "text": "...", "correct": false }
  ]
}
```

- Tối đa **3 đáp án đúng + 3 đáp án sai** (tối thiểu 1 đúng + 1 sai).
- Hỗ trợ **multipart** với field `question_image` (ảnh ≤ 5MB).

**Xóa có force:**

```
DELETE /api/questions/{id}?force=1
```

Gỡ câu hỏi khỏi các mẫu đề liên quan trước khi xóa. Không có `force` → `409` nếu câu đang trong đề.

---

### 2.2.3.1.3.7. Quản lý đề thi (exam templates)

| Thao tác | URL |
|----------|-----|
| List | `GET /api/admin/exam-templates` |
| Detail | `GET /api/admin/exam-templates/{id}` |
| Create | `POST /api/admin/exam-templates` |
| Update | `PUT /api/admin/exam-templates/{id}` |
| Delete | `DELETE /api/admin/exam-templates/{id}` |
| Gỡ câu khỏi đề | `DELETE /api/admin/exam-templates/{id}/questions/{questionId}` |

Gán câu hỏi vào đề qua `question_ids[]` khi tạo/cập nhật template.

---

### 2.2.3.1.3.8. Quản lý cuộc thi

| Thao tác | URL |
|----------|-----|
| List | `GET /api/admin/contests` |
| Detail | `GET /api/admin/contests/{id}` |
| Create | `POST /api/admin/contests` |
| Cập nhật | **`PATCH /api/admin/contests/{id}`** |
| Delete | `DELETE /api/admin/contests/{id}` |
| BXH admin | `GET /api/admin/contests/{id}/leaderboard` |

---

### 2.2.3.1.3.9. Quản lý vật phẩm

| Thao tác | URL |
|----------|-----|
| List | `GET /api/admin/items` |
| Detail | `GET /api/admin/items/{id}` |
| Create | `POST /api/admin/items` (JSON hoặc multipart có ảnh) |
| Update | `PUT /api/admin/items/{id}` |
| Delete | `DELETE /api/admin/items/{id}` |

Ảnh vật phẩm lưu tại `backend/items-images/`.

---

## Phụ lục: Mã lỗi HTTP thường gặp

| Mã | Ý nghĩa |
|----|---------|
| `400` | Dữ liệu request không hợp lệ |
| `401` | Thiếu/sai JWT |
| `403` | Không đủ quyền (admin, email chưa xác minh, cuộc thi chưa mở…) |
| `404` | Không tìm thấy tài nguyên |
| `409` | Xung đột (trùng username, đã nộp cuộc thi, câu hỏi đang trong đề…) |
| `429` | Rate limit (OTP, resend email…) |
| `500` | Lỗi server |

---

## Phụ lục: Phân cấp nội dung học

```
Grade (khối/lớp)
  └── Type (chủ đề)
        └── Lesson (bài học)
              └── Question (câu hỏi)
```

---

*Tài liệu sinh từ mã nguồn dự án `gametoanhoc-vite` — cập nhật theo codebase hiện tại.*
