/** Đọc user từ localStorage (JSON). */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** role === 1 → admin (theo DB users.role). */
export function isAdminUser(user) {
  if (!user || user.role === undefined || user.role === null) return false;
  return Number(user.role) === 1;
}

export function isRegularUser(user) {
  return !isAdminUser(user);
}
