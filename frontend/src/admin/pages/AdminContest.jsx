import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminContests,
  createAdminContest,
  updateAdminContest,
  deleteAdminContest,
  getAdminExamTemplates,
  getAdminGrades,
} from "../../api.js";

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
  { id: "ended", name: "Đã kết thúc" },
  { id: "scheduled", name: "Đã lên lịch" },
  { id: "active", name: "Đang kích hoạt" },
];

/** DB contests.status: 0 đã kết thúc, 1 đã lên lịch, 2 đang kích hoạt */
const STATUS_FROM_DB = {
  0: "ended",
  1: "scheduled",
  2: "active",
};

const STATUS_TO_DB = {
  ended: 0,
  scheduled: 1,
  active: 2,
};

function normalizeContestRow(row) {
  const st = Number(row.status);
  const code = Number.isFinite(st) && st >= 0 && st <= 2 ? st : 1;
  const statusKey = STATUS_FROM_DB[code] || "scheduled";
  const toIso = (v) => {
    if (v == null) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const nm = row.name != null && String(row.name).trim() !== "" ? String(row.name).trim() : "";
  const tpl = row.template_name != null ? String(row.template_name) : "";
  const pr = Number(row.prize);
  return {
    id: row.id,
    gradeId: row.grade_id,
    examId: row.template_id,
    name: nm || tpl || `Cuộc thi · ${row.grade_name != null ? row.grade_name : `Khối ${row.grade_id}`}`,
    templateName: tpl,
    prize: Number.isFinite(pr) && pr >= 0 ? pr : 0,
    gradeName: row.grade_name || "",
    description: row.description || "",
    startsAt: toIso(row.start_time),
    endsAt: toIso(row.end_time),
    status: statusKey,
  };
}

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

export default function AdminContest() {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [statusId, setStatusId] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedContestId, setExpandedContestId] = useState(null);
  const [contests, setContests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [grades, setGrades] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [draftTemplateId, setDraftTemplateId] = useState({});

  const [editingContest, setEditingContest] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrize, setEditPrize] = useState("0");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("scheduled");
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("00:00");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEndTime, setEditEndTime] = useState("23:59");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newContestName, setNewContestName] = useState("");
  const [newPrize, setNewPrize] = useState("0");
  const [newGradeId, setNewGradeId] = useState("");
  const [newTemplateId, setNewTemplateId] = useState("");
  const [newContestDescription, setNewContestDescription] = useState("");
  const [newContestStatus, setNewContestStatus] = useState("scheduled");
  const [newStartDate, setNewStartDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("00:00");
  const [newEndDate, setNewEndDate] = useState("");
  const [newEndTime, setNewEndTime] = useState("23:59");

  const selectedStatus = STATUS_OPTIONS.find((item) => item.id === statusId);

  const loadAll = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const [cRows, tRows, gRows] = await Promise.all([
        getAdminContests(),
        getAdminExamTemplates(),
        getAdminGrades(),
      ]);
      const list = Array.isArray(cRows) ? cRows.map(normalizeContestRow) : [];
      setContests(list);
      setTemplates(Array.isArray(tRows) ? tRows : []);
      setGrades(Array.isArray(gRows) ? gRows : []);
      const draft = {};
      list.forEach((c) => {
        draft[c.id] = c.examId != null ? String(c.examId) : "";
      });
      setDraftTemplateId(draft);
    } catch (e) {
      setError(
        e?.response?.data?.message || e.message || "Không tải được dữ liệu contest."
      );
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const templatesForGrade = useMemo(() => {
    const gid = Number(newGradeId);
    if (!gid) return [];
    return templates.filter((t) => Number(t.grade_id) === gid);
  }, [templates, newGradeId]);

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
    setEditName(contest.name || "");
    setEditPrize(String(contest.prize ?? 0));
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

  const saveEditModal = async () => {
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
    if (!startsAt || !endsAt) {
      window.alert("Vui lòng nhập đầy đủ ngày giờ bắt đầu và kết thúc.");
      return;
    }
    const en = editName.trim();
    if (!en) {
      window.alert("Tên cuộc thi không được để trống.");
      return;
    }
    let prizeNum = Number(editPrize);
    if (!Number.isFinite(prizeNum) || prizeNum < 0) prizeNum = 0;
    prizeNum = Math.min(Math.floor(prizeNum), 65535);

    setSaving(true);
    setError(null);
    try {
      await updateAdminContest(editingContest.id, {
        name: en.slice(0, 255),
        prize: prizeNum,
        start_time: startsAt,
        end_time: endsAt,
        description: editDescription.trim() || null,
        status: STATUS_TO_DB[editStatus] ?? 1,
      });
      await loadAll();
      closeEditModal();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Không lưu được contest.");
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setNewContestName("");
    setNewPrize("0");
    setNewGradeId("");
    setNewTemplateId("");
    setNewContestDescription("");
    setNewContestStatus("scheduled");
    setNewStartDate("");
    setNewStartTime("00:00");
    setNewEndDate("");
    setNewEndTime("23:59");
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const saveCreateModal = async () => {
    if (!newContestName.trim()) {
      window.alert("Nhập tên cuộc thi.");
      return;
    }
    const gid = Number(newGradeId);
    const tid = Number(newTemplateId);
    if (!gid || !tid) {
      window.alert("Chọn khối lớp và mẫu đề (exam template).");
      return;
    }
    let prizeNum = Number(newPrize);
    if (!Number.isFinite(prizeNum) || prizeNum < 0) prizeNum = 0;
    prizeNum = Math.min(Math.floor(prizeNum), 65535);
    if (newStartDate && newEndDate) {
      const t0 = localScheduleToMs(newStartDate, newStartTime);
      const t1 = localScheduleToMs(newEndDate, newEndTime);
      if (!Number.isNaN(t0) && !Number.isNaN(t1) && t1 < t0) {
        window.alert("Thời gian kết thúc phải sau hoặc bằng thời gian bắt đầu.");
        return;
      }
    }
    const startsAt = dateTimePartsToIso(newStartDate, newStartTime);
    const endsAt = dateTimePartsToIso(newEndDate, newEndTime);
    if (!startsAt || !endsAt) {
      window.alert("Vui lòng nhập đầy đủ ngày giờ bắt đầu và kết thúc.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAdminContest({
        name: newContestName.trim().slice(0, 255),
        prize: prizeNum,
        grade_id: gid,
        template_id: tid,
        start_time: startsAt,
        end_time: endsAt,
        description: newContestDescription.trim() || null,
        status: STATUS_TO_DB[newContestStatus] ?? 1,
      });
      await loadAll();
      closeCreateModal();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Không tạo được contest.";
      window.alert(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const getTemplateLabel = (examId) => {
    if (examId == null) return "";
    const t = templates.find((x) => Number(x.id) === Number(examId));
    return t ? `${t.name} (${t.grade_name || ""})` : "";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contests.filter((contest) => {
      const matchesStatus = statusId === "all" || contest.status === statusId;
      const examLabel = getTemplateLabel(contest.examId);
      const matchesSearch = `${contest.id} ${contest.name} ${contest.templateName} ${contest.prize} ${contest.description} ${contest.gradeName} ${formatContestSchedule(
        contest.startsAt,
        contest.endsAt
      )} ${examLabel}`
        .toLowerCase()
        .includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [search, statusId, contests, templates]);

  const totalFormatted = useMemo(() => {
    if (listLoading && contests.length === 0) return "—";
    return filtered.length.toLocaleString("vi-VN");
  }, [listLoading, contests.length, filtered.length]);

  const statLabelText = useMemo(() => {
    if (selectedStatus && selectedStatus.id !== "all") {
      return `Số cuộc thi · ${selectedStatus.name}`;
    }
    return "Số cuộc thi";
  }, [selectedStatus]);

  const toggleExpand = (contest) => {
    const id = String(contest.id);
    setExpandedContestId((prev) => (prev === id ? null : id));
  };

  const saveExamDraft = async (contestId) => {
    const raw = draftTemplateId[contestId];
    const tid = Number(raw);
    if (!tid) {
      window.alert("Chọn một mẫu đề.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateAdminContest(contestId, { template_id: tid });
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Không lưu mẫu đề.");
    } finally {
      setSaving(false);
    }
  };

  const cancelExamDraft = (contest) => {
    setDraftTemplateId((prev) => ({
      ...prev,
      [contest.id]: contest.examId != null ? String(contest.examId) : "",
    }));
  };

  const handleDeleteContest = async (contest) => {
    if (!window.confirm(`Xóa contest #${contest.id} (${contest.name})?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteAdminContest(contest.id);
      setExpandedContestId((prev) => (prev === String(contest.id) ? null : prev));
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Không xóa được contest.");
    } finally {
      setSaving(false);
    }
  };

  const renderExamAssignment = (contest, detailsStyle = {}) => {
    const list = templates.filter((t) => Number(t.grade_id) === Number(contest.gradeId));
    return (
      <div style={{ ...styles.contestDetails, ...detailsStyle }}>
        <div style={styles.detailRow}>
          <label style={styles.detailLabel} htmlFor={`exam-select-${contest.id}`}>
            Chọn đề thi cho cuộc thi
          </label>
          <select
            id={`exam-select-${contest.id}`}
            style={styles.detailSelect}
            value={draftTemplateId[contest.id] ?? ""}
            onChange={(e) =>
              setDraftTemplateId((prev) => ({
                ...prev,
                [contest.id]: e.target.value,
              }))
            }
            disabled={saving}
          >
            <option value="">— Chọn mẫu đề —</option>
            {list.map((exam) => (
              <option key={exam.id} value={String(exam.id)}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.detailActions}>
          <button
            type="button"
            style={styles.btnSave}
            disabled={saving}
            onClick={() => saveExamDraft(contest.id)}
          >
            Lưu thay đổi
          </button>
          <button
            type="button"
            style={styles.btnCancel}
            disabled={saving}
            onClick={() => cancelExamDraft(contest)}
          >
            Hủy
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Quản lý cuộc thi</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Quản lý cuộc thi</h1>
          <p style={styles.lead}>
            Chào mừng bạn đến với trang quản lý cuộc thi.
          </p>
        </div>
        <button
          type="button"
          style={{ ...styles.btnPrimary, ...(saving ? { opacity: 0.7, pointerEvents: "none" } : {}) }}
          onClick={openCreateModal}
          disabled={saving || listLoading}
        >
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Tạo cuộc thi mới
        </button>
      </header>

      {error && (
        <div style={styles.errorBanner} role="alert">
          {error}{" "}
          <button type="button" style={styles.linkBtn} onClick={() => loadAll()}>
            Tải lại
          </button>
        </div>
      )}

      <section style={styles.filterCard} aria-label="Lọc trạng thái cuộc thi">
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

      <section style={styles.statCard} aria-label="Thống kê">
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
            placeholder="Tìm theo tên cuộc thi, mẫu đề, điểm giải, khối, mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
            aria-label="Tìm kiếm cuộc thi"
          />
          <span style={styles.searchIconSlot} aria-hidden>
            <SearchIcon />
          </span>
        </div>
      </div>

      {isNarrow ? (
        <div style={styles.cardList}>
          {listLoading ? (
            <div style={styles.cardEmpty}>Đang tải danh sách cuộc thi…</div>
          ) : filtered.length === 0 ? (
            <div style={styles.cardEmpty}>
              {search.trim()
                ? `Không có kết quả phù hợp với “${search}”.`
                : contests.length === 0
                  ? "Chưa có cuộc thi nào."
                  : "Không có cuộc thi khớp bộ lọc."}
            </div>
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
                  <span style={styles.cardLabel}>Điểm giải (prize)</span>
                  <span style={styles.cardValue}>{contest.prize}</span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Thời gian diễn ra</span>
                  <span style={{ ...styles.cardValue, fontSize: "0.85rem" }}>
                    {formatContestSchedule(contest.startsAt, contest.endsAt)}
                  </span>
                </div>
                <div style={styles.cardField}>
                  <span style={styles.cardLabel}>Mẫu đề</span>
                  {contest.examId ? (
                    <span>
                      <span style={{ ...styles.cardValue, fontWeight: 700, color: "#2d5a76", display: "block" }}>
                        {getTemplateLabel(contest.examId).split(" (")[0] || "—"}
                      </span>
                      <span style={styles.mutedSmall}>{contest.gradeName}</span>
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
                    disabled={saving}
                    onClick={() => openEditModal(contest)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    style={styles.iconBtn}
                    title="Xóa"
                    disabled={saving}
                    onClick={() => handleDeleteContest(contest)}
                  >
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
                <th style={{ ...styles.th, width: 88, textAlign: "right" }}>Điểm giải</th>
                <th style={{ ...styles.th, minWidth: 200 }}>Thời gian</th>
                <th style={styles.th}>Mẫu đề</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={{ ...styles.th, textAlign: "right", width: 120 }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={8} style={styles.tdEmpty}>
                    Đang tải danh sách contest…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.tdEmpty}>
                    {search.trim()
                      ? `Không có kết quả phù hợp với “${search}”.`
                      : contests.length === 0
                        ? "Chưa có cuộc thi nào"
                        : "Không có cuộc thi khớp bộ lọc."}
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
                        <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                          {contest.prize}
                        </td>
                        <td style={{ ...styles.td, fontSize: "0.82rem", color: "#57606a", whiteSpace: "nowrap" }}>
                          {formatContestSchedule(contest.startsAt, contest.endsAt)}
                        </td>
                        <td style={styles.td}>
                          {contest.examId ? (
                            <div>
                              <div style={styles.examName}>
                                {getTemplateLabel(contest.examId).split(" (")[0] || "—"}
                              </div>
                              <div style={styles.mutedSmall}>{contest.gradeName}</div>
                            </div>
                          ) : (
                            <div style={styles.mutedSmall}>Chưa chọn mẫu đề</div>
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
                            disabled={saving}
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
                            disabled={saving}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContest(contest);
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={8} style={styles.nestedCell}>
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
                  Tên cuộc thi
                </label>
                <input
                  id="edit-contest-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={styles.modalTextInput}
                  maxLength={255}
                />
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="edit-contest-prize">
                  Điểm giải (prize)
                </label>
                <input
                  id="edit-contest-prize"
                  type="number"
                  min={0}
                  max={65535}
                  step={1}
                  value={editPrize}
                  onChange={(e) => setEditPrize(e.target.value)}
                  style={styles.modalTextInput}
                />
              </div>
              <div style={styles.modalField}>
                <span style={styles.modalLabel}>Mẫu đề đang gắn</span>
                <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#24292f" }}>
                  {editingContest.templateName || "—"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#57606a" }}>
                  Khối: {editingContest.gradeName} — đổi mẫu đề trong phần mở rộng dòng bảng.
                </p>
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
              <button
                type="button"
                style={styles.btnSave}
                onClick={saveEditModal}
                disabled={saving}
              >
                Lưu
              </button>
              <button
                type="button"
                style={styles.btnCancel}
                onClick={closeEditModal}
                disabled={saving}
              >
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
                  Tên cuộc thi
                </label>
                <input
                  id="create-contest-name"
                  type="text"
                  value={newContestName}
                  onChange={(e) => setNewContestName(e.target.value)}
                  placeholder="Ví dụ: Tuần 3 – Lớp 1"
                  style={styles.modalTextInput}
                  maxLength={255}
                />
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="create-contest-prize">
                  Điểm giải (prize)
                </label>
                <input
                  id="create-contest-prize"
                  type="number"
                  min={0}
                  max={65535}
                  step={1}
                  value={newPrize}
                  onChange={(e) => setNewPrize(e.target.value)}
                  style={styles.modalTextInput}
                />
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="create-contest-grade">
                  Khối lớp
                </label>
                <select
                  id="create-contest-grade"
                  value={newGradeId}
                  onChange={(e) => {
                    setNewGradeId(e.target.value);
                    setNewTemplateId("");
                  }}
                  style={styles.modalSelect}
                >
                  <option value="">— Chọn khối —</option>
                  {grades.map((g) => (
                    <option key={g.id} value={String(g.id)}>
                      {g.name}
                    </option>
                  ))}
                </select>
              
              </div>

              <div style={styles.modalField}>
                <label style={styles.modalLabel} htmlFor="create-contest-template">
                  Mẫu đề (exam template)
                </label>
                <select
                  id="create-contest-template"
                  value={newTemplateId}
                  onChange={(e) => setNewTemplateId(e.target.value)}
                  style={styles.modalSelect}
                  disabled={!newGradeId}
                >
                  <option value="">— Chọn mẫu đề —</option>
                  {templatesForGrade.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
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
              <button
                type="button"
                style={styles.btnSave}
                onClick={saveCreateModal}
                disabled={saving}
              >
                Tạo contest
              </button>
              <button
                type="button"
                style={styles.btnCancel}
                onClick={closeCreateModal}
                disabled={saving}
              >
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

function DocumentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d5a76" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
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
  errorBanner: {
    padding: "12px 16px",
    marginBottom: 16,
    background: "#ffebe9",
    border: "1px solid #ff818266",
    borderRadius: 8,
    color: "#a40e26",
    fontSize: "0.9rem",
  },
  linkBtn: {
    marginLeft: 8,
    padding: 0,
    border: "none",
    background: "none",
    color: "#0969da",
    cursor: "pointer",
    textDecoration: "underline",
    fontFamily: "inherit",
    fontSize: "inherit",
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
    /** 1 — đã lên lịch */
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
    /** 2 — đang kích hoạt */
    active: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 10px",
      borderRadius: 999,
      background: "#dafbe1",
      color: "#1a7f37",
      fontSize: "0.82rem",
      fontWeight: 700,
      textTransform: "capitalize",
    },
    /** 0 — đã kết thúc */
    ended: {
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
    fontFamily: "inherit",
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
};
