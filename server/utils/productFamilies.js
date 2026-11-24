// Products and their sizes. A "family" is the product ("Frame"); each size of it
// is a Product record. Products made before families existed are grouped by name
// the first time they are needed (only links are added: nothing is deleted or
// changed in a size record, and no order is touched).
const Product = require("../models/Product");
const Family = require("../models/ProductFamily");
const Category = require("../models/Category");
const ProductImage = require("../models/ProductImage");

const MAX_PICTURES = 5;

const cleanName = (value) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
const familyKey = (name) => cleanName(name).toLowerCase();

// the family with this name (made if it does not exist yet)
const ensureFamily = async (shopId, name) => {
  const clean = cleanName(name);
  const nameKey = familyKey(clean);
  const find = () => Family.findOne({ shop: shopId, nameKey });
  const found = await find();
  if (found) return found;
  try {
    return await Family.create({ shop: shopId, name: clean, nameKey });
  } catch (err) {
    if (err.code === 11000) return find(); // someone made it a moment ago
    throw err;
  }
};

const joinNotes = (list) => [...new Set(list.map((n) => String(n || "").trim()).filter(Boolean))].join(" / ").slice(0, 300);

const migrate = async (shopId) => {
  const orphans = await Product.find({ shop: shopId, family: null }).select("name notes category images").sort({ createdAt: 1 }).lean();
  if (!orphans.length) return 0;
  const cats = new Set((await Category.find({ shop: shopId }).select("_id").lean()).map((c) => String(c._id)));

  const groups = new Map();
  for (const p of orphans) {
    const key = familyKey(p.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  for (const [key, members] of groups) {
    let family = await Family.findOne({ shop: shopId, nameKey: key });
    const isNew = !family;
    if (!family) {
      const category = members.map((m) => m.category).find((c) => c && cats.has(String(c)));
      try {
        family = await Family.create({
          shop: shopId,
          name: cleanName(members[0].name),
          nameKey: key,
          notes: joinNotes(members.map((m) => m.notes)),
          ...(category ? { category } : {}),
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
        family = await Family.findOne({ shop: shopId, nameKey: key });
      }
    }
    const memberIds = members.map((m) => m._id);

    // pictures: the old ones follow the product (the first 5 are kept)
    const oldPictures = [...new Set(members.flatMap((m) => (m.images || []).map(String)))];
    if (oldPictures.length) {
      await Family.updateOne({ _id: family._id }, { $addToSet: { images: { $each: oldPictures } } });
      const fresh = await Family.findById(family._id).select("images").lean();
      if (fresh.images.length > MAX_PICTURES) {
        const keep = fresh.images.slice(0, MAX_PICTURES);
        const drop = fresh.images.slice(MAX_PICTURES);
        await Family.updateOne({ _id: family._id }, { $set: { images: keep } });
        await ProductImage.deleteMany({ shop: shopId, _id: { $in: drop } });
      }
    }
    await ProductImage.updateMany({ shop: shopId, product: { $in: memberIds } }, { $set: { product: family._id } });
    await Product.updateMany({ _id: { $in: memberIds }, shop: shopId }, { $set: { family: family._id } }, { timestamps: false });
    if (!isNew && !family.notes) {
      const notes = joinNotes(members.map((m) => m.notes));
      if (notes) await Family.updateOne({ _id: family._id, notes: "" }, { $set: { notes } });
    }
  }
  return orphans.length;
};

// Group the shop's products that have no family yet. One run at a time per shop.
const running = new Map();
const ensureFamiliesForShop = (shopId) => {
  const key = String(shopId);
  if (!running.has(key)) {
    running.set(key, migrate(shopId).finally(() => running.delete(key)));
  }
  return running.get(key);
};

const needsFamilies = async (shopId) => Boolean(await Product.exists({ shop: shopId, family: null }));

module.exports = { cleanName, familyKey, ensureFamily, ensureFamiliesForShop, needsFamilies, MAX_PICTURES };
