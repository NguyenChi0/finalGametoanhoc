import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  getAdminGrades,
  getAdminTypes,
  getAdminLessons,
  createAdminType,
  updateAdminType,
  deleteAdminType,
  createAdminLesson,
  updateAdminLesson,
  deleteAdminLesson,
} from "../../api";
import CurriculumImageField from "../components/CurriculumImageField";

const MOBILE_MAX_PX = 767;

function reorderIds(ids, fromId, toId) {
  const from = ids.findIndex((id) => String(id) === String(fromId));
  const to = ids.findIndex((id) => String(id) === String(toId));
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function orderMatchesBaseline(currentIds, baselineIds) {
  if (!currentIds || currentIds.length !== baselineIds.length) return true;
  return currentIds.every((id, i) => String(id) === String(baselineIds[i]));
}

function applyIdOrder(items, orderedIds) {
  const byId = new Map(items.map((item) => [String(item.id), item]));
  return orderedIds.map((id) => byId.get(String(id))).filter(Boolean);
}

/** Bảng trên desktop; thẻ dọc trên mobile. */
function useIsDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(`(min-width: ${MOBILE_MAX_PX + 1}px)`).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MOBILE_MAX_PX + 1}px)`);
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export default function AdminMathTypes() {
  const isDesktopLayout = useIsDesktopLayout();
  const [grades, setGrades] = useState([]);
  const [filterGradeId, setFilterGradeId] = useState("");
  const [types, setTypes] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [expandedTypeId, setExpandedTypeId] = useState(null);
  const [lessonsByTypeId, setLessonsByTypeId] = useState({});
  const [loadingLessonsTypeId, setLoadingLessonsTypeId] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formError, setFormError] = useState(null);
  const [savingForm, setSavingForm] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState(null);

  const [opModalOpen, setOpModalOpen] = useState(false);
  const [opCreate, setOpCreate] = useState(false);
  const [opEditId, setOpEditId] = useState(null);
  const [opForTypeId, setOpForTypeId] = useState(null);
  const [opForTypeName, setOpForTypeName] = useState("");
  const [opName, setOpName] = useState("");
  const [opFormImage, setOpFormImage] = useState("");
  const [opFormError, setOpFormError] = useState(null);
  const [savingOp, setSavingOp] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState(null);

  const [draftTypeIds, setDraftTypeIds] = useState(null);
  const [draftLessonIdsByType, setDraftLessonIdsByType] = useState({});
  const [dragTypeId, setDragTypeId] = useState(null);
  const [dragLesson, setDragLesson] = useState(null);
  const [dragOverTypeId, setDragOverTypeId] = useState(null);
  const [dragOverLessonKey, setDragOverLessonKey] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockModalText, setBlockModalText] = useState("");

  const selectedGrade = useMemo(
    () => grades.find((g) => String(g.id) === filterGradeId),
    [grades, filterGradeId]
  );

  const loadGrades = useCallback(async () => {
    setLoadingGrades(true);
    setError(null);
    try {
      const gradeData = await getAdminGrades();
      setGrades(Array.isArray(gradeData) ? gradeData : []);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Không tải được danh sách khối lớp.";
      setError(msg);
      setGrades([]);
    } finally {
      setLoadingGrades(false);
    }
  }, []);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const reloadTypes = useCallback(async () => {
    if (!filterGradeId) {
      setTypes([]);
      setLoadingTypes(false);
      return [];
    }
    const gid = Number(filterGradeId);
    if (!Number.isFinite(gid)) return [];

    setLoadingTypes(true);
    setError(null);
    try {
      const raw = await getAdminTypes({ grade_id: gid });
      const list = Array.isArray(raw) ? raw : [];
      const g = grades.find((x) => Number(x.id) === gid);
      const gradeName = g?.name || `Lộp #${gid}`;
      const mapped = list.map((t) => ({
        ...t,
        grade_id: t.grade_id != null ? Number(t.grade_id) : gid,
        gradeName,
        description:
          t.description == null || String(t.description).trim() === ""
            ? ""
            : String(t.description).trim(),
      }));
      setTypes(mapped);
      return mapped;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Không tải được chủ đề cho khối đã chọn.";
      setError(msg);
      setTypes([]);
      return [];
    } finally {
      setLoadingTypes(false);
    }
  }, [filterGradeId, grades]);

  useEffect(() => {
    reloadTypes();
  }, [reloadTypes]);

  useEffect(() => {
    setEditOpen(false);
    setCreateOpen(false);
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setExpandedTypeId(null);
    setLessonsByTypeId({});
    setLoadingLessonsTypeId(null);
    setOpModalOpen(false);
    setOpCreate(false);
    setOpEditId(null);
    setOpForTypeId(null);
    setOpForTypeName("");
    setOpName("");
    setDraftTypeIds(null);
    setDraftLessonIdsByType({});
    setDragTypeId(null);
    setDragLesson(null);
  }, [filterGradeId]);

  const loadLessonsForType = useCallback(async (typeRow) => {
    const tid = String(typeRow.id);
    setLoadingLessonsTypeId(tid);
    try {
      const raw = await getAdminLessons({ type_id: typeRow.id });
      const list = Array.isArray(raw) ? raw : [];
      setLessonsByTypeId((prev) => ({
        ...prev,
        [tid]: list.map((o) => ({
          ...o,
          type_id: o.type_id != null ? Number(o.type_id) : typeRow.id,
        })),
      }));
    } catch {
      setLessonsByTypeId((prev) => ({
        ...prev,
        [tid]: [],
      }));
    } finally {
      setLoadingLessonsTypeId(null);
    }
  }, []);

  const toggleExpand = (t) => {
    const tid = String(t.id);
    if (expandedTypeId === tid) {
      setExpandedTypeId(null);
      return;
    }
    setExpandedTypeId(tid);
    if (lessonsByTypeId[tid] !== undefined) return;
    loadLessonsForType(t);
  };

  const typeIdsBaseline = useMemo(() => types.map((t) => t.id), [types]);

  const orderedTypes = useMemo(() => {
    const ids = draftTypeIds ?? typeIdsBaseline;
    return applyIdOrder(types, ids);
  }, [types, draftTypeIds, typeIdsBaseline]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedTypes;
    return orderedTypes.filter((t) => {
      const blob = [t.id, t.name, t.description].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [orderedTypes, search]);

  const canReorder = !search.trim();

  const hasTypeOrderChanges = useMemo(
    () =>
      draftTypeIds != null && !orderMatchesBaseline(draftTypeIds, typeIdsBaseline),
    [draftTypeIds, typeIdsBaseline]
  );

  const hasLessonOrderChanges = useMemo(() => {
    return Object.entries(draftLessonIdsByType).some(([tid, ids]) => {
      const base = lessonsByTypeId[tid];
      if (!Array.isArray(base)) return false;
      const baseline = base.map((o) => o.id);
      return !orderMatchesBaseline(ids, baseline);
    });
  }, [draftLessonIdsByType, lessonsByTypeId]);

  const hasPendingOrderChanges = hasTypeOrderChanges || hasLessonOrderChanges;

  const getLessonsForType = useCallback(
    (typeRow) => {
      const tid = String(typeRow.id);
      const base = lessonsByTypeId[tid];
      if (!Array.isArray(base)) return base;
      const baseline = base.map((o) => o.id);
      const ids = draftLessonIdsByType[tid] ?? baseline;
      return applyIdOrder(base, ids);
    },
    [lessonsByTypeId, draftLessonIdsByType]
  );

  const totalFormatted = useMemo(() => {
    if (!filterGradeId || (loadingTypes && types.length === 0)) return "";
    return filtered.length.toLocaleString("vi-VN");
  }, [filterGradeId, loadingTypes, types.length, filtered.length]);

  const statLabelText = useMemo(() => {
    if (selectedGrade) return `Số chủ đề · ${selectedGrade.name}`;
    return "Số chủ đề";
  }, [selectedGrade]);

  const openEdit = (row) => {
    setEditId(row.id);
    setFormName(row.name);
    setFormDesc(row.description || "");
    setFormImage(row.image || "");
    setFormError(null);
    setEditOpen(true);
    setCreateOpen(false);
  };

  const openCreate = () => {
    if (!filterGradeId) return;
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setFormImage("");
    setFormError(null);
    setCreateOpen(true);
    setEditOpen(true);
  };

  const closeModal = () => {
    setEditOpen(false);
    setCreateOpen(false);
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setFormImage("");
    setFormError(null);
  };

  const saveForm = async (e) => {
    e.preventDefault();
    const name = formName.trim();
    const gid = Number(filterGradeId);
    if (!name || !Number.isFinite(gid)) return;

    const desc = formDesc.trim();
    const imageVal = formImage.trim();
    setFormError(null);
    setSavingForm(true);
    try {
      if (createOpen) {
        await createAdminType({
          grade_id: gid,
          name,
          description: desc || null,
          image: imageVal || null,
        });
      } else if (editId != null) {
        await updateAdminType(editId, {
          name,
          description: desc,
          image: imageVal || null,
        });
      }
      setExpandedTypeId(null);
      setLessonsByTypeId({});
      await reloadTypes();
      closeModal();
    } catch (err) {
      setFormError(
        err?.response?.data?.message || err?.message || "Không lưu được chủ đề."
      );
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async (row) => {
    if (
      !window.confirm(
        `Xóa chủ đề "${row.name}" (ID ${row.id})?\n\nCác bài học thuộc chủ đề sẽ bị xóa theo nếu không còn câu hỏi tham chiếu. Nếu còn câu hỏi gắn chủ đề này, chủ đề sẽ không thể bị xóa.`
      )
    ) {
      return;
    }
    setDeletingTypeId(row.id);
    setError(null);
    try {
      await deleteAdminType(row.id);
      const tid = String(row.id);
      setLessonsByTypeId((prev) => {
        const next = { ...prev };
        delete next[tid];
        return next;
      });
      if (expandedTypeId === tid) setExpandedTypeId(null);
      await reloadTypes();
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message || err?.message || "Không xóa được chủ đề.";
      if (status === 409) {
        setBlockModalText(msg);
        setBlockModalOpen(true);
      } else {
        setError(msg);
      }
    } finally {
      setDeletingTypeId(null);
    }
  };

  const openOpCreate = (typeRow) => {
    setOpForTypeId(typeRow.id);
    setOpForTypeName(typeRow.name);
    setOpCreate(true);
    setOpEditId(null);
    setOpName("");
    setOpFormImage("");
    setOpFormError(null);
    setOpModalOpen(true);
  };

  const openOpEdit = (op, typeRow) => {
    setOpForTypeId(typeRow.id);
    setOpForTypeName(typeRow.name);
    setOpCreate(false);
    setOpEditId(op.id);
    setOpName(op.name);
    setOpFormImage(op.image || "");
    setOpFormError(null);
    setOpModalOpen(true);
  };

  const closeOpModal = () => {
    setOpModalOpen(false);
    setOpCreate(false);
    setOpEditId(null);
    setOpForTypeId(null);
    setOpForTypeName("");
    setOpName("");
    setOpFormImage("");
    setOpFormError(null);
  };

  const saveOp = async (e) => {
    e.preventDefault();
    const name = opName.trim();
    if (!name || opForTypeId == null) return;

    setOpFormError(null);
    setSavingOp(true);
    try {
      const typeRow = types.find((x) => x.id === opForTypeId);
      if (!typeRow) {
        setOpFormError("Không tìm thấy chủ đề.");
        return;
      }
      const imageVal = opFormImage.trim();
      if (opCreate) {
        await createAdminLesson({
          type_id: opForTypeId,
          name,
          image: imageVal || null,
        });
      } else if (opEditId != null) {
        await updateAdminLesson(opEditId, { name, image: imageVal || null });
      }
      await loadLessonsForType(typeRow);
      closeOpModal();
    } catch (err) {
      setOpFormError(
        err?.response?.data?.message || err?.message || "Không lưu được bài học."
      );
    } finally {
      setSavingOp(false);
    }
  };

  const handleTypeDragStart = (e, typeId) => {
    if (!canReorder) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDragTypeId(typeId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(typeId));
  };

  const handleTypeDragOver = (e, typeId) => {
    if (!canReorder || dragTypeId == null) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverTypeId(typeId);
  };

  const handleTypeDrop = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canReorder || dragTypeId == null) return;
    const currentIds = draftTypeIds ?? typeIdsBaseline;
    setDraftTypeIds(reorderIds(currentIds, dragTypeId, targetId));
    setDragTypeId(null);
    setDragOverTypeId(null);
  };

  const handleTypeDragEnd = () => {
    setDragTypeId(null);
    setDragOverTypeId(null);
  };

  const handleLessonDragStart = (e, typeRow, lessonId) => {
    if (!canReorder) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDragLesson({ typeId: String(typeRow.id), lessonId });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(lessonId));
  };

  const handleLessonDragOver = (e, typeRow, lessonId) => {
    if (!canReorder || !dragLesson || String(dragLesson.typeId) !== String(typeRow.id)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverLessonKey(`${typeRow.id}:${lessonId}`);
  };

  const handleLessonDrop = (e, typeRow, targetLessonId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canReorder || !dragLesson || String(dragLesson.typeId) !== String(typeRow.id)) {
      return;
    }
    const tid = String(typeRow.id);
    const base = lessonsByTypeId[tid];
    if (!Array.isArray(base)) return;
    const baseline = base.map((o) => o.id);
    const currentIds = draftLessonIdsByType[tid] ?? baseline;
    setDraftLessonIdsByType((prev) => ({
      ...prev,
      [tid]: reorderIds(currentIds, dragLesson.lessonId, targetLessonId),
    }));
    setDragLesson(null);
    setDragOverLessonKey(null);
  };

  const handleLessonDragEnd = () => {
    setDragLesson(null);
    setDragOverLessonKey(null);
  };

  const cancelOrderChanges = async () => {
    const lessonTids = new Set(Object.keys(draftLessonIdsByType));
    if (expandedTypeId) lessonTids.add(expandedTypeId);
    setDraftTypeIds(null);
    setDraftLessonIdsByType({});
    setDragTypeId(null);
    setDragLesson(null);
    const list = await reloadTypes();
    for (const tid of lessonTids) {
      const row = list.find((x) => String(x.id) === tid);
      if (row) await loadLessonsForType(row);
    }
  };

  const saveOrderChanges = async () => {
    setSavingOrder(true);
    setError(null);
    try {
      if (hasTypeOrderChanges && draftTypeIds) {
        await Promise.all(
          draftTypeIds.map((id, idx) =>
            updateAdminType(id, { sort_order: (idx + 1) * 10 })
          )
        );
      }
      for (const [tid, ids] of Object.entries(draftLessonIdsByType)) {
        const base = lessonsByTypeId[tid];
        if (!Array.isArray(base)) continue;
        const baseline = base.map((o) => o.id);
        if (orderMatchesBaseline(ids, baseline)) continue;
        await Promise.all(
          ids.map((id, idx) =>
            updateAdminLesson(id, { sort_order: (idx + 1) * 10 })
          )
        );
      }
      setDraftTypeIds(null);
      setDraftLessonIdsByType({});
      setExpandedTypeId(null);
      setLessonsByTypeId({});
      await reloadTypes();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không lưu được thứ tự mới."
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDeleteOp = async (op, typeRow) => {
    if (!window.confirm(`Xóa bài học "${op.name}" (ID ${op.id})?`)) {
      return;
    }
    setDeletingLessonId(op.id);
    setError(null);
    try {
      await deleteAdminLesson(op.id);
      await loadLessonsForType(typeRow);
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message || err?.message || "Không xóa được bài học.";
      if (status === 409) {
        setBlockModalText(msg);
        setBlockModalOpen(true);
      } else {
        setError(msg);
      }
    } finally {
      setDeletingLessonId(null);
    }
  };

  const showList = Boolean(filterGradeId) && !loadingTypes;
  const hasGradeOptions = grades.length > 0;

  return (
    <div
      style={{
        ...styles.root,
        ...(hasPendingOrderChanges ? { paddingBottom: 96 } : {}),
      }}
    >
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tộng quan
        </Link>
        <span style={styles.crumbSep}>⬺</span>
        <span style={styles.crumbCurrent}>Quản lý chủ đề</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Quản lý chủ đề</h1>
          <p style={styles.lead}>
            Chào mừng bạn đến với trang quản lý chủ đề.
          </p>
        </div>
        <button
          type="button"
          style={{
            ...styles.btnPrimary,
            ...(!filterGradeId || !hasGradeOptions
              ? { opacity: 0.55, cursor: "not-allowed" }
              : {}),
          }}
          onClick={openCreate}
          disabled={!filterGradeId || !hasGradeOptions}
        >
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo chủ đề mới
        </button>
      </header>

      <div style={styles.filterBar}>
        <label style={styles.filterLabel} htmlFor="admin-math-type-grade">
          Khối lớp
        </label>
        <select
          id="admin-math-type-grade"
          value={filterGradeId}
          onChange={(e) => {
            setFilterGradeId(e.target.value);
            setSearch("");
          }}
          style={styles.filterSelect}
          disabled={loadingGrades || !hasGradeOptions}
        >
          <option value=""> Chọn khối lớp </option>
          {grades.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {loadingGrades && (
        <p style={styles.muted}>Đang tải danh sách khối lớp…</p>
      )}

      {!loadingGrades && !hasGradeOptions && !error && (
        <p style={styles.muted}>Chưa có khối lớp nào</p>
      )}

      {error && (
        <div style={styles.errorBanner}>
          {error}{" "}
          <button
            type="button"
            style={styles.linkBtn}
            onClick={() => {
              loadGrades();
              if (filterGradeId) reloadTypes();
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {filterGradeId && loadingTypes && (
        <p style={styles.muted}>Đang tải chủ đề…</p>
      )}

      {filterGradeId && !loadingTypes && showList && (
        <>
          <section style={styles.statCard} aria-label="Thđng kê">
            <div style={styles.statIconWrap}>
              <DocumentIcon />
            </div>
            <div>
              <p style={styles.statLabel}>{statLabelText}</p>
              <p style={styles.statNumber}>{totalFormatted}</p>
            </div>
          </section>

          <div style={styles.toolbar}>
            <div style={styles.searchWrap}>
              <input
                type="search"
                placeholder="Tìm theo tên chủ đề, mô tả hoặc ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
                aria-label="Tìm kiếm trong danh sách chủ đề"
              />
              <span style={styles.searchIconSlot} aria-hidden>
                <SearchIcon />
              </span>
            </div>
          </div>

          {!canReorder && types.length > 0 && (
            <p style={styles.reorderHint}>
              Xóa từ khóa tìm kiếm để kéo thả sắp xếp thứ tự.
            </p>
          )}

          {types.length === 0 ? (
            <p style={styles.muted}>
              Khối này chưa có chủ đề nào
            </p>
          ) : isDesktopLayout ? (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: 72 }} title="Kéo để đổi thứ tự">
                      Thứ tự
                    </th>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Tên chủ đề</th>
                    <th style={styles.th}>Mô tả</th>
                    <th style={{ ...styles.th, textAlign: "right", width: 120 }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={styles.tdEmpty}>
                        Không có kết quả phù hợp với “{search}”.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => {
                      const tid = String(t.id);
                      const isOpen = expandedTypeId === tid;
                      const lessons = getLessonsForType(t);
                      const loadingLessons = loadingLessonsTypeId === tid;
                      const typeIdx = orderedTypes.findIndex((x) => x.id === t.id);
                      const isDragging = dragTypeId === t.id;
                      const isDragOver =
                        dragOverTypeId === t.id && dragTypeId != null && dragTypeId !== t.id;
                      return (
                        <React.Fragment key={t.id}>
                          <tr
                            style={{
                              ...styles.typeRow,
                              ...(isDragging ? styles.draggingRow : {}),
                              ...(isDragOver ? styles.dragOverRow : {}),
                            }}
                            onClick={() => toggleExpand(t)}
                            aria-expanded={isOpen}
                            onDragOver={(e) => handleTypeDragOver(e, t.id)}
                            onDrop={(e) => handleTypeDrop(e, t.id)}
                            onDragLeave={() => {
                              if (dragOverTypeId === t.id) setDragOverTypeId(null);
                            }}
                          >
                            <td
                              style={styles.td}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={dragStyles.cell}>
                                <DragHandle
                                  disabled={!canReorder}
                                  label={`Kéo chủ đề ${t.name}`}
                                  onDragStart={(e) => handleTypeDragStart(e, t.id)}
                                  onDragEnd={handleTypeDragEnd}
                                />
                                <span style={dragStyles.orderNum}>
                                  {typeIdx >= 0 ? typeIdx + 1 : ""}
                                </span>
                              </div>
                            </td>
                            <td style={styles.td}>{t.id}</td>
                            <td style={styles.td}>
                              <div style={styles.typeNameToggle}>
                                {t.name}
                              </div>
                            </td>
                            <td style={{ ...styles.td, color: "#57606a" }}>
                              {t.description ? t.description : ""}
                            </td>
                            <td
                              style={{ ...styles.td, textAlign: "right" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                style={styles.iconBtn}
                                title="Chỉnh sửa chủ đề"
                                onClick={() => openEdit(t)}
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                style={{
                                  ...styles.iconBtn,
                                  marginLeft: 8,
                                  ...(deletingTypeId === t.id
                                    ? { opacity: 0.55, pointerEvents: "none" }
                                    : {}),
                                }}
                                title="Xóa chủ đề"
                                disabled={deletingTypeId != null}
                                onClick={() => handleDelete(t)}
                              >
                                <TrashIcon />
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={5} style={styles.nestedCell}>
                                <div style={styles.nestedPanel}>
                                  <div style={styles.nestedHeader}>
                                    <span style={styles.nestedTitle}>
                                      Các bài học
                                    </span>
                                    <button
                                      type="button"
                                      style={styles.btnAddOp}
                                      onClick={() => openOpCreate(t)}
                                    >
                                      + Thêm bài học
                                    </button>
                                  </div>
                                  {loadingLessons && (
                                    <p style={styles.mutedSmall}>Đang tải bài học…</p>
                                  )}
                                  {!loadingLessons && lessons !== undefined && lessons.length === 0 && (
                                    <p style={styles.mutedSmall}>
                                      Chưa có bài học nào
                                    </p>
                                  )}
                                  {!loadingLessons && lessons && lessons.length > 0 && (
                                    <table style={styles.nestedTable}>
                                      <thead>
                                        <tr>
                                          <th
                                            style={{ ...styles.nestedTh, width: 72 }}
                                            title="Kéo để đổi thứ tự"
                                          >
                                            Thứ tự
                                          </th>
                                          <th style={styles.nestedTh}>ID</th>
                                          <th style={styles.nestedTh}>Tên bài học</th>
                                          <th
                                            style={{
                                              ...styles.nestedTh,
                                              textAlign: "right",
                                              width: 100,
                                            }}
                                          >
                                            Thao tác
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {lessons.map((op, opIdx) => {
                                          const lessonKey = `${t.id}:${op.id}`;
                                          const isLessonDragging =
                                            dragLesson?.lessonId === op.id &&
                                            String(dragLesson?.typeId) === tid;
                                          const isLessonDragOver =
                                            dragOverLessonKey === lessonKey &&
                                            dragLesson != null &&
                                            dragLesson.lessonId !== op.id;
                                          return (
                                          <tr
                                            key={op.id}
                                            style={{
                                              ...(isLessonDragging ? styles.draggingRow : {}),
                                              ...(isLessonDragOver ? styles.dragOverRow : {}),
                                            }}
                                            onDragOver={(e) =>
                                              handleLessonDragOver(e, t, op.id)
                                            }
                                            onDrop={(e) => handleLessonDrop(e, t, op.id)}
                                            onDragLeave={() => {
                                              if (dragOverLessonKey === lessonKey) {
                                                setDragOverLessonKey(null);
                                              }
                                            }}
                                          >
                                            <td style={styles.nestedTd}>
                                              <div style={dragStyles.cell}>
                                                <DragHandle
                                                  disabled={!canReorder}
                                                  label={`Kéo bài học ${op.name}`}
                                                  onDragStart={(e) =>
                                                    handleLessonDragStart(e, t, op.id)
                                                  }
                                                  onDragEnd={handleLessonDragEnd}
                                                />
                                                <span style={dragStyles.orderNum}>
                                                  {opIdx + 1}
                                                </span>
                                              </div>
                                            </td>
                                            <td style={styles.nestedTd}>{op.id}</td>
                                            <td style={{ ...styles.nestedTd, fontWeight: 600 }}>
                                              {op.name}
                                            </td>
                                            <td
                                              style={{
                                                ...styles.nestedTd,
                                                textAlign: "right",
                                              }}
                                            >
                                              <button
                                                type="button"
                                                style={styles.iconBtnSm}
                                                title="Sửa bài học"
                                                onClick={() => openOpEdit(op, t)}
                                              >
                                                <PencilIcon />
                                              </button>
                                              <button
                                                type="button"
                                                style={{
                                                  ...styles.iconBtnSm,
                                                  marginLeft: 6,
                                                  ...(deletingLessonId === op.id
                                                    ? { opacity: 0.55, pointerEvents: "none" }
                                                    : {}),
                                                }}
                                                title="Xóa bài học"
                                                disabled={deletingLessonId != null}
                                                onClick={() => handleDeleteOp(op, t)}
                                              >
                                                <TrashIcon />
                                              </button>
                                            </td>
                                          </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.cardList} aria-label="Danh sách chủ đề dạng thẻ">
              {filtered.length === 0 ? (
                <div style={styles.cardEmpty}>
                  Không có kết quả phù hợp với “{search}”.
                </div>
              ) : (
                filtered.map((t) => {
                  const tid = String(t.id);
                  const isOpen = expandedTypeId === tid;
                  const lessons = getLessonsForType(t);
                  const loadingLessons = loadingLessonsTypeId === tid;
                  const typeIdx = orderedTypes.findIndex((x) => x.id === t.id);
                  const isDragging = dragTypeId === t.id;
                  const isDragOver =
                    dragOverTypeId === t.id && dragTypeId != null && dragTypeId !== t.id;
                  return (
                    <article
                      key={t.id}
                      style={{
                        ...styles.typeCard,
                        ...(isDragging ? styles.draggingRow : {}),
                        ...(isDragOver ? styles.dragOverRow : {}),
                      }}
                      onDragOver={(e) => handleTypeDragOver(e, t.id)}
                      onDrop={(e) => handleTypeDrop(e, t.id)}
                      onDragLeave={() => {
                        if (dragOverTypeId === t.id) setDragOverTypeId(null);
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOpen}
                        aria-label={`${t.name}, chạm để ${isOpen ? "thu gọn" : "mở"} danh sách bài học`}
                        onClick={() => toggleExpand(t)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleExpand(t);
                          }
                        }}
                        style={styles.typeCardMain}
                      >
                        <div style={styles.cardField}>
                          <span style={styles.cardLabel}>Thứ tự</span>
                          <div style={dragStyles.cell}>
                            <DragHandle
                              disabled={!canReorder}
                              label={`Kéo chủ đề ${t.name}`}
                              onDragStart={(e) => handleTypeDragStart(e, t.id)}
                              onDragEnd={handleTypeDragEnd}
                            />
                            <span style={dragStyles.orderNum}>
                              {typeIdx >= 0 ? typeIdx + 1 : ""}
                            </span>
                          </div>
                        </div>
                        <div style={styles.cardField}>
                          <span style={styles.cardLabel}>ID</span>
                          <span style={styles.cardValue}>{t.id}</span>
                        </div>
                        <div style={styles.cardField}>
                          <span style={styles.cardLabel}>Tên chủ đề</span>
                          <span style={styles.typeCardTitle}>{t.name}</span>
                        </div>
                        <div style={styles.cardField}>
                          <span style={styles.cardLabel}>Mô tả</span>
                          <span
                            style={{
                              ...styles.cardValue,
                              color: "#57606a",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {t.description ? t.description : ""}
                          </span>
                        </div>
                        <p style={styles.cardHint}>
                          Chạm để {isOpen ? "thu gọn" : "xem"} các bài học
                        </p>
                      </div>
                      <div style={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          title="Chỉnh sửa chủ đề"
                          onClick={() => openEdit(t)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.iconBtn,
                            ...(deletingTypeId === t.id
                              ? { opacity: 0.55, pointerEvents: "none" }
                              : {}),
                          }}
                          title="Xóa chủ đề"
                          disabled={deletingTypeId != null}
                          onClick={() => handleDelete(t)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                      {isOpen && (
                        <div style={styles.typeCardNested}>
                          <div style={styles.nestedHeader}>
                            <span style={styles.nestedTitle}>Các bài học</span>
                            <button
                              type="button"
                              style={styles.btnAddOp}
                              onClick={() => openOpCreate(t)}
                            >
                              + Thêm bài học
                            </button>
                          </div>
                          {loadingLessons && (
                            <p style={{ ...styles.mutedSmall, marginTop: 0 }}>Đang tải bài học…</p>
                          )}
                          {!loadingLessons && lessons !== undefined && lessons.length === 0 && (
                            <p style={{ ...styles.mutedSmall, marginTop: 0 }}>
                              Chưa có bài học nào
                            </p>
                          )}
                          {!loadingLessons && lessons && lessons.length > 0 && (
                            <div style={styles.lessonCardList}>
                              {lessons.map((op, opIdx) => {
                                const lessonKey = `${t.id}:${op.id}`;
                                const isLessonDragging =
                                  dragLesson?.lessonId === op.id &&
                                  String(dragLesson?.typeId) === tid;
                                const isLessonDragOver =
                                  dragOverLessonKey === lessonKey &&
                                  dragLesson != null &&
                                  dragLesson.lessonId !== op.id;
                                return (
                                <div
                                  key={op.id}
                                  style={{
                                    ...styles.lessonCard,
                                    ...(isLessonDragging ? styles.draggingRow : {}),
                                    ...(isLessonDragOver ? styles.dragOverRow : {}),
                                  }}
                                  onDragOver={(e) => handleLessonDragOver(e, t, op.id)}
                                  onDrop={(e) => handleLessonDrop(e, t, op.id)}
                                  onDragLeave={() => {
                                    if (dragOverLessonKey === lessonKey) {
                                      setDragOverLessonKey(null);
                                    }
                                  }}
                                >
                                  <div style={styles.cardField}>
                                    <span style={styles.cardLabel}>Thứ tự</span>
                                    <div style={dragStyles.cell}>
                                      <DragHandle
                                        disabled={!canReorder}
                                        label={`Kéo bài học ${op.name}`}
                                        onDragStart={(e) =>
                                          handleLessonDragStart(e, t, op.id)
                                        }
                                        onDragEnd={handleLessonDragEnd}
                                      />
                                      <span style={dragStyles.orderNum}>{opIdx + 1}</span>
                                    </div>
                                  </div>
                                  <div style={styles.cardField}>
                                    <span style={styles.cardLabel}>ID</span>
                                    <span style={styles.cardValue}>{op.id}</span>
                                  </div>
                                  <div style={styles.cardField}>
                                    <span style={styles.cardLabel}>Tên bài học</span>
                                    <span style={{ ...styles.cardValue, fontWeight: 600 }}>
                                      {op.name}
                                    </span>
                                  </div>
                                  <div
                                    style={styles.lessonCardActions}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      style={styles.iconBtnSm}
                                      title="Sửa bài học"
                                      onClick={() => openOpEdit(op, t)}
                                    >
                                      <PencilIcon />
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        ...styles.iconBtnSm,
                                        ...(deletingLessonId === op.id
                                          ? { opacity: 0.55, pointerEvents: "none" }
                                          : {}),
                                      }}
                                      title="Xóa bài học"
                                      disabled={deletingLessonId != null}
                                      onClick={() => handleDeleteOp(op, t)}
                                    >
                                      <TrashIcon />
                                    </button>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {!filterGradeId && hasGradeOptions && !loadingGrades && (
        <p style={styles.hintBox}>
          Chọn một khối lớp để quản lý các chủ đề.
        </p>
      )}

      {editOpen && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {createOpen ? "Tạo chủ đề mới" : "Chỉnh sửa chủ đề"}
            </h3>
            {selectedGrade && (
              <p style={styles.modalContext}>
                Khối: <strong>{selectedGrade.name}</strong>
              </p>
            )}
            <form onSubmit={saveForm}>
              <label style={styles.label}>
                Tên chủ đề
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={styles.inputLight}
                  required
                  autoFocus
                />
              </label>
              <label style={styles.label}>
                Mô tả
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{ ...styles.inputLight, minHeight: 100, resize: "vertical" }}
                  rows={4}
                />
              </label>
              <CurriculumImageField
                kind="type"
                label="Ảnh chủ đề"
                value={formImage}
                onChange={setFormImage}
                disabled={savingForm}
                hint="Hiển thị trên vòng chủ đề ở trang chọn bài học."
              />
              {formError && (
                <div style={styles.formError} role="alert">
                  {formError}
                </div>
              )}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={closeModal}
                  disabled={savingForm}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.btnPrimaryModal,
                    ...(savingForm ? { opacity: 0.75, pointerEvents: "none" } : {}),
                  }}
                  disabled={savingForm}
                >
                  {savingForm ? "Đang lưu…" : createOpen ? "Tạo" : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {opModalOpen && (
        <div style={styles.opModalOverlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {opCreate ? "Thêm bài học" : "Sửa bài học"}
            </h3>
            <p style={styles.modalContext}>
              Chủ đề: <strong>{opForTypeName}</strong>
            </p>
            <form onSubmit={saveOp}>
              <label style={styles.label}>
                Tên bài học
                <input
                  type="text"
                  value={opName}
                  onChange={(e) => setOpName(e.target.value)}
                  style={styles.inputLight}
                  required
                  autoFocus
                />
              </label>
              <CurriculumImageField
                kind="lesson"
                label="Ảnh bài học"
                value={opFormImage}
                onChange={setOpFormImage}
                disabled={savingOp}
                hint="Hiển thị trên ô bài học ở lộ trình (nếu trống dùng ảnh mặc định)."
              />
              {opFormError && (
                <div style={styles.formError} role="alert">
                  {opFormError}
                </div>
              )}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={closeOpModal}
                  disabled={savingOp}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.btnPrimaryModal,
                    ...(savingOp ? { opacity: 0.75, pointerEvents: "none" } : {}),
                  }}
                  disabled={savingOp}
                >
                  {savingOp ? "Đang lưu…" : opCreate ? "Thêm" : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {hasPendingOrderChanges && (
        <OrderSaveBar
          saving={savingOrder}
          onCancel={cancelOrderChanges}
          onSave={saveOrderChanges}
        />
      )}

      {blockModalOpen && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="block-del-title">
          <div style={styles.modal}>
            <h3 id="block-del-title" style={styles.modalTitleWarn}>
              Không thể xóa
            </h3>
            <p style={styles.blockModalBody}>{blockModalText}</p>
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.btnPrimaryModal}
                onClick={() => {
                  setBlockModalOpen(false);
                  setBlockModalText("");
                }}
              >
                Đã hiỒu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DragHandle({ disabled, label, onDragStart, onDragEnd }) {
  return (
    <button
      type="button"
      draggable={!disabled}
      aria-label={label}
      title={disabled ? "Xóa từ khóa tìm kiếm để kéo thả" : label}
      disabled={disabled}
      style={{
        ...dragStyles.handle,
        ...(disabled ? dragStyles.handleDisabled : {}),
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => e.stopPropagation()}
    >
      <GripIcon />
    </button>
  );
}

function OrderSaveBar({ saving, onCancel, onSave }) {
  return (
    <div style={saveBarStyles.wrap} role="region" aria-label="Lưu thay đổi thứ tự">
      <div style={saveBarStyles.bar}>
        <button
          type="button"
          style={saveBarStyles.cancelBtn}
          onClick={onCancel}
          disabled={saving}
        >
          Hủy
        </button>
        <button
          type="button"
          style={{
            ...saveBarStyles.saveBtn,
            ...(saving ? { opacity: 0.75, pointerEvents: "none" } : {}),
          }}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Đang lưu…" : "Cập nhật ngay"}
        </button>
      </div>
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#57606a" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

const dragStyles = {
  cell: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  orderNum: {
    minWidth: 22,
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "#57606a",
    textAlign: "center",
  },
  handle: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    padding: 0,
    border: "1px solid #d0d7de",
    borderRadius: 8,
    background: "#f6f8fa",
    cursor: "grab",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  handleDisabled: {
    opacity: 0.35,
    cursor: "not-allowed",
  },
};

const saveBarStyles = {
  wrap: {
    position: "fixed",
    right: 24,
    bottom: 24,
    zIndex: 1200,
    pointerEvents: "none",
  },
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "#fff",
    borderRadius: 999,
    boxShadow: "0 8px 28px rgba(27, 31, 35, 0.18), 0 2px 8px rgba(27, 31, 35, 0.08)",
    border: "1px solid #d0d7de",
    pointerEvents: "auto",
  },
  cancelBtn: {
    padding: "10px 18px",
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  saveBtn: {
    padding: "10px 22px",
    border: "none",
    borderRadius: 999,
    background: "#0969da",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 1px 0 rgba(27, 31, 35, 0.04)",
  },
};

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#57606a"
      strokeWidth="2"
      style={{ display: "block", verticalAlign: "middle" }}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
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

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#24292f" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4 11.5-11.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cf222e" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
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
    marginBottom: 20,
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
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(31,35,40,0.08)",
  },
  btnIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    padding: "14px 16px",
    background: "#fff",
    border: "1px solid #d0d7de",
    maxWidth: 480,
  },
  filterLabel: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#24292f",
  },
  filterSelect: {
    flex: 1,
    minWidth: 200,
    padding: "10px 12px",
    fontSize: "0.95rem",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
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
  searchWrap: {
    flex: 1,
    minWidth: 240,
    display: "flex",
    alignItems: "center",
    border: "1px solid #d0d7de",
    borderRadius: 10,
    background: "#fff",
    overflow: "hidden",
    fontFamily: "inherit",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
    padding: "11px 8px 11px 14px",
    fontSize: "0.95rem",
    lineHeight: 1.4,
    border: "none",
    background: "transparent",
    color: "#24292f",
    outline: "none",  
    fontFamily: "inherit",
  },
  searchIconSlot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "0 12px 0 4px",
  },
  reorderHint: {
    margin: "0 0 12px",
    fontSize: "0.875rem",
    color: "#57606a",
  },
  draggingRow: {
    opacity: 0.55,
  },
  dragOverRow: {
    outline: "2px solid #0969da",
    outlineOffset: -2,
    background: "#f0f6ff",
  },
  muted: {
    color: "#57606a",
    marginBottom: 16,
  },
  mutedSmall: {
    margin: "8px 0 0",
    fontSize: "0.88rem",
    color: "#57606a",
  },
  errorBanner: {
    background: "#fff8f8",
    border: "1px solid #ff818266",
    color: "#a40e26",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: "0.9rem",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#2d5a76",
    cursor: "pointer",
    textDecoration: "underline",
    marginLeft: 8,
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #d0d7de",
    borderRadius: 0,
    background: "#fff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
  textAlign: "left",
  padding: "14px 16px",
  background: "#2d5a76",  
  color: "#fff",          
  fontWeight: 700,
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #d0d7de",
},
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #eaeef2",
    verticalAlign: "top",
    color: "#24292f",
  },
  typeRow: {
    cursor: "pointer",
  },
  typeNameToggle: {
    padding: 0,
    margin: 0,
    border: "none",
    background: "none",
    cursor: "inherit",
    textAlign: "left",
    font: "inherit",
    color: "#2d5a76",
    fontWeight: 700,
    maxWidth: "100%",
  },
  typeCardTitle: {
    fontSize: "0.95rem",
    lineHeight: 1.45,
    color: "#2d5a76",
    fontWeight: 700,
    wordBreak: "break-word",
  },
  nestedCell: {
    padding: 0,
    borderBottom: "1px solid #d0d7de",
    background: "#f6f8fa",
    verticalAlign: "top",
  },
  nestedPanel: {
    padding: "14px 16px 16px 28px",
    borderLeft: "3px solid #2d5a76",
  },
  nestedHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  nestedTitle: {
    fontSize: "0.88rem",
    fontWeight: 700,
    color: "#24292f",
  },
  btnAddOp: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #2d5a76",
    background: "#fff",
    color: "#2d5a76",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  nestedTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.85rem",
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    overflow: "hidden",
  },
  nestedTh: {
  textAlign: "left",
  padding: "10px 12px",
  background: "#2d5a76",  
  color: "#fff",          
  fontWeight: 700,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  borderBottom: "1px solid #d0d7de",
},
  nestedTd: {
    padding: "10px 12px",
    borderBottom: "1px solid #eaeef2",
    verticalAlign: "middle",
    color: "#24292f",
  },
  iconBtnSm: {
    width: 32,
    height: 32,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    cursor: "pointer",
    verticalAlign: "middle",
  },
  tdEmpty: {
    padding: "28px 16px",
    textAlign: "center",
    color: "#57606a",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
  },
  typeCard: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(31,35,40,0.06)",
  },
  typeCardMain: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "14px 16px",
    cursor: "pointer",
    outline: "none",
  },
  cardField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  cardLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#57606a",
  },
  cardValue: {
    fontSize: "0.95rem",
    lineHeight: 1.45,
    color: "#24292f",
  },
  cardHint: {
    margin: 0,
    fontSize: "0.8rem",
    color: "#6e7781",
    lineHeight: 1.4,
  },
  cardActions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    padding: "10px 16px 14px",
    borderTop: "1px solid #eaeef2",
    background: "#fafbfc",
  },
  cardEmpty: {
    padding: "24px 16px",
    textAlign: "center",
    color: "#57606a",
    fontSize: "0.95rem",
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 10,
  },
  typeCardNested: {
    padding: "14px 16px 16px",
    borderTop: "1px solid #d0d7de",
    background: "#f6f8fa",
    borderLeft: "3px solid #2d5a76",
  },
  lessonCardList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 4,
  },
  lessonCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "12px 14px",
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: 10,
    boxSizing: "border-box",
  },
  lessonCardActions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10,
    borderTop: "1px solid #eaeef2",
  },
  iconBtn: {
    width: 36,
    height: 36,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    cursor: "pointer",
    verticalAlign: "middle",
  },
  formError: {
    marginBottom: 12,
    padding: "10px 12px",
    fontSize: "0.88rem",
    color: "#9a3412",
    background: "#fff8f5",
    border: "1px solid #f0c4a8",
    borderRadius: 8,
    lineHeight: 1.45,
  },
  modalTitleWarn: {
    margin: "0 0 12px",
    fontSize: "1.1rem",
    color: "#9a3412",
    fontWeight: 700,
  },
  blockModalBody: {
    margin: "0 0 18px",
    fontSize: "0.95rem",
    color: "#24292f",
    lineHeight: 1.55,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(31, 35, 40, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
    padding: 16,
  },
  opModalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(31, 35, 40, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 320,
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 440,
    background: "#fff",
    borderRadius: 12,
    padding: "24px",
    boxShadow: "0 8px 32px rgba(31,35,40,0.2)",
    border: "1px solid #d0d7de",
  },
  modalTitle: {
    margin: "0 0 8px",
    fontSize: "1.15rem",
    color: "#1f2328",
    fontWeight: 700,
  },
  modalContext: {
    margin: "0 0 16px",
    fontSize: "0.9rem",
    color: "#57606a",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#24292f",
    fontSize: "0.88rem",
    fontWeight: 600,
    marginBottom: 14,
  },
  inputLight: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#2d5a76",
    fontSize: "0.95rem",
    fontFamily: "inherit",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  btnSecondary: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    color: "#24292f",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnPrimaryModal: {
    padding: "8px 18px",
    borderRadius: 8,
    border: "none",
    background: "#2d5a76",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
