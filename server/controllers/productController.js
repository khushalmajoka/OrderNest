// The shop's products. A product ("Frame") has a name, category, pictures and notes, and
// its sizes inside it, each size with its own price. A size is a Product record; the
// product is a ProductFamily. Orders point at the size records.
//  - see the list: the admin and any staff who can create/edit orders or manage products
//  - add / edit / archive: the admin, and staff with "Manage products"
//  - category: the admin only
// Prices follow the amounts rule: someone who may not see amounts gets no prices
// and cannot change them. Nothing here changes an old order.
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Family = require("../models/ProductFamily");
const { can } = require("../utils/permissions");
const { checkProductInput } = require("../utils/productInput");
const { logActivity } = require("../utils/activity");
const Order = require("../models/Order");
const { suggestProducts, keyOf, sizeLabelOf, MAX_SUGGESTIONS } = require("../utils/productSuggestions");
const { cleanName, familyKey, ensureFamily, ensureFamiliesForShop, needsFamilies } = require("../utils/productFamilies");

const MAX_PRODUCTS = 2000; // size records in a shop
const MAX_SIZES = 50; // sizes in one product

const seesAmounts = (req) => can(req.account, "viewAmounts");
const canManage = (req) => can(req.account, "manageProducts");
const isAdmin = (req) => req.account.role === "admin";
const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const cleanNotes = (v) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 300);

// what the screen gets for a size (no price for someone who may not see amounts).
// The product's category, pictures and notes are shown on each of its sizes too.
const present = (req, product, family) => {
  const p = product.toObject ? product.toObject() : { ...product };
  delete p.nameKey;
  delete p.__v;
  if (p.family) p.family = String(p.family);
  p.category = family?.category ? String(family.category) : undefined;
  p.images = (family?.images || []).map(String);
  p.notes = family ? family.notes || "" : p.notes || "";
  if (!seesAmounts(req)) {
    delete p.price;
    delete p.priceUnit;
  }
  return p;
};
const presentFamily = (f) => ({
  _id: String(f._id),
  name: f.name,
  notes: f.notes || "",
  category: f.category ? String(f.category) : undefined,
  images: (f.images || []).map(String),
  inCatalog: Boolean(f.inCatalog),
});

const money = (n) => `₹${Number(n) || 0}`;
const priceText = (p) => (p.price === undefined || p.price === null ? "no price" : `${money(p.price)} per ${p.priceUnit}`);
const label = (p) => (p.sizeLabel ? `${p.name} (${p.sizeLabel})` : p.name);

// Only the admin sets a category. Returns { skip } (not sent / not allowed), { error } or { value, name }.
const resolveCategory = async (req, body) => {
  if (!isAdmin(req) || !("category" in (body || {}))) return { skip: true };
  const id = body.category;
  if (id === null || id === "" || id === undefined) return { value: null };
  if (!isId(id)) return { error: "Please choose a category." };
  const found = await Category.findOne({ _id: id, shop: req.shop._id }).select("name").lean();
  if (!found) return { error: "Please choose a category." };
  return { value: found._id, name: found.name };
};

// Is this a good new name for the product? (nothing is changed)
const checkRename = async (req, family, newName) => {
  const name = cleanName(newName);
  if (!name) return { error: "Please enter the product name." };
  const nameKey = familyKey(name);
  if (nameKey !== family.nameKey) {
    const dup = await Family.findOne({ shop: req.shop._id, nameKey, _id: { $ne: family._id } }).select("_id").lean();
    if (dup) return { error: "A product with this name already exists. Open it and add a size instead." };
  }
  return { name, nameKey, same: name === family.name };
};

// Rename a product: every size gets the new name (check it with checkRename first).
const renameFamily = async (req, family, checked) => {
  if (checked.same) return { changed: false };
  const sizes = await Product.find({ shop: req.shop._id, family: family._id }).select("sizeLabel").lean();
  if (sizes.length) {
    await Product.bulkWrite(
      sizes.map((s) => ({
        updateOne: { filter: { _id: s._id }, update: { $set: { name: checked.name, nameKey: `${checked.nameKey}|${String(s.sizeLabel || "").toLowerCase()}` } } },
      }))
    );
  }
  const old = family.name;
  family.name = checked.name;
  family.nameKey = checked.nameKey;
  await family.save();
  return { changed: true, change: { field: "Name", from: old, to: checked.name } };
};

