// What the logged-in person may do. Admins can do everything; staff only what
// their admin switched on. (The server checks again: this only decides what
// to show.)
export const can = (account, permission) =>
  Boolean(account) &&
  (account.role === "admin" || Boolean(account.permissions?.[permission]));

export const isAdmin = (account) => account?.role === "admin";
