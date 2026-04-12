import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getGrades, getTypes, getLessons, updateQuestion } from "../../api";

const initialAnswers = ["", "", "", ""];

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

/**
 * Nhận draft từ Quản lý câu hỏi: navigate(..., { state: { draft } }) — phân cấp + nội dung câu.
 */
export default function AdminQuestionUpdate() {
  const location = useLocation();
  const navigate = useNavigate();
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const draft = location.state?.draft;

  const [questionId, setQuestionId] = useState(() => draft?.id ?? null);

  const [grades, setGrades] = useState([]);
  const [types, setTypes] = useState([]);
  const [lessons, setLessons] = useState([]);
  /** Lazy init từ draft để effect phân cấp lần đầu không xóa type/lesson (thứ tự effect). */
  const [gradeId, setGradeId] = useState(() =>
    draft?.grade_id != null && draft.grade_id !== "" ? String(draft.grade_id) : ""
  );
  const [typeId, setTypeId] = useState(() =>
    draft?.type_id != null && draft.type_id !== "" ? String(draft.type_id) : ""
  );
  const [lessonId, setLessonId] = useState(() =>
    draft?.lesson_id != null && draft.lesson_id !== "" ? String(draft.lesson_id) : ""
  );

  const [questionText, setQuestionText] = useState("");
  const [questionImage, setQuestionImage] = useState("");
  const [questionImagePreview, setQuestionImagePreview] = useState("");
  const [questionImageFile, setQuestionImageFile] = useState(null);
  /** Người dùng xóa ảnh (để gửi clear_question_image khi lưu). */
  const [imageCleared, setImageCleared] = useState(false);
  const [answers, setAnswers] = useState(initialAnswers);
  const [correctIndex, setCorrectIndex] = useState(0);

  const [loadingGrades, setLoadingGrades] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadGrades = useCallback(async () => {
    setLoadingGrades(true);
    setError(null);
    try {
      const data = await getGrades();
      setGrades(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Không tải được danh sách khối lớp.");
      setGrades([]);
    } finally {
      setLoadingGrades(false);
    }
  }, []);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    setError(null);
    if (!draft) {
      setQuestionId(null);
      setGradeId("");
      setTypeId("");
      setLessonId("");
      setTypes([]);
      setLessons([]);
      setQuestionText("");
      setQuestionImage("");
      setQuestionImagePreview("");
      setQuestionImageFile(null);
      setImageCleared(false);
      setAnswers(initialAnswers);
      setCorrectIndex(0);
      return;
    }
    setQuestionId(draft.id);
    setGradeId(draft.grade_id != null && draft.grade_id !== "" ? String(draft.grade_id) : "");
    setTypeId(draft.type_id != null && draft.type_id !== "" ? String(draft.type_id) : "");
    setLessonId(draft.lesson_id != null && draft.lesson_id !== "" ? String(draft.lesson_id) : "");
    setQuestionText(draft.questionText || "");
    const img = draft.questionImage ? String(draft.questionImage).trim() : "";
    setQuestionImage(img);
    setQuestionImagePreview(draft.questionImagePreview != null ? String(draft.questionImagePreview).trim() : img);
    setQuestionImageFile(null);
    setImageCleared(false);
    setAnswers(
      Array.isArray(draft.answers) && draft.answers.length === 4
        ? [...draft.answers]
        : initialAnswers
    );
    setCorrectIndex(
      typeof draft.correctIndex === "number" && draft.correctIndex >= 0 && draft.correctIndex < 4
        ? draft.correctIndex
        : 0
    );
  }, [draft, location.key]);

  useEffect(() => {
    if (!gradeId) {
      setTypes([]);
      setTypeId("");
      setLessons([]);
      setLessonId("");
      return;
    }
    const gid = Number(gradeId);
    let cancelled = false;
    (async () => {
      setLoadingTypes(true);
      setError(null);
      try {
        const raw = await getTypes(gid);
        if (cancelled) return;
        const list = Array.isArray(raw) ? raw : [];
        setTypes(list);
        setTypeId((prev) =>
          prev && list.some((x) => String(x.id) === String(prev)) ? prev : ""
        );
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Không tải được chủ đề.");
          setTypes([]);
        }
      } finally {
        if (!cancelled) setLoadingTypes(false);
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
    const tid = Number(typeId);
    let cancelled = false;
    (async () => {
      setLoadingLessons(true);
      setError(null);
      try {
        const raw = await getLessons(tid);
        if (cancelled) return;
        const list = Array.isArray(raw) ? raw : [];
        setLessons(list);
        setLessonId((prev) =>
          prev && list.some((x) => String(x.id) === String(prev)) ? prev : ""
        );
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Không tải được bài học.");
          setLessons([]);
        }
      } finally {
        if (!cancelled) setLoadingLessons(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [typeId]);

  const hierarchyPreview = useMemo(() => {
    const g = grades.find((x) => String(x.id) === String(gradeId));
    const t = types.find((x) => String(x.id) === String(typeId));
    const l = lessons.find((x) => String(x.id) === String(lessonId));
    const parts = [g?.name, t?.name, l?.name].filter(Boolean);
    return parts.length ? parts.join(" > ") : "—";
  }, [grades, types, lessons, gradeId, typeId, lessonId]);

  const refGradeId = gradeId ? Number(gradeId) : null;
  const refTypeId = typeId ? Number(typeId) : null;
  const refLessonId = lessonId ? Number(lessonId) : null;

  const setAnswerAt = (idx, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const readImageFile = (file) => {
    setQuestionImageFile(file);
    setImageCleared(false);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setQuestionImage(String(dataUrl || ""));
      setQuestionImagePreview(String(dataUrl || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      readImageFile(file);
    } else {
      setQuestionImageFile(null);
      setQuestionImage("");
      setQuestionImagePreview("");
      setImageCleared(true);
    }
  };

  const handlePaste = (event) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            readImageFile(file);
            return;
          }
        }
      }
    }
    const text = event.clipboardData?.getData("text");
    if (text) {
      setQuestionImageFile(null);
      setImageCleared(false);
      setQuestionImage(text.trim());
      setQuestionImagePreview(text.trim());
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      readImageFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!draft || !questionId) {
      setError("Không có dữ liệu câu hỏi.");
      return;
    }
    if (!gradeId || !typeId || !lessonId) {
      setError("Vui lòng chọn khối lớp, chủ đề và bài học.");
      return;
    }
    setSaving(true);
    try {
      let fileToSend = questionImageFile;
      if (!fileToSend && questionImage.trim().startsWith("data:image")) {
        try {
          const r = await fetch(questionImage.trim());
          const blob = await r.blob();
          fileToSend = new File([blob], "question.png", {
            type: blob.type || "image/png",
          });
        } catch (_) {
          /* bỏ qua */
        }
      }
      const pathOnly =
        !fileToSend &&
        !imageCleared &&
        questionImage.trim() &&
        !questionImage.trim().startsWith("data:")
          ? questionImage.trim()
          : undefined;

      await updateQuestion(questionId, {
        grade_id: Number(gradeId),
        type_id: Number(typeId),
        lesson_id: Number(lessonId),
        question_text: questionText,
        answers,
        correct_index: correctIndex,
        ...(fileToSend ? { imageFile: fileToSend } : {}),
        ...(pathOnly ? { question_image_path: pathOnly } : {}),
        ...(imageCleared && !fileToSend ? { clear_question_image: true } : {}),
      });

      navigate("/admin/questions", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Không lưu được thay đổi.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const canPickHierarchy = !loadingGrades && grades.length > 0;

  if (!draft) {
    return (
      <div style={styles.root}>
        <nav style={styles.breadcrumb} aria-label="Breadcrumb">
          <Link to="/admin" style={styles.crumbLink}>
            Tổng quan
          </Link>
          <span style={styles.crumbSep}>›</span>
          <Link to="/admin/questions" style={styles.crumbLink}>
            Quản lý câu hỏi
          </Link>
          <span style={styles.crumbSep}>›</span>
          <span style={styles.crumbCurrent}>Cập nhật câu hỏi</span>
        </nav>
        <div style={styles.emptyWrap}>
          <p style={styles.emptyTitle}>Chưa có dữ liệu câu hỏi</p>
          <p style={styles.muted}>
            Hãy mở từ <strong>Quản lý câu hỏi</strong> → nút chỉnh sửa (bút) trên một dòng. Truy cập trực
            tiếp URL hoặc F5 sẽ mất <code style={styles.code}>location.state</code>.
          </p>
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
        <Link to="/admin/questions" style={styles.crumbLink}>
          Quản lý câu hỏi
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Cập nhật câu hỏi</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Cập nhật câu hỏi #{questionId}</h1>
          <p style={styles.lead}>
            Chọn phân cấp (khối → chủ đề → bài học), nhập nội dung và bốn đáp án trắc nghiệm, đánh dấu đáp
            án đúng.
          </p>
        </div>
      </header>

      <p style={styles.infoBanner}>
        Bạn có thể đổi <strong>khối</strong>, <strong>chủ đề</strong> và <strong>bài học</strong> trực tiếp tại
        đây; sau khi lưu, thay đổi được ghi vào cơ sở dữ liệu.
      </p>

      {error && (
        <div style={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      {loadingGrades && <p style={styles.muted}>Đang tải danh sách khối lớp…</p>}

      <form
        onSubmit={handleSubmit}
        style={{
          ...styles.formCard,
          ...(isNarrow ? styles.formCardNarrow : {}),
        }}
      >
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Phân cấp</h2>
          <p style={styles.hierarchyIds} aria-label="Mã tham chiếu phân cấp trong cơ sở dữ liệu">
            Khối #{refGradeId ?? "—"} · Chủ đề #{refTypeId ?? "—"} · Bài học #{refLessonId ?? "—"}
          </p>
          <div
            style={{
              ...styles.grid3,
              ...(isNarrow ? styles.grid3Narrow : {}),
            }}
          >
            <label style={styles.label}>
              <span style={styles.labelTitle}>
                Khối lớp <span style={styles.req}>*</span>
              </span>
              <select
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                style={styles.select}
                required
                disabled={!canPickHierarchy}
              >
                <option value="">— Chọn khối —</option>
                {grades.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              <span style={styles.labelTitle}>
                Chủ đề <span style={styles.req}>*</span>
              </span>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                style={styles.select}
                required
                disabled={!gradeId || loadingTypes}
              >
                <option value="">
                  {gradeId ? "— Chọn chủ đề —" : "Chọn khối trước"}
                </option>
                {types.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              <span style={styles.labelTitle}>
                Bài học <span style={styles.req}>*</span>
              </span>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                style={styles.select}
                required
                disabled={!typeId || loadingLessons}
              >
                <option value="">
                  {typeId ? "— Chọn bài học —" : "Chọn chủ đề trước"}
                </option>
                {lessons.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </select>
              {typeId && !loadingLessons && lessons.length === 0 && (
                <span style={styles.warnInline}>
                  Chưa có bài học cho chủ đề này — thêm bài học ở Quản lý chủ đề trước.
                </span>
              )}
            </label>
          </div>
          <div style={styles.hierarchyBlock}>
            <span style={styles.hierarchyLine}>{hierarchyPreview}</span>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Nội dung câu hỏi</h2>
          <label style={styles.label}>
            <span style={styles.labelTitle}>
              Câu hỏi <span style={styles.req}>*</span>
            </span>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              style={styles.textarea}
              rows={4}
              placeholder="Nhập nội dung câu hỏi…"
              required
            />
          </label>
          <div style={styles.uploadLabelContainer}>
            <span style={styles.uploadLabelText}>Ảnh câu hỏi (tùy chọn)</span>
            <div
              style={{
                ...styles.uploadDropZone,
                ...(isNarrow ? styles.uploadDropZoneNarrow : {}),
              }}
              onPaste={handlePaste}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              tabIndex={0}
              aria-label="Click để paste ảnh hoặc kéo thả file vào đây"
            >
              <div
                style={{
                  ...styles.uploadIcon,
                  ...(isNarrow ? styles.uploadIconNarrow : {}),
                }}
                aria-hidden
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2d5a76" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 5 17 10" />
                  <path d="M12 5v12" />
                </svg>
              </div>
              <div
                style={{
                  ...styles.uploadTextBlock,
                  ...(isNarrow ? styles.uploadTextBlockNarrow : {}),
                }}
              >
                <p style={styles.uploadTitle}>Click để paste ảnh (Ctrl+V)</p>
                <p style={styles.uploadSubtitle}>hoặc kéo thả file vào đây</p>
                <p style={styles.uploadHint}>Hỗ trợ: JPG, PNG, GIF (tối đa 5MB)</p>
              </div>
              <label
                style={{
                  ...styles.uploadButton,
                  ...(isNarrow ? styles.uploadButtonNarrow : {}),
                }}
              >
                Chọn file từ thiết bị
                <input type="file" accept="image/*" onChange={handleFileChange} style={styles.fileInput} />
              </label>
            </div>
          </div>
          {questionImagePreview && (
            <div style={styles.imagePreviewWrap}>
              <img src={questionImagePreview} alt="Xem trước ảnh câu hỏi" style={styles.previewImage} />
              <button
                type="button"
                style={styles.removeImageButton}
                onClick={() => {
                  setQuestionImageFile(null);
                  setQuestionImage("");
                  setQuestionImagePreview("");
                  setImageCleared(true);
                }}
              >
                Xóa ảnh
              </button>
            </div>
          )}
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Đáp án trắc nghiệm</h2>
          <p style={styles.hint}>Nhập đủ 4 phương án và chọn một đáp án đúng.</p>
          {[0, 1, 2, 3].map((i) => {
            const label = ["A", "B", "C", "D"][i];
            return (
              <div key={i} style={styles.answerRow}>
                <label style={styles.radioWrap}>
                  <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                  <span style={styles.answerBadge}>{label}</span>
                </label>
                <input
                  type="text"
                  value={answers[i]}
                  onChange={(e) => setAnswerAt(i, e.target.value)}
                  style={styles.inputFlex}
                  placeholder={`Đáp án ${label}`}
                  required
                />
              </div>
            );
          })}
        </section>

        <div style={styles.actions}>
          <Link to="/admin/questions" style={styles.btnSecondary}>
            Hủy
          </Link>
          <button
            type="submit"
            style={{
              ...styles.btnPrimary,
              ...(saving ? { opacity: 0.7, pointerEvents: "none" } : {}),
            }}
            disabled={saving}
          >
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}

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
  crumbSep: { color: "#d0d7de", userSelect: "none" },
  crumbCurrent: { color: "#24292f", fontWeight: 600 },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
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
  },
  infoBanner: {
    margin: "0 0 16px",
    padding: "10px 14px",
    fontSize: "0.88rem",
    color: "#1e3a4c",
    background: "#eaf4ff",
    border: "1px solid #c9d8e8",
    borderRadius: 8,
    lineHeight: 1.45,
  },
  hierarchyIds: {
    margin: "0 0 12px",
    fontSize: "0.8rem",
    color: "#57606a",
    lineHeight: 1.45,
  },
  emptyWrap: {
    padding: "32px 24px",
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
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
  errorBanner: {
    padding: "12px 16px",
    marginBottom: 16,
    borderRadius: 8,
    background: "#fff8f5",
    border: "1px solid #f0c4a8",
    color: "#9a3412",
    fontSize: "0.9rem",
  },
  formCard: {
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 0,
    padding: "20px 24px",
    boxSizing: "border-box",
    minWidth: 0,
    maxWidth: "100%",
  },
  formCardNarrow: {
    padding: "16px 14px",
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 20,
    alignItems: "start",
    minWidth: 0,
    width: "100%",
  },
  grid3Narrow: {
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  label: {
    marginTop: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontWeight: 600,
    fontSize: "0.88rem",
    color: "#24292f",
    minWidth: 0,
    maxWidth: "100%",
  },
  labelTitle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
  },
  req: { color: "#cf222e" },
  select: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    background: "#fff",
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  warnInline: {
    fontSize: "0.82rem",
    color: "#9a3412",
    fontWeight: 500,
    marginTop: 4,
  },
  hierarchyBlock: {
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "12px 14px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px dashed #c9d3dd",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  hierarchyLine: {
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "#24292f",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  },
  uploadLabelContainer: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontWeight: 600,
    fontSize: "0.88rem",
    color: "#24292f",
    minWidth: 0,
    maxWidth: "100%",
  },
  uploadLabelText: {
    fontWeight: 600,
    color: "#24292f",
  },
  uploadDropZone: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 16,
    padding: "22px 20px",
    borderRadius: 16,
    border: "1px dashed #c9d3dd",
    background: "#f8fafc",
    color: "#24292f",
    minHeight: 132,
    minWidth: 0,
    boxSizing: "border-box",
  },
  uploadDropZoneNarrow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 14,
    minHeight: "auto",
    padding: "18px 16px",
  },
  uploadIcon: {
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eaf4ff",
    borderRadius: 14,
    flexShrink: 0,
  },
  uploadIconNarrow: {
    alignSelf: "center",
  },
  uploadTextBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    maxWidth: "100%",
  },
  uploadTextBlockNarrow: {
    textAlign: "center",
    width: "100%",
  },
  uploadTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    color: "#24292f",
    lineHeight: 1.4,
    wordBreak: "normal",
    overflowWrap: "break-word",
  },
  uploadSubtitle: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#57606a",
    lineHeight: 1.45,
    wordBreak: "normal",
    overflowWrap: "break-word",
  },
  uploadHint: {
    margin: 0,
    fontSize: "0.82rem",
    color: "#8b96a5",
    lineHeight: 1.45,
    wordBreak: "normal",
    overflowWrap: "break-word",
  },
  uploadButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 18px",
    borderRadius: 10,
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
    boxSizing: "border-box",
  },
  uploadButtonNarrow: {
    width: "100%",
    maxWidth: "100%",
  },
  fileInput: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },
  imagePreviewWrap: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  previewImage: {
    maxWidth: 200,
    maxHeight: 140,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    objectFit: "contain",
  },
  removeImageButton: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    cursor: "pointer",
    fontWeight: 600,
  },
  textarea: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    lineHeight: 1.5,
    resize: "vertical",
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  hint: {
    margin: "0 0 12px",
    fontSize: "0.88rem",
    color: "#57606a",
    fontWeight: 400,
  },
  answerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  radioWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 72,
    cursor: "pointer",
    fontWeight: 600,
  },
  answerBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    fontSize: "0.85rem",
    color: "#24292f",
  },
  inputFlex: {
    flex: 1,
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 8,
    borderTop: "1px solid #eaeef2",
    marginTop: 8,
  },
  btnSecondary: {
    padding: "10px 20px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.95rem",
    textDecoration: "none",
  },
  btnPrimary: {
    padding: "10px 22px",
    borderRadius: 10,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(31,35,40,0.08)",
  },
  muted: {
    margin: "0 0 16px",
    fontSize: "0.9rem",
    color: "#57606a",
    lineHeight: 1.5,
  },
};
