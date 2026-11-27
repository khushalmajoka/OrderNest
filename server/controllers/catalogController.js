// The customer catalog: a public page opened with a long secret link.
// It shows only the shop's name, logo, phone and the products ticked
// "Show in catalog". Never orders, customers or staff. Prices are sent only
// when the shop switched them on.
const crypto = require("crypto");
const mongoose = require("mongoose");
const Shop = require("../models/Shop");
const Product = require("../models/Product");
const Family = require("../models/ProductFamily");
const Category = require("../models/Category");
const ProductImage = require("../models/ProductImage");
const { logActivity } = require("../utils/activity");
const { recordUse } = require("../utils/usage");

const MAX_MOVE = 500; // products in one show/hide request
const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const newToken = () => crypto.randomBytes(18).toString("base64url"); // 24 characters, cannot be guessed
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24}$/;
const GONE = "This catalog is not available. Please ask the shop for a new link.";

const findByToken = (token) =>
  TOKEN_PATTERN.test(String(token))
    ? Shop.findOne({ "catalog.token": token, "catalog.enabled": true }).select("name logo phone +catalog")
    : null;

// GET /api/catalog/:token   (public)
exports.publicCatalog = async (req, res, next) => {
  try {
    const shop = await findByToken(req.params.token);
    if (!shop) return res.status(404).json({ message: GONE });
    const showPrices = shop.catalog.showPrices === true;

    const [families, categories] = await Promise.all([
      Family.find({ shop: shop._id, inCatalog: true }).select("name notes category images").sort({ nameKey: 1 }).lean(),
      Category.find({ shop: shop._id }).select("name").sort({ nameKey: 1 }).lean(),
    ]);
    const sizes = await Product.find({ shop: shop._id, active: true, family: { $in: families.map((f) => f._id) } })
      .select("family size sizeLabel price priceUnit")
      .lean();
    const byFamily = new Map();
    for (const s of sizes) {
      const key = String(s.family);
      if (!byFamily.has(key)) byFamily.set(key, []);
      byFamily.get(key).push({
        _id: String(s._id),
        size: s.size,
        sizeLabel: s.sizeLabel || "",
        ...(showPrices && s.price !== undefined && s.price !== null ? { price: s.price, priceUnit: s.priceUnit } : {}),
      });
    }
    // a product with every size archived is not shown
    const products = families
      .filter((f) => byFamily.has(String(f._id)))
      .map((f) => ({
        _id: String(f._id),
        name: f.name,
        notes: f.notes || "",
        category: f.category ? String(f.category) : undefined,
        images: (f.images || []).map(String),
        sizes: byFamily.get(String(f._id)),
      }));
    const used = new Set(products.map((p) => p.category).filter(Boolean));

    if (!req.devMode) recordUse(shop._id, null, "catalog.view");
    res.set("Cache-Control", "no-store"); // switching off or hiding a product works at once
    res.status(200).json({
      shop: { name: shop.name, logo: shop.logo || "", phone: shop.catalog.phone || shop.phone },
      showPrices,
      categories: categories.filter((c) => used.has(String(c._id))).map((c) => ({ _id: String(c._id), name: c.name })),
      products,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/catalog/:token/images/:imageId?size=thumb|full   (public)
// Only pictures of products that are in this catalog right now.
exports.publicImage = async (req, res, next) => {
  try {
    const notFound = () => res.status(404).json({ message: "Picture not found" });
    if (!isId(req.params.imageId)) return notFound();
    const shop = await findByToken(req.params.token);
    if (!shop) return notFound();
    const field = req.query.size === "thumb" ? "thumb" : "full";
    const image = await ProductImage.findOne({ _id: req.params.imageId, shop: shop._id }).select(`${field} contentType product`);
    if (!image) return notFound();
    const [shown, inUse] = await Promise.all([
      Family.exists({ _id: image.product, shop: shop._id, inCatalog: true }),
      Product.exists({ shop: shop._id, family: image.product, active: true }),
    ]);
    if (!shown || !inUse) return notFound();
    res.set("Content-Type", image.contentType);
    res.set("Cache-Control", "public, max-age=3600");
    res.status(200).end(image[field]);
  } catch (error) {
    return next(error);
  }
};

const loadSettings = (req) => Shop.findById(req.shop._id).select("phone +catalog").lean();

// what the shop's own screen gets
const presentSettings = async (req) => {
  const shop = await loadSettings(req);
  const c = shop.catalog || {};
  const families = await Family.find({ shop: req.shop._id, inCatalog: true }).select("_id").lean();
  const live = await Product.distinct("family", { shop: req.shop._id, active: true, family: { $in: families.map((f) => f._id) } });
  const enabled = c.enabled === true && Boolean(c.token);
  return {
    enabled,
    token: enabled ? c.token : null,
    showPrices: c.showPrices === true,
    phone: c.phone || "",
    shopPhone: shop.phone,
    shownCount: live.length,
    canChange: req.account.role === "admin",
  };
};

const log = (req, action, summary) =>
  logActivity(req, { kind: "product", action, targetLabel: "Catalog", summary });

// GET /api/catalog-settings
exports.getSettings = async (req, res, next) => {
  try {
    res.status(200).json(await presentSettings(req));
  } catch (error) {
    return next(error);
  }
};

// PUT /api/catalog-settings   { enabled?, showPrices?, phone? }
exports.saveSettings = async (req, res, next) => {
  try {
    const body = req.body || {};
    const before = (await loadSettings(req)).catalog || {};
    const set = {};
    const lines = [];

    if (body.phone !== undefined) {
      const phone = typeof body.phone === "string" ? body.phone.trim() : null;
      const digits = String(phone || "").replace(/[\s\-()]/g, "").replace(/^\+/, "");
      if (phone === null || phone.length > 25 || (phone && !/^\d{6,15}$/.test(digits))) {
        return res.status(400).json({ message: "Phone number must have 6 to 15 digits (or leave it empty)." });
      }
      if (phone !== (before.phone || "")) {
        set["catalog.phone"] = phone;
        lines.push(["catalog.phone", phone ? `Set the catalog contact number to ${phone}` : "Catalog now shows the shop phone number"]);
      }
    }
    if (typeof body.showPrices === "boolean" && body.showPrices !== (before.showPrices === true)) {
      set["catalog.showPrices"] = body.showPrices;
      lines.push(["catalog.prices", `${body.showPrices ? "Showing" : "Hid"} prices on the customer catalog`]);
    }
    if (typeof body.enabled === "boolean" && body.enabled !== (before.enabled === true)) {
      set["catalog.enabled"] = body.enabled;
      if (body.enabled && !before.token) set["catalog.token"] = newToken();
      lines.push([body.enabled ? "catalog.on" : "catalog.off", `Switched the customer catalog ${body.enabled ? "on" : "off"}`]);
    }

    if (Object.keys(set).length) await Shop.updateOne({ _id: req.shop._id }, { $set: set });
    lines.forEach(([action, summary]) => log(req, action, summary));
    res.status(200).json(await presentSettings(req));
  } catch (error) {
    return next(error);
  }
};

// POST /api/catalog-settings/new-link   (the old link stops working)
exports.newLink = async (req, res, next) => {
  try {
    const current = (await loadSettings(req)).catalog;
    if (!current?.enabled) return res.status(400).json({ message: "Switch the catalog on first." });
    await Shop.updateOne({ _id: req.shop._id }, { $set: { "catalog.token": newToken() } });
    log(req, "catalog.new_link", "Made a new catalog link (the old one no longer works)");
    res.status(200).json(await presentSettings(req));
  } catch (error) {
    return next(error);
  }
};

// POST /api/catalog-settings/products   { ids: [product ids], show: true|false }
exports.showProducts = async (req, res, next) => {
  try {
    const { ids, show } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || ids.length > MAX_MOVE || ids.some((i) => typeof i !== "string" || !isId(i))) {
      return res.status(400).json({ message: "Please tick the products first." });
    }
    if (typeof show !== "boolean") return res.status(400).json({ message: "Something is not right. Please try again." });
    const result = await Family.updateMany(
      { _id: { $in: ids }, shop: req.shop._id, inCatalog: show ? { $ne: true } : true },
      { $set: { inCatalog: show } },
      { timestamps: false }
    );
    const changed = result.modifiedCount;
    if (changed) {
      logActivity(req, {
        kind: "product",
        action: show ? "catalog.show" : "catalog.hide",
        targetLabel: `${changed} ${changed === 1 ? "product" : "products"}`,
        summary: `${show ? "Added" : "Removed"} ${changed} ${changed === 1 ? "product" : "products"} ${show ? "to" : "from"} the customer catalog`,
      });
    }
    res.status(200).json({ changed });
  } catch (error) {
    return next(error);
  }
};
