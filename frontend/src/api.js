// src/api.js
import axios from "axios";

// Base URL đã có prefix /api
const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5050/api";

/** Origin server API (không có /api) — dùng cho ảnh tĩnh ví dụ /items-images/... */
export const API_ORIGIN = String(API_BASE).replace(/\/api\/?$/i, "");

/**
 * URL ảnh vật phẩm — DB lưu `/items-images/...` (hoặc legacy: chỉ tên file).
 */
export function itemImageUrl(link) {
  if (link == null || String(link).trim() === "") return "";
  const s = String(link).trim();
  const origin = API_ORIGIN.replace(/\/$/, "");
  if (s.startsWith("/items-images/")) {
    return `${origin}${s}`;
  }
  const rel = s.replace(/^\/+/, "");
  if (!rel) return "";
  const segments = rel.split("/").filter(Boolean).map((seg) => encodeURIComponent(seg));
  return `${origin}/items-images/${segments.join("/")}`;
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// attach token nếu có
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (typeof window !== "undefined") {
        const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
        const loginPath = `${base}/login` || "/login";
        if (window.location.pathname !== loginPath) {
          window.location.assign(loginPath);
        }
      }
    }
    return Promise.reject(error);
  }
);

// ==========================
// Auth
// ==========================
export const register = async ({ username, password, email, phone }) => {
  return api.post("/register", { username, password, email, phone });
};

export const login = async ({ username, password }) => {
  return api.post("/login", { username, password });
};

export const getAuthMe = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};

// ==========================
// Contests (trang user — không qua /admin)
// ==========================
/**
 * Danh sách cuộc thi (user): chỉ cuộc đang diễn ra (`status === 2`).
 * Mỗi phần tử có `exam_duration_minutes` / `duration_time` = thời gian làm bài (phút) từ DB.
 */
export const getContests = async () => {
  const res = await api.get("/contests");
  return res.data;
};

/** Chi tiết một cuộc thi — cùng trường thời lượng làm bài như danh sách. */
export const getContestById = async (id) => {
  const res = await api.get(`/contests/${id}`);
  return res.data;
};

/** Lưu điểm một lần / contest vào `user_contests` (409 nếu đã thi). */
export const submitContestScore = async (contestId, { score }) => {
  const res = await api.post(`/contests/${contestId}/submit`, { score });
  return res.data;
};

// ==========================
// Exams (exam_templates) - user
// ==========================
export const getExams = async (opts = {}) => {
  const params = Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const res = await api.get("/exams", { params });
  return res.data;
};

/** Chi tiết đề luyện: `questions[]` có `question_text`, `question_image`, `answers` (giống /api/questions). */
export const getExamById = async (id) => {
  const res = await api.get(`/exams/${id}`);
  return res.data;
};

// ==========================
// Grades / Types / Lessons (bảng `lessons` trên server)
// ==========================
export const getGrades = async () => {
  const res = await api.get("/grades");
  return res.data;
};

export const getTypes = async (gradeId) => {
  const res = await api.get(`/types/${gradeId}`);
  return res.data;
};

export const getLessons = async (typeId) => {
  const res = await api.get(`/lessons/${typeId}`);
  return res.data;
};

export const getHierarchyLabels = async () => {
  const res = await api.get("/hierarchy-labels");
  return res.data;
};

/** @deprecated dùng getLessons */
export const getOperations = getLessons;

// ==========================
// Admin — Grades (CRUD /api/admin/grades)
// ==========================
export const getAdminGrades = async () => {
  const res = await api.get("/admin/grades");
  return res.data;
};

export const getAdminGrade = async (id) => {
  const res = await api.get(`/admin/grades/${id}`);
  return res.data;
};

export const createAdminGrade = async ({ id, name, description }) => {
  const res = await api.post("/admin/grades", { id, name, description });
  return res.data;
};

export const updateAdminGrade = async (id, payload) => {
  const res = await api.put(`/admin/grades/${id}`, payload);
  return res.data;
};

export const deleteAdminGrade = async (id) => {
  const res = await api.delete(`/admin/grades/${id}`);
  return res.data;
};

// ==========================
// Admin — Types & Lessons (chủ đề / bài học)
// ==========================
export const getAdminTypes = async (opts = {}) => {
  const params = Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const res = await api.get("/admin/types", { params });
  return res.data;
};

export const getAdminType = async (id) => {
  const res = await api.get(`/admin/types/${id}`);
  return res.data;
};

export const createAdminType = async ({ grade_id, name, description }) => {
  const res = await api.post("/admin/types", { grade_id, name, description });
  return res.data;
};

export const updateAdminType = async (id, payload) => {
  const res = await api.put(`/admin/types/${id}`, payload);
  return res.data;
};

export const deleteAdminType = async (id) => {
  const res = await api.delete(`/admin/types/${id}`);
  return res.data;
};

export const getAdminLessons = async (opts = {}) => {
  const params = Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const res = await api.get("/admin/lessons", { params });
  return res.data;
};

export const getAdminLesson = async (id) => {
  const res = await api.get(`/admin/lessons/${id}`);
  return res.data;
};

