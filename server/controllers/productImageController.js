// Product pictures. The screen sends two shrunk copies (full + thumb) as base64.
//  - see a picture: anyone who may see the product list
//  - add / remove / reorder: the admin, and staff with "Manage products"
// Pictures never change an order.
const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductImage = require("../models/ProductImage");
const { can } = require("../utils/permissions");
const { logActivity } = require("../utils/activity");

const MAX_PER_PRODUCT = 5;
const MAX_PER_SHOP = 1500;
const MAX_FULL = 250 * 1024; // bytes after shrinking
const MAX_THUMB = 40 * 1024;

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const label = (p) => (p.sizeLabel ? `${p.name} (${p.sizeLabel})` : p.name);

// the kind of picture, from the first bytes (the server never trusts a name or a type sent by the screen)
const kindOf = (buf) => {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "image/webp";
  return null;
};

// "data:image/jpeg;base64,...." or plain base64 -> Buffer (or null)
const decode = (value) => {
  if (typeof value !== "string" || !value) return null;
  const raw = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) return null;
  const buf = Buffer.from(raw, "base64");
  return buf.length ? buf : null;
};

// POST /api/products/:id/images   { full, thumb }
exports.addImage = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Product not found" });
    const product = await Product.findOne({ _id: req.params.id, shop: req.shop._id }).select("name sizeLabel images");
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.images.length >= MAX_PER_PRODUCT) {
      return res.status(400).json({ message: `A product can have up to ${MAX_PER_PRODUCT} pictures.` });
    }

    const full = decode(req.body?.full);
    const thumb = decode(req.body?.thumb);
    if (!full || !thumb) return res.status(400).json({ message: "Please choose a picture." });
    const kind = kindOf(full);
    const thumbKind = kindOf(thumb);
    if (!kind || !thumbKind) return res.status(400).json({ message: "This kind of picture is not supported. Please use a JPG, PNG or WebP picture." });
    if (full.length > MAX_FULL || thumb.length > MAX_THUMB) return res.status(400).json({ message: "This picture is too big. Please choose a smaller one." });
    if ((await ProductImage.countDocuments({ shop: req.shop._id })) >= MAX_PER_SHOP) {
      return res.status(400).json({ message: `A shop can keep up to ${MAX_PER_SHOP} product pictures.` });
    }

    const image = await ProductImage.create({ shop: req.shop._id, product: product._id, contentType: kind, full, thumb });
    // add it only if there is still room (two uploads at once cannot go over the limit)
    const pushed = await Product.updateOne(
      { _id: product._id, shop: req.shop._id, [`images.${MAX_PER_PRODUCT - 1}`]: { $exists: false } },
      { $push: { images: image._id } },
      { timestamps: false }
    );
    if (!pushed.matchedCount) {
      await image.deleteOne();
      return res.status(400).json({ message: `A product can have up to ${MAX_PER_PRODUCT} pictures.` });
    }
    logActivity(req, { kind: "product", action: "product.image_add", targetLabel: label(product), summary: `Added a picture to ${label(product)}` });
    const fresh = await Product.findById(product._id).select("images").lean();
    res.status(201).json({ image: { _id: image._id }, images: fresh.images });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/products/images/:imageId
exports.deleteImage = async (req, res, next) => {
  try {
    if (!isId(req.params.imageId)) return res.status(404).json({ message: "Picture not found" });
    const image = await ProductImage.findOne({ _id: req.params.imageId, shop: req.shop._id }).select("product");
    if (!image) return res.status(404).json({ message: "Picture not found" });
    const product = await Product.findOneAndUpdate(
      { _id: image.product, shop: req.shop._id },
      { $pull: { images: image._id } },
      { new: true, timestamps: false }
    ).select("name sizeLabel images");
    await image.deleteOne();
    if (product) {
      logActivity(req, { kind: "product", action: "product.image_remove", targetLabel: label(product), summary: `Removed a picture from ${label(product)}` });
    }
    res.status(200).json({ deleted: true, images: product ? product.images : [] });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/products/:id/images/order   { ids: [...] }  (the same pictures, in a new order; the first is the main one)
exports.orderImages = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Product not found" });
    const product = await Product.findOne({ _id: req.params.id, shop: req.shop._id }).select("name sizeLabel images");
    if (!product) return res.status(404).json({ message: "Product not found" });
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
    const current = product.images.map(String);
    const same = ids.length === current.length && new Set(ids).size === ids.length && ids.every((id) => current.includes(id));
    if (!same) return res.status(400).json({ message: "The pictures have changed. Please try again." });
    const changed = ids.some((id, i) => id !== current[i]);
    if (changed) {
      await Product.updateOne({ _id: product._id, shop: req.shop._id }, { $set: { images: ids } }, { timestamps: false });
      logActivity(req, { kind: "product", action: "product.image_order", targetLabel: label(product), summary: `Changed the main picture of ${label(product)}` });
    }
    res.status(200).json({ images: ids });
  } catch (error) {
    return next(error);
  }
};

// GET /api/products/images/:imageId?size=thumb|full  (the picture itself)
exports.getImage = async (req, res, next) => {
  try {
    const allowed = can(req.account, "manageProducts") || can(req.account, "createOrders") || can(req.account, "editOrders");
    if (!allowed) return res.status(403).json({ error: "You do not have permission to do this. Ask your admin." });
    if (!isId(req.params.imageId)) return res.status(404).json({ message: "Picture not found" });
    const field = req.query.size === "thumb" ? "thumb" : "full";
    const image = await ProductImage.findOne({ _id: req.params.imageId, shop: req.shop._id }).select(`${field} contentType`);
    if (!image) return res.status(404).json({ message: "Picture not found" });
    res.set("Content-Type", image.contentType);
    res.set("Cache-Control", "private, max-age=86400"); // a picture never changes (a new one gets a new id)
    res.status(200).end(image[field]);
  } catch (error) {
    return next(error);
  }
};
