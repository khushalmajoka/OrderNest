// The shop the developer is working inside (see the Developer page). Kept in
// this browser only; the server checks it on every request, and only the
// developer's own login can use it.
const KEY = "devShop";

export const getDevShop = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : null;
    return value && value.id ? value : null;
  } catch {
    return null;
  }
};

export const setDevShop = (id, name) => localStorage.setItem(KEY, JSON.stringify({ id, name }));
export const clearDevShop = () => localStorage.removeItem(KEY);

export const isDeveloperLogin = () => localStorage.getItem("isDeveloper") === "1";
