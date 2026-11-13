const express = require("express");
const router = express.Router();
const {
  setupShop,
  getShopByUserId,
  saveStatusColors,
  saveTableColumns,
  saveSlipSettings,
} = require("../controllers/shopController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const { requireAdmin } = require("../middlewares/access");

router.post("/setup", authenticate, loadUser, requireAdmin, setupShop);
router.get("/:userId", authenticate, loadUser, getShopByUserId);
router.put(
  "/settings/status-colors",
  authenticate,
  loadUser,
  requireAdmin,
  saveStatusColors
);

router.put(
  "/settings/table-columns",
  authenticate,
  loadUser,
  requireAdmin,
  saveTableColumns
);

router.put(
  "/settings/slip",
  authenticate,
  loadUser,
  requireAdmin,
  saveSlipSettings
);

module.exports = router;
