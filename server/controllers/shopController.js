const Shop = require("../models/Shop");
const User = require("../models/User");
const ORDER_STATUSES = require("../models/orderStatuses");
const COLOR_NAMES = require("../models/statusColors");
const TABLE_COLUMNS = require("../models/tableColumns");
const SLIP_FIELDS = require("../models/slipFields");
const WHATSAPP = require("../models/whatsappMessages");
const { checkShopProfile } = require("../utils/shopInput");

// POST /api/shop/setup
const setupShop = async (req, res, next) => {
  try {
    const body = req.body || {};
    const userId = req.user?.id; // Set by auth middleware

    if (!body.name || !body.phone || !body.category) {
      return res
        .status(400)
        .json({ error: "Shop name, phone and category are required" });
    }

    // Same rules as Settings -> Shop details (lengths, phone, logo picture)
    const checked = checkShopProfile(body);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const { name, phone, category, address, logo } = checked.values;

    // Check if shop already exists for this user
    const existingShop = await Shop.findOne({ owner: userId });
    if (existingShop) {
      return res.status(400).json({ error: "Shop already setup for this user" });
    }

    // Create and save new shop
    const newShop = new Shop({
      name,
      logo,
      address,
      phone,
      category,
      owner: userId,
      isSetupComplete: true,
    });

    const savedShop = await newShop.save();

    // Link shop to user
    await User.findByIdAndUpdate(userId, { shopId: savedShop._id });

    res.status(201).json({ message: "Shop setup complete", shop: savedShop });
  } catch (error) {
    return next(error);
  }
};

