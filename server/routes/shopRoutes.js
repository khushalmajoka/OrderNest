const express = require("express");
const router = express.Router();
const {
  setupShop,
  getShopByUserId,
  resetOrders,
  saveStatusColors,
} = require("../controllers/shopController");
const authenticate = require("../middlewares/authenticate");

router.post("/setup", authenticate, setupShop);
router.get("/:userId", authenticate, getShopByUserId);
router.post("/settings/reset", authenticate, resetOrders);
router.put("/settings/status-colors", authenticate, saveStatusColors);

module.exports = router;
