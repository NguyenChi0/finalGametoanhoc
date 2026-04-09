import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STATUS_OPTIONS = [
  { id: "all", name: "Tất cả trạng thái" },
  { id: "scheduled", name: "Đã lên lịch" },
  { id: "published", name: "Đã công khai" },
  { id: "archived", name: "Đã lưu trữ" },
];

const MOCK_EXAMS = [
  { id: 1, name: "Đề kiểm tra giữa kỳ", grade: "Lớp 4", description: "Chưa có mô tả." },
  { id: 2, name: "Đề ôn tuần 1", grade: "Lớp 4", description: "Chưa có mô tả." },
  { id: 3, name: "Đề kiểm tra cuối kỳ", grade: "Lớp 5", description: "Chưa có mô tả." },
  { id: 4, name: "Đề ôn tập học kỳ", grade: "Lớp 5", description: "Chưa có mô tả." },
  { id: 5, name: "Đề toán cơ bản", grade: "Lớp 1", description: "Chưa có mô tả." },
  { id: 6, name: "Đề toán nâng cao", grade: "Lớp 2", description: "Chưa có mô tả." },
  { id: 7, name: "Đề hình học", grade: "Lớp 3", description: "Chưa có mô tả." },
  { id: 8, name: "Đề số học", grade: "Lớp 4", description: "Chưa có mô tả." },
  { id: 9, name: "Đề đại số", grade: "Lớp 5", description: "Chưa có mô tả." },
];

const MOCK_CONTESTS = [
  {
    id: 101,
    name: "Contest tuần 1 - Số học",
    week: "Tuần 1",
    status: "published",
    description: "Bài kiểm tra tuần đầu dành cho lớp 4.",
    examId: 8,
  },
  {
    id: 102,
    name: "Contest tuần 2 - Hình học",
    week: "Tuần 2",
    status: "scheduled",
    description: "Contest tuần 2 đang được lên lịch.",
    examId: 7,
  },
  {
    id: 103,
    name: "Contest tuần 3 - Luyện thi",
    week: "Tuần 3",
    status: "published",
    description: "Contest luyện thi giữa học kỳ.",
    examId: 3,
  },
  {
    id: 104,
    name: "Contest tuần 4 - Ôn tập",
    week: "Tuần 4",
    status: "archived",
    description: "Contest đã lưu trữ từ kỳ trước.",
    examId: 4,
  },
];

