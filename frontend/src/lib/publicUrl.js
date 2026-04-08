/** Giống CRA PUBLIC_URL: prefix không có dấu / cuối, để nối `/assets/...`. */
export const publicUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
