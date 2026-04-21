import React from "react";

/**
 * Pop-up chỉnh sửa contest — tách từ AdminContest.jsx
 */
export function AdminContestEditModal({
  styles,
  statusModalOptions,
  contest,
  editName,
  setEditName,
  editPrize,
  setEditPrize,
  editDescription,
  setEditDescription,
  editStatus,
  setEditStatus,
  editStartDate,
  editStartTime,
  setEditStartTime,
  editEndDate,
  editEndTime,
  setEditEndTime,
  editDurationMinutes,
  setEditDurationMinutes,
  editTemplateId,
  setEditTemplateId,
  templatesForEdit,
  onEditStartDateChange,
  onEditEndDateChange,
  onClose,
  onSave,
  saving,
}) {
  if (!contest) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="edit-contest-title">
        <div style={styles.modalHeader}>
          <h2 id="edit-contest-title" style={styles.modalTitle}>
            Chỉnh sửa contest
          </h2>
          <button type="button" style={styles.modalClose} onClick={onClose} aria-label="Đóng">
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
            <label style={styles.modalLabel} htmlFor="edit-contest-duration">
              Thời gian làm bài (phút)
            </label>
            <input
              id="edit-contest-duration"
              type="number"
              min={1}
              max={65535}
              step={1}
              value={editDurationMinutes}
              onChange={(e) => setEditDurationMinutes(e.target.value)}
              style={styles.modalTextInput}
            />
          </div>
          <div style={styles.modalField}>
            <label style={styles.modalLabel} htmlFor="edit-contest-template">
              Mẫu đề (exam template)
            </label>
            <select
              id="edit-contest-template"
              value={editTemplateId}
              onChange={(e) => setEditTemplateId(e.target.value)}
              style={styles.modalSelect}
              disabled={saving || !templatesForEdit?.length}
            >
              <option value="">— Chọn mẫu đề —</option>
              {(templatesForEdit || []).map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
            {!templatesForEdit?.length && (
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#a40e26" }}>
                Không có mẫu đề nào cho khối này.
              </p>
            )}
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
              {statusModalOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={styles.modalActions}>
          <button type="button" style={styles.btnSave} onClick={onSave} disabled={saving}>
            Lưu
          </button>
          <button type="button" style={styles.btnCancel} onClick={onClose} disabled={saving}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Pop-up tạo contest mới — tách từ AdminContest.jsx
 */
export function AdminContestCreateModal({
  styles,
  statusModalOptions,
  newContestName,
  setNewContestName,
  newPrize,
  setNewPrize,
  newDurationMinutes,
  setNewDurationMinutes,
  newGradeId,
  setNewGradeId,
  newTemplateId,
  setNewTemplateId,
  newContestDescription,
  setNewContestDescription,
  newContestStatus,
  setNewContestStatus,
  newStartDate,
  setNewStartDate,
  newStartTime,
  setNewStartTime,
  newEndDate,
  setNewEndDate,
  newEndTime,
  setNewEndTime,
  onNewStartDateChange,
  onNewEndDateChange,
  grades,
  templatesForGrade,
  onClose,
  onSave,
  saving,
}) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="create-contest-title">
        <div style={styles.modalHeader}>
          <h2 id="create-contest-title" style={styles.modalTitle}>
            Tạo contest mới
          </h2>
          <button type="button" style={styles.modalClose} onClick={onClose} aria-label="Đóng">
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
            <label style={styles.modalLabel} htmlFor="create-contest-duration">
              Thời gian làm bài (phút)
            </label>
            <input
              id="create-contest-duration"
              type="number"
              min={1}
              max={65535}
              step={1}
              value={newDurationMinutes}
              onChange={(e) => setNewDurationMinutes(e.target.value)}
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
              {statusModalOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={styles.modalActions}>
          <button type="button" style={styles.btnSave} onClick={onSave} disabled={saving}>
            Tạo contest
          </button>
          <button type="button" style={styles.btnCancel} onClick={onClose} disabled={saving}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
