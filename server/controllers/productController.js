// The shop's products: a list the Create order window picks from.
//  - see the list: the admin and any staff who can create/edit orders or manage products
//  - add / edit / archive: the admin, and staff with "Manage products"
// Prices follow the amounts rule: someone who may not see amounts gets no prices
// and cannot change them. Nothing here changes an old order.
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { can } = require("../utils/permissions");
const { checkProductInput } = require("../utils/productInput");
const { logActivity } = require("../utils/activity");
const Order = require("../models/Order");
const { suggestProducts, MAX_SUGGESTIONS } = require("../utils/productSuggestions");

const MAX_PRODUCTS = 2000;
const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const seesAmounts = (req) => can(req.account, "viewAmounts");
const canManage = (req) => can(req.account, "manageProducts");

// what the screen gets (no price for someone who may not see amounts)
const present = (req, product) => {
  const p = product.toObject ? product.toObject() : { ...product };
  delete p.nameKey;
  delete p.__v;
  if (!seesAmounts(req)) {
    delete p.price;
    delete p.priceUnit;
  }
  return p;
};

const money = (n) => `₹${Number(n) || 0}`;
const priceText = (p) => (p.price === undefined || p.price === null ? "no price" : `${money(p.price)} per ${p.priceUnit}`);
const label = (p) => (p.sizeLabel ? `${p.name} (${p.sizeLabel})` : p.name);

// GET /api/products?search=&archived=1
exports.listProducts = async (req, res, next) => {
  try {
    const allowed = canManage(req) || can(req.account, "createOrders") || can(req.account, "editOrders");
    if (!allowed) return res.status(403).json({ error: "You do not have permission to do this. Ask your admin." });

    const filter = { shop: req.shop._id };
    // archived products are only for people who manage products
    const wantArchived = req.query.archived === "1" && canManage(req);
    if (!wantArchived) filter.active = true;

    const search = String(req.query.search ?? "").trim().slice(0, 100);
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: pattern }, { sizeLabel: pattern }, { notes: pattern }];
    }
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const products = await Product.find(filter).sort({ active: -1, name: 1, sizeLabel: 1 }).limit(limit);
    res.status(200).json({ products: products.map((p) => present(req, p)), canManage: canManage(req) });
  } catch (error) {
    return next(error);
  }
};

// POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const input = { ...req.body };
    if (!seesAmounts(req)) {
      delete input.price;
      delete input.priceUnit;
    }
    const checked = checkProductInput(input);
    if (checked.error) return res.status(400).json({ message: checked.error });

    if ((await Product.countDocuments({ shop: req.shop._id })) >= MAX_PRODUCTS) {
      return res.status(400).json({ message: `A shop can have up to ${MAX_PRODUCTS} products.` });
    }
    const dup = await Product.findOne({ shop: req.shop._id, nameKey: checked.values.nameKey });
    if (dup) {
      return res.status(400).json({
        message: dup.active
          ? "This product (same name and size) already exists."
          : "This product exists but is archived. Restore it from the Products page.",
      });
    }

    let product;
    try {
      product = await Product.create({ shop: req.shop._id, ...checked.values });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: "This product (same name and size) already exists." });
      throw err;
    }
    logActivity(req, {
      kind: "product",
      action: "product.create",
      targetLabel: label(product),
      summary: `Added product ${label(product)} (${priceText(product)})`,
    });
    res.status(201).json({ product: present(req, product) });
  } catch (error) {
    return next(error);
  }
};

const FIELDS = [
  { label: "Name", read: (p) => p.name },
  { label: "Size", read: (p) => p.sizeLabel || "(none)" },
  { label: "Price", read: (p) => (p.price === undefined || p.price === null ? "(none)" : money(p.price)) },
  { label: "Price for", read: (p) => p.priceUnit },
  { label: "Notes", read: (p) => p.notes || "(none)" },
];

