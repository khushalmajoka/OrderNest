const express = require("express");
const { publicCatalog, publicImage, getSettings, saveSettings, newLink, showProducts } = require("../controllers/catalogController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { requireAdmin, requirePermission } = require("../middlewares/access");
const { catalogLimiter, catalogImageLimiter } = require("../middlewares/rateLimiter");
const { countUse } = require("../utils/usage");

// Public: no login, only the secret link
const publicRouter = express.Router();
publicRouter.get("/:token", catalogLimiter, publicCatalog);
publicRouter.get("/:token/images/:imageId", catalogImageLimiter, publicImage);

// For the shop
const settingsRouter = express.Router();
const signedIn = [authenticate, loadUser, loadShop];
settingsRouter.get("/", ...signedIn, requirePermission("manageProducts"), getSettings);
// switching on/off, prices, number, new link: the admin only
settingsRouter.put("/", ...signedIn, requireAdmin, countUse("catalog.manage"), saveSettings);
settingsRouter.post("/new-link", ...signedIn, requireAdmin, countUse("catalog.manage"), newLink);
// which products customers see
settingsRouter.post("/products", ...signedIn, requirePermission("manageProducts"), countUse("catalog.manage"), showProducts);

module.exports = { publicRouter, settingsRouter };