export const createAdminLesson = async ({ type_id, name }) => {
  const res = await api.post("/admin/lessons", { type_id, name });
  return res.data;
};

export const updateAdminLesson = async (id, payload) => {
  const res = await api.put(`/admin/lessons/${id}`, payload);
  return res.data;
};

export const deleteAdminLesson = async (id) => {
  const res = await api.delete(`/admin/lessons/${id}`);
  return res.data;
};

// ==========================
// Admin — Exam templates (mẫu đề / exam_templates)
// Payload/response: `duration_time` = số phút (1..9999), mặc định tạo 30 nếu không gửi.
// ==========================
export const getAdminExamTemplates = async (opts = {}) => {
  const params = Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const res = await api.get("/admin/exam-templates", { params });
  return res.data;
};

export const getAdminExamTemplate = async (id) => {
  const res = await api.get(`/admin/exam-templates/${id}`);
  return res.data;
};

export const createAdminExamTemplate = async (payload) => {
  const res = await api.post("/admin/exam-templates", payload);
  return res.data;
};

export const updateAdminExamTemplate = async (id, payload) => {
  const res = await api.put(`/admin/exam-templates/${id}`, payload);
  return res.data;
};

export const deleteAdminExamTemplate = async (id) => {
  const res = await api.delete(`/admin/exam-templates/${id}`);
  return res.data;
};

/** Gỡ một câu hỏi khỏi đề (không xóa bản ghi questions). */
export const removeQuestionFromExamTemplate = async (templateId, questionId) => {
  const res = await api.delete(
    `/admin/exam-templates/${templateId}/questions/${questionId}`
  );
  return res.data;
};

// ==========================
// Admin — Contests (name, prize, template_id; khối qua exam_templates — nhiều cuộc thi / khối)
// ==========================
export const getAdminContests = async () => {
  const res = await api.get("/admin/contests");
  return res.data;
};

export const getAdminContest = async (id) => {
  const res = await api.get(`/admin/contests/${id}`);
  return res.data;
};

export const createAdminContest = async (payload) => {
  const res = await api.post("/admin/contests", payload);
  return res.data;
};

export const updateAdminContest = async (id, payload) => {
  const res = await api.patch(`/admin/contests/${id}`, payload);
  return res.data;
};

export const deleteAdminContest = async (id) => {
  const res = await api.delete(`/admin/contests/${id}`);
  return res.data;
};

// ==========================
// Admin — Items (shop /api/admin/items)
// ==========================
export const getAdminItems = async () => {
  const res = await api.get("/admin/items");
  return res.data;
};

export const getAdminItem = async (id) => {
  const res = await api.get(`/admin/items/${id}`);
  return res.data;
};

/**
 * Tạo item — JSON hoặc multipart (`item_image` / `item_image_path`), server lưu `link` = `/items-images/...`.
 */
export const createAdminItem = async (payload) => {
  const { imageFile, item_image_path, ...rest } = payload;
  if (imageFile instanceof Blob || (item_image_path != null && String(item_image_path).trim() !== "")) {
    const fd = new FormData();
    fd.append("name", rest.name ?? "");
    fd.append("description", rest.description ?? "");
    fd.append("require_score", String(rest.require_score ?? 0));
    if (imageFile instanceof Blob) {
      const name =
        imageFile instanceof File && imageFile.name ? imageFile.name : "item.png";
      fd.append("item_image", imageFile, name);
    } else if (item_image_path != null && String(item_image_path).trim() !== "") {
      fd.append("item_image_path", String(item_image_path).trim());
    }
    const headers = {};
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/admin/items`, {
      method: "POST",
      headers,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || res.statusText || "Lỗi tạo vật phẩm");
      err.response = { data, status: res.status };
      throw err;
    }
    return data;
  }
  const res = await api.post("/admin/items", rest);
  return res.data;
};

export const updateAdminItem = async (id, payload) => {
  const { imageFile, item_image_path, clear_item_image, ...rest } = payload;
  const iid = Number(id);
  if (!iid) throw new Error("id không hợp lệ");
  const useMultipart =
    imageFile instanceof Blob ||
    (item_image_path != null && String(item_image_path).trim() !== "") ||
    clear_item_image === true;
  if (useMultipart) {
    const fd = new FormData();
    fd.append("name", rest.name ?? "");
    fd.append("description", rest.description ?? "");
    fd.append("require_score", String(rest.require_score ?? 0));
    if (imageFile instanceof Blob) {
      const name =
        imageFile instanceof File && imageFile.name ? imageFile.name : "item.png";
      fd.append("item_image", imageFile, name);
    } else if (item_image_path != null && String(item_image_path).trim() !== "") {
      fd.append("item_image_path", String(item_image_path).trim());
    }
    if (clear_item_image) {
      fd.append("clear_item_image", "1");
    }
    const headers = {};
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/admin/items/${iid}`, {
      method: "PUT",
      headers,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || res.statusText || "Lỗi cập nhật vật phẩm");
      err.response = { data, status: res.status };
      throw err;
    }
    return data;
  }
  const res = await api.put(`/admin/items/${iid}`, rest);
  return res.data;
};

