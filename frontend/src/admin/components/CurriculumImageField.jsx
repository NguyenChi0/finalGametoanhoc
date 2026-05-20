import React, { useState } from "react";
import {
  typeImageUrl,
  lessonImageUrl,
  gradeImageUrl,
  uploadAdminTypeImage,
  uploadAdminLessonImage,
  uploadAdminGradeImage,
} from "../../api";

const KIND_CONFIG = {
  type: {
    resolveUrl: typeImageUrl,
    uploadFn: uploadAdminTypeImage,
    placeholder: "/types-images/tên-file.png hoặc URL",
  },
  lesson: {
    resolveUrl: lessonImageUrl,
    uploadFn: uploadAdminLessonImage,
    placeholder: "/lessons-images/tên-file.png hoặc URL",
  },
  grade: {
    resolveUrl: gradeImageUrl,
    uploadFn: uploadAdminGradeImage,
    placeholder: "/grades-images/tên-file.png hoặc URL",
  },
};

export default function CurriculumImageField({
  kind,
  label,
  value,
  onChange,
  disabled,
  hint,
}) {
  const cfg = KIND_CONFIG[kind] || KIND_CONFIG.type;
  const { resolveUrl, uploadFn, placeholder: pathPlaceholder } = cfg;

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState(null);
  const preview = value ? resolveUrl(value) : "";

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const data = await uploadFn(file);
      if (data?.image) onChange(data.image);
    } catch (err) {
      setUploadErr(
        err?.response?.data?.message || err?.message || "Không tải được ảnh."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <span style={styles.label}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
        placeholder={pathPlaceholder}
        disabled={disabled || uploading}
      />
      <div style={styles.row}>
        <label style={styles.fileBtn}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={onPickFile}
            disabled={disabled || uploading}
            style={{ display: "none" }}
          />
          {uploading ? "Đang tải…" : "Chọn ảnh"}
        </label>
        {value ? (
          <button
            type="button"
            style={styles.clearBtn}
            onClick={() => onChange("")}
            disabled={disabled || uploading}
          >
            Xóa ảnh
          </button>
        ) : null}
      </div>
      {hint ? <p style={styles.hint}>{hint}</p> : null}
      {uploadErr ? (
        <p style={styles.err} role="alert">
          {uploadErr}
        </p>
      ) : null}
      {preview ? (
        <img src={preview} alt="" style={styles.preview} />
      ) : null}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, width: "100%", minWidth: 0 },
  label: { fontWeight: 600, fontSize: "0.9rem", color: "#24292f" },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    fontSize: "0.9rem",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  row: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  fileBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
    fontSize: "0.88rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  clearBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#fff",
    fontSize: "0.88rem",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#cf222e",
  },
  hint: { margin: 0, fontSize: "0.8rem", color: "#57606a" },
  err: { margin: 0, fontSize: "0.85rem", color: "#cf222e" },
  preview: {
    maxWidth: "100%",
    maxHeight: 120,
    objectFit: "contain",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    background: "#f6f8fa",
  },
};