// notes / category of a product (category: admin only). Returns { error } or { changes }.
const applyFamilyFields = async (req, family, body) => {
  const changes = [];
  if (body.notes !== undefined && cleanNotes(body.notes) !== (family.notes || "")) {
    const to = cleanNotes(body.notes);
    changes.push({ field: "Notes", from: family.notes || "(none)", to: to || "(none)" });
    family.notes = to;
  }
  const cat = await resolveCategory(req, body);
  if (cat.error) return { error: cat.error };
  if (!cat.skip && String(family.category || "") !== String(cat.value || "")) {
    const oldCat = family.category ? await Category.findById(family.category).select("name").lean() : null;
    changes.push({ field: "Category", from: oldCat?.name || "(none)", to: cat.name || "(none)" });
    family.category = cat.value || undefined;
  }
  if (typeof body.inCatalog === "boolean" && body.inCatalog !== Boolean(family.inCatalog)) {
    changes.push({ field: "In catalog", from: family.inCatalog ? "Yes" : "No", to: body.inCatalog ? "Yes" : "No" });
    family.inCatalog = body.inCatalog;
  }
  return { changes };
};

// GET /api/products?search=&archived=1
// -> sizes (products), the products they belong to (families) and the categories
exports.listProducts = async (req, res, next) => {
  try {
    const allowed = canManage(req) || can(req.account, "createOrders") || can(req.account, "editOrders");
    if (!allowed) return res.status(403).json({ error: "You do not have permission to do this. Ask your admin." });

    const shopId = req.shop._id;
    const filter = { shop: shopId };
    // archived sizes are only for people who manage products
    const wantArchived = req.query.archived === "1" && canManage(req);
    if (!wantArchived) filter.active = true;

    // every word typed must be found in the name, size or notes (in any order: "10 x 8" finds "8 x 10")
    const search = String(req.query.search ?? "").trim().slice(0, 100);
    const words = search.split(/\s+/).filter(Boolean);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));

    // one trip to the database: the sizes, the categories, the products, and whether old products need grouping
    const load = () =>
      Promise.all([
        Product.find(filter).sort({ active: -1, name: 1, sizeLabel: 1 }).lean(),
        Category.find({ shop: shopId }).select("name").sort({ nameKey: 1 }).lean(),
        Family.find({ shop: shopId }).lean(),
        needsFamilies(shopId),
      ]);
    let [products, categories, families, needs] = await load();
    if (needs) {
      // products made before sizes lived inside products: group them now (links only)
      await ensureFamiliesForShop(shopId);
      [products, categories, families] = await load();
    }
    const byId = new Map(families.map((f) => [String(f._id), f]));
    if (words.length) {
      // every word must be found in the product's name, the size or the notes of its product
      const lower = words.map((w) => w.toLowerCase());
      products = products.filter((p) => {
        const text = `${p.name} ${p.sizeLabel || ""} ${byId.get(String(p.family))?.notes || p.notes || ""}`.toLowerCase();
        return lower.every((w) => text.includes(w));
      });
    }
    products = products.slice(0, limit);
    const used = new Set(products.map((p) => String(p.family)));
    res.status(200).json({
      products: products.map((p) => present(req, p, byId.get(String(p.family)))),
      families: families.filter((f) => used.has(String(f._id))).map(presentFamily),
      categories,
      canManage: canManage(req),
      // only the admin makes categories and moves products between them
      canManageCategories: isAdmin(req),
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/products/families   { name, category?, notes?, sizes: [{ size?, price?, priceUnit? }] }
// A new product with its sizes (a product with no size has one size line without a size).
exports.createFamily = async (req, res, next) => {
  try {
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ message: "Please enter the product name." });
    const sizesIn = Array.isArray(req.body?.sizes) && req.body.sizes.length ? req.body.sizes : [{}];
    if (sizesIn.length > MAX_SIZES) return res.status(400).json({ message: `A product can have up to ${MAX_SIZES} sizes.` });

    const docs = [];
    const seen = new Set();
    for (const row of sizesIn) {
      if (!row || typeof row !== "object") return res.status(400).json({ message: "Something in the sizes is not right." });
      const input = { name, size: row.size };
      if (seesAmounts(req)) {
        input.price = row.price;
        input.priceUnit = row.priceUnit;
      }
      const checked = checkProductInput(input);
      if (checked.error) return res.status(400).json({ message: checked.error });
      if (seen.has(checked.values.nameKey)) return res.status(400).json({ message: "Two sizes are the same. Each size can be added once." });
      seen.add(checked.values.nameKey);
      docs.push(checked.values);
    }
    if ((await Product.countDocuments({ shop: req.shop._id })) + docs.length > MAX_PRODUCTS) {
      return res.status(400).json({ message: `A shop can have up to ${MAX_PRODUCTS} sizes of products.` });
    }
    if (await Family.exists({ shop: req.shop._id, nameKey: familyKey(name) })) {
      return res.status(400).json({ message: "A product with this name already exists. Open it and add a size instead." });
    }
    const cat = await resolveCategory(req, req.body);
    if (cat.error) return res.status(400).json({ message: cat.error });

    let family;
    try {
      family = await Family.create({
        shop: req.shop._id,
        name,
        nameKey: familyKey(name),
        notes: cleanNotes(req.body?.notes),
        ...(cat.value ? { category: cat.value } : {}),
        ...(req.body?.inCatalog === true ? { inCatalog: true } : {}),
      });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: "A product with this name already exists. Open it and add a size instead." });
      throw err;
    }
    let sizes;
    try {
      sizes = await Product.insertMany(docs.map((d) => ({ shop: req.shop._id, family: family._id, ...d, notes: undefined })));
    } catch (err) {
      await Family.deleteOne({ _id: family._id }); // nothing half-made is left
      throw err;
    }
    logActivity(req, {
      kind: "product",
      action: "product.create",
      targetLabel: name,
      summary: `Added product ${name} (${sizes.length} ${sizes.length === 1 ? "size" : "sizes"})`,
    });
    res.status(201).json({ family: presentFamily(family), sizes: sizes.map((s) => present(req, s, family)) });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/products/families/:id   { name?, notes?, category?, active? }
