export const CONTEST_GRADE_PILL_STORAGE_KEY = "gametoanhoc:contest-grade-pill-filter";
export const EXAM_GRADE_PILL_STORAGE_KEY = "gametoanhoc:exam-grade-pill-filter";

export function readGradePillFilter(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const visibleGradeIds = Array.isArray(parsed.visibleGradeIds)
      ? parsed.visibleGradeIds.map(String).filter(Boolean)
      : null;
    const selectedGradeId =
      parsed.selectedGradeId != null ? String(parsed.selectedGradeId) : "";
    return { visibleGradeIds, selectedGradeId };
  } catch {
    return null;
  }
}

export function writeGradePillFilter(storageKey, { visibleGradeIds, selectedGradeId }) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        visibleGradeIds: (visibleGradeIds ?? []).map(String),
        selectedGradeId: selectedGradeId != null ? String(selectedGradeId) : "",
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function resolveVisibleGradeIds(savedIds, allGradeIds) {
  const allIds = allGradeIds.map(String);
  if (!Array.isArray(savedIds) || savedIds.length === 0) return allIds;
  const valid = savedIds.map(String).filter((id) => allIds.includes(id));
  return valid.length > 0 ? valid : allIds;
}

export function resolveSelectedGradeId(savedId, visibleIds) {
  const sid = savedId != null ? String(savedId) : "";
  if (sid === "") return "";
  const visible = visibleIds.map(String);
  if (visible.includes(sid)) return sid;
  return visible[0] ?? "";
}
