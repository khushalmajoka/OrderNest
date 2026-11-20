const Order = require("../models/Order");
const reserveOrderIds = require("../utils/reserveOrderIds");
const { checkOrderInput } = require("../utils/orderInput");
const buildOrderFilters = require("../utils/orderFilters");
const { logActivity, diffOrder, money } = require("../utils/activity");
const dateStamp = require("../utils/dateStamp");
const { can } = require("../utils/permissions");

// Money (Total, Advance, Balance) is only for people who may see it: the admin,
// and staff the admin switched "See amounts" on for. Everyone else gets orders
// without these fields, and cannot sort or filter by them either (that would
// show the numbers by the back door).
const AMOUNT_FIELDS = ["total", "advance", "balance"];
const AMOUNT_QUERY_KEYS = [
  "totalMin", "totalMax", "advanceMin", "advanceMax", "balanceMin", "balanceMax", "hasBalance",
];
const seesAmounts = (req) => can(req.account, "viewAmounts");
const withoutAmounts = (order) => {
  const plain = typeof order.toObject === "function" ? order.toObject() : { ...order };
  AMOUNT_FIELDS.forEach((key) => delete plain[key]);
  return plain;
};

// Text for the Activity history: no stray spaces, "-" when empty
const shown = (value) => String(value ?? "").trim() || "-";

const lastTenDigits = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(-10);

// @desc Public Track Order: needs BOTH the Order ID and the customer's phone.
// Returns only what the tracking page shows (never the amounts or the phone). A wrong phone and an unknown ID
// give the same empty answer, so nobody can probe which IDs exist.
exports.trackOrder = async (req, res, next) => {
  try {
    const { orderId: rawOrderId, phone: rawPhone } = req.body || {};
    const typedId = String(rawOrderId ?? "").trim();
    const phone = lastTenDigits(rawPhone);

    if (!typedId || phone.length !== 10) {
      return res
        .status(400)
        .json({ message: "Enter your Order ID and 10-digit phone number" });
    }

    // Order IDs are only unique per shop, so several shops can match the ID;
    // the phone number then picks out the customer's own order(s).
    // IDs we generate are upper case, and uploaded IDs are stored upper case
    // too; older uploads may still be in their original case, so try both.
    const candidates = await Order.find({
      orderId: { $in: [...new Set([typedId, typedId.toUpperCase()])] },
    })
      .populate("shop", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    const orders = candidates
      .filter((order) => lastTenDigits(order.phone) === phone)
      .map((order) => ({
        orderId: order.orderId,
        customerName: order.customerName,
        item: order.item,
        status: order.status,
        orderExecutive: order.orderExecutive,
        expectedDeliveryDate: order.expectedDeliveryDate,
        shopName: order.shop ? order.shop.name : undefined,
        // so the customer can call the shop
        shopPhone: order.shop ? order.shop.phone : undefined,
      }));

    res.status(200).json({ orders });
  } catch (err) {
    console.error("Track Order Error:", err);
    return next(err);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { item, customerName, phone, address, status, orderExecutive } =
      req.body;

    const checked = checkOrderInput(req.body);
    if (checked.error) return res.status(400).json({ message: checked.error });

    // Shop and user always come from the logged-in user, never from the body
    const shop = req.shop;
    const userId = req.user.id;

    let newOrder;
    for (let attempt = 0; attempt < 5 && !newOrder; attempt++) {
      const [orderId] = await reserveOrderIds(shop._id, 1);

      try {
        newOrder = await new Order({
          orderId,
          shop: shop._id,
          userId,
          item,
          customerName,
          phone,
          address,
          ...checked.values,
          status,
          orderExecutive,
        }).save();
      } catch (err) {
        // Lost a race for this exact ID: reserve the next number and retry
        if (err.code === 11000 && err.keyPattern && err.keyPattern.orderId) {
          continue;
        }
        throw err;
      }
    }

    if (!newOrder) {
      throw new Error("Could not allocate a unique order ID");
    }

    logActivity(req, {
      kind: "order",
      action: "order.create",
      targetLabel: newOrder.orderId,
      summary: `Created order ${newOrder.orderId} for ${shown(newOrder.customerName)} (${money(newOrder.total)})`,
    });

    res.status(201).json({
      message: "Order created",
      order: seesAmounts(req) ? newOrder : withoutAmounts(newOrder),
    });
  } catch (error) {
    return next(error);
  }
};

// @desc Update Order
exports.updateOrder = async (req, res, next) => {
  try {
    const { customerName, item, phone, address, status, orderExecutive } =
      req.body;

    // The order as it was, to tell what this edit changed
    const before = await Order.findOne({
      _id: req.params.id,
      shop: req.shop._id,
    }).lean();

    // Someone who may not see the amounts cannot change them either: the
    // order keeps the amounts it has
    const input = seesAmounts(req) || !before
      ? req.body
      : { ...req.body, total: before.total, advance: before.advance };
    const checked = checkOrderInput(input, { existingExecutive: before?.orderExecutive });
    if (checked.error) return res.status(400).json({ message: checked.error });

    // An empty delivery date sent on purpose means "remove it" (a date that is
    // simply not sent stays as it is)
    const updateDoc = {
      $set: {
        customerName,
        item,
        phone,
        address,
        ...checked.values,
        status,
        orderExecutive,
      },
    };
    if (checked.clearDate) {
      delete updateDoc.$set.expectedDeliveryDate;
      updateDoc.$unset = { expectedDeliveryDate: 1 };
    }

    // Only match an order that belongs to the caller's own shop
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id, shop: req.shop._id },
      updateDoc,
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const changes = before ? diffOrder(before, updatedOrder.toObject()) : [];
    if (changes.length) {
      logActivity(req, {
        kind: "order",
        action: "order.update",
        targetLabel: updatedOrder.orderId,
        summary: `Edited order ${updatedOrder.orderId} (${shown(updatedOrder.customerName)})`,
        changes,
      });
    }

    res.status(200).json({
      message: "Order updated",
      order: seesAmounts(req) ? updatedOrder : withoutAmounts(updatedOrder),
    });
  } catch (error) {
    return next(error);
  }
};

