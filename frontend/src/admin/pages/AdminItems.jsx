import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminItems,
  createAdminItem,
  updateAdminItem,
  deleteAdminItem,
  itemImageUrl,
} from "../../api";

const ITEMS_PAGE_SIZE = 10;

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

function normalizeItemRow(row) {
  return {
    ...row,
    name: row.name != null ? String(row.name) : "",
    description:
      row.description == null || String(row.description).trim() === ""
        ? ""
        : String(row.description).trim(),
    link: row.link != null ? String(row.link).trim() : "",
    require_score:
      row.require_score != null && row.require_score !== ""
        ? Number(row.require_score)
        : 0,
  };
}

export default function AdminItems() {
  /** Bảng → danh sách thẻ; đồng thời điều chỉnh vùng upload trong modal */
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formScore, setFormScore] = useState("0");
  /** Giống AdminQuestionCreate: data URL hoặc chuỗi đường dẫn /items-images/... */
  const [itemImage, setItemImage] = useState("");
  const [itemImagePreview, setItemImagePreview] = useState("");
  const [itemImageFile, setItemImageFile] = useState(null);
  /** link trong DB khi mở sửa — dùng khi lưu JSON không đổi ảnh */
  const [originalLink, setOriginalLink] = useState("");
  const [imageCleared, setImageCleared] = useState(false);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockModalText, setBlockModalText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminItems();
      const list = Array.isArray(data) ? data : [];
      setItems(list.map(normalizeItemRow));
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Không tải được danh sách vật phẩm.";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const blob = `${it.id} ${it.name} ${it.description || ""} ${it.link} ${it.require_score}`.toLowerCase();
      return blob.includes(q);
    });
  }, [items, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / ITEMS_PAGE_SIZE) || 1),
    [filtered.length]
  );

  const pagedItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PAGE_SIZE;
    return filtered.slice(start, start + ITEMS_PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search, items.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totalFormatted = useMemo(() => {
    if (loading && items.length === 0 && !error) return "—";
    return items.length.toLocaleString("vi-VN");
  }, [loading, items.length, error]);

  const readImageFile = (file) => {
    setItemImageFile(file);
    setImageCleared(false);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setItemImage(String(dataUrl || ""));
      setItemImagePreview(String(dataUrl || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      readImageFile(file);
    } else {
      setItemImageFile(null);
      setItemImage("");
      setItemImagePreview("");
    }
  };

  const handlePaste = (event) => {
    const clipItems = event.clipboardData?.items;
    if (clipItems) {
      for (const clip of clipItems) {
        if (clip.type.startsWith("image/")) {
          const file = clip.getAsFile();
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
      const t = text.trim();
      setItemImageFile(null);
      setImageCleared(false);
      setItemImage(t);
      if (t.startsWith("data:image")) {
        setItemImagePreview(t);
      } else {
        setItemImagePreview(itemImageUrl(t) || t);
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      readImageFile(file);
    }
  };

  const openEdit = (it) => {
    setEditId(it.id);
    setFormName(it.name);
    setFormDesc(it.description || "");
    setFormScore(String(it.require_score ?? 0));
    const lk = it.link ? String(it.link).trim() : "";
    setOriginalLink(lk);
    setItemImage(lk);
    setItemImagePreview(lk ? itemImageUrl(lk) : "");
    setItemImageFile(null);
    setImageCleared(false);
    setFormError(null);
    setEditOpen(true);
    setCreateOpen(false);
  };

  const openCreate = () => {
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setFormScore("0");
    setOriginalLink("");
    setItemImage("");
    setItemImagePreview("");
    setItemImageFile(null);
    setImageCleared(false);
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
    setFormScore("0");
    setOriginalLink("");
    setItemImage("");
    setItemImagePreview("");
    setItemImageFile(null);
    setImageCleared(false);
    setFormError(null);
  };

  const saveForm = async (e) => {
    e.preventDefault();
    const name = formName.trim();
    const desc = formDesc.trim();
    if (!name) {
      setFormError("Tên hiển thị là bắt buộc.");
      return;
    }
    const scoreNum = Number(formScore);
    if (Number.isNaN(scoreNum) || scoreNum < 0) {
      setFormError("Giá (điểm) phải là số ≥ 0.");
      return;
    }

    let fileToSend = itemImageFile;
    if (!fileToSend && itemImage.trim().startsWith("data:image")) {
      try {
        const r = await fetch(itemImage.trim());
        const blob = await r.blob();
        fileToSend = new File([blob], "item.png", { type: blob.type || "image/png" });
      } catch (_) {
        /* bỏ qua */
      }
    }
    const pathOnly =
      !fileToSend &&
      itemImage.trim() &&
      !itemImage.trim().startsWith("data:")
        ? itemImage.trim()
        : undefined;

    if (createOpen) {
      if (!fileToSend && !pathOnly) {
        setFormError("Cần ảnh: kéo thả, paste ảnh, chọn file, hoặc dán đường dẫn /items-images/...");
        return;
      }
    }

    setFormError(null);
    setSaving(true);
    try {
      if (createOpen) {
        await createAdminItem({
          name,
          description: desc || null,
          require_score: scoreNum,
          ...(fileToSend ? { imageFile: fileToSend } : {}),
          ...(pathOnly ? { item_image_path: pathOnly } : {}),
        });
      } else if (editId != null) {
        if (imageCleared) {
          await updateAdminItem(editId, {
            name,
            description: desc,
            require_score: scoreNum,
            clear_item_image: true,
          });
        } else if (fileToSend || (pathOnly && pathOnly !== originalLink)) {
          await updateAdminItem(editId, {
            name,
            description: desc,
            require_score: scoreNum,
            ...(fileToSend ? { imageFile: fileToSend } : {}),
            ...(!fileToSend && pathOnly ? { item_image_path: pathOnly } : {}),
          });
        } else {
          await updateAdminItem(editId, {
            name,
            description: desc,
            require_score: scoreNum,
            link: originalLink,
          });
        }
      }
      await load();
      closeModal();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Không lưu được. Vui lòng thử lại.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (it) => {
    if (
      !window.confirm(
        `Xóa vật phẩm "${it.name}" (ID ${it.id})?\n\nNếu đã có người chơi mua vật phẩm này, hệ thống sẽ không cho xóa.`
      )
    ) {
      return;
    }
    setDeletingId(it.id);
    setError(null);
    try {
      await deleteAdminItem(it.id);
      await load();
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message || err?.message || "Không xóa được vật phẩm.";
      if (status === 409) {
        setBlockModalText(msg);
        setBlockModalOpen(true);
      } else {
        setError(msg);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={styles.root}>
      <nav style={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to="/admin" style={styles.crumbLink}>
          Tổng quan
        </Link>
        <span style={styles.crumbSep}>›</span>
        <span style={styles.crumbCurrent}>Quản lý item (cửa hàng)</span>
      </nav>

      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Quản lý vật phẩm</h1>
          <p style={styles.lead}>
            Chào mừng bạn đến với trang quản lý vật phẩm.
          </p>
        </div>
        <button type="button" style={styles.btnPrimary} onClick={openCreate}>
          <span style={styles.btnIcon} aria-hidden>
            <PlusIcon />
          </span>
          Thêm vật phẩm
        </button>
      </header>

      {error && (
        <div style={styles.errorBanner}>
          {error}{" "}
          <button type="button" style={styles.linkBtn} onClick={load}>
            Thử lại
          </button>
        </div>
      )}

      <section style={styles.statCard} aria-label="Thống kê">
        <div style={styles.statIconWrap}>
          <DocumentIcon />
        </div>
        <div>
          <p style={styles.statLabel}>Tổng số vật phẩm</p>
          <p style={styles.statNumber}>{totalFormatted}</p>
        </div>
      </section>

      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <input
            type="search"
            placeholder="Tìm theo ID, tên, mô tả, giá…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={styles.searchInput}
            aria-label="Tìm kiếm vật phẩm"
          />
          <span style={styles.searchIconSlot} aria-hidden>
            <SearchIcon />
          </span>
        </div>
      </div>


      {loading && items.length === 0 && !error && <p style={styles.muted}>Đang tải danh sách…</p>}

      {!loading && items.length === 0 && !error && <p style={styles.muted}>Chưa có vật phẩm nào.</p>}

      {items.length > 0 &&
        (isNarrow ? (
          <div style={styles.cardList}>
            {filtered.length === 0 ? (
              <div style={styles.cardEmpty}>Không có kết quả phù hợp với “{search}”.</div>
            ) : (
              pagedItems.map((it) => (
                <article key={it.id} style={styles.itemCard}>
                  <div style={styles.cardField}>
                    <span style={styles.cardLabel}>ID</span>
                    <span style={styles.cardValue}>{it.id}</span>
                  </div>
                  <div style={styles.cardField}>
                    <span style={styles.cardLabel}>Tên vật phẩm</span>
                    <span style={{ ...styles.cardValue, fontWeight: 700 }}>{it.name}</span>
                  </div>
                  <div style={styles.cardField}>
                    <span style={styles.cardLabel}>Mô tả</span>
                    <span style={{ ...styles.cardValue, color: "#57606a" }}>
                      {it.description ? (
                        <span title={it.description}>{it.description}</span>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  <div style={styles.cardField}>
                    <span style={styles.cardLabel}>Ảnh</span>
                    <span style={styles.cardThumbWrap}>
                      <ItemThumb link={it.link} variant="card" />
                    </span>
                  </div>
                  <div style={styles.cardField}>
                    <span style={styles.cardLabel}>Giá (điểm)</span>
                    <span style={{ ...styles.cardValue, fontWeight: 600 }}>{it.require_score}</span>
                  </div>
                  <div style={styles.cardActions}>
                    <button
                      type="button"
                      style={styles.iconBtn}
                      title="Chỉnh sửa"
                      onClick={() => openEdit(it)}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.iconBtn,
                        ...(deletingId === it.id ? { opacity: 0.6, pointerEvents: "none" } : {}),
                      }}
                      title="Xóa"
                      disabled={deletingId != null}
                      onClick={() => handleDelete(it)}
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
                  <th style={styles.th}>Tên vật phẩm</th>
                  <th style={styles.th}>Mô tả</th>
                  <th style={{ ...styles.th, width: 88 }}>Ảnh</th>
                  <th style={{ ...styles.th, width: 110 }}>Giá (điểm)</th>
                  <th style={{ ...styles.th, textAlign: "right", width: 120 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={styles.tdEmpty}>
                      Không có kết quả phù hợp với “{search}”.
                    </td>
                  </tr>
                ) : (
                  pagedItems.map((it) => (
                    <tr key={it.id}>
                      <td style={styles.td}>{it.id}</td>
                      <td style={{ ...styles.td, fontWeight: 700 }}>{it.name}</td>
                      <td style={{ ...styles.td, color: "#57606a", maxWidth: 220 }}>
                        {it.description ? (
                          <span title={it.description}>
                            {it.description.length > 80 ? `${it.description.slice(0, 80)}…` : it.description}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={styles.td}>
                        <ItemThumb link={it.link} />
                      </td>
                      <td style={styles.td}>{it.require_score}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          title="Chỉnh sửa"
                          onClick={() => openEdit(it)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.iconBtn,
                            marginLeft: 8,
                            ...(deletingId === it.id ? { opacity: 0.6, pointerEvents: "none" } : {}),
                          }}
                          title="Xóa"
                          disabled={deletingId != null}
                          onClick={() => handleDelete(it)}
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}

      {filtered.length > 0 && (
        <nav style={styles.paginationBar} aria-label="Phân trang danh sách vật phẩm">
          <p style={styles.paginationMeta}>
            Hiển thị {(page - 1) * ITEMS_PAGE_SIZE + 1}-
            {Math.min(page * ITEMS_PAGE_SIZE, filtered.length)} / {filtered.length} vật phẩm
          </p>
          <div style={styles.paginationControls}>
            <button
              type="button"
              style={{
                ...styles.paginationBtn,
                ...(page <= 1 ? styles.paginationBtnDisabled : {}),
              }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <span style={styles.paginationPage}>
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              style={{
                ...styles.paginationBtn,
                ...(page >= totalPages ? styles.paginationBtnDisabled : {}),
              }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </nav>
      )}

      {editOpen && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true">
          <div style={{ ...styles.modal, maxWidth: 520 }}>
            <h3 style={styles.modalTitle}>{createOpen ? "Thêm vật phẩm" : "Chỉnh sửa vật phẩm"}</h3>
            <form onSubmit={saveForm}>
              <label style={styles.label}>
                Tên hiển thị
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
                Mô tả (tùy chọn)
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{ ...styles.inputLight, minHeight: 80, resize: "vertical" }}
                  rows={3}
                />
              </label>

              <div style={styles.uploadLabelContainer}>
                <span style={styles.uploadLabelText}>
                  Ảnh vật phẩm {createOpen ? <span style={styles.req}>*</span> : <span style={styles.optionalHint}>(tùy chọn đổi)</span>}
                </span>
                <div
                  style={{
                    ...styles.uploadDropZone,
                    ...(isNarrow ? styles.uploadDropZoneNarrow : {}),
                  }}
                  onPaste={handlePaste}
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={handleDrop}
                  tabIndex={0}
                  aria-label="Paste ảnh hoặc kéo thả file"
                >
                  <div
                    style={{
                      ...styles.uploadIcon,
                      ...(isNarrow ? styles.uploadIconNarrow : {}),
                    }}
                    aria-hidden
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2d5a76"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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
                    <p style={styles.uploadHint}>JPG, PNG, GIF, WebP — tối đa 5MB.</p>
                  </div>
                  <label
                    style={{
                      ...styles.uploadButton,
                      ...(isNarrow ? styles.uploadButtonNarrow : {}),
                    }}
                  >
                    Chọn file từ thiết bị
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileChange}
                      style={styles.fileInput}
                    />
                  </label>
                </div>
              </div>
              {itemImagePreview ? (
                <div style={styles.imagePreviewWrap}>
                  <img
                    src={itemImagePreview}
                    alt="Xem trước"
                    style={styles.previewImage}
                  />
                  <button
                    type="button"
                    style={styles.removeImageButton}
                    onClick={() => {
                      setItemImageFile(null);
                      setItemImage("");
                      setItemImagePreview("");
                      if (!createOpen) setImageCleared(true);
                    }}
                  >
                    Xóa ảnh
                  </button>
                </div>
              ) : null}

              <label style={styles.label}>
                Giá (điểm) — require_score
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={formScore}
                  onChange={(e) => setFormScore(e.target.value)}
                  style={styles.inputLight}
                  required
                />
              </label>
              {formError && (
                <div style={styles.formError} role="alert">
                  {formError}
                </div>
              )}
              <div style={styles.modalActions}>
                <button type="button" style={styles.btnSecondary} onClick={closeModal} disabled={saving}>
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.btnPrimaryModal,
                    ...(saving ? { opacity: 0.75, pointerEvents: "none" } : {}),
                  }}
                  disabled={saving}
                >
                  {saving ? "Đang lưu…" : createOpen ? "Tạo" : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {blockModalOpen && (
        <div
          style={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-delete-item-title"
        >
          <div style={styles.modal}>
            <h3 id="block-delete-item-title" style={styles.modalTitleWarn}>
              Không thể xóa vật phẩm
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

function ItemThumb({ link, variant }) {
  const [broken, setBroken] = useState(false);
  const src = itemImageUrl(link);
  const size = variant === "card" ? 80 : 48;
  if (!link || !src || broken) {
    return (
      <span style={{ fontSize: "0.75rem", color: "#57606a" }} title="Không có ảnh">
        —
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        borderRadius: 8,
        border: "1px solid #eaeef2",
        background: "#f6f8fa",
        display: "block",
      }}
      onError={() => setBroken(true)}
    />
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
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4 11.5-11.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  codeInline: {
    fontSize: "0.88em",
    background: "#f6f8fa",
    padding: "2px 6px",
    borderRadius: 4,
    border: "1px solid #eaeef2",
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
  muted: {
    color: "#57606a",
    marginBottom: 16,
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
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  },
  itemCard: {
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
  cardThumbWrap: {
    display: "inline-block",
    minWidth: 0,
  },
  cardActions: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
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
    verticalAlign: "middle",
    color: "#24292f",
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
    margin: "0 0 18px",
    fontSize: "1.15rem",
    color: "#1f2328",
    fontWeight: 700,
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
  req: { color: "#cf222e" },
  optionalHint: {
    fontWeight: 500,
    color: "#57606a",
    fontSize: "0.85rem",
  },
  uploadLabelContainer: {
    marginTop: 4,
    marginBottom: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontWeight: 600,
    fontSize: "0.88rem",
    color: "#24292f",
    minWidth: 0,
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
  },
  uploadHint: {
    margin: 0,
    fontSize: "0.82rem",
    color: "#8b96a5",
    lineHeight: 1.45,
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
    marginBottom: 14,
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
    fontFamily: "inherit",
  },
  paginationBar: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  paginationMeta: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#57606a",
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  paginationBtn: {
    border: "1px solid #d0d7de",
    background: "#fff",
    color: "#24292f",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "inherit",
  },
  paginationBtnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  paginationPage: {
    minWidth: 96,
    textAlign: "center",
    color: "#57606a",
    fontSize: "0.9rem",
  },
};
