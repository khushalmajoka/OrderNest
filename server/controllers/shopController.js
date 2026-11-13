const Shop = require("../models/Shop");
const User = require("../models/User");
const ORDER_STATUSES = require("../models/orderStatuses");
const COLOR_NAMES = require("../models/statusColors");
const TABLE_COLUMNS = require("../models/tableColumns");
const SLIP_FIELDS = require("../models/slipFields");

// POST /api/shop/setup
const setupShop = async (req, res, next) => {
  try {
    const { name, logo, address, phone, category } = req.body;
    const userId = req.user?.id; // Set by auth middleware

    if (!name || !phone || !category) {
      return res
        .status(400)
        .json({ error: "Shop name, phone and category are required" });
    }

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

    // A user may only read their own shop
    if (userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // The owner's own shop, or the shop a staff member works for
    const shop =
      req.account.role === "staff"
        ? await Shop.findById(req.account.shopId)
        : await Shop.findOne({ owner: userId });

    if (!shop) return res.status(404).json({ error: "Shop not found" });

    // `account` tells the screen what this person may do
    const { id, role, name, email, username, permissions, passwordChange } = req.account;
    res.status(200).json({
      shop,
      account: { id, role, name, email, username, permissions, passwordChange },
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

    const shop = await Shop.findOneAndUpdate(
      { owner: req.user.id },
      { statusColors: clean },
      { new: true }
    );
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    res.status(200).json({ statusColors: shop.statusColors });
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

module.exports = {
  saveSlipSettings,
  saveTableColumns,
  setupShop,
  getShopByUserId,
  saveStatusColors,
};