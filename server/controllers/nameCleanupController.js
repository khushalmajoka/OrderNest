// Cleaning the customer names of OLD orders (admin only).
//
// Step 1 (GET name-check): finds the names that are not real names (the same
// rules as for new orders, like "N", "NA", "xx", "123") and groups them, so the
// admin can look at them. Nothing is changed.
// Step 2 (POST clear-names): the admin picks groups; ONLY the customer name of
// those orders is emptied. Phone, product, amounts and the order's "last
// changed" time stay as they are (so rows do not jump to the top of the list).
const Order = require("../models/Order");
const { nameProblem, cleanName } = require("../utils/customerName");
const { logActivity } = require("../utils/activity");

const MAX_ORDERS_SHOWN = 5000; // a safety limit for one check

// "  Asha   Verma " -> "asha verma": the group a name belongs to
const groupKey = (name) => cleanName(name).toLowerCase();

// Orders (id, order ID, name, ...) of this shop whose name is NOT a real name
const findUnclearOrders = async (shopId) => {
  const orders = await Order.find({
    shop: shopId,
    customerName: { $type: "string", $regex: /\S/ }, // a name that is not empty
  })
    .select("orderId customerName item phone createdAt")
    .sort({ createdAt: -1 })
    .lean();
  return orders.filter((order) => nameProblem(order.customerName) !== null);
};

// GET /api/orders/shop/:shopId/name-check
exports.checkNames = async (req, res, next) => {
  try {
    if (req.params.shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const unclear = await findUnclearOrders(req.shop._id);
    const shown = unclear.slice(0, MAX_ORDERS_SHOWN);

    const groups = new Map();
    for (const order of shown) {
      const key = groupKey(order.customerName);
      if (!groups.has(key)) {
        groups.set(key, { key, name: cleanName(order.customerName), count: 0, orders: [] });
      }
      const group = groups.get(key);
      group.count += 1;
      group.orders.push({
        orderId: order.orderId,
        customerName: order.customerName,
        item: order.item,
        phone: order.phone,
        createdAt: order.createdAt,
      });
    }

    res.status(200).json({
      totalOrders: unclear.length,
      truncated: unclear.length > shown.length,
      groups: [...groups.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/orders/shop/:shopId/clear-names   { keys: ["n", "na"] }
// `keys` are the group keys from the check. A name that is a real name is
// never cleared, whatever is sent.
exports.clearNames = async (req, res, next) => {
  try {
    if (req.params.shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const keys = req.body?.keys;
    if (!Array.isArray(keys) || keys.length === 0 || keys.some((k) => typeof k !== "string")) {
      return res.status(400).json({ message: "Please choose which names to clear." });
    }
    const wanted = new Set(keys.map((k) => groupKey(k)));

    // Looked up again now, from the database (not trusted from the screen)
    const unclear = await findUnclearOrders(req.shop._id);
    const chosen = unclear.filter((order) => wanted.has(groupKey(order.customerName)));
    if (chosen.length === 0) {
      return res.status(200).json({ cleared: 0, names: [] });
    }

    // timestamps: false = the orders keep their "last changed" time
    await Order.updateMany(
      { _id: { $in: chosen.map((order) => order._id) }, shop: req.shop._id },
      { $set: { customerName: "" } },
      { timestamps: false }
    );

    // one entry per kind of name ("NA" and "na" are the same kind)
    const kinds = new Map();
    for (const order of chosen) {
      const key = groupKey(order.customerName);
      if (!kinds.has(key)) kinds.set(key, cleanName(order.customerName));
    }
    const names = [...kinds.values()];
    logActivity(req, {
      kind: "order",
      action: "order.clear_names",
      targetLabel: `${chosen.length} orders`,
      summary: `Cleared ${chosen.length} unclear customer name${chosen.length === 1 ? "" : "s"} (${names
        .slice(0, 12)
        .map((n) => `"${n}"`)
        .join(", ")}${names.length > 12 ? ", ..." : ""})`,
    });

    res.status(200).json({ cleared: chosen.length, names });
  } catch (error) {
    return next(error);
  }
};
