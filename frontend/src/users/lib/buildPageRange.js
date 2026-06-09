/**
 * Sinh dãy trang cho phân trang dạng số: [1, 2, 3, 'ellipsis', 10].
 * @param {number} current - Trang hiện tại (1-based)
 * @param {number} total - Tổng số trang
 * @param {number} [siblingCount=1] - Số trang lân cận hiển thị quanh trang hiện tại
 * @returns {(number|'ellipsis')[]}
 */
export function buildPageRange(current, total, siblingCount = 1) {
  const totalPages = Math.max(0, Math.floor(Number(total)) || 0);
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const cur = Math.min(Math.max(1, Math.floor(Number(current)) || 1), totalPages);
  const pages = new Set([1, totalPages]);
  for (let i = cur - siblingCount; i <= cur + siblingCount; i += 1) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }
  return result;
}
