// access.js: route guards. Use after `authenticate` and `loadUser`.
const { can } = require("../utils/permissions");

const requireAdmin = (req, res, next) => {
  if (req.account.role !== "admin") {
    return res.status(403).json({ error: "Only the admin can do this." });
  }
  next();
};

const requireStaff = (req, res, next) => {
  if (req.account.role !== "staff") {
    return res.status(403).json({ error: "This is only for staff accounts." });
  }
  next();
};

// e.g. requirePermission("deleteOrders")
const requirePermission = (permission) => (req, res, next) => {
  if (!can(req.account, permission)) {
    return res
      .status(403)
      .json({ error: "You do not have permission to do this. Ask your admin." });
  }
  next();
};

module.exports = { requireAdmin, requireStaff, requirePermission };