export default function AdminContest() {
  const [statusId, setStatusId] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedContestId, setExpandedContestId] = useState("101");
  const [contests, setContests] = useState(MOCK_CONTESTS);
  const [editingContest, setEditingContest] = useState(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("published");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newContestName, setNewContestName] = useState("");
  const [newContestStatus, setNewContestStatus] = useState("published");

  const selectedStatus = STATUS_OPTIONS.find((item) => item.id === statusId);

  const openEditModal = (contest) => {
    setEditingContest(contest);
    setEditName(contest.name);
    setEditStatus(contest.status);
  };

  const closeEditModal = () => {
    setEditingContest(null);
  };

  const saveEditModal = () => {
    if (!editingContest) return;
    setContests((prev) =>
      prev.map((contest) =>
        contest.id === editingContest.id
          ? { ...contest, name: editName, status: editStatus }
          : contest
      )
    );
    closeEditModal();
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setNewContestName("");
    setNewContestStatus("published");
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const saveCreateModal = () => {
    if (!newContestName.trim()) return;
    const nextId = Math.max(0, ...contests.map((contest) => contest.id)) + 1;
    const newContest = {
      id: nextId,
      name: newContestName.trim(),
      status: newContestStatus,
      description: "Contest mới vừa được tạo.",
      examId: null,
    };
    setContests((prev) => [...prev, newContest]);
    closeCreateModal();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contests.filter((contest) => {
      const matchesStatus = statusId === "all" || contest.status === statusId;
      const matchesSearch = `${contest.id} ${contest.name} ${contest.description} ${contest.week} ${
        contest.examId ? MOCK_EXAMS.find((e) => e.id === contest.examId)?.name : ""
      } ${contest.examId ? MOCK_EXAMS.find((e) => e.id === contest.examId)?.grade : ""}`
        .toLowerCase()
        .includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [search, statusId, contests]);

  const toggleExpand = (contest) => {
    const id = String(contest.id);
    setExpandedContestId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Quản lý contest</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Quản lý contest</h1>
          <p style={styles.lead}>
            Quản lý các contest tuần — mỗi contest ứng với 1 exam, theo dõi trạng thái và điều chỉnh chi tiết.
          </p>
        </div>
        <button type="button" style={styles.btnPrimary} onClick={openCreateModal}>
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo contest mới
        </button>
      </header>

      <section style={styles.filterCard} aria-label="Lọc trạng thái contest">
        <label style={styles.filterLabel} htmlFor="admin-contest-status">
          Trạng thái
        </label>
        <select
          id="admin-contest-status"
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
          style={styles.filterSelect}
        >
          {STATUS_OPTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </section>

      <div style={styles.toolbar}>
        <p style={styles.statLine}>
          {selectedStatus ? (
            <>
              Contest ({selectedStatus.name}) : <span style={styles.statNumber}>{filtered.length}</span>
            </>
          ) : (
            <>
              Contest : <span style={styles.statNumber}>{filtered.length}</span>
            </>
          )}
        </p>
        <div style={styles.searchWrap}>
          <input
            type="search"
            placeholder="Tìm theo tên contest, tuần, exam hoặc mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
            aria-label="Tìm kiếm contest"
          />
          <span style={styles.searchIconSlot} aria-hidden>
            <SearchIcon />
          </span>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Tên contest</th>
              <th style={styles.th}>Exam được chọn</th>
              <th style={styles.th}>Trạng thái</th>
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
              filtered.map((contest) => {
                const cid = String(contest.id);
                const isOpen = expandedContestId === cid;
                return (
                  <React.Fragment key={contest.id}>
                    <tr
                      style={styles.dataRow}
                      onClick={() => toggleExpand(contest)}
                      aria-expanded={isOpen}
                    >
                      <td style={styles.td}>{contest.id}</td>
                      <td style={styles.td}>
                        <div style={styles.examName}>{contest.name}</div>
                      </td>
                      <td style={styles.td}>
                        {contest.examId ? (
                          <div>
                            <div style={styles.examName}>
                              {MOCK_EXAMS.find(e => e.id === contest.examId)?.name}
                            </div>
                            <div style={styles.mutedSmall}>
                              {MOCK_EXAMS.find(e => e.id === contest.examId)?.grade}
                            </div>
                          </div>
                        ) : (
                          <div style={styles.mutedSmall}>Chưa chọn exam</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.statusBadge[contest.status] || styles.statusBadge.default}>
                          {STATUS_OPTIONS.find((item) => item.id === contest.status)?.name || contest.status}
                        </span>
                      </td>
                      <td
                        style={{ ...styles.td, textAlign: "right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          style={styles.iconBtn}
                          title="Chỉnh sửa"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(contest);
                          }}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          style={{ ...styles.iconBtn, marginLeft: 8 }}
                          title="Xóa"
                          onClick={() => {}}
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
                            </div>
                            <div style={styles.contestDetails}>
                              <div style={styles.detailRow}>
                                <label style={styles.detailLabel} htmlFor={`exam-select-${contest.id}`}>
                                  Chọn exam cho contest
                                </label>
                                <select
                                  id={`exam-select-${contest.id}`}
                                  style={styles.detailSelect}
                                  defaultValue={contest.examId || ""}
                                >
                                  <option value="">-- Chọn exam --</option>
                                  {MOCK_EXAMS.map((exam) => (
                                    <option key={exam.id} value={exam.id}>
                                      {exam.name} ({exam.grade})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div style={styles.detailActions}>
                                <button type="button" style={styles.btnSave}>
                                  Lưu thay đổi
                                </button>
                                <button type="button" style={styles.btnCancel}>
                                  Hủy
                                </button>
                              </div>
                            </div>
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

      <p style={styles.demoNote}>
        Giao diện demo — chưa nối API. Bấm dòng để xem/điều chỉnh chi tiết contest và chọn exam.
      </p>

      {editingContest && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="edit-contest-title">
            <div style={styles.modalHeader}>
              <h2 id="edit-contest-title" style={styles.modalTitle}>
                Chỉnh sửa contest
              </h2>
              <button type="button" style={styles.modalClose} onClick={closeEditModal} aria-label="Đóng">
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.modalLabel} htmlFor="edit-contest-name">
                Tên contest
              </label>
              <input
                id="edit-contest-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={styles.modalInput}
              />

              <label style={styles.modalLabel} htmlFor="edit-contest-status">
                Trạng thái
              </label>
              <select
                id="edit-contest-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={styles.modalInput}
              >
                {STATUS_OPTIONS.filter((item) => item.id !== "all").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.modalActions}>
              <button type="button" style={styles.btnSave} onClick={saveEditModal}>
                Lưu
              </button>
              <button type="button" style={styles.btnCancel} onClick={closeEditModal}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="create-contest-title">
            <div style={styles.modalHeader}>
              <h2 id="create-contest-title" style={styles.modalTitle}>
                Tạo contest mới
              </h2>
              <button type="button" style={styles.modalClose} onClick={closeCreateModal} aria-label="Đóng">
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.modalLabel} htmlFor="create-contest-name">
                Tên contest
              </label>
              <input
                id="create-contest-name"
                type="text"
                value={newContestName}
                onChange={(e) => setNewContestName(e.target.value)}
                style={styles.modalInput}
              />

              <label style={styles.modalLabel} htmlFor="create-contest-status">
                Trạng thái
              </label>
              <select
                id="create-contest-status"
                value={newContestStatus}
                onChange={(e) => setNewContestStatus(e.target.value)}
                style={styles.modalInput}
              >
                {STATUS_OPTIONS.filter((item) => item.id !== "all").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.modalActions}>
              <button type="button" style={styles.btnSave} onClick={saveCreateModal}>
                Tạo contest
              </button>
              <button type="button" style={styles.btnCancel} onClick={closeCreateModal}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
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
      style={{ display: "block" }}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
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
    color: "#0969da",
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
  /* Đồng bộ với AdminExams / các trang admin khác */
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: "#0969da",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.95rem",
    fontFamily: "inherit",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 1px 2px rgba(31,35,40,0.08)",
  },
  btnIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    maxWidth: 640,
  },
  filterCard: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    marginBottom: 24,
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: 10,
    maxWidth: 480,
    boxSizing: "border-box",
  },
  filterLabel: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#24292f",
    flexShrink: 0,
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
  },
  searchIconSlot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "0 12px 0 4px",
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
    background: "#f6f8fa",
    color: "#24292f",
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
  tdEmpty: {
    padding: "28px 16px",
    textAlign: "center",
    color: "#57606a",
  },
  dataRow: {
    cursor: "pointer",
  },
  examName: {
    fontWeight: 700,
    color: "#0969da",
    textAlign: "left",
  },
  statusBadge: {
    default: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 10px",
      borderRadius: 999,
      background: "#f1f8ff",
      color: "#0969da",
      fontSize: "0.82rem",
      fontWeight: 700,
      textTransform: "capitalize",
    },
    scheduled: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 10px",
      borderRadius: 999,
      background: "#fff4e8",
      color: "#a25b00",
      fontSize: "0.82rem",
      fontWeight: 700,
      textTransform: "capitalize",
    },
    published: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 10px",
      borderRadius: 999,
      background: "#ddf4ff",
      color: "#0969da",
      fontSize: "0.82rem",
      fontWeight: 700,
      textTransform: "capitalize",
    },
    archived: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 10px",
      borderRadius: 999,
      background: "#f6f8fa",
      color: "#57606a",
      fontSize: "0.82rem",
      fontWeight: 700,
      textTransform: "capitalize",
    },
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
  nestedCell: {
    padding: 0,
    borderBottom: "1px solid #d0d7de",
    background: "#f6f8fa",
    verticalAlign: "top",
  },
  nestedPanel: {
    padding: "14px 16px 16px 28px",
    borderLeft: "3px solid #0969da",
  },
  nestedHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  mutedSmall: {
    margin: 0,
    fontSize: "0.88rem",
    color: "#57606a",
    lineHeight: 1.45,
  },
  contestDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    marginTop: 12,
  },
  detailRow: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  detailLabel: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#24292f",
  },
  detailInput: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
  },
  detailSelect: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
    cursor: "pointer",
  },
  detailTextarea: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  detailActions: {
    display: "flex",
    gap: 12,
    marginTop: 8,
  },
  btnSave: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#0969da",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  btnCancel: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    width: "min(520px, 100%)",
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 24px 56px rgba(15, 23, 42, 0.18)",
    padding: 24,
    boxSizing: "border-box",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
  },
  modalTitle: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#1f2328",
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    fontSize: "1.4rem",
    lineHeight: 1,
    cursor: "pointer",
  },
  modalBody: {
    display: "grid",
    gap: 16,
    marginBottom: 20,
  },
  modalLabel: {
    display: "block",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#24292f",
    marginBottom: 8,
  },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  demoNote: {
    marginTop: 20,
    fontSize: "0.8rem",
    color: "#6e7781",
    lineHeight: 1.45,
  },
};
