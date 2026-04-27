import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getAdminExamTemplate,
  getAdminTypes,
  getAdminLessons,
  getQuestions,
  updateAdminExamTemplate,
} from "../../api.js";

/**
 * Draft từ Quản lý exams: { id, name, description, grade_id, status, duration_time, selectedQuestionIds }.
 */
export default function AdminExamUpdate() {
  const location = useLocation();
  const navigate = useNavigate();
  const draft = location.state?.draft;

  const [examId, setExamId] = useState(null);
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [examStatus, setExamStatus] = useState(0);
  const [examDurationMinutes, setExamDurationMinutes] = useState("30");
  const [templateGradeId, setTemplateGradeId] = useState(null);
  const [gradeName, setGradeName] = useState("");
  const [types, setTypes] = useState([]);
  const [titleId, setTitleId] = useState("");
  const [lessons, setLessons] = useState([]);
  const [lessonId, setLessonId] = useState("");
  const [search, setSearch] = useState("");
  const [questionPool, setQuestionPool] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionCache, setQuestionCache] = useState({});
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    if (!draft?.id) {
      setExamId(null);
      setExamTitle("");
      setExamDescription("");
      setExamStatus(0);
      setExamDurationMinutes("30");
      setTemplateGradeId(null);
      setGradeName("");
      setSelectedQuestionIds([]);
      setQuestionCache({});
      setInitError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setInitError(null);
      try {
        const t = await getAdminExamTemplate(draft.id);
        if (cancelled) return;
        setExamId(t.id);
        setExamTitle(t.name || "");
        setExamDescription(t.description || "");
        setExamStatus(Number(t.status) === 1 ? 1 : 0);
        setExamDurationMinutes(
          t.duration_time != null && String(t.duration_time).trim() !== ""
            ? String(Number(t.duration_time))
            : "30"
        );
        setTemplateGradeId(Number(t.grade_id));
        setGradeName(t.grade_name || "");
        const ids = (t.questions || []).map((q) => Number(q.id));
        setSelectedQuestionIds(ids);
        const cache = {};
        (t.questions || []).forEach((q) => {
          const qid = Number(q.id);
          cache[qid] = { id: qid, text: q.text, detail: "" };
        });
        setQuestionCache(cache);
      } catch (e) {
        if (!cancelled) {
          setInitError(e?.response?.data?.message || e.message || "Không tải được đề.");
          setExamId(draft.id);
          setExamTitle(draft.name || "");
          setExamDescription(draft.description || "");
          setExamStatus(Number(draft.status) === 1 ? 1 : 0);
          setExamDurationMinutes(
            draft.duration_time != null && String(draft.duration_time).trim() !== ""
              ? String(Number(draft.duration_time))
              : "30"
          );
          setTemplateGradeId(Number(draft.grade_id));
          setGradeName("");
          const ids = Array.isArray(draft.selectedQuestionIds)
            ? draft.selectedQuestionIds.map((x) => Number(x))
            : [];
          setSelectedQuestionIds(ids);
          setQuestionCache({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft?.id, location.key]);

  useEffect(() => {
    if (templateGradeId == null) {
      setTypes([]);
      setTitleId("");
      return;
    }
    (async () => {
      try {
        const list = await getAdminTypes({ grade_id: String(templateGradeId) });
        setTypes(Array.isArray(list) ? list : []);
        setTitleId("");
        setLessonId("");
      } catch {
        setTypes([]);
      }
    })();
  }, [templateGradeId]);

  useEffect(() => {
    if (!titleId) {
      setLessons([]);
      setLessonId("");
      return;
    }
    (async () => {
      try {
        const list = await getAdminLessons({ type_id: titleId });
        setLessons(Array.isArray(list) ? list : []);
        setLessonId("");
      } catch {
        setLessons([]);
      }
    })();
  }, [titleId]);

  useEffect(() => {
    if (templateGradeId == null) {
      setQuestionPool([]);
      return;
    }
    let cancelled = false;
    setQuestionsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await getQuestions({
          grade_id: String(templateGradeId),
          type_id: titleId || undefined,
          lesson_id: lessonId || undefined,
          search: search.trim() || undefined,
          limit: 500,
        });
        if (cancelled) return;
        const raw = Array.isArray(res?.data) ? res.data : [];
        setQuestionPool(
          raw.map((q) => ({
            id: Number(q.id),
            text: q.question_text || "",
            detail:
              q.hierarchy_path ||
              [q.type_name, q.lesson_name].filter(Boolean).join(" · ") ||
              "",
          }))
        );
      } catch {
        if (!cancelled) setQuestionPool([]);
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [templateGradeId, titleId, lessonId, search]);

  const titleOptions = useMemo(() => {
    return [{ id: "", name: "Tất cả chủ đề" }, ...types.map((t) => ({ id: String(t.id), name: t.name }))];
  }, [types]);

  const lessonOptionsForSelect = useMemo(() => {
    return [{ id: "", label: "Tất cả bài học" }, ...lessons.map((l) => ({ id: String(l.id), label: l.name }))];
  }, [lessons]);

  const filteredQuestions = questionPool;

  const selectedQuestions = selectedQuestionIds.map((id) => {
    const fromPool = questionPool.find((q) => q.id === id);
    if (fromPool) return fromPool;
    return questionCache[id] || { id, text: `Câu #${id}`, detail: "" };
  });

  const toggleQuestion = (questionId) => {
    const q = questionPool.find((x) => x.id === questionId);
    if (q) setQuestionCache((c) => ({ ...c, [questionId]: q }));
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (!filteredQuestions.length) return;
    setQuestionCache((prev) => {
      const next = { ...prev };
      filteredQuestions.forEach((q) => {
        next[q.id] = q;
      });
      return next;
    });
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      filteredQuestions.forEach((q) => next.add(q.id));
      return Array.from(next);
    });
  };

  const handleClearAllSelected = () => {
    setSelectedQuestionIds([]);
  };

  const handleSaveExam = async () => {
    if (!draft?.id) return;
    if (!examTitle.trim()) return;
    const duration = Number(String(examDurationMinutes).trim());
    if (!Number.isInteger(duration) || duration < 1 || duration > 9999) {
      setInitError("Thời gian làm bài phải là số phút từ 1 đến 9999.");
      return;
    }
    if (selectedQuestionIds.length === 0) return;
    setSaving(true);
    try {
      await updateAdminExamTemplate(draft.id, {
        name: examTitle.trim(),
        description: examDescription.trim(),
        status: Number(examStatus) === 1 ? 1 : 0,
        duration_time: duration,
        question_ids: selectedQuestionIds,
      });
      navigate("/admin/exams", { replace: true });
    } catch (e) {
      setInitError(e?.response?.data?.message || e.message || "Không lưu được đề.");
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <div style={styles.root}>
        <nav style={styles.breadcrumb} aria-label="Breadcrumb">
          <Link to="/admin" style={styles.crumbLink}>
            Tổng quan
          </Link>
          <span style={styles.crumbSep}>›</span>
          <Link to="/admin/exams" style={styles.crumbLink}>
            Quản lý exams
          </Link>
          <span style={styles.crumbSep}>›</span>
          <span style={styles.crumbCurrent}>Cập nhật exam</span>
        </nav>
        <div style={styles.emptyWrap}>
          <p style={styles.emptyTitle}>Chưa có dữ liệu đề</p>
          <p style={styles.muted}>
            Mở từ <strong>Quản lý exams</strong> → nút chỉnh sửa (bút) trên một dòng đề. F5 hoặc vào URL trực
            tiếp sẽ mất <code style={styles.code}>location.state</code>.
          </p>
          <Link to="/admin/exams" style={styles.btnGhost}>
            ← Quay lại quản lý exams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <Link to="/admin/exams" style={styles.crumbLink}>
          Quản lý exams
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Cập nhật exam</span>
      </nav>

      <header style={styles.headerRow}>
        <div style={styles.headerText}>
          <h1 style={styles.title}>Cập nhật exam #{examId}</h1>
          <p style={styles.lead}>
            Chào mừng bạn đến với trang cập nhật đề thi.
          </p>
        </div>
      </header>

      {initError && (
        <div style={styles.errorBanner} role="alert">
          {initError}
        </div>
      )}

      <section style={styles.examInfo}>
        <div style={styles.fieldGroup}>
          <label htmlFor="exam-title" style={styles.label}>
            Tiêu đề exam
          </label>
          <input
            id="exam-title"
            type="text"
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            placeholder="Nhập tiêu đề exam"
            style={styles.input}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label htmlFor="exam-description" style={styles.label}>
            Mô tả exam
          </label>
          <textarea
            id="exam-description"
            value={examDescription}
            onChange={(e) => setExamDescription(e.target.value)}
            placeholder="Mô tả ngắn gọn exam"
            style={styles.textarea}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label htmlFor="exam-duration" style={styles.label}>
            Thời gian làm bài (phút)
          </label>
          <input
            id="exam-duration"
            type="number"
            min={1}
            max={9999}
            step={1}
            value={examDurationMinutes}
            onChange={(e) => setExamDurationMinutes(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label htmlFor="exam-status" style={styles.label}>
            Trạng thái hiển thị
          </label>
          <select
            id="exam-status"
            value={String(examStatus)}
            onChange={(e) => setExamStatus(Number(e.target.value))}
            style={styles.select}
          >
            <option value="0">Không công khai</option>
            <option value="1">Công khai</option>
          </select>
        </div>
      </section>

      <section style={styles.filterSection}>
        <div style={styles.filterHeader}>
          <h2 style={styles.sectionTitle}>Bộ lọc câu hỏi</h2>
          <p style={styles.sectionSubtitle}>
            Lọc câu hỏi theo chủ đề / bài học (cùng khối với đề). Dùng tìm kiếm để thu hẹp danh sách.
          </p>
        </div>

        <div style={styles.filterRow}>
          <div style={styles.filterField}>
            <span style={styles.filterLabel}>Khối của đề</span>
            <div style={styles.lockedGrade}>
              {gradeName || (templateGradeId != null ? `Lớp (ID ${templateGradeId})` : "—")}
            </div>
          </div>

          <div style={styles.filterField}>
            <label htmlFor="title-filter" style={styles.filterLabel}>
              Chủ đề
            </label>
            <select
              id="title-filter"
              value={titleId}
              onChange={(e) => setTitleId(e.target.value)}
              style={styles.select}
            >
              {titleOptions.map((title) => (
                <option key={title.id || "all-topics"} value={title.id}>
                  {title.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label htmlFor="lesson-filter" style={styles.filterLabel}>
              Bài học
            </label>
            <select
              id="lesson-filter"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              style={styles.select}
              disabled={!titleId}
            >
              {lessonOptionsForSelect.map((lesson) => (
                <option key={lesson.id || "all-lessons"} value={lesson.id}>
                  {lesson.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label htmlFor="question-search" style={styles.filterLabel}>
              Tìm câu hỏi
            </label>
            <input
              id="question-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.gridLayout}>
          <div style={styles.questionPanel}>
            <div style={styles.panelHeader}>
              <div style={styles.panelHeaderLeft}>
                <h3 style={styles.panelTitle}>Danh sách câu hỏi</h3>
                <button
                  type="button"
                  style={{
                    ...styles.panelActionText,
                    ...(questionsLoading || filteredQuestions.length === 0
                      ? styles.panelActionTextDisabled
                      : {}),
                  }}
                  disabled={questionsLoading || filteredQuestions.length === 0}
                  onClick={handleSelectAllFiltered}
                >
                  Chọn tất cả
                </button>
              </div>
              <span style={styles.panelMeta}>
                {questionsLoading ? "Đang tải…" : `${filteredQuestions.length} câu hỏi`}
              </span>
            </div>
            <div style={styles.panelScroll}>
              {questionsLoading ? (
                <div style={styles.emptyState}>Đang tải danh sách câu hỏi…</div>
              ) : filteredQuestions.length === 0 ? (
                <div style={styles.emptyState}>Không tìm thấy câu hỏi phù hợp với bộ lọc.</div>
              ) : (
                filteredQuestions.map((question) => (
                  <div key={question.id} style={styles.questionCard}>
                    <div style={styles.cardBody}>
                      <p style={styles.questionText}>{question.text}</p>
                      <p style={styles.questionDetail}>{question.detail}</p>
                    </div>
                    <button
                      type="button"
                      style={styles.cardActionBtn}
                      onClick={() => toggleQuestion(question.id)}
                    >
                      {selectedQuestionIds.includes(question.id) ? "−" : "+"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside style={styles.summaryPanel}>
            <div style={styles.panelHeader}>
              <div style={styles.panelHeaderLeft}>
                <h3 style={styles.panelTitle}>Câu hỏi đã chọn</h3>
                <button
                  type="button"
                  style={{
                    ...styles.panelActionText,
                    ...(selectedQuestionIds.length === 0 ? styles.panelActionTextDisabled : {}),
                  }}
                  disabled={selectedQuestionIds.length === 0}
                  onClick={handleClearAllSelected}
                >
                  Xóa tất cả
                </button>
              </div>
              <span style={styles.panelMeta}>{selectedQuestionIds.length} mục</span>
            </div>
            <div style={styles.panelScroll}>
              {selectedQuestions.length === 0 ? (
                <div style={styles.emptyState}>Chưa có câu hỏi nào được thêm.</div>
              ) : (
                selectedQuestions.map((question) => (
                  <div key={question.id} style={styles.questionCard}>
                    <div style={styles.cardBody}>
                      <p style={styles.questionText}>{question.text}</p>
                      <p style={styles.questionDetail}>{question.detail}</p>
                    </div>
                    <button
                      type="button"
                      style={styles.cardActionBtn}
                      onClick={() => toggleQuestion(question.id)}
                      aria-label="Gỡ khỏi danh sách"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>

      <footer style={styles.pageFooter}>
        <button
          type="button"
          style={{
            ...styles.btnSaveFooter,
            ...(saving || !examTitle.trim() || selectedQuestionIds.length === 0
              ? { opacity: 0.55, pointerEvents: saving ? "none" : "auto" }
              : {}),
          }}
          disabled={saving || !examTitle.trim() || selectedQuestionIds.length === 0}
          onClick={handleSaveExam}
        >
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
        <Link to="/admin/exams" style={styles.btnCancelFooter}>
          Hủy và quay về trang quản lý exams
        </Link>
      </footer>
    </div>
  );
}

const styles = {
  root: {
    width: "100%",
    minWidth: 0,
    color: "#1f2328",
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
    justifyContent: "flex-start",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
    minWidth: 0,
  },
  headerText: {
    minWidth: 0,
    flex: "1 1 auto",
    maxWidth: "100%",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1f2328",
    letterSpacing: "-0.02em",
    overflowWrap: "anywhere",
  },
  lead: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#57606a",
    lineHeight: 1.5,
    maxWidth: 640,
    overflowWrap: "anywhere",
  },
  emptyWrap: {
    padding: "32px 24px",
    background: "#fff",
    border: "1px solid #d0d7de",
    maxWidth: 520,
  },
  emptyTitle: {
    margin: "0 0 8px",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  code: {
    fontSize: "0.85em",
    background: "#f6f8fa",
    padding: "2px 6px",
    borderRadius: 4,
  },
  btnGhost: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.9rem",
    textDecoration: "none",
  },
  muted: {
    margin: "0 0 16px",
    fontSize: "0.9rem",
    color: "#57606a",
    lineHeight: 1.5,
  },
  examInfo: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 20,
    marginBottom: 24,
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  fieldGroup: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    maxWidth: "100%",
  },
  label: {
    color: "#24292f",
    fontWeight: 600,
  },
  input: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    color: "#24292f",
    outline: "none",
    overflowWrap: "anywhere",
  },
  textarea: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    minHeight: 120,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    color: "#24292f",
    outline: "none",
    resize: "vertical",
    overflowWrap: "anywhere",
    overflow: "auto",
  },
  filterSection: {
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 16,
    padding: 24,
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  filterHeader: {
    marginBottom: 20,
    minWidth: 0,
  },
  sectionTitle: {
    margin: "0 0 4px",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  sectionSubtitle: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#57606a",
    lineHeight: 1.5,
  },
  filterRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 20,
    minWidth: 0,
  },
  filterField: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    fontFamily: "inherit",
  },
  filterLabel: {
    fontSize: "0.9rem",
    color: "#24292f",
    fontWeight: 600,
    fontFamily: "inherit",
  },
  select: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
  },
  searchInput: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "12px 14px",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    color: "#24292f",
    outline: "none",
  },
  gridLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
    alignItems: "stretch",
  },
  questionPanel: {
    boxSizing: "border-box",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    gap: 0,
    height: 520,
    minHeight: 520,
    maxHeight: 520,
    padding: "0 16px 16px",
    borderRadius: 14,
    border: "1px solid #d0d7de",
    background: "#fff",
    overflow: "hidden",
  },
  summaryPanel: {
    boxSizing: "border-box",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    gap: 0,
    height: 520,
    minHeight: 520,
    maxHeight: 520,
    padding: "0 16px 16px",
    borderRadius: 14,
    border: "1px solid #d0d7de",
    background: "#fff",
    overflow: "hidden",
  },
  panelHeader: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 52,
    flexWrap: "wrap",
    padding: "10px 0 10px",
    flexShrink: 0,
    borderBottom: "1px solid #eaeef2",
  },
  panelHeaderLeft: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    minWidth: 0,
  },
  panelScroll: {
    boxSizing: "border-box",
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    paddingTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  panelTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    lineHeight: 1.25,
  },
  panelMeta: {
    color: "#57606a",
    fontSize: "0.9rem",
    lineHeight: 1.25,
    whiteSpace: "normal",
  },
  panelActionText: {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    fontFamily: "inherit",
    fontSize: "0.9rem",
    fontWeight: 400,
    color: "#2d5a76",
    textDecoration: "underline",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  panelActionTextDisabled: {
    color: "#8c959f",
    cursor: "not-allowed",
  },
  questionCard: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
    minHeight: 108,
    height: "auto",
    padding: "12px 14px",
    borderRadius: 12,
    background: "#f6f8fa",
    border: "1px solid #e1e4e8",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    overflow: "hidden",
  },
  questionText: {
    margin: 0,
    fontSize: "0.93rem",
    fontWeight: 700,
    color: "#1f2328",
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  questionDetail: {
    margin: "4px 0 0",
    fontSize: "0.88rem",
    color: "#57606a",
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardActionBtn: {
    flexShrink: 0,
    alignSelf: "center",
    width: 44,
    height: 44,
    borderRadius: 12,
    border: "1px solid #2d5a76",
    background: "#ffffff",
    color: "#2d5a76",
    fontSize: "1.15rem",
    cursor: "pointer",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    fontFamily: "inherit",
  },
  pageFooter: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid #eaeef2",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    width: "100%",
  },
  btnSaveFooter: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    width: "100%",
    maxWidth: "100%",
    fontFamily: "inherit",
    textAlign: "center",
  },
  btnCancelFooter: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "100%",
    padding: "12px 20px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.95rem",
    textDecoration: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    overflowWrap: "anywhere",
    textAlign: "center",
  },
  emptyState: {
    padding: 22,
    borderRadius: 14,
    background: "#f6f8fa",
    color: "#57606a",
    textAlign: "center",
  },
  errorBanner: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 10,
    background: "#fff8f8",
    border: "1px solid #ff818266",
    color: "#a40e26",
    fontSize: "0.9rem",
    lineHeight: 1.45,
  },
  inlineCode: {
    fontSize: "0.88em",
    background: "#f6f8fa",
    padding: "1px 6px",
    borderRadius: 4,
  },
  lockedGrade: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    fontSize: "0.95rem",
    color: "#24292f",
    fontWeight: 600,
  },
};
