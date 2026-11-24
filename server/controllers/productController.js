// The shop's products: a list the Create order window picks from.
//  - see the list: the admin and any staff who can create/edit orders or manage products
//  - add / edit / archive: the admin, and staff with "Manage products"
// Prices follow the amounts rule: someone who may not see amounts gets no prices
// and cannot change them. Nothing here changes an old order.
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { can } = require("../utils/permissions");
const { checkProductInput } = require("../utils/productInput");
const { logActivity } = require("../utils/activity");
const Order = require("../models/Order");
const { suggestProducts, keyOf, sizeLabelOf, MAX_SUGGESTIONS } = require("../utils/productSuggestions");

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

// Only the admin sets a category. Returns { skip } (not sent / not allowed), { error } or { value }.
const resolveCategory = async (req, body) => {
  if (req.account.role !== "admin" || !("category" in (body || {}))) return { skip: true };
  const id = body.category;
  if (id === null || id === "" || id === undefined) return { value: null };
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: "Please choose a category." };
  const found = await Category.findOne({ _id: id, shop: req.shop._id }).select("name").lean();
  if (!found) return { error: "Please choose a category." };
  return { value: found._id, name: found.name };
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

    // every word typed must be found in the name, size or notes (in any order: "10 x 8" finds "8 x 10")
    const search = String(req.query.search ?? "").trim().slice(0, 100);
    const words = search.split(/\s+/).filter(Boolean);
    if (words.length) {
      filter.$and = words.map((word) => {
        const pattern = new RegExp(escapeRegex(word), "i");
        return { $or: [{ name: pattern }, { sizeLabel: pattern }, { notes: pattern }] };
      });
    }
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));
    // both asked at the same time (each trip to the database takes time)
    const [products, categories] = await Promise.all([
      Product.find(filter).sort({ active: -1, name: 1, sizeLabel: 1 }).limit(limit),
      Category.find({ shop: req.shop._id }).select("name").sort({ nameKey: 1 }).lean(),
    ]);
    res.status(200).json({
      products: products.map((p) => present(req, p)),
      categories,
      canManage: canManage(req),
      // only the admin makes categories and moves products between them
      canManageCategories: req.account.role === "admin",
    });
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

    const cat = await resolveCategory(req, req.body);
    if (cat.error) return res.status(400).json({ message: cat.error });
    let product;
    try {
      product = await Product.create({ shop: req.shop._id, ...checked.values, ...(cat.value ? { category: cat.value } : {}) });
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
      if (dup) return res.status(400).json({ message: "Another product has the same name and size (a size is always kept with the smaller number first, so 10 x 8 is 8 x 10)." });
    }

    const cat = await resolveCategory(req, req.body);
    if (cat.error) return res.status(400).json({ message: cat.error });

    Object.assign(product, checked.values);
    if (checked.values.price === undefined) product.price = undefined;
    if (!cat.skip) product.category = cat.value || undefined;
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
    if (!cat.skip && String(before.category || "") !== String(cat.value || "")) {
      const oldCat = before.category ? await Category.findById(before.category).select("name").lean() : null;
      changes.push({ field: "Category", from: oldCat?.name || "(none)", to: cat.name || "(none)" });
    }
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
      Product.find({ shop: req.shop._id }).select("name sizeLabel size").lean(),
    ]);
    // products already in the list (even archived): the same name + size is never suggested again
    const existing = new Set(products.map((p) => keyOf(p.name, sizeLabelOf(p))));
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

