const express = require("express");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { recordUse, FROM_APP } = require("../utils/usage");
const { rateLimit } = require("express-rate-limit");

const router = express.Router();

// A person cannot cause more than this many counts per minute (keeps a broken
// or abused client from filling the database)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests." },
});

// The app reports things that only happen on screen, e.g. { feature: "whatsapp.open" }.
// Always answers 204: counting is never something the person waits for.
router.post("/", limiter, authenticate, loadUser, loadShop, (req, res) => {
  const feature = req.body?.feature;
  if (!req.devMode && typeof feature === "string" && FROM_APP.has(feature)) {
    recordUse(req.shop._id, req.account.id, feature);
  }
  res.status(204).end();
});

module.exports = router;