// @desc Delete Order
exports.deleteOrder = async (req, res, next) => {
  try {
    const deletedOrder = await Order.findOneAndDelete({
      _id: req.params.id,
      shop: req.shop._id,
    });

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    logActivity(req, {
      kind: "order",
      action: "order.delete",
      targetLabel: deletedOrder.orderId,
      summary: `Deleted order ${deletedOrder.orderId} (${shown(deletedOrder.customerName)}, ${shown(deletedOrder.item)}, ${money(deletedOrder.total)})`,
    });

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

const MAX_BULK_ROWS = 2000;

exports.bulkUploadOrders = async (req, res, next) => {
  try {
    const { orders: rows } = req.body;
    const userId = req.user.id;
    const shop = req.shop;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: "No orders to upload." });
    }
    if (rows.length > MAX_BULK_ROWS) {
      return res.status(400).json({
        message: `Please upload at most ${MAX_BULK_ROWS} orders at a time.`,
      });
    }

    // Typed IDs are tidied (spaces removed, upper case) so customers can track
    // them whichever way they type the ID, and so the duplicate checks work.
    const orders = rows.map((row) => {
      const typedId = String(row?.orderId ?? "").trim().toUpperCase();
      // Excel can hand over numbers where we expect text
      const address =
        row?.address === undefined || row?.address === null
          ? undefined
          : String(row.address);
      return { ...row, orderId: typedId || undefined, address };
    });

    // Check DB-level duplicate orderIds (within this shop only)
    const incomingOrderIds = orders.map((o) => o.orderId).filter(Boolean);
    const existingOrders = await Order.find({
      shop: shop._id,
      orderId: { $in: incomingOrderIds },
    }).select("orderId");
    const existingOrderIdSet = new Set(existingOrders.map((o) => o.orderId));

    const errors = [];

    // Track duplicate orderIds within Excel itself
    const seenOrderIds = new Set();
    const cleanValues = [];

    orders.forEach((order, index) => {
      const rowNum = index + 2; // considering header row

      if (!order.item) {
        errors.push(`Row ${rowNum}: item is missing.`);
      }

      // An empty total is allowed here and saved as 0
      const checked = checkOrderInput(order, { totalRequired: false });
      if (checked.error) {
        errors.push(`Row ${rowNum}: ${checked.error}`);
      }
      cleanValues[index] = checked.values;

      if (order.orderId) {
        // Check in DB
        if (existingOrderIdSet.has(order.orderId)) {
          errors.push(
            `Row ${rowNum}: orderId "${order.orderId}" already exists in DB.`
          );
        }

        // Check within Excel itself
        if (seenOrderIds.has(order.orderId)) {
          errors.push(
            `Row ${rowNum}: Duplicate orderId "${order.orderId}" found in Excel.`
          );
        } else {
          seenOrderIds.add(order.orderId);
        }
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.slice(0, 20),
        totalErrors: errors.length,
      });
    }

    // All clear: continue with upload.
    // Reserve one block of numbers up front for every row without its own ID
    const missingIds = orders.filter((o) => !o.orderId).length;
    const generatedIds = missingIds
      ? await reserveOrderIds(shop._id, missingIds)
      : [];
    let nextGenerated = 0;

    const newOrders = orders.map((order, index) => ({
      orderId: order.orderId || generatedIds[nextGenerated++],
      shop: shop._id,
      userId,
      item: order.item,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      ...cleanValues[index],
      status: order.status || "Order Received",
      orderExecutive: order.orderExecutive,
    }));

    const insertedOrders = await Order.insertMany(newOrders);

    logActivity(req, {
      kind: "order",
      action: "order.bulk_upload",
      targetLabel: `${insertedOrders.length} orders`,
      summary: `Uploaded ${insertedOrders.length} orders from Excel`,
    });

    res.status(201).json({
      message: `${insertedOrders.length} orders uploaded successfully.`,
      insertedOrders,
    });
  } catch (error) {
    return next(error);
  }
};

