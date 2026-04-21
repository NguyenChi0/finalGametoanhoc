import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getGrades,
  getTypes,
  getLessons,
  getQuestions,
  getHierarchyLabels,
} from "../../api";

/** Số câu hỏi tối đa mỗi trang (đồng bộ với API limit). */
const QUESTIONS_PAGE_SIZE = 10;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    const fn = () => setMatches(m.matches);
    fn();
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, [query]);
  return matches;
}

function pickNameFromRowOrMap(apiName, fkId, idToName) {
  const fromApi = apiName != null && String(apiName).trim() !== "" ? String(apiName).trim() : "";
  if (fromApi) return fromApi;
  if (fkId == null || fkId === "") return "";
  const n = idToName?.get(Number(fkId));
  return n != null && String(n).trim() !== "" ? String(n).trim() : "";
}

/**
 * Payload từ dòng API → AdminQuestionUpdate (navigate state.draft).
 * `lookup`: map id→tên từ dropdown bộ lọc (bổ sung khi API thiếu tên sau JOIN).
 */
function buildQuestionEditDraft(row, lookup) {
  const parts = row.answers || [];
  const correct = parts.find((a) => a.correct);
  const wrong = parts.filter((a) => !a.correct);
  const fourTexts = [
    correct?.text ?? "",
    wrong[0]?.text ?? "",
    wrong[1]?.text ?? "",
    wrong[2]?.text ?? "",
  ];
  const img = row.question_image ? String(row.question_image).trim() : "";
  const g = pickNameFromRowOrMap(row.grade_name, row.grade_id, lookup?.gradeById);
  const t = pickNameFromRowOrMap(row.type_name, row.type_id, lookup?.typeById);
  const l = pickNameFromRowOrMap(row.lesson_name, row.lesson_id, lookup?.lessonById);
  const chain = [g, t, l].filter(Boolean);
  const pathFromApi =
    row.hierarchy_path != null && String(row.hierarchy_path).trim() !== ""
      ? String(row.hierarchy_path).trim()
      : "";
  return {
    id: row.id,
    grade_id: row.grade_id != null && row.grade_id !== "" ? Number(row.grade_id) : null,
    type_id: row.type_id != null && row.type_id !== "" ? Number(row.type_id) : null,
    lesson_id: row.lesson_id != null && row.lesson_id !== "" ? Number(row.lesson_id) : null,
    gradeLabel: g,
    subjectLabel: t,
    lessonLabel: l,
    gradeLine: pathFromApi || (chain.length ? chain.join(" > ") : ""),
    topicLine: "",
    typeLabel: t || "Trắc nghiệm",
    questionText: row.question_text || "",
    answers: fourTexts,
    correctIndex: 0,
    questionImage: img,
    questionImagePreview: img,
  };
}

function formatAnswerLabel(row) {
  const t = row.answers?.find((a) => a.correct)?.text;
  return t ? `A. ${t}` : "—";
}

/** Chuẩn hóa phản hồi GET /questions (một số proxy/client có thể khác shape). */
function listFromQuestionsApiResponse(res) {
  if (res == null) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.items)) return res.items;
  return [];
}

function totalFromQuestionsApiResponse(res, listLength) {
  if (res == null) return listLength;
  if (typeof res.total === "number") return res.total;
  if (typeof res.count === "number") return res.count;
  return listLength;
}

/** Khối > Chủ đề > Bài — ưu tiên `hierarchy_path` từ API (JOIN DB), sau đó map hierarchy-labels. */
function formatHierarchyLine(row, lookup) {
  const path = row.hierarchy_path != null && String(row.hierarchy_path).trim() !== "";
  if (path) return String(row.hierarchy_path).trim();
  const g = pickNameFromRowOrMap(row.grade_name, row.grade_id, lookup.gradeById);
  const t = pickNameFromRowOrMap(row.type_name, row.type_id, lookup.typeById);
  const l = pickNameFromRowOrMap(row.lesson_name, row.lesson_id, lookup.lessonById);
  const parts = [g, t, l].filter(Boolean);
  return parts.length ? parts.join(" > ") : "—";
}

