export const ADMIN_QUESTIONS_FILTER_KEY = "admin_questions_filter_v1";

function normalizeId(value) {
  if (value == null || value === "") return "";
  return String(value);
}

function normalizePage(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/**
 * @param {{
 *   gradeId?: string|number,
 *   typeId?: string|number,
 *   lessonId?: string|number,
 *   searchTerm?: string,
 *   page?: number,
 *   isFilterOpen?: boolean,
 * }} filters
 */
export function persistAdminQuestionsFilter(filters) {
  if (!filters || typeof filters !== "object") return;
  try {
    sessionStorage.setItem(
      ADMIN_QUESTIONS_FILTER_KEY,
      JSON.stringify({
        gradeId: normalizeId(filters.gradeId),
        typeId: normalizeId(filters.typeId),
        lessonId: normalizeId(filters.lessonId),
        searchTerm: String(filters.searchTerm ?? ""),
        page: normalizePage(filters.page),
        isFilterOpen: Boolean(filters.isFilterOpen),
        ts: Date.now(),
      })
    );
  } catch (e) {
    console.warn("Không lưu được bộ lọc câu hỏi admin:", e);
  }
}

export function readAdminQuestionsFilter() {
  try {
    const raw = sessionStorage.getItem(ADMIN_QUESTIONS_FILTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      gradeId: normalizeId(parsed.gradeId),
      typeId: normalizeId(parsed.typeId),
      lessonId: normalizeId(parsed.lessonId),
      searchTerm: String(parsed.searchTerm ?? ""),
      page: normalizePage(parsed.page),
      isFilterOpen: Boolean(parsed.isFilterOpen),
    };
  } catch (e) {
    console.warn("Lỗi đọc bộ lọc câu hỏi admin:", e);
    return null;
  }
}