// active: false / true archives / restores every size of the product.
exports.updateFamily = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Product not found" });
    let family = await Family.findOne({ _id: req.params.id, shop: req.shop._id });
    if (!family) return res.status(404).json({ message: "Product not found" });
    const changes = [];
    // check everything first, then change
    const rename = req.body.name !== undefined ? await checkRename(req, family, req.body.name) : null;
    if (rename?.error) return res.status(400).json({ message: rename.error });
    const catCheck = await resolveCategory(req, req.body);
    if (catCheck.error) return res.status(400).json({ message: catCheck.error });
    if (rename) {
      const r = await renameFamily(req, family, rename);
      if (r.change) changes.push(r.change);
    }
    const f = await applyFamilyFields(req, family, req.body);
    if (f.error) return res.status(400).json({ message: f.error });
    changes.push(...f.changes);
    if (f.changes.length) await family.save();

    let archived = null;
    if (typeof req.body.active === "boolean") {
      const r = await Product.updateMany({ shop: req.shop._id, family: family._id, active: !req.body.active }, { $set: { active: req.body.active } });
      if (r.modifiedCount) archived = !req.body.active;
    }
    if (changes.length) {
      logActivity(req, { kind: "product", action: "product.update", targetLabel: family.name, summary: `Edited product ${family.name}`, changes });
    }
    if (archived !== null) {
      logActivity(req, {
        kind: "product",
        action: archived ? "product.archive" : "product.restore",
        targetLabel: family.name,
        summary: `${archived ? "Archived" : "Restored"} product ${family.name} (all sizes)`,
      });
    }
    res.status(200).json({ family: presentFamily(family), changed: changes.length > 0 || archived !== null });
  } catch (error) {
    return next(error);
  }
};

