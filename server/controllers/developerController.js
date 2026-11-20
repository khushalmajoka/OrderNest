// The developer's own numbers (see middlewares/requireDeveloper.js):
//  - usage: how much each feature is used, over the last N days
//  - completeness: how many orders have a phone, an address, ...
// Across ALL shops, or one shop (?shop=ID).
const mongoose = require("mongoose");
const UsageCount = require("../models/UsageCount");
const Shop = require("../models/Shop");
const User = require("../models/User");
const Order = require("../models/Order");
const FEATURES = require("../utils/usageFeatures");
const dateStamp = require("../utils/dateStamp");
const { nameProblem } = require("../utils/customerName");

const DAYS = [7, 30, 90];

const stampOf = (date) => dateStamp(date);

const readShop = async (req, res) => {
  const wanted = req.query.shop;
  if (!wanted || wanted === "all") return { all: true };
  if (!mongoose.Types.ObjectId.isValid(wanted)) {
    res.status(400).json({ message: "Unknown shop." });
    return null;
  }
  const shop = await Shop.findById(wanted).select("name owner");
  if (!shop) {
    res.status(400).json({ message: "Unknown shop." });
    return null;
  }
  return { all: false, shop };
};

// GET /api/developer/usage?days=30&shop=all
exports.getUsage = async (req, res, next) => {
  try {
    const days = DAYS.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const scope = await readShop(req, res);
    if (!scope) return;

    const first = stampOf(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
    const match = { day: { $gte: first } };
    if (!scope.all) match.shop = scope.shop._id;

    const rows = await UsageCount.find(match).select("day feature count users lastAt").lean();
    // The first day anything was counted (counting only starts when this feature went live)
    const firstRow = await UsageCount.findOne(scope.all ? {} : { shop: scope.shop._id }).sort({ day: 1 }).select("day").lean();

    const byFeature = new Map();
    const daily = new Map();
    const allUsers = new Set();
    for (const r of rows) {
      const f = byFeature.get(r.feature) || { count: 0, users: new Set(), lastAt: null, days: new Set() };
      f.count += r.count;
      (r.users || []).forEach((u) => {
        f.users.add(u);
        allUsers.add(u);
      });
      if (!f.lastAt || r.lastAt > f.lastAt) f.lastAt = r.lastAt;
      f.days.add(r.day);
      byFeature.set(r.feature, f);
      daily.set(r.day, (daily.get(r.day) || 0) + r.count);
    }

    const total = [...byFeature.values()].reduce((s, f) => s + f.count, 0);

    // People who could use the app: the owner and the turned-on staff
    const shops = await Shop.find(scope.all ? {} : { _id: scope.shop._id }).select("name owner").lean();
    const people = await User.countDocuments({
      $or: [{ _id: { $in: shops.map((s) => s.owner) } }, { shopId: { $in: shops.map((s) => s._id) } }],
      active: { $ne: false },
    });

    const features = FEATURES.map((meta) => {
      const f = byFeature.get(meta.key);
      return {
        key: meta.key,
        label: meta.label,
        group: meta.group,
        count: f ? f.count : 0,
        share: f && total ? (f.count / total) * 100 : 0,
        people: f ? f.users.size : 0,
        daysUsed: f ? f.days.size : 0,
        lastAt: f ? f.lastAt : null,
      };
    }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    // one number per day, oldest first, for the small bar chart
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = stampOf(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
      series.push({ day, count: daily.get(day) || 0 });
    }

    res.status(200).json({
      days,
      since: firstRow ? firstRow.day : null,
      total,
      people,
      activePeople: allUsers.size,
      features,
      series,
      // always every shop, for the shop picker
      shops: (await Shop.find({}).select("name").sort({ name: 1 }).lean()).map((s) => ({ id: String(s._id), name: s.name })),
      shop: scope.all ? "all" : String(scope.shop._id),
    });
  } catch (error) {
    return next(error);
  }
};

const has = (field) => ({
  $sum: {
    $cond: [
      { $and: [{ $eq: [{ $type: field }, "string"] }, { $gt: [{ $strLenCP: { $trim: { input: field } } }, 0] }] },
      1,
      0,
    ],
  },
});

// GET /api/developer/completeness?shop=all
exports.getCompleteness = async (req, res, next) => {
  try {
    const scope = await readShop(req, res);
    if (!scope) return;
    const match = scope.all ? {} : { shop: scope.shop._id };

    const [row] = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          phone: has("$phone"),
          address: has("$address"),
          item: has("$item"),
          executive: has("$orderExecutive"),
          deliveryDate: { $sum: { $cond: [{ $eq: [{ $type: "$expectedDeliveryDate" }, "date"] }, 1, 0] } },
          advance: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$advance", 0] }, 0] }, 1, 0] } },
        },
      },
    ]);

    const total = row?.total || 0;

    // A real name only: "N", "NA", "xx", "123" and an empty name do not count
    let realNames = 0;
    const cursor = Order.find(match).select("customerName").lean().cursor();
    for await (const order of cursor) {
      if (typeof order.customerName === "string" && order.customerName.trim() && nameProblem(order.customerName) === null) {
        realNames += 1;
      }
    }

    const counts = { ...(row || {}), customerName: realNames };
    const part = (label, key) => ({
      key,
      label,
      count: counts[key] || 0,
      percent: total ? ((counts[key] || 0) / total) * 100 : 0,
    });
    res.status(200).json({
      total,
      fields: [
        part("Customer phone", "phone"),
        part("Customer name", "customerName"),
        part("Product", "item"),
        part("Delivery address", "address"),
        part("Delivery date", "deliveryDate"),
        part("Order executive", "executive"),
        part("Advance taken", "advance"),
      ],
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/developer/shops: every shop, so the developer can open any of them
exports.listShops = async (req, res, next) => {
  try {
    const shops = await Shop.find({}).select("name category phone owner createdAt").sort({ createdAt: 1 }).lean();
    const owners = await User.find({ _id: { $in: shops.map((s) => s.owner) } }).select("name email").lean();
    const ownerOf = new Map(owners.map((o) => [String(o._id), o]));

    const stats = await Order.aggregate([
      { $group: { _id: "$shop", orders: { $sum: 1 }, lastAt: { $max: "$updatedAt" } } },
    ]);
    const statOf = new Map(stats.map((s) => [String(s._id), s]));
    const staff = await User.aggregate([
      { $match: { role: "staff", shopId: { $in: shops.map((s) => s._id) } } },
      { $group: { _id: "$shopId", staff: { $sum: 1 } } },
    ]);
    const staffOf = new Map(staff.map((s) => [String(s._id), s.staff]));

    res.status(200).json({
      shops: shops.map((s) => {
        const owner = ownerOf.get(String(s.owner));
        const st = statOf.get(String(s._id));
        return {
          id: String(s._id),
          name: s.name,
          category: s.category,
          ownerName: owner?.name,
          ownerEmail: owner?.email,
          orders: st?.orders || 0,
          lastActivity: st?.lastAt || null,
          staff: staffOf.get(String(s._id)) || 0,
          createdAt: s.createdAt,
        };
      }),
    });
  } catch (error) {
    return next(error);
  }
};
