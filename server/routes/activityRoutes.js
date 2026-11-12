const express = require("express");
const { listActivity } = require("../controllers/activityController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { requireAdmin } = require("../middlewares/access");

const router = express.Router();

// Who did what (admin only)
router.get("/", authenticate, loadUser, loadShop, requireAdmin, listActivity);

module.exports = router;