// PUT /api/products/:id   (any of name, size, price, priceUnit, notes, active)
exports.updateProduct = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Product not found" });
    const product = await Product.findOne({ _id: req.params.id, shop: req.shop._id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const before = product.toObject();
    const input = { ...req.body };
    if (!seesAmounts(req)) {
      delete input.price;
      delete input.priceUnit;
    }
    const checked = checkProductInput(input, { existing: before });
    if (checked.error) return res.status(400).json({ message: checked.error });

    if (checked.values.nameKey !== before.nameKey) {
      const dup = await Product.findOne({ shop: req.shop._id, nameKey: checked.values.nameKey, _id: { $ne: product._id } });
      if (dup) return res.status(400).json({ message: "Another product has the same name and size." });
    }

    Object.assign(product, checked.values);
    if (checked.values.price === undefined) product.price = undefined;
    let archivedNow = null;
    if (typeof req.body.active === "boolean" && req.body.active !== before.active) {
      product.active = req.body.active;
      archivedNow = !req.body.active;
    }
    try {
      await product.save();
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: "Another product has the same name and size." });
      throw err;
    }

    const after = product.toObject();
    const changes = FIELDS.flatMap((f) => {
      const from = f.read(before);
      const to = f.read(after);
      return from === to ? [] : [{ field: f.label, from, to }];
    });
    if (changes.length) {
      logActivity(req, {
        kind: "product",
        action: "product.update",
        targetLabel: label(product),
        summary: `Edited product ${label(product)}`,
        changes,
      });
    }
    if (archivedNow !== null) {
      logActivity(req, {
        kind: "product",
        action: archivedNow ? "product.archive" : "product.restore",
        targetLabel: label(product),
        summary: `${archivedNow ? "Archived" : "Restored"} product ${label(product)}`,
      });
    }
    res.status(200).json({ product: present(req, product), changed: changes.length > 0 || archivedNow !== null });
  } catch (error) {
    return next(error);
  }
};

// GET /api/products/from-orders?min=2
// Suggestions for the product list, read from the Product text of old orders.
// Only reads. Products already in the list are left out.
exports.suggestFromOrders = async (req, res, next) => {
  try {
    const min = req.query.min === "1" ? 1 : 2;
    const [orders, products] = await Promise.all([
      Order.find({ shop: req.shop._id, item: { $exists: true, $ne: "" } }).select("item total lines").limit(50000).lean(),
      Product.find({ shop: req.shop._id }).select("nameKey").lean(),
    ]);
    // products already in the list (even archived): the same name + size is never suggested again
    const existing = new Set(products.map((p) => p.nameKey));
    const result = suggestProducts(orders, existing, { min, withPrices: seesAmounts(req) });
    res.status(200).json({ ...result, ordersRead: orders.length, canSeePrices: seesAmounts(req) });
  } catch (error) {
    return next(error);
  }
};

// POST /api/products/from-orders   { items: [{ name, size?, price? }] }
// Adds the chosen suggestions as products (price per piece). The price only
// goes on the product: no order is touched, whatever is chosen here.
exports.createFromOrders = async (req, res, next) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Please choose at least one product." });
    }
    if (items.length > MAX_SUGGESTIONS) {
      return res.status(400).json({ message: `You can add up to ${MAX_SUGGESTIONS} products at once.` });
    }
    const have = await Product.countDocuments({ shop: req.shop._id });
    if (have + items.length > MAX_PRODUCTS) {
      return res.status(400).json({ message: `A shop can have up to ${MAX_PRODUCTS} products.` });
    }

    const docs = [];
    const seen = new Set();
    let skipped = 0;
    for (const item of items) {
      if (!item || typeof item !== "object") return res.status(400).json({ message: "Something in the list is not right." });
      const input = { name: item.name };
      if (item.size && typeof item.size === "object") input.size = item.size;
      if (seesAmounts(req) && item.price !== undefined && item.price !== null && item.price !== "") input.price = item.price;
      const checked = checkProductInput(input);
      if (checked.error) return res.status(400).json({ message: `"${String(item.name ?? "").slice(0, 40)}": ${checked.error}` });
      // the same name twice in one request is added once
      if (seen.has(checked.values.nameKey)) {
        skipped += 1;
        continue;
      }
      seen.add(checked.values.nameKey);
      docs.push({ shop: req.shop._id, ...checked.values });
    }

    // already in the list (even archived): skipped
    const existing = new Set((await Product.find({ shop: req.shop._id, nameKey: { $in: docs.map((d) => d.nameKey) } }).select("nameKey").lean()).map((p) => p.nameKey));
    const fresh = docs.filter((d) => !existing.has(d.nameKey));
    skipped += docs.length - fresh.length;

    let created = 0;
    if (fresh.length) {
      try {
        const result = await Product.insertMany(fresh, { ordered: false });
        created = result.length;
      } catch (err) {
        // a race with another add: the rest were still saved
        if (err.code === 11000 || err.writeErrors) created = err.insertedDocs?.length ?? fresh.length - (err.writeErrors?.length || 0);
        else throw err;
      }
      skipped += fresh.length - created;
    }
    if (created) {
      logActivity(req, {
        kind: "product",
        action: "product.create",
        targetLabel: `${created} products`,
        summary: `Added ${created} ${created === 1 ? "product" : "products"} from old orders`,
      });
    }
    res.status(201).json({ created, skipped });
  } catch (error) {
    return next(error);
  }
};
