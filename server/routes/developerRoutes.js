const express = require("express");
const { getUsage, getCompleteness } = require("../controllers/developerController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const requireDeveloper = require("../middlewares/requireDeveloper");

const router = express.Router();

// The developer only (see requireDeveloper): everyone else gets "Not found"
router.get("/usage", authenticate, loadUser, requireDeveloper, getUsage);
router.get("/completeness", authenticate, loadUser, requireDeveloper, getCompleteness);

module.exports = router;
