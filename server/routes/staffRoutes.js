const express = require("express");
const c = require("../controllers/staffController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { requireAdmin, requireStaff } = require("../middlewares/access");
const { staffPasswordLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// Staff, about themselves (before the "/:id" routes)
router.post("/me/password-request", authenticate, loadUser, requireStaff, c.requestPasswordChange);
router.post(
  "/me/password",
  authenticate,
  loadUser,
  requireStaff,
  staffPasswordLimiter,
  c.changeOwnPassword
);

// Admin only
const admin = [authenticate, loadUser, loadShop, requireAdmin];
router.get("/", ...admin, c.listStaff);
router.post("/", ...admin, c.createStaff);
router.put("/:id", ...admin, c.updateStaff);
router.delete("/:id", ...admin, c.deleteStaff);
router.put("/:id/password", ...admin, c.resetStaffPassword);
router.post("/:id/password-request/approve", ...admin, c.approvePasswordRequest);
router.post("/:id/password-request/deny", ...admin, c.denyPasswordRequest);

module.exports = router;
