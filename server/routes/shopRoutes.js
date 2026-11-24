const express = require("express");
const router = express.Router();
const {
  setupShop,
  getShopByUserId,
  saveStatusColors,
  saveStatusVisibility,
  saveWhatsappPrompt,
  saveNeedsReview,
  saveSharePicture,
  saveTableColumns,
  saveSlipSettings,
  saveShopProfile,
  saveWhatsappMessages,
} = require("../controllers/shopController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const { requireAdmin } = require("../middlewares/access");
const { countUse } = require("../utils/usage");

router.post("/setup", authenticate, loadUser, requireAdmin, setupShop);
router.get("/:userId", authenticate, loadUser, getShopByUserId);
router.put(
  "/settings/status-colors",
  authenticate,
  loadUser,
  requireAdmin,
  countUse("settings.colors"),
  saveStatusColors
);

router.put(
  "/settings/statuses",
  authenticate,
  loadUser,
  requireAdmin,
  countUse("settings.statuses"),
  saveStatusVisibility
);

router.put(
  "/settings/share-picture",
  authenticate,
  loadUser,
  requireAdmin,
  countUse("settings.share_picture"),
  saveSharePicture
);

router.put(
  "/settings/needs-review",
  authenticate,
  loadUser,
  requireAdmin,
  countUse("settings.needs_review"),
  saveNeedsReview
);

router.put(
  "/settings/whatsapp-prompt",
  authenticate,
  loadUser,
  requireAdmin,
  countUse("settings.whatsapp_prompt"),
  saveWhatsappPrompt
);

router.put(
  "/settings/table-columns",
  authenticate,
  loadUser,
  requireAdmin,
  countUse("settings.columns"),
  saveTableColumns
);

router.put(
  "/settings/slip",
  authenticate,
  loadUser,
  requireAdmin,
  countUse("settings.slip"),
  saveSlipSettings
);

router.put(
  "/settings/whatsapp-messages",
  authenticate,
  loadUser,
  requireAdmin,
  countUse("settings.whatsapp"),
  saveWhatsappMessages
);

router.put(
  "/settings/profile",
  authenticate,
  loadUser,
  requireAdmin,
  countUse("settings.profile"),
  saveShopProfile
);

module.exports = router;
