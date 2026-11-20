const express = require("express");
const c = require("../controllers/staffController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { requireAdmin, requireStaff } = require("../middlewares/access");
const { staffPasswordLimiter } = require("../middlewares/rateLimiter");
const { countUse } = require("../utils/usage");

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
router.post("/", ...admin, countUse("staff.manage"), c.createStaff);
router.put("/:id", ...admin, countUse("staff.manage"), c.updateStaff);
router.delete("/:id", ...admin, countUse("staff.manage"), c.deleteStaff);
router.put("/:id/password", ...admin, countUse("staff.manage"), c.resetStaffPassword);
router.post("/:id/password-request/approve", ...admin, countUse("staff.manage"), c.approvePasswordRequest);
router.post("/:id/password-request/deny", ...admin, countUse("staff.manage"), c.denyPasswordRequest);

module.exports = router;