// GET /api/shop/:userId
const getShopByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // A user may only read their own shop (the developer working inside a shop
    // asks with their own id, and gets the shop they chose)
    if (!req.devMode && userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // The owner's own shop, or the shop a staff member works for
    const shop =
      req.account.role === "staff"
        ? await Shop.findById(req.account.shopId)
        : await Shop.findOne({ owner: req.user.id });

    if (!shop) return res.status(404).json({ error: "Shop not found" });

    // `account` tells the screen what this person may do
    const { id, role, name, email, username, permissions, passwordChange, isDeveloper, devMode } = req.account;
    res.status(200).json({
      shop,
      account: { id, role, name, email, username, permissions, passwordChange, isDeveloper, devMode },
    });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/shop/settings/status-colors
// Body: { statusColors: { "Pending": { enabled: true, color: "yellow" }, ... } }
const saveStatusColors = async (req, res, next) => {
  try {
    const incoming = req.body?.statusColors;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return res.status(400).json({ error: "Status colours are missing." });
    }

    // Keep only known statuses, and only the two things we store
    const clean = {};
    for (const [status, choice] of Object.entries(incoming)) {
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Unknown status: ${status}` });
      }
      if (
        !choice ||
        typeof choice.enabled !== "boolean" ||
        !COLOR_NAMES.includes(choice.color)
      ) {
        return res.status(400).json({ error: `Pick a valid colour for ${status}.` });
      }
      clean[status] = { enabled: choice.enabled, color: choice.color };
    }

    // The main switches are optional; when sent they must be on or off
    const update = { statusColors: clean };
    for (const [key, field] of [["master", "colorMaster"], ["row", "colorRow"], ["strip", "colorStrip"]]) {
      const value = req.body?.[key];
      if (value === undefined) continue;
      if (typeof value !== "boolean") {
        return res.status(400).json({ error: `The ${key} switch must be on or off.` });
      }
      update[field] = value;
    }

    const shop = await Shop.findOneAndUpdate(
      { owner: req.user.id },
      update,
      { new: true }
    );
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    res.status(200).json({
      statusColors: shop.statusColors,
      master: shop.colorMaster !== false,
      row: shop.colorRow !== false,
      strip: shop.colorStrip !== false,
    });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/shop/settings/table-columns   { columns: ["orderId", "status", ...] }
const saveTableColumns = async (req, res, next) => {
  try {
    const wanted = req.body?.columns;
    if (!Array.isArray(wanted) || wanted.some((key) => typeof key !== "string")) {
      return res.status(400).json({ error: "Please send the list of columns." });
    }
    const unknown = wanted.find((key) => !TABLE_COLUMNS.includes(key));
    if (unknown) return res.status(400).json({ error: `Unknown column: ${unknown}` });

    // Fixed order, no repeats, and the Order ID is always there
    const columns = TABLE_COLUMNS.filter(
      (key) => key === "orderId" || wanted.includes(key)
    );

    const shop = await Shop.findOneAndUpdate(
      { owner: req.user.id },
      { tableColumns: columns },
      { new: true }
    );
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    res.status(200).json({ tableColumns: shop.tableColumns });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/shop/settings/slip   { fields: { logo: true, ... }, note: "..." }
const saveSlipSettings = async (req, res, next) => {
  try {
    const { fields, note } = req.body || {};
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return res.status(400).json({ error: "Please send the slip fields." });
    }

    const clean = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!SLIP_FIELDS.includes(key)) {
        return res.status(400).json({ error: `Unknown slip field: ${key}` });
      }
      if (typeof value !== "boolean") {
        return res.status(400).json({ error: `${key} must be on or off.` });
      }
      clean[key] = value;
    }

    if (note !== undefined && typeof note !== "string") {
      return res.status(400).json({ error: "The note must be text." });
    }
    if ((note || "").length > 200) {
      return res.status(400).json({ error: "The note is too long (200 letters at most)." });
    }

    const shop = await Shop.findOneAndUpdate(
      { owner: req.user.id },
      { slipFields: clean, slipNote: (note || "").trim() },
      { new: true }
    );
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    res.status(200).json({ slipFields: shop.slipFields, slipNote: shop.slipNote });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/shop/settings/whatsapp-messages
// Body: { messages: { en: { "Pending": "Hello {name}..." }, hi: {...}, hinglish: {...} } }
// Only texts that differ from the app's own are sent; the whole set is replaced.
const saveWhatsappMessages = async (req, res, next) => {
  try {
    const incoming = req.body?.messages;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return res.status(400).json({ error: "Please send the messages." });
    }

    const clean = {};
    for (const [language, byStatus] of Object.entries(incoming)) {
      if (!WHATSAPP.LANGUAGES.includes(language)) {
        return res.status(400).json({ error: `Unknown language: ${language}` });
      }
      if (!byStatus || typeof byStatus !== "object" || Array.isArray(byStatus)) {
        return res.status(400).json({ error: "Messages are in the wrong format." });
      }
      for (const [status, rawText] of Object.entries(byStatus)) {
        if (!ORDER_STATUSES.includes(status)) {
          return res.status(400).json({ error: `Unknown status: ${status}` });
        }
        if (typeof rawText !== "string") {
          return res.status(400).json({ error: `The message for ${status} must be text.` });
        }
        const text = rawText.trim();
        if (!text) continue; // empty = use the app's own text
        if (text.length > WHATSAPP.MAX_LENGTH) {
          return res.status(400).json({
            error: `The message for ${status} is too long (${WHATSAPP.MAX_LENGTH} letters at most).`,
          });
        }
        const badTag = [...text.matchAll(/\{([^{}]*)\}/g)].find(
          (m) => !WHATSAPP.TAGS.includes(m[1])
        );
        if (badTag) {
          return res.status(400).json({
            error: `Unknown tag {${badTag[1]}} in the message for ${status}.`,
          });
        }
        clean[language] = { ...clean[language], [status]: text };
      }
    }

    const shop = await Shop.findOneAndUpdate(
      { owner: req.user.id },
      { whatsappMessages: clean },
      { new: true }
    );
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    res.status(200).json({ whatsappMessages: shop.whatsappMessages });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/shop/settings/profile   { name, phone, address, category, logo }
// The shop's own details (shown in the top bar and printed on delivery slips).
// `logo` is a small picture as text ("data:image/..."); "" removes it and
// leaving it out keeps the current one.
const saveShopProfile = async (req, res, next) => {
  try {
    const checked = checkShopProfile(req.body);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const update = checked.values;

    const shop = await Shop.findOneAndUpdate(
      { owner: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    res.status(200).json({ shop });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  saveShopProfile,
  saveWhatsappMessages,
  saveSlipSettings,
  saveTableColumns,
  setupShop,
  getShopByUserId,
  saveStatusColors,
};