// Columns the dashboard can sort by (anything else falls back to newest first)
const SORTABLE_FIELDS = [
  "orderId",
  "customerName",
  "item",
  "phone",
  "total",
  "advance",
  "balance",
  "status",
  "expectedDeliveryDate",
  "orderExecutive",
  "createdAt",
  "updatedAt",
];
const TEXT_FIELDS = [
  "orderId",
  "customerName",
  "item",
  "phone",
  "status",
  "orderExecutive",
];
const SEARCH_FIELDS = ["customerName", "orderId", "item", "phone"];
const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Search, filters and sort from the query string, shared by the dashboard
// list and the Excel export so both always agree. Returns { filter, sortBy,
// sortDir } or { error }.
const readListQuery = (req) => {
  // Without the right to see amounts, the amount filters and sorts are ignored
  const q = { ...req.query };
  if (!seesAmounts(req)) {
    AMOUNT_QUERY_KEYS.forEach((key) => delete q[key]);
    if (AMOUNT_FIELDS.includes(q.sortBy)) delete q.sortBy;
  }
  const filter = { shop: req.shop._id };

  // Search is plain text, so special characters are matched literally
  const search = String(q.search ?? "").trim().slice(0, 100);
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = SEARCH_FIELDS.map((field) => ({ [field]: pattern }));
  }

  // Filter panel choices (status, amounts, dates, ...), all must match
  const filters = buildOrderFilters(q);
  if (filters.error) return { error: filters.error };
  if (filters.conditions.length) filter.$and = filters.conditions;

  // Without a chosen sort: the order with the latest activity (created or
  // changed most recently) comes first
  const sortBy = SORTABLE_FIELDS.includes(q.sortBy)
    ? q.sortBy
    : "updatedAt";
  const sortDir = q.sortDir === "asc" ? 1 : -1;
  return { filter, sortBy, sortDir };
};

// _id as a tie-breaker keeps the order stable when many rows share a value
const sortedQuery = ({ filter, sortBy, sortDir }) => {
  const query = Order.find(filter).sort({ [sortBy]: sortDir, _id: sortDir });
  // Text columns: ignore upper/lower case and sort numbers inside text by value
  if (TEXT_FIELDS.includes(sortBy)) {
    query.collation({ locale: "en", strength: 2, numericOrdering: true });
  }
  return query;
};

// A short text that changes whenever an order of this shop is created, edited
// or deleted (the number of orders + the latest change). The dashboard compares
// it now and then to know whether the list on screen is out of date.
const changeToken = async (shopId) => {
  const [count, latest] = await Promise.all([
    Order.countDocuments({ shop: shopId }),
    Order.findOne({ shop: shopId }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
  ]);
  return `${count}-${latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0}`;
};

// @desc Light check: has anything changed since the dashboard last loaded?
// Gives only the token (no order data, so no amounts either).
exports.getOrderChanges = async (req, res, next) => {
  try {
    if (req.params.shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.status(200).json({ token: await changeToken(req.shop._id) });
  } catch (error) {
    return next(error);
  }
};

// @desc Get this shop's orders, one page at a time.
// Query: page (from 1), limit (max 200), search, sortBy, sortDir (asc|desc),
// plus the filters listed in utils/orderFilters.js
exports.getOrdersByShop = async (req, res, next) => {
  try {
    const shopId = req.params.shopId;
    if (shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE)
    );

    const list = readListQuery(req);
    if (list.error) return res.status(400).json({ message: list.error });

    // The token is taken BEFORE the orders: if something changes in between,
    // the next check simply notices it (a change is never missed)
    const token = await changeToken(req.shop._id);

    const [orders, totalOrders] = await Promise.all([
      sortedQuery(list)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(list.filter),
    ]);

    res.status(200).json({
      orders: seesAmounts(req) ? orders : orders.map(withoutAmounts),
      changeToken: token,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      limit,
    });
  } catch (error) {
    return next(error);
  }
};

// The most rows one Excel file can have
const MAX_EXPORT_ROWS = 10000;
const EXPORT_FIELDS =
  "orderId customerName phone address item total advance balance status expectedDeliveryDate orderExecutive createdAt updatedAt";

// @desc The orders for an Excel file: same search, filters and sort as the
// dashboard, but no paging. Query: `limit` = how many rows (default and
// maximum 10000). Admin only (see the route).
exports.exportOrders = async (req, res, next) => {
  try {
    if (req.params.shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const list = readListQuery(req);
    if (list.error) return res.status(400).json({ message: list.error });

    let limit = MAX_EXPORT_ROWS;
    if (req.query.limit !== undefined && req.query.limit !== "") {
      limit = Number(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1) {
        return res.status(400).json({ message: "Rows to export must be a whole number, 1 or more." });
      }
      limit = Math.min(limit, MAX_EXPORT_ROWS);
    }

    const [orders, totalMatching] = await Promise.all([
      sortedQuery(list).select(EXPORT_FIELDS).limit(limit).lean(),
      Order.countDocuments(list.filter),
    ]);

    res.status(200).json({
      orders,
      totalMatching,
      maxRows: MAX_EXPORT_ROWS,
      // true when more orders match than this file holds
      cutOff: orders.length < totalMatching,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc Numbers for the strip at the top of the dashboard, for the whole shop
// (search and filters do not change them):
//  open      = orders not yet Delivered or Cancelled
//  overdue   = open orders whose delivery date is before today
//  balance   = money still to collect (Cancelled orders are left out)
//  today     = orders created today (Indian time, like the filters)
exports.getOrderSummary = async (req, res, next) => {
  try {
    if (req.params.shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const stamp = dateStamp();
    const day = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
    const startOfToday = new Date(`${day}T00:00:00.000+05:30`);
    const deliveryCutoff = new Date(`${day}T00:00:00.000Z`);

    const finished = ["Delivered", "Cancelled"];
    const isOpen = { $not: [{ $in: ["$status", finished] }] };

    const [row] = await Order.aggregate([
      { $match: { shop: req.shop._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [isOpen, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    isOpen,
                    // no date (missing or null) is never overdue
                    { $eq: [{ $type: "$expectedDeliveryDate" }, "date"] },
                    { $lt: ["$expectedDeliveryDate", deliveryCutoff] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          balance: {
            $sum: { $cond: [{ $ne: ["$status", "Cancelled"] }, { $ifNull: ["$balance", 0] }, 0] },
          },
          balanceOrders: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$status", "Cancelled"] }, { $gt: [{ $ifNull: ["$balance", 0] }, 0] }] },
                1,
                0,
              ],
            },
          },
          today: { $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, 1, 0] } },
        },
      },
    ]);

    const numbers = {
      total: row?.total || 0,
      open: row?.open || 0,
      overdue: row?.overdue || 0,
      balance: row?.balance || 0,
      balanceOrders: row?.balanceOrders || 0,
      today: row?.today || 0,
    };
    if (!seesAmounts(req)) {
      delete numbers.balance;
      delete numbers.balanceOrders;
    }
    res.status(200).json(numbers);
  } catch (error) {
    return next(error);
  }
};

// @desc The names that can be picked in "Order executive": every name already
// used on this shop's orders, plus the owner and the staff. Spelling that only
// differs in capital letters counts as one name (the most used spelling wins).
exports.getExecutiveNames = async (req, res, next) => {
  try {
    if (req.params.shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const used = await Order.aggregate([
      { $match: { shop: req.shop._id, orderExecutive: { $type: "string" } } },
      { $group: { _id: { $trim: { input: "$orderExecutive" } }, count: { $sum: 1 } } },
      { $match: { _id: { $ne: "" } } },
    ]);

    const User = require("../models/User");
    const people = await User.find({
      $or: [{ _id: req.shop.owner }, { role: "staff", shopId: req.shop._id }],
    }).select("name");

    // name (lower case) -> { name, count } keeping the most used spelling
    const byKey = new Map();
    const add = (name, count) => {
      const clean = String(name || "").trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      const seen = byKey.get(key);
      if (!seen) byKey.set(key, { name: clean, best: count });
      else if (count > seen.best) {
        seen.name = clean;
        seen.best = count;
      }
    };
    used.forEach((row) => add(row._id, row.count));
    people.forEach((person) => add(person.name, 0));

    // Names with numbers in them (old entries, wrong Excel columns) are not offered
    const names = [...byKey.values()]
      .map((entry) => entry.name)
      .filter((name) => !/\p{Nd}/u.test(name))
      .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

    res.status(200).json({ names });
  } catch (error) {
    return next(error);
  }
};
