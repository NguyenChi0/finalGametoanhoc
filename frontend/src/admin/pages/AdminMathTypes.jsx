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

export default function AdminMathTypes() {
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
  const [formError, setFormError] = useState(null);
  const [savingForm, setSavingForm] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState(null);

  const [opModalOpen, setOpModalOpen] = useState(false);
  const [opCreate, setOpCreate] = useState(false);
  const [opEditId, setOpEditId] = useState(null);
  const [opForTypeId, setOpForTypeId] = useState(null);
  const [opForTypeName, setOpForTypeName] = useState("");
  const [opName, setOpName] = useState("");
  const [opFormError, setOpFormError] = useState(null);
  const [savingOp, setSavingOp] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState(null);

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
      return;
    }
    const gid = Number(filterGradeId);
    if (!Number.isFinite(gid)) return;

    setLoadingTypes(true);
    setError(null);
    try {
      const raw = await getAdminTypes({ grade_id: gid });
      const list = Array.isArray(raw) ? raw : [];
      const g = grades.find((x) => Number(x.id) === gid);
      const gradeName = g?.name || `Lớp #${gid}`;
      setTypes(
        list.map((t) => ({
          ...t,
          grade_id: t.grade_id != null ? Number(t.grade_id) : gid,
          gradeName,
          description:
            t.description == null || String(t.description).trim() === ""
              ? ""
              : String(t.description).trim(),
        }))
      );
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Không tải được chủ đề cho khối đã chọn.";
      setError(msg);
      setTypes([]);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => {
      const blob = [t.id, t.name, t.description].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [types, search]);

  const openEdit = (row) => {
    setEditId(row.id);
    setFormName(row.name);
    setFormDesc(row.description || "");
    setFormError(null);
    setEditOpen(true);
    setCreateOpen(false);
  };

  const openCreate = () => {
    if (!filterGradeId) return;
    setEditId(null);
    setFormName("");
    setFormDesc("");
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
    setFormError(null);
  };

  const saveForm = async (e) => {
    e.preventDefault();
    const name = formName.trim();
    const gid = Number(filterGradeId);
    if (!name || !Number.isFinite(gid)) return;

    const desc = formDesc.trim();
    setFormError(null);
    setSavingForm(true);
    try {
      if (createOpen) {
        await createAdminType({
          grade_id: gid,
          name,
          description: desc || null,
        });
      } else if (editId != null) {
        await updateAdminType(editId, {
          name,
          description: desc,
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
        `Xóa chủ đề "${row.name}" (ID ${row.id})?\n\nCác bài học thuộc chủ đề sẽ bị xóa theo nếu không còn câu hỏi tham chiếu. Nếu còn câu hỏi gắn chủ đề này, hệ thống sẽ không cho xóa.`
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
    setOpFormError(null);
    setOpModalOpen(true);
  };

  const openOpEdit = (op, typeRow) => {
    setOpForTypeId(typeRow.id);
    setOpForTypeName(typeRow.name);
    setOpCreate(false);
    setOpEditId(op.id);
    setOpName(op.name);
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
      if (opCreate) {
        await createAdminLesson({ type_id: opForTypeId, name });
      } else if (opEditId != null) {
        await updateAdminLesson(opEditId, { name });
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
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
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
          <option value="">— Chọn khối lớp —</option>
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
        <p style={styles.muted}>Chưa có khối lớp trong hệ thống.</p>
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
          <div style={styles.toolbar}>
            <p style={styles.statLine}>
              {selectedGrade ? (
                <>
                  Tổng số chủ đề ({selectedGrade.name}) :{" "}
                  <span style={styles.statNumber}>{types.length}</span>
                </>
              ) : (
                <>
                  Tổng số chủ đề :{" "}
                  <span style={styles.statNumber}>{types.length}</span>
                </>
              )}
            </p>
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

          {types.length === 0 ? (
            <p style={styles.muted}>
              Khối này chưa có chủ đề nào. Bạn có thể thêm mới bằng nút phía trên.
            </p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
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
                      <td colSpan={4} style={styles.tdEmpty}>
                        Không có kết quả phù hợp với “{search}”.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => {
                      const tid = String(t.id);
                      const isOpen = expandedTypeId === tid;
                      const lessons = lessonsByTypeId[tid];
                      const loadingLessons = loadingLessonsTypeId === tid;
                      return (
                        <React.Fragment key={t.id}>
                          <tr
                            style={styles.typeRow}
                            onClick={() => toggleExpand(t)}
                            aria-expanded={isOpen}
                          >
                            <td style={styles.td}>{t.id}</td>
                            <td style={styles.td}>
                              <div style={styles.typeNameToggle}>
                                {t.name}
                              </div>
                            </td>
                            <td style={{ ...styles.td, color: "#57606a" }}>
                              {t.description ? t.description : "—"}
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
                              <td colSpan={4} style={styles.nestedCell}>
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
                                      Chưa có bài học. Thêm mới bằng nút bên trên.
                                    </p>
                                  )}
                                  {!loadingLessons && lessons && lessons.length > 0 && (
                                    <table style={styles.nestedTable}>
                                      <thead>
                                        <tr>
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
                                        {lessons.map((op) => (
                                          <tr key={op.id}>
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
                                        ))}
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
          )}
        </>
      )}

      {!filterGradeId && hasGradeOptions && !loadingGrades && (
        <p style={styles.hintBox}>
          Chọn một khối lớp ở ô phía trên để hiển thị danh sách chủ đề.
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
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
    borderRadius: 10,
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
  hintBox: {
    margin: "12px 0 0",
    padding: "16px 18px",
    background: "#f6f8fa",
    border: "1px dashed #d0d7de",
    borderRadius: 10,
    color: "#57606a",
    fontSize: "0.95rem",
    lineHeight: 1.5,
    maxWidth: 520,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  statLine: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#24292f",
    fontWeight: 600,
    lineHeight: 1.4,
    whiteSpace: "nowrap",
  },
  statNumber: {
    color: "#cf222e",
    fontWeight: 700,
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
    color: "#24292f",
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