// POST /api/products   (adds a size)
//   { family: id, size?, price?, priceUnit? }   a size of a product that exists
//   { name, size?, price?, ... }                the product with this name (made if it is new)
exports.createProduct = async (req, res, next) => {
  try {
    const input = { ...req.body };
    if (!seesAmounts(req)) {
      delete input.price;
      delete input.priceUnit;
    }
    let family = null;
    if (input.family !== undefined && input.family !== null && input.family !== "") {
      family = isId(input.family) ? await Family.findOne({ _id: input.family, shop: req.shop._id }) : null;
      if (!family) return res.status(400).json({ message: "Product not found." });
      input.name = family.name;
    }
    const checked = checkProductInput(input);
    if (checked.error) return res.status(400).json({ message: checked.error });

    if ((await Product.countDocuments({ shop: req.shop._id })) >= MAX_PRODUCTS) {
      return res.status(400).json({ message: `A shop can have up to ${MAX_PRODUCTS} sizes of products.` });
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
    if (!family) family = await ensureFamily(req.shop._id, checked.values.name);

    let product;
    try {
      product = await Product.create({ shop: req.shop._id, family: family._id, ...checked.values, notes: undefined });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: "This product (same name and size) already exists." });
      throw err;
    }
    // notes and category belong to the product
    const f = await applyFamilyFields(req, family, { ...(req.body.notes ? { notes: req.body.notes } : {}), ...("category" in req.body ? { category: req.body.category } : {}) });
    if (f.changes?.length) await family.save();
    logActivity(req, {
      kind: "product",
      action: "product.create",
      targetLabel: label(product),
      summary: `Added product ${label(product)} (${priceText(product)})`,
    });
    res.status(201).json({ product: present(req, product, family) });
  } catch (error) {
    return next(error);
  }
};

const FIELDS = [
  { label: "Name", read: (p) => p.name },
  { label: "Size", read: (p) => p.sizeLabel || "(none)" },
  { label: "Price", read: (p) => (p.price === undefined || p.price === null ? "(none)" : money(p.price)) },
  { label: "Price for", read: (p) => p.priceUnit },
];

// PUT /api/products/:id   (one size: size, price, priceUnit, active)
// The name, notes and category belong to the product: sent here, they are applied to it.
exports.updateProduct = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Product not found" });
    let product = await Product.findOne({ _id: req.params.id, shop: req.shop._id });
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!product.family) {
      await ensureFamiliesForShop(req.shop._id);
      product = await Product.findOne({ _id: req.params.id, shop: req.shop._id });
    }
    const family = await Family.findOne({ _id: product.family, shop: req.shop._id });
    const before = product.toObject();

    // check everything first, then change anything
    const rename = req.body.name !== undefined ? await checkRename(req, family, req.body.name) : { name: family.name, nameKey: family.nameKey, same: true };
    if (rename.error) return res.status(400).json({ message: rename.error });
    const catCheck = await resolveCategory(req, req.body);
    if (catCheck.error) return res.status(400).json({ message: catCheck.error });

    const input = { ...req.body, name: rename.name };
    if (!seesAmounts(req)) {
      delete input.price;
      delete input.priceUnit;
    }
    const checked = checkProductInput(input, { existing: before });
    if (checked.error) return res.status(400).json({ message: checked.error });
    // another size of the same product with this size?
    const sameSize = await Product.findOne({ shop: req.shop._id, family: family._id, sizeLabel: checked.values.sizeLabel, _id: { $ne: product._id } }).select("_id").lean();
    if (sameSize) return res.status(400).json({ message: "Another product has the same name and size (a size is always kept with the smaller number first, so 10 x 8 is 8 x 10)." });

    const familyChanges = [];
    const renamed = await renameFamily(req, family, rename);
    if (renamed.change) familyChanges.push(renamed.change);
    const f = await applyFamilyFields(req, family, req.body);
    familyChanges.push(...f.changes);
    if (f.changes.length) await family.save();
    product = await Product.findOne({ _id: req.params.id, shop: req.shop._id });

    Object.assign(product, checked.values);
    product.notes = undefined;
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
    const changes = [
      ...familyChanges,
      ...FIELDS.flatMap((fld) => {
        if (fld.label === "Name" && familyChanges.some((c) => c.field === "Name")) return [];
        const from = fld.read(before);
        const to = fld.read(after);
        return from === to ? [] : [{ field: fld.label, from, to }];
      }),
    ];
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
    res.status(200).json({ product: present(req, product, family), changed: changes.length > 0 || archivedNow !== null });
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
    if (created) await ensureFamiliesForShop(req.shop._id); // the new sizes join their product
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
