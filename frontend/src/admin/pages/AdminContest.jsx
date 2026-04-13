import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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

/** Tách ISO / Date → ngày + giờ 24h (địa phương), dùng cho input date + time — không dùng thư viện. */
function isoToDateTimeParts(iso) {
  if (iso == null || iso === "") {
    return { date: "", time: "00:00" };
  }
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: "", time: "00:00" };
  }
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

/** Ghép YYYY-MM-DD + HH:mm (24h) → ISO — parse theo giờ địa phương của trình duyệt */
function dateTimePartsToIso(dateStr, timeStr) {
  if (!dateStr || !String(dateStr).trim()) return null;
  const t = timeStr && String(timeStr).trim() ? String(timeStr).trim() : "00:00";
  const d = new Date(`${dateStr.trim()}T${t}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function localScheduleToMs(dateStr, timeStr) {
  if (!dateStr || !String(dateStr).trim()) return NaN;
  const t = timeStr && String(timeStr).trim() ? String(timeStr).trim() : "00:00";
  const d = new Date(`${dateStr.trim()}T${t}`);
  return d.getTime();
}

function formatContestSchedule(startsAt, endsAt) {
  if (!startsAt && !endsAt) return "—";
  const opts = { dateStyle: "short", timeStyle: "short" };
  const s = startsAt ? new Date(startsAt).toLocaleString("vi-VN", opts) : "—";
  const e = endsAt ? new Date(endsAt).toLocaleString("vi-VN", opts) : "—";
  return `${s} → ${e}`;
}

const MOCK_CONTESTS = [
  {
    id: 101,
    name: "Contest tuần 1 - Số học",
    week: "Tuần 1",
    status: "published",
    description: "Bài kiểm tra tuần đầu dành cho lớp 4.",
    examId: 8,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 86400000 * 8).toISOString(),
  },
  {
    id: 102,
    name: "Contest tuần 2 - Hình học",
    week: "Tuần 2",
    status: "scheduled",
    description: "Contest tuần 2 đang được lên lịch.",
    examId: 7,
    startsAt: null,
    endsAt: null,
  },
  {
    id: 103,
    name: "Contest tuần 3 - Luyện thi",
    week: "Tuần 3",
    status: "published",
    description: "Contest luyện thi giữa học kỳ.",
    examId: 3,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 3600000 * 48).toISOString(),
  },
  {
    id: 104,
    name: "Contest tuần 4 - Ôn tập",
    week: "Tuần 4",
    status: "archived",
    description: "Contest đã lưu trữ từ kỳ trước.",
    examId: 4,
    startsAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    endsAt: new Date(Date.now() - 86400000 * 23).toISOString(),
  },
];

export default function AdminContest() {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [statusId, setStatusId] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedContestId, setExpandedContestId] = useState("101");
  const [contests, setContests] = useState(MOCK_CONTESTS);
  const [editingContest, setEditingContest] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("published");
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("00:00");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEndTime, setEditEndTime] = useState("23:59");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newContestName, setNewContestName] = useState("");
  const [newContestDescription, setNewContestDescription] = useState("");
  const [newContestStatus, setNewContestStatus] = useState("published");
  const [newStartDate, setNewStartDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("00:00");
  const [newEndDate, setNewEndDate] = useState("");
  const [newEndTime, setNewEndTime] = useState("23:59");

  const selectedStatus = STATUS_OPTIONS.find((item) => item.id === statusId);

  const onEditStartDateChange = (e) => {
    const next = e.target.value;
    if (next !== editStartDate) setEditStartTime("00:00");
    setEditStartDate(next);
  };
  const onEditEndDateChange = (e) => {
    const next = e.target.value;
    if (next !== editEndDate) setEditEndTime("23:59");
    setEditEndDate(next);
  };
  const onNewStartDateChange = (e) => {
    const next = e.target.value;
    if (next !== newStartDate) setNewStartTime("00:00");
    setNewStartDate(next);
  };
  const onNewEndDateChange = (e) => {
    const next = e.target.value;
    if (next !== newEndDate) setNewEndTime("23:59");
    setNewEndDate(next);
  };

  const openEditModal = (contest) => {
    setEditingContest(contest);
    setEditName(contest.name);
    setEditDescription(contest.description || "");
    setEditStatus(contest.status);
    const s = isoToDateTimeParts(contest.startsAt);
    const e = isoToDateTimeParts(contest.endsAt);
    setEditStartDate(s.date);
    setEditStartTime(s.time);
    setEditEndDate(e.date);
    setEditEndTime(e.time);
  };

  const closeEditModal = () => {
    setEditingContest(null);
  };

  const saveEditModal = () => {
    if (!editingContest) return;
    if (editStartDate && editEndDate) {
      const t0 = localScheduleToMs(editStartDate, editStartTime);
      const t1 = localScheduleToMs(editEndDate, editEndTime);
      if (!Number.isNaN(t0) && !Number.isNaN(t1) && t1 < t0) {
        window.alert("Thời gian kết thúc phải sau hoặc bằng thời gian bắt đầu.");
        return;
      }
    }
    const startsAt = dateTimePartsToIso(editStartDate, editStartTime);
    const endsAt = dateTimePartsToIso(editEndDate, editEndTime);
    setContests((prev) =>
      prev.map((contest) =>
        contest.id === editingContest.id
          ? {
              ...contest,
              name: editName,
              description: editDescription.trim(),
              status: editStatus,
              startsAt,
              endsAt,
            }
          : contest
      )
    );
    closeEditModal();
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setNewContestName("");
    setNewContestDescription("");
    setNewContestStatus("published");
    setNewStartDate("");
    setNewStartTime("00:00");
    setNewEndDate("");
    setNewEndTime("23:59");
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const saveCreateModal = () => {
    if (!newContestName.trim()) return;
    if (newStartDate && newEndDate) {
      const t0 = localScheduleToMs(newStartDate, newStartTime);
      const t1 = localScheduleToMs(newEndDate, newEndTime);
      if (!Number.isNaN(t0) && !Number.isNaN(t1) && t1 < t0) {
        window.alert("Thời gian kết thúc phải sau hoặc bằng thời gian bắt đầu.");
        return;
      }
    }
    const nextId = Math.max(0, ...contests.map((contest) => contest.id)) + 1;
    const newContest = {
      id: nextId,
      name: newContestName.trim(),
      status: newContestStatus,
      description: newContestDescription.trim() || "Chưa có mô tả.",
      examId: null,
      startsAt: dateTimePartsToIso(newStartDate, newStartTime),
      endsAt: dateTimePartsToIso(newEndDate, newEndTime),
    };
    setContests((prev) => [...prev, newContest]);
    closeCreateModal();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contests.filter((contest) => {
      const matchesStatus = statusId === "all" || contest.status === statusId;
      const matchesSearch = `${contest.id} ${contest.name} ${contest.description} ${contest.week} ${formatContestSchedule(
        contest.startsAt,
        contest.endsAt
      )} ${
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

  const renderExamAssignment = (contest, detailsStyle = {}) => (
    <div style={{ ...styles.contestDetails, ...detailsStyle }}>
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
  );

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

      {isNarrow ? (
        <div style={styles.cardList}>
          {filtered.length === 0 ? (
            <div style={styles.cardEmpty}>Không có kết quả phù hợp với “{search}”.</div>
          ) : (
            filtered.map((contest) => (
              <article key={contest.id} style={styles.contestCard}>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>ID</span>
                  <span style={styles.cardValue}>{contest.id}</span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Tên contest</span>
                  <span style={{ ...styles.cardValue, fontWeight: 700, color: "#2d5a76" }}>
                    {contest.name}
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Mô tả</span>
                  <span style={{ ...styles.cardValue, color: "#57606a", fontSize: "0.88rem" }}>
                    {contest.description || "—"}
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Thời gian diễn ra</span>
                  <span style={{ ...styles.cardValue, fontSize: "0.85rem" }}>
                    {formatContestSchedule(contest.startsAt, contest.endsAt)}
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Exam được chọn</span>
                  {contest.examId ? (
                    <span>
                      <span style={{ ...styles.cardValue, fontWeight: 700, color: "#2d5a76", display: "block" }}>
                        {MOCK_EXAMS.find((e) => e.id === contest.examId)?.name}
                      </span>
                      <span style={styles.mutedSmall}>{MOCK_EXAMS.find((e) => e.id === contest.examId)?.grade}</span>
                    </span>
                  ) : (
                    <span style={styles.mutedSmall}>Chưa chọn exam</span>
                  )}
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Trạng thái</span>
                  <span>
                    <span style={styles.statusBadge[contest.status] || styles.statusBadge.default}>
                      {STATUS_OPTIONS.find((item) => item.id === contest.status)?.name || contest.status}
                    </span>
                  </span>
                </div>
                <div style={styles.cardExamWrap}>
                  {renderExamAssignment(contest, { marginTop: 0 })}
                </div>
                <div style={styles.cardActions}>
                  <button
                    type="button"
                    style={styles.iconBtn}
                    title="Chỉnh sửa"
                    onClick={() => openEditModal(contest)}
                  >
                    <PencilIcon />
                  </button>
                  <button type="button" style={styles.iconBtn} title="Xóa" onClick={() => {}}>
                    <TrashIcon />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Tên contest</th>
                <th style={styles.th}>Mô tả</th>
                <th style={{ ...styles.th, minWidth: 200 }}>Thời gian</th>
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
                  <td colSpan={7} style={styles.tdEmpty}>
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
                        <td style={{ ...styles.td, color: "#57606a", fontSize: "0.88rem", maxWidth: 280 }}>
                          <div style={styles.tableDesc}>{contest.description || "—"}</div>
                        </td>
                        <td style={{ ...styles.td, fontSize: "0.82rem", color: "#57606a", whiteSpace: "nowrap" }}>
                          {formatContestSchedule(contest.startsAt, contest.endsAt)}
                        </td>
                        <td style={styles.td}>
                          {contest.examId ? (
                            <div>
                              <div style={styles.examName}>
                                {MOCK_EXAMS.find((e) => e.id === contest.examId)?.name}
                              </div>
                              <div style={styles.mutedSmall}>
                                {MOCK_EXAMS.find((e) => e.id === contest.examId)?.grade}
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
                          <td colSpan={7} style={styles.nestedCell}>
                            <div style={styles.nestedPanel}>
                              <div style={styles.nestedHeader} />
                              {renderExamAssignment(contest)}
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

      <p style={styles.demoNote}>
        Giao diện demo — chưa nối API. Trên màn hình lớn: bấm dòng để mở phần chọn exam. Trên mobile: danh sách dạng thẻ,
        phần chọn exam luôn hiển thị ngay trong từng thẻ.
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
              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="edit-contest-name">
                  Tên contest
                </label>
                <input
                  id="edit-contest-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={styles.modalTextInput}
                />
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="edit-contest-description">
                  Mô tả
                </label>
                <textarea
                  id="edit-contest-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Mô tả ngắn về contest"
                  rows={3}
                  style={styles.modalTextarea}
                />
              </div>

              <div style={styles.modalField}>
                <span style={styles.modalLabel}>Thời gian bắt đầu</span>
                <div style={styles.modalDateTimeRow} lang="en-GB">
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={onEditStartDateChange}
                    style={styles.modalDateInput}
                    aria-label="Ngày bắt đầu"
                  />
                  <input
                    type="time"
                    step={60}
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    style={styles.modalTimeInput}
                    aria-label="Giờ bắt đầu (24h)"
                  />
                </div>
              </div>
              <div style={styles.modalField}>
                <span style={styles.modalLabel}>Thời gian kết thúc</span>
                <div style={styles.modalDateTimeRow} lang="en-GB">
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={onEditEndDateChange}
                    style={styles.modalDateInput}
                    aria-label="Ngày kết thúc"
                  />
                  <input
                    type="time"
                    step={60}
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    style={styles.modalTimeInput}
                    aria-label="Giờ kết thúc (24h)"
                  />
                </div>
              </div>
              <p style={styles.modalScheduleHint}>
                Đổi ngày: giờ bắt đầu về 00:00, giờ kết thúc về 23:59 (có thể chỉnh lại). Ô giờ dùng định dạng 24h.
              </p>

              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="edit-contest-status">
                  Trạng thái
                </label>
                <select
                  id="edit-contest-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={styles.modalSelect}
                >
                {STATUS_OPTIONS.filter((item) => item.id !== "all").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
                </select>
              </div>
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
              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="create-contest-name">
                  Tên contest
                </label>
                <input
                  id="create-contest-name"
                  type="text"
                  value={newContestName}
                  onChange={(e) => setNewContestName(e.target.value)}
                  placeholder="Nhập tên contest"
                  style={styles.modalTextInput}
                />
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="create-contest-description">
                  Mô tả
                </label>
                <textarea
                  id="create-contest-description"
                  value={newContestDescription}
                  onChange={(e) => setNewContestDescription(e.target.value)}
                  placeholder="Mô tả ngắn về contest"
                  rows={3}
                  style={styles.modalTextarea}
                />
              </div>

              <div style={styles.modalField}>
                <span style={styles.modalLabel}>Thời gian bắt đầu</span>
                <div style={styles.modalDateTimeRow} lang="en-GB">
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={onNewStartDateChange}
                    style={styles.modalDateInput}
                    aria-label="Ngày bắt đầu"
                  />
                  <input
                    type="time"
                    step={60}
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    style={styles.modalTimeInput}
                    aria-label="Giờ bắt đầu (24h)"
                  />
                </div>
              </div>
              <div style={styles.modalField}>
                <span style={styles.modalLabel}>Thời gian kết thúc</span>
                <div style={styles.modalDateTimeRow} lang="en-GB">
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={onNewEndDateChange}
                    style={styles.modalDateInput}
                    aria-label="Ngày kết thúc"
                  />
                  <input
                    type="time"
                    step={60}
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    style={styles.modalTimeInput}
                    aria-label="Giờ kết thúc (24h)"
                  />
                </div>
              </div>
              <p style={styles.modalScheduleHint}>
                Đổi ngày: giờ bắt đầu về 00:00, giờ kết thúc về 23:59 (có thể chỉnh lại). Ô giờ dùng định dạng 24h.
              </p>

              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="create-contest-status">
                  Trạng thái
                </label>
                <select
                  id="create-contest-status"
                  value={newContestStatus}
                  onChange={(e) => setNewContestStatus(e.target.value)}
                  style={styles.modalSelect}
                >
                {STATUS_OPTIONS.filter((item) => item.id !== "all").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
                </select>
              </div>
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
  /* Đồng bộ với AdminExams / các trang admin khác */
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
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  },
  contestCard: {
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
  cardExamWrap: {
    marginBottom: 14,
    padding: "14px 12px 16px",
    background: "#f6f8fa",
    border: "1px solid #e1e4e8",
    borderLeft: "3px solid #2d5a76",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
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
    border: "1px solid #d0d7de",
    borderRadius: 0,
    background: "#fff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
    minWidth: 1120,
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
    color: "#2d5a76",
    textAlign: "left",
  },
  tableDesc: {
    margin: 0,
    lineHeight: 1.45,
    overflowWrap: "anywhere",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  statusBadge: {
    default: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 10px",
      borderRadius: 999,
      background: "#f1f8ff",
      color: "#2d5a76",
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
      color: "#2d5a76",
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
    borderLeft: "3px solid #2d5a76",
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
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
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
    background: "#2d5a76",
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
    width: "min(560px, calc(100vw - 32px))",
    maxWidth: "100%",
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 24px 56px rgba(15, 23, 42, 0.18)",
    padding: 24,
    boxSizing: "border-box",
    minWidth: 0,
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
    gap: 18,
    marginBottom: 20,
    minWidth: 0,
  },
  modalField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
  },
  modalLabel: {
    display: "block",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#24292f",
    margin: 0,
  },
  modalTextInput: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.45,
    overflowWrap: "anywhere",
  },
  modalDateTimeRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    width: "100%",
    minWidth: 0,
  },
  modalDateInput: {
    boxSizing: "border-box",
    flex: "1 1 180px",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.45,
  },
  modalTimeInput: {
    boxSizing: "border-box",
    flex: "0 1 128px",
    minWidth: 104,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.45,
  },
  modalScheduleHint: {
    margin: "-4px 0 0",
    fontSize: "0.8rem",
    color: "#6e7781",
    lineHeight: 1.45,
  },
  modalTextarea: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.45,
    resize: "vertical",
    minHeight: 88,
    overflowWrap: "anywhere",
  },
  modalSelect: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d0d7de",
    fontSize: "0.95rem",
    color: "#24292f",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.45,
    cursor: "pointer",
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
