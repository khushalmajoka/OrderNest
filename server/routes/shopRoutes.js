const express = require("express");
const router = express.Router();
const {
  setupShop,
  getShopByUserId,
  resetOrders,
} = require("../controllers/shopController");
const authenticate = require("../middlewares/authenticate");

router.post("/setup", authenticate, setupShop);
router.get("/:userId", authenticate, getShopByUserId);
router.post("/settings/reset", authenticate, resetOrders);

module.exports = router;
