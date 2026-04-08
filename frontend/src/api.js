// src/api.js
import axios from "axios";

// Base URL đã có prefix /api
const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5050/api";

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

// ==========================
// Auth
// ==========================
export const register = async ({ username, password, fullname }) => {
  return api.post("/register", { username, password, fullname });
};

export const login = async ({ username, password }) => {
  return api.post("/login", { username, password });
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

/** @deprecated dùng getLessons */
export const getOperations = getLessons;

// ==========================
// Questions
// ==========================
export const getQuestions = async ({ grade_id, type_id, lesson_id, limit, offset, random }) => {
  const params = { grade_id, type_id, lesson_id, limit, offset, random };
  const res = await api.get("/questions", { params });
  return res.data;
};

export const getQuestionById = async (id) => {
  const res = await api.get(`/questions/${id}`);
  return res.data;
};

/** Tạo câu hỏi trắc nghiệm 4 đáp án (text) */
export const createQuestion = async (payload) => {
  const res = await api.post("/questions", payload);
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