export const deleteAdminItem = async (id) => {
  const res = await api.delete(`/admin/items/${id}`);
  return res.data;
};

// ==========================
// Admin — Users (CRUD /api/admin/users; mật khẩu băm bcrypt ở server)
// ==========================
export const getAdminUsers = async (opts = {}) => {
  const params = Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const res = await api.get("/admin/users", { params });
  return res.data;
};

export const getAdminUser = async (id) => {
  const res = await api.get(`/admin/users/${id}`);
  return res.data;
};

export const createAdminUser = async (payload) => {
  const res = await api.post("/admin/users", payload);
  return res.data;
};

export const updateAdminUser = async (id, payload) => {
  const res = await api.put(`/admin/users/${id}`, payload);
  return res.data;
};

export const deleteAdminUser = async (id) => {
  const res = await api.delete(`/admin/users/${id}`);
  return res.data;
};

// ==========================
// Questions
// ==========================
export const getQuestions = async (opts = {}) => {
  const params = Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const res = await api.get("/questions", { params });
  return res.data;
};

export const getQuestionById = async (id) => {
  const res = await api.get(`/questions/${id}`);
  return res.data;
};

/**
 * Tạo câu hỏi trắc nghiệm 4 đáp án.
 * - Nếu có `imageFile` (File/Blob): gửi multipart, ảnh lưu ở backend/questions-images.
 * - Nếu có `question_image_path` (chuỗi path/URL, không file): gửi kèm trong form.
 * - Ngược lại: JSON như cũ (tương thích script / không ảnh).
 */
export const createQuestion = async (payload) => {
  const { imageFile, question_image_path, ...rest } = payload;

  if (imageFile instanceof Blob || (question_image_path != null && String(question_image_path).trim() !== "")) {
    const fd = new FormData();
    fd.append("grade_id", String(rest.grade_id));
    fd.append("type_id", String(rest.type_id));
    fd.append("lesson_id", String(rest.lesson_id));
    fd.append("question_text", rest.question_text ?? "");
    fd.append("answers", JSON.stringify(rest.answers ?? []));
    fd.append("correct_index", String(rest.correct_index ?? 0));
    if (imageFile instanceof Blob) {
      const name =
        imageFile instanceof File && imageFile.name
          ? imageFile.name
          : "question.png";
      fd.append("question_image", imageFile, name);
    } else if (question_image_path != null && String(question_image_path).trim() !== "") {
      fd.append("question_image_path", String(question_image_path).trim());
    }

    const headers = {};
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/questions`, {
      method: "POST",
      headers,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || res.statusText || "Lỗi tạo câu hỏi");
      err.response = { data, status: res.status };
      throw err;
    }
    return data;
  }

  const res = await api.post("/questions", rest);
  return res.data;
};

/**
 * Cập nhật câu hỏi — cùng payload / multipart như createQuestion.
 */
export const updateQuestion = async (id, payload) => {
  const { imageFile, question_image_path, clear_question_image, ...rest } = payload;
  const qid = Number(id);
  if (!qid) throw new Error("id không hợp lệ");

  if (imageFile instanceof Blob || (question_image_path != null && String(question_image_path).trim() !== "")) {
    const fd = new FormData();
    fd.append("grade_id", String(rest.grade_id));
    fd.append("type_id", String(rest.type_id));
    fd.append("lesson_id", String(rest.lesson_id));
    fd.append("question_text", rest.question_text ?? "");
    fd.append("answers", JSON.stringify(rest.answers ?? []));
    fd.append("correct_index", String(rest.correct_index ?? 0));
    if (imageFile instanceof Blob) {
      const name =
        imageFile instanceof File && imageFile.name
          ? imageFile.name
          : "question.png";
      fd.append("question_image", imageFile, name);
    } else if (question_image_path != null && String(question_image_path).trim() !== "") {
      fd.append("question_image_path", String(question_image_path).trim());
    }

    const headers = {};
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/questions/${qid}`, {
      method: "PUT",
      headers,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || res.statusText || "Lỗi cập nhật câu hỏi");
      err.response = { data, status: res.status };
      throw err;
    }
    return data;
  }

  const res = await api.put(`/questions/${qid}`, {
    ...rest,
    ...(clear_question_image ? { clear_question_image: true } : {}),
  });
  return res.data;
};

// ==========================
// Score
// ==========================
export const incrementScore = async ({ userId, delta }) => {
  const res = await api.post("/score/increment", { userId, delta });
  return res.data;
};

// ==========================
// External login child (Kilovia)
// ==========================
export const externalLoginChild = async ({ maTreEm, fullname, school }) => {
  const res = await api.post("/external-login-child", {
    maTreEm,
    fullname,
    school,
  });
  return res.data;
};


// ==========================
// Music
// ==========================
export const getMusicList = async () => {
  const res = await api.get('/music');
  return res.data;
};

export const getMusicById = async (id) => {
  const res = await api.get(`/music/${id}`);
  return res.data;
};


export default api;
