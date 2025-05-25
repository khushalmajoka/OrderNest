const express = require("express");
const router = express.Router();
const { setupShop, getMyShop,  getShopByUserId} = require("../controllers/shopController");
const authenticate = require("../middlewares/authenticate");

// @route   POST /api/shop/setup
// @desc    Setup shop for logged-in user
// @access  Private
router.post("/setup", authenticate, setupShop);

// @route   GET /api/shop/me
// @desc    Get current user's shop details
// @access  Private
router.get("/:userId", authenticate, getShopByUserId);

module.exports = router;
