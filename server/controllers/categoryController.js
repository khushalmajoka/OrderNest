// Product categories: made, renamed, deleted and filled by the admin only.
// A category never changes an order, and deleting one never deletes a product.
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Family = require("../models/ProductFamily");
const { ensureFamiliesForShop } = require("../utils/productFamilies");
const { logActivity } = require("../utils/activity");

const MAX_CATEGORIES = 100;
const MAX_MOVE = 1000;

const cleanName = (value) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
const keyOf = (name) => name.toLowerCase();
const isId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/products/categories   { name }
exports.createCategory = async (req, res, next) => {
  try {
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ message: "Please enter the category name." });
    if ((await Category.countDocuments({ shop: req.shop._id })) >= MAX_CATEGORIES) {
      return res.status(400).json({ message: `A shop can have up to ${MAX_CATEGORIES} categories.` });
    }
    let category;
    try {
      category = await Category.create({ shop: req.shop._id, name, nameKey: keyOf(name) });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: "A category with this name already exists." });
      throw err;
    }
    logActivity(req, { kind: "product", action: "category.create", targetLabel: name, summary: `Added category ${name}` });
    res.status(201).json({ category: { _id: category._id, name: category.name } });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/products/categories/:id   { name }
exports.renameCategory = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Category not found" });
    const category = await Category.findOne({ _id: req.params.id, shop: req.shop._id });
    if (!category) return res.status(404).json({ message: "Category not found" });
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ message: "Please enter the category name." });
    if (name === category.name) return res.status(200).json({ category: { _id: category._id, name }, changed: false });
    const dup = await Category.findOne({ shop: req.shop._id, nameKey: keyOf(name), _id: { $ne: category._id } });
    if (dup) return res.status(400).json({ message: "A category with this name already exists." });
    const old = category.name;
    category.name = name;
    category.nameKey = keyOf(name);
    await category.save();
    logActivity(req, {
      kind: "product",
      action: "category.rename",
      targetLabel: name,
      summary: `Renamed category ${old} to ${name}`,
      changes: [{ field: "Name", from: old, to: name }],
    });
    res.status(200).json({ category: { _id: category._id, name }, changed: true });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/products/categories/:id   (its products become Uncategorized)
exports.deleteCategory = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Category not found" });
    const category = await Category.findOne({ _id: req.params.id, shop: req.shop._id });
    if (!category) return res.status(404).json({ message: "Category not found" });
    await ensureFamiliesForShop(req.shop._id); // products made the old way join their product first
    const moved = await Family.updateMany(
      { shop: req.shop._id, category: category._id },
      { $unset: { category: 1 } },
      { timestamps: false }
    );
    // the old place of the category (before products had sizes inside them)
    await Product.updateMany({ shop: req.shop._id, category: category._id }, { $unset: { category: 1 } }, { timestamps: false });
    await category.deleteOne();
    logActivity(req, {
      kind: "product",
      action: "category.delete",
      targetLabel: category.name,
      summary: `Deleted category ${category.name} (${moved.modifiedCount} product${moved.modifiedCount === 1 ? "" : "s"} now Uncategorized)`,
    });
    res.status(200).json({ deleted: true, productsMoved: moved.modifiedCount });
  } catch (error) {
    return next(error);
  }
};

// POST /api/products/move   { ids: [productId...], category: categoryId | null }
exports.moveProducts = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(String))] : [];
    if (!ids.length) return res.status(400).json({ message: "Please choose at least one product." });
    if (ids.length > MAX_MOVE || !ids.every(isId)) return res.status(400).json({ message: "These products cannot be moved." });

    let target = null;
    if (req.body.category !== null && req.body.category !== undefined && req.body.category !== "") {
      if (!isId(req.body.category)) return res.status(400).json({ message: "Please choose a category." });
      target = await Category.findOne({ _id: req.body.category, shop: req.shop._id });
      if (!target) return res.status(400).json({ message: "Please choose a category." });
    }
    // The ids are products (families); the id of a size also works (its product is moved).
    // Only this shop's products are touched; "updatedAt" is left alone.
    const sizes = await Product.find({ shop: req.shop._id, _id: { $in: ids } }).select("family").lean();
    if (sizes.some((p) => !p.family)) await ensureFamiliesForShop(req.shop._id);
    const sizeFamilies = sizes.some((p) => !p.family)
      ? (await Product.find({ shop: req.shop._id, _id: { $in: ids } }).select("family").lean()).map((p) => p.family)
      : sizes.map((p) => p.family);
    const familyIds = [...new Set([...ids, ...sizeFamilies.filter(Boolean).map(String)])];
    const result = await Family.updateMany(
      { shop: req.shop._id, _id: { $in: familyIds } },
      target ? { $set: { category: target._id } } : { $unset: { category: 1 } },
      { timestamps: false }
    );
    const n = result.matchedCount;
    if (n) {
      logActivity(req, {
        kind: "product",
        action: "category.move",
        targetLabel: target ? target.name : "Uncategorized",
        summary: `Moved ${n} product${n === 1 ? "" : "s"} to ${target ? target.name : "Uncategorized"}`,
      });
    }
    res.status(200).json({ moved: n });
  } catch (error) {
    return next(error);
  }
};
