const express = require("express");
const { listActivity } = require("../controllers/activityController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { requireAdmin } = require("../middlewares/access");
const { countUse } = require("../utils/usage");

const router = express.Router();

// Who did what (admin only)
router.get("/", authenticate, loadUser, loadShop, requireAdmin, countUse("activity.view", (req) => !req.query.page || req.query.page === "1"), listActivity);

module.exports = router;