// ---------- "Make sizes the same way": 8 x 10 and 10 x 8 are one size ----------
// Products made before the rule may be written with the bigger number first.
// The plan (read only): each such product is either RENAMED to the smaller-first
// size, or, when the same product already exists that way, MERGED into it (the
// reversed one is archived). Orders are never changed: they keep what they saved.
const buildTidyPlan = async (shopId) => {
  const all = await Product.find({ shop: shopId }).lean();
  const reversed = all.filter((p) => p.size && p.size.kind === "dimensions" && p.size.length > p.size.breadth);
  const wrongIds = new Set(reversed.map((p) => String(p._id))); // none of these can be the "right" product
  const wrong = reversed.filter((p) => p.active); // archived ones are out of the way already: left alone
  // where each correct product lives (active ones win)
  const homes = new Map();
  for (const p of [...all].sort((a, b) => Number(b.active) - Number(a.active))) {
    if (wrongIds.has(String(p._id))) continue;
    const key = keyOf(p.name, sizeLabelOf(p));
    if (!homes.has(key)) homes.set(key, p);
  }
  const plan = [];
  for (const p of wrong.sort((a, b) => Number(b.active) - Number(a.active) || String(a.name).localeCompare(b.name))) {
    const to = sizeLabelOf(p);
    const key = keyOf(p.name, to);
    const home = homes.get(key);
    if (home) {
      plan.push({ _id: String(p._id), name: p.name, from: p.sizeLabel, to, action: "merge", price: p.price, active: p.active, into: { _id: String(home._id), price: home.price, active: home.active } });
    } else {
      homes.set(key, p); // the next one with the same name and size is merged into this one
      plan.push({ _id: String(p._id), name: p.name, from: p.sizeLabel, to, action: "rename", price: p.price, active: p.active });
    }
  }
  return plan;
};

const presentPlan = (req, plan) =>
  plan.map((item) => {
    const out = { ...item };
    if (!seesAmounts(req)) {
      delete out.price;
      if (out.into) out.into = { _id: out.into._id, active: out.into.active };
    }
    return out;
  });

// GET /api/products/tidy-sizes   (reads only)
exports.tidySizesPlan = async (req, res, next) => {
  try {
    res.status(200).json({ plan: presentPlan(req, await buildTidyPlan(req.shop._id)) });
  } catch (error) {
    return next(error);
  }
};

// POST /api/products/tidy-sizes   { ids: [...] }  (the products of the plan to fix; the plan is worked out again here)
exports.tidySizesApply = async (req, res, next) => {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== "string")) {
      return res.status(400).json({ message: "Please choose the products first." });
    }
    const chosen = new Set(ids);
    const plan = (await buildTidyPlan(req.shop._id)).filter((i) => chosen.has(i._id));
    let renamed = 0;
    let merged = 0;
    for (const item of plan) {
      const product = await Product.findOne({ _id: item._id, shop: req.shop._id });
      if (!product) continue;
      if (item.action === "rename") {
        const checked = checkProductInput({ name: product.name, size: product.size, price: product.price, priceUnit: product.priceUnit, notes: product.notes });
        if (checked.error) continue;
        const dup = await Product.findOne({ shop: req.shop._id, nameKey: checked.values.nameKey, _id: { $ne: product._id } });
        if (dup) continue; // taken in the meantime: left as it is
        product.size = checked.values.size;
        product.sizeLabel = checked.values.sizeLabel;
        product.nameKey = checked.values.nameKey;
        await product.save();
        renamed += 1;
      } else {
        // the same product already exists the right way round: this one is archived.
        // If that one has no price yet, it takes this one's price.
        const keeper = await Product.findOne({ _id: item.into._id, shop: req.shop._id });
        if (keeper && seesAmounts(req) && (keeper.price === undefined || keeper.price === null) && product.price !== undefined && product.price !== null) {
          keeper.price = product.price;
          keeper.priceUnit = product.priceUnit;
          await keeper.save();
        }
        // an archived keeper comes back when the product being merged was in use, so the product does not vanish
        if (keeper && product.active && !keeper.active) {
          keeper.active = true;
          await keeper.save();
        }
        if (product.active) {
          product.active = false;
          await product.save();
        }
        merged += 1;
      }
    }
    if (renamed || merged) {
      logActivity(req, {
        kind: "product",
        action: "product.update",
        targetLabel: `${renamed + merged} products`,
        summary: `Made product sizes the same way (smaller number first): ${renamed} renamed, ${merged} merged into the same product`,
      });
    }
    res.status(200).json({ renamed, merged });
  } catch (error) {
    return next(error);
  }
};
