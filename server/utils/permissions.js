// What a staff member can be allowed to do (the admin switches these on).
// Seeing the orders is always allowed.
const PERMISSION_KEYS = ["createOrders", "editOrders", "deleteOrders", "shareSlip"];

// Admin can do everything; staff only what is switched on
const can = (account, permission) =>
  account.role === "admin" || Boolean(account.permissions?.[permission]);

// Only keep known permissions, as true/false
const cleanPermissions = (input = {}) =>
  Object.fromEntries(PERMISSION_KEYS.map((key) => [key, Boolean(input[key])]));

module.exports = { PERMISSION_KEYS, can, cleanPermissions };
