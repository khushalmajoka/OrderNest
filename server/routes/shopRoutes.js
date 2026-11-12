const express = require("express");
const router = express.Router();
const {
  setupShop,
  getShopByUserId,
  resetOrders,
  saveStatusColors,
} = require("../controllers/shopController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const { requireAdmin } = require("../middlewares/access");

router.post("/setup", authenticate, loadUser, requireAdmin, setupShop);
router.get("/:userId", authenticate, loadUser, getShopByUserId);
router.post("/settings/reset", authenticate, loadUser, requireAdmin, resetOrders);
router.put(
  "/settings/status-colors",
  authenticate,
  loadUser,
  requireAdmin,
  saveStatusColors
);

module.exports = router;
