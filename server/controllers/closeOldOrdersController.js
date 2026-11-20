// Closing OLD orders that never got a status update (admin only).
//
// Many old orders stay on "Order Received" for ever, so the Open count is too
// high. This tool lets the admin choose which old orders to close:
//   Step 1 (GET close-check):  shows what WOULD change. Nothing is changed.
//   Step 2 (POST close-orders): changes only the status (and, if the admin
//     ticked it, marks the balance as paid). The "last changed" time of the
//     orders is NOT touched, so rows do not jump to the top of the list.
// Open = not Delivered, Cancelled or Closed (old) (see utils/statusGroups.js).
const Order = require("../models/Order");
const ORDER_STATUSES = require("../models/orderStatuses");
const { logActivity } = require("../utils/activity");
const { FINISHED, CLOSED_OLD } = require("../utils/statusGroups");

const MAX_ORDERS = 5000; // a safety limit for one go
const OPEN_STATUSES = ORDER_STATUSES.filter((s) => !FINISHED.includes(s));
const BASES = ["delivery", "created", "updated"];
const BASE_LABEL = {
  delivery: "delivery date",
  created: "created date",
  updated: "last changed date",
};

const isRealDay = (text) => {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
};

// Reads and checks what the admin chose. Returns { error } or the clean choice.
const readChoice = (source) => {
  const basis = source?.basis;
  const before = source?.before;
  let statuses = source?.statuses;
  if (typeof statuses === "string") statuses = statuses.split(",").filter(Boolean);

  if (!BASES.includes(basis)) return { error: "Please choose which date to use." };
  if (!isRealDay(before)) return { error: "Please choose a date." };
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return { error: "Please choose at least one status." };
  }
  if (statuses.some((s) => !OPEN_STATUSES.includes(s))) {
    return { error: "Only orders that are still open can be closed." };
  }
  return { basis, before, statuses: [...new Set(statuses)] };
};

// The database filter: this shop, chosen statuses, and "older than" the date.
// "Older than 01 Jan" means the day BEFORE 01 Jan and earlier (01 Jan itself stays).
const makeFilter = (shopId, { basis, before, statuses }) => {
  const istStart = new Date(`${before}T00:00:00.000+05:30`); // created/changed: Indian time
  const dayStart = new Date(`${before}T00:00:00.000Z`); // delivery dates are saved as plain days

  let date;
  if (basis === "created") {
    date = { $lt: ["$createdAt", istStart] };
  } else if (basis === "updated") {
    date = { $lt: ["$updatedAt", istStart] };
  } else {
    // delivery date; an order without one is judged by its created date
    date = {
      $cond: [
        { $eq: [{ $type: "$expectedDeliveryDate" }, "date"] },
        { $lt: ["$expectedDeliveryDate", dayStart] },
        { $lt: ["$createdAt", istStart] },
      ],
    };
  }
  return { shop: shopId, status: { $in: statuses }, $expr: date };
};

const FIELDS = "orderId customerName item phone status total advance balance createdAt expectedDeliveryDate";

const findMatches = (shopId, choice, limit) =>
  Order.find(makeFilter(shopId, choice)).select(FIELDS).sort({ createdAt: 1 }).limit(limit).lean();

const showDay = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

// GET /api/orders/shop/:shopId/close-check?basis=delivery&before=2026-01-01&statuses=Pending,Order Received
exports.checkOldOrders = async (req, res, next) => {
  try {
    if (req.params.shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const choice = readChoice(req.query);
    if (choice.error) return res.status(400).json({ message: choice.error });

    const found = await findMatches(req.shop._id, choice, MAX_ORDERS + 1);
    const tooMany = found.length > MAX_ORDERS;
    const orders = tooMany ? found.slice(0, MAX_ORDERS) : found;

    const byStatus = {};
    let balance = 0;
    let withBalance = 0;
    let dueLater = 0; // delivery date is today or later: probably still a live order
    let oldest = null;
    let newest = null;
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      const b = Number(o.balance) || 0;
      balance += b;
      if (b > 0) withBalance += 1;
      if (o.expectedDeliveryDate && new Date(o.expectedDeliveryDate) >= today) dueLater += 1;
      if (!oldest || o.createdAt < oldest) oldest = o.createdAt;
      if (!newest || o.createdAt > newest) newest = o.createdAt;
    }

    res.status(200).json({
      count: orders.length,
      tooMany,
      limit: MAX_ORDERS,
      byStatus,
      balance,
      withBalance,
      dueLater,
      oldest,
      newest,
      // for the Excel backup and the short list on the screen
      orders: orders.map((o) => ({
        orderId: o.orderId,
        customerName: o.customerName,
        item: o.item,
        phone: o.phone,
        status: o.status,
        total: o.total,
        advance: o.advance,
        balance: o.balance,
        createdAt: o.createdAt,
        expectedDeliveryDate: o.expectedDeliveryDate,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/orders/shop/:shopId/close-orders
// { basis, before, statuses, newStatus, markPaid, expectedCount }
// `expectedCount` is the number the admin saw in the check. If the real number
// is different now (orders changed meanwhile), nothing is changed.
exports.closeOldOrders = async (req, res, next) => {
  try {
    if (req.params.shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const choice = readChoice(req.body);
    if (choice.error) return res.status(400).json({ message: choice.error });

    const { newStatus, markPaid, expectedCount } = req.body;
    if (!FINISHED.includes(newStatus)) {
      return res.status(400).json({ message: "The new status must be Closed (old), Delivered or Cancelled." });
    }
    if (typeof markPaid !== "undefined" && typeof markPaid !== "boolean") {
      return res.status(400).json({ message: "Invalid choice for the balance." });
    }
    if (!Number.isInteger(expectedCount) || expectedCount < 0) {
      return res.status(400).json({ message: "Please check the orders first." });
    }
    // "Paid" only makes sense for delivered orders
    const payBalance = markPaid === true && newStatus === "Delivered";

    // Looked up again now, from the database (not trusted from the screen)
    const found = await Order.find(makeFilter(req.shop._id, choice)).select("_id").limit(MAX_ORDERS + 1).lean();
    if (found.length > MAX_ORDERS) {
      return res.status(400).json({
        message: `That is more than ${MAX_ORDERS} orders. Please choose an earlier date.`,
      });
    }
    if (found.length !== expectedCount) {
      return res.status(409).json({
        message: "The orders changed since you checked. Please check again.",
      });
    }
    if (found.length === 0) {
      return res.status(200).json({ closed: 0 });
    }

    const set = payBalance ? { status: newStatus, advance: "$total", balance: 0 } : { status: newStatus };
    // timestamps: false = the orders keep their "last changed" time
    const result = await Order.updateMany(
      {
        _id: { $in: found.map((o) => o._id) },
        shop: req.shop._id,
        status: { $in: choice.statuses },
      },
      [{ $set: set }],
      { timestamps: false }
    );
    const closed = result.modifiedCount ?? found.length;

    logActivity(req, {
      kind: "order",
      action: "order.close_old",
      targetLabel: `${closed} orders`,
      summary: `Closed ${closed} old order${closed === 1 ? "" : "s"} as ${newStatus} (${
        BASE_LABEL[choice.basis]
      } before ${showDay(choice.before)}; from ${choice.statuses.join(", ")}${
        payBalance ? "; balance marked as paid" : ""
      })`,
    });

    res.status(200).json({ closed });
  } catch (error) {
    return next(error);
  }
};