export default function AdminQuestions() {
  const navigate = useNavigate();
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [grades, setGrades] = useState([]);
  const [types, setTypes] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [gradeId, setGradeId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [totalDb, setTotalDb] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  /** Đồng bộ API sau debounce — tránh gọi server mỗi ký tự. */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [allTypes, setAllTypes] = useState([]);
  const [allLessons, setAllLessons] = useState([]);

  const loadGrades = useCallback(async () => {
    setLoadingFilters(true);
    setError(null);
    try {
      const data = await getGrades();
      setGrades(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Không tải được danh sách khối lớp.");
      setGrades([]);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getHierarchyLabels();
        if (cancelled || !data) return;
        setAllTypes(Array.isArray(data.types) ? data.types : []);
        setAllLessons(Array.isArray(data.lessons) ? data.lessons : []);
      } catch {
        if (!cancelled) {
          setAllTypes([]);
          setAllLessons([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gradeId) {
      setTypes([]);
      setTypeId("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingFilters(true);
      try {
        const data = await getTypes(Number(gradeId));
        if (!cancelled) setTypes(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setTypes([]);
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeId]);

  useEffect(() => {
    if (!typeId) {
      setLessons([]);
      setLessonId("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingFilters(true);
      try {
        const data = await getLessons(Number(typeId));
        if (!cancelled) setLessons(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setLessons([]);
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [typeId]);

  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [gradeId, typeId, lessonId, debouncedSearch]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * QUESTIONS_PAGE_SIZE;
      const params = { limit: QUESTIONS_PAGE_SIZE, offset };
      if (gradeId) params.grade_id = Number(gradeId);
      if (typeId) params.type_id = Number(typeId);
      if (lessonId) params.lesson_id = Number(lessonId);
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await getQuestions(params);
      const list = listFromQuestionsApiResponse(res);
      setQuestions(Array.isArray(list) ? list : []);
      setTotalDb(totalFromQuestionsApiResponse(res, Array.isArray(list) ? list.length : 0));
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Không tải được danh sách câu hỏi."
      );
      setQuestions([]);
      setTotalDb(0);
    } finally {
      setLoading(false);
    }
  }, [gradeId, typeId, lessonId, debouncedSearch, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const totalPages = Math.max(1, Math.ceil(totalDb / QUESTIONS_PAGE_SIZE) || 1);

  useEffect(() => {
    if (totalDb <= 0) return;
    if (page > totalPages) setPage(totalPages);
  }, [totalDb, totalPages, page]);

  const rangeStart = totalDb === 0 ? 0 : (page - 1) * QUESTIONS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * QUESTIONS_PAGE_SIZE, totalDb);

  const emptyListMessage =
    totalDb === 0
      ? debouncedSearch
        ? "Không có câu hỏi khớp ô tìm kiếm."
        : "Không có câu hỏi nào với bộ lọc hiện tại."
      : "";

  const totalFormatted = totalDb.toLocaleString("vi-VN");

  const gradeById = useMemo(
    () => new Map(grades.map((g) => [Number(g.id), g.name])),
    [grades]
  );
  /** Toàn DB trước, bộ lọc đang chọn ghi đè (luôn đủ tên khi chưa lọc). */
  const typeById = useMemo(() => {
    const m = new Map();
    for (const t of allTypes) m.set(Number(t.id), t.name);
    for (const t of types) m.set(Number(t.id), t.name);
    return m;
  }, [allTypes, types]);
  const lessonById = useMemo(() => {
    const m = new Map();
    for (const l of allLessons) m.set(Number(l.id), l.name);
    for (const l of lessons) m.set(Number(l.id), l.name);
    return m;
  }, [allLessons, lessons]);
  const draftLookup = useMemo(
    () => ({ gradeById, typeById, lessonById }),
    [gradeById, typeById, lessonById]
  );

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Quản lý câu hỏi</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Quản lý câu hỏi</h1>
          <p style={styles.lead}>
            Chào mừng bạn đến với trang quản lý câu hỏi.
          </p>
        </div>
        <Link to="new" style={styles.btnPrimary}>
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo câu hỏi mới
        </Link>
      </header>

      {error && (
        <div style={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <section style={styles.statCard} aria-label="Thống kê">
        <div style={styles.statIconWrap}>
          <DocumentIcon />
        </div>
        <div>
          <p style={styles.statLabel}>Tổng số câu hỏi</p>
          <p style={styles.statNumber}>{totalFormatted}</p>
        </div>
      </section>

      <div
        style={{ ...styles.filterBar, cursor: "pointer" }}
        role="button"
        tabIndex={0}
        aria-expanded={isFilterOpen}
        onClick={() => setIsFilterOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setIsFilterOpen((value) => !value);
          }
        }}
      >
        <div style={styles.filterBarLeft}>
          <span style={styles.filterIcon} aria-hidden>
            <FilterIcon />
          </span>
          <span style={styles.filterTitle}>Bộ lọc tìm kiếm</span>
        </div>
        <span
          style={{
            ...styles.chevron,
            transform: isFilterOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
          aria-hidden
        >
          <ChevronDownIcon />
        </span>
      </div>

      {isFilterOpen && (
        <section style={styles.filterPanel}>
          <div style={styles.filterPanelHeading}>Lọc theo phân cấp</div>
          <div style={styles.filterGrid}>
            <label style={styles.filterField}>
              <span style={styles.filterFieldLabel}>Tìm kiếm</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo nội dung hoặc ID"
                style={styles.filterInput}
              />
            </label>

            <label style={styles.filterField}>
              <span style={styles.filterFieldLabel}>Khối lớp</span>
              <select
                value={gradeId}
                onChange={(event) => {
                  setGradeId(event.target.value);
                  setTypeId("");
                  setLessonId("");
                }}
                style={styles.filterSelect}
              >
                <option value="">Tất cả lớp</option>
                {grades.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              <span style={styles.filterFieldLabel}>Chủ đề</span>
              <select
                value={typeId}
                onChange={(event) => {
                  setTypeId(event.target.value);
                  setLessonId("");
                }}
                style={styles.filterSelect}
                disabled={!gradeId}
              >
                <option value="">{gradeId ? "Tất cả chủ đề" : "Chọn khối trước"}</option>
                {types.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              <span style={styles.filterFieldLabel}>Bài học</span>
              <select
                value={lessonId}
                onChange={(event) => setLessonId(event.target.value)}
                style={styles.filterSelect}
                disabled={!typeId}
              >
                <option value="">{typeId ? "Tất cả bài học" : "Chọn chủ đề trước"}</option>
                {lessons.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      {loading ? (
        <div style={styles.loadingBox}>Đang tải danh sách câu hỏi…</div>
      ) : isNarrow ? (
        <div style={styles.cardList}>
          {questions.length > 0 ? (
            questions.map((row) => (
              <article key={row.id} style={styles.questionCard}>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>ID</span>
                  <span style={styles.cardValue}>{row.id}</span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Phân cấp</span>
                  <div style={styles.hierarchyInCard}>
                    <span style={styles.hierarchyMain}>{formatHierarchyLine(row, draftLookup)}</span>
                  </div>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Nội dung câu hỏi</span>
                  <span style={{ ...styles.cardValue, ...styles.cardValueMultiline }}>
                    {row.question_text}
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Đáp án đúng</span>
                  <span style={{ ...styles.cardValue, fontWeight: 600 }}>
                    {formatAnswerLabel(row)}
                  </span>
                </div>
                <div style={styles.cardActions}>
                  <button
                    type="button"
                    style={styles.actionBtn}
                    title="Chỉnh sửa câu hỏi"
                    onClick={() =>
                      navigate("/admin/questions/edit", {
                        state: { draft: buildQuestionEditDraft(row, draftLookup) },
                      })
                    }
                  >
                    <PencilIcon />
                  </button>
                  <span style={{ ...styles.actionBtn, ...styles.actionBtnDanger }} title="Xóa">
                    <TrashIcon />
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div style={styles.cardEmpty}>{emptyListMessage}</div>
          )}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 72 }}>ID</th>
                <th style={{ ...styles.th, width: "26%", minWidth: 200 }}>Phân cấp</th>
                <th style={styles.th}>Nội dung câu hỏi</th>
                <th style={{ ...styles.th, width: 100 }}>Đáp án đúng</th>
                <th style={{ ...styles.th, width: 120, textAlign: "right" }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {questions.length > 0 ? (
                questions.map((row) => (
                  <tr key={row.id}>
                    <td style={styles.td}>{row.id}</td>
                    <td style={{ ...styles.td, ...styles.tdHierarchy }}>
                      <div style={styles.hierarchy}>
                        <span style={styles.hierarchyMain}>{formatHierarchyLine(row, draftLookup)}</span>
                      </div>
                    </td>
                    <td style={{ ...styles.td, ...styles.tdContent }}>{row.question_text}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{formatAnswerLabel(row)}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <div style={styles.actionGroup}>
                        <button
                          type="button"
                          style={styles.actionBtn}
                          title="Chỉnh sửa câu hỏi"
                          onClick={() =>
                            navigate("/admin/questions/edit", {
                              state: { draft: buildQuestionEditDraft(row, draftLookup) },
                            })
                          }
                        >
                          <PencilIcon />
                        </button>
                        <span style={{ ...styles.actionBtn, ...styles.actionBtnDanger }} title="Xóa">
                          <TrashIcon />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={styles.emptyState} colSpan={5}>
                    {emptyListMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (
        <nav style={styles.paginationBar} aria-label="Phân trang danh sách câu hỏi">
          <p style={styles.paginationMeta}>
            {totalDb === 0
              ? "Không có câu hỏi để hiển thị."
              : `Hiển thị ${rangeStart.toLocaleString("vi-VN")}–${rangeEnd.toLocaleString("vi-VN")} / ${totalDb.toLocaleString("vi-VN")} câu`}
          </p>
          <div style={styles.paginationControls}>
            <button
              type="button"
              style={{
                ...styles.paginationBtn,
                ...(page <= 1 ? styles.paginationBtnDisabled : {}),
              }}
              disabled={page <= 1 || totalDb === 0}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trang trước
            </button>
            <span style={styles.paginationPage}>
              Trang {totalDb === 0 ? 0 : page} / {totalDb === 0 ? 0 : totalPages}
            </span>
            <button
              type="button"
              style={{
                ...styles.paginationBtn,
                ...(page >= totalPages || totalDb === 0 ? styles.paginationBtnDisabled : {}),
              }}
              disabled={page >= totalPages || totalDb === 0}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
// Icons
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d5a76" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d5a76" strokeWidth="2">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#57606a" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#57606a" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4 11.5-11.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cf222e" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

// Styles
const styles = {
  root: {
    width: "100%",
    minWidth: 0,
    color: "#24292f",
  },
  breadcrumb: {
    fontSize: "0.875rem",
    color: "#57606a",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  crumbLink: {
    color: "#2d5a76",
    textDecoration: "none",
  },
  crumbSep: {
    color: "#d0d7de",
    userSelect: "none",
  },
  crumbCurrent: {
    color: "#24292f",
    fontWeight: 500,
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1f2328",
    letterSpacing: "-0.02em",
  },
  lead: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#57606a",
    lineHeight: 1.5,
    fontFamily: "inherit",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 1px 2px rgba(31,35,40,0.08)",
  },
  btnIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 20px",
    marginBottom: 16,
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    background: "#ddf4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statLabel: {
    margin: "0 0 4px",
    fontSize: "0.9rem",
    color: "#57606a",
    fontWeight: 500,
  },
  statNumber: {
    margin: 0,
    fontSize: "1.65rem",
    fontWeight: 700,
    color: "#1f2328",
    letterSpacing: "-0.02em",
  },
  statHint: {
    margin: "8px 0 0",
    fontSize: "0.8rem",
    color: "#6e7781",
    lineHeight: 1.45,
    maxWidth: 420,
  },
  errorBanner: {
    padding: "12px 16px",
    marginBottom: 16,
    borderRadius: 8,
    background: "#fff8f5",
    border: "1px solid #f0c4a8",
    color: "#9a3412",
    fontSize: "0.9rem",
  },
  loadingBox: {
    padding: "32px 16px",
    textAlign: "center",
    color: "#57606a",
    fontSize: "0.95rem",
    background: "#ffffff",
    border: "1px solid #d0d7de",
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    marginBottom: 16,
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  filterBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  filterIcon: {
    display: "flex",
    alignItems: "center",
  },
  filterTitle: {
    fontWeight: 600,
    fontSize: "0.95rem",
    color: "#24292f",
  },
  chevron: {
    display: "flex",
    alignItems: "center",
    opacity: 0.85,
  },
  filterPanel: {
    display: "grid",
    gap: 16,
    padding: "16px 20px",
    marginBottom: 16,
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  filterPanelHeading: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#24292f",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  filterFieldLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#57606a",
    fontFamily: "inherit",
  },
  filterSelect: {
    width: "100%",
    height: 44,
    minHeight: 44,
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    lineHeight: "1.4",
    color: "#24292f",
    background: "#fff",
    appearance: "none",
    fontFamily: "inherit",
  },
  filterInput: {
    width: "100%",
    height: 44,
    minHeight: 44,
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    lineHeight: "1.4",
    color: "#24292f",
    background: "#fff",
    fontFamily: "inherit",
  },
  emptyState: {
    padding: "24px 16px",
    textAlign: "center",
    color: "#57606a",
    fontSize: "0.95rem",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  },
  questionCard: {
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
    padding: "16px 14px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  cardField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 14,
    minWidth: 0,
  },
  cardLabel: {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#57606a",
  },
  cardValue: {
    fontSize: "0.9rem",
    color: "#24292f",
    lineHeight: 1.5,
    wordBreak: "break-word",
    overflowWrap: "break-word",
  },
  cardValueMultiline: {
    lineHeight: 1.55,
  },
  hierarchyInCard: {
    minWidth: 0,
    maxWidth: "100%",
  },
  cardActions: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 12,
    marginTop: 4,
    borderTop: "1px solid #eaeef2",
  },
  cardEmpty: {
    padding: "28px 16px",
    textAlign: "center",
    color: "#57606a",
    fontSize: "0.95rem",
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
    minWidth: 960,
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #d0d7de",
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #eaeef2",
    verticalAlign: "top",
    color: "#24292f",
  },
  tdContent: {
    lineHeight: 1.5,
    maxWidth: 360,
  },
  tdHierarchy: {
    verticalAlign: "top",
    minWidth: 180,
    maxWidth: 320,
    wordBreak: "break-word",
    overflowWrap: "break-word",
  },
  hierarchy: {
    maxWidth: "100%",
  },
  hierarchyMain: {
    fontWeight: 600,
    fontSize: "0.85rem",
    color: "#24292f",
    lineHeight: 1.35,
  },
  actionGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },
  actionBtnDanger: {
    background: "#fff8f8",
    borderColor: "#f0c4c8",
  },
  paginationBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 20,
    padding: "14px 16px",
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    borderRadius: 0,
  },
  paginationMeta: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#57606a",
    lineHeight: 1.45,
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  paginationBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.88rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  paginationBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  paginationPage: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#24292f",
    minWidth: 100,
    textAlign: "center",
  },
};