const mongoose = require("mongoose");
const Order = require("../models/Order");
const ORDER_STATUSES = require("../models/orderStatuses");
const reserveOrderIds = require("../utils/reserveOrderIds");
const { checkOrderInput } = require("../utils/orderInput");
const { FINISHED, NO_BALANCE, CLOSED_OLD } = require("../utils/statusGroups");
const { recordUse } = require("../utils/usage");
const buildOrderFilters = require("../utils/orderFilters");
const { logActivity, diffOrder, money } = require("../utils/activity");
const dateStamp = require("../utils/dateStamp");
const { can } = require("../utils/permissions");
const { checkLines } = require("../utils/orderLines");
const { reviewSettingsOf, reviewFilter, PROBABLY_DELIVERED, SNOOZE_DAYS } = require("../utils/needsReview");

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
  // prices of the products on the order are amounts too
  if (Array.isArray(plain.lines)) plain.lines = plain.lines.map(({ unitPrice, ...line }) => line);
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

    const matched = candidates.filter((order) => lastTenDigits(order.phone) === phone);
    const orders = matched
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

    // Count it for the shop (a customer has no account, so no person is stored)
    if (orders.length && matched[0]?.shop?._id) recordUse(matched[0].shop._id, null, "tracking.view");

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
    if (status === CLOSED_OLD && req.account.role !== "admin") {
      return res.status(403).json({ message: "Only the admin can use the status Closed (old)." });
    }
    // Products picked from the shop's list (optional)
    let lines;
    if (req.body.lines !== undefined) {
      const checkedLines = await checkLines(req.body.lines, { shopId: req.shop._id, seesAmounts: seesAmounts(req) });
      if (checkedLines.error) return res.status(400).json({ message: checkedLines.error });
      if (checkedLines.lines.length) lines = checkedLines.lines;
    }

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
          ...(lines ? { lines } : {}),
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
    const checked = checkOrderInput(input, {
      existingExecutive: before?.orderExecutive,
      existingName: before?.customerName,
    });
    if (checked.error) return res.status(400).json({ message: checked.error });
    // Only the admin can SET Closed (old). An order that already has it can
    // still be edited by anyone who may edit (the status stays as it is).
    if (status === CLOSED_OLD && before?.status !== CLOSED_OLD && req.account.role !== "admin") {
      return res.status(403).json({ message: "Only the admin can use the status Closed (old)." });
    }

    // Products: not sent = stay as they are; a list (even empty) replaces them
    let newLines;
    if (req.body.lines !== undefined) {
      const checkedLines = await checkLines(req.body.lines, {
        shopId: req.shop._id,
        seesAmounts: seesAmounts(req),
        existing: before?.lines || [],
      });
      if (checkedLines.error) return res.status(400).json({ message: checkedLines.error });
      newLines = checkedLines.lines;
    }

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
    if (newLines) updateDoc.$set.lines = newLines;
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
    // Count what was used: a status change and/or other details
    if (!req.devMode && changes.some((c) => c.field === "Status")) recordUse(req.shop._id, req.account.id, "order.status");
    if (!req.devMode && changes.some((c) => c.field !== "Status")) recordUse(req.shop._id, req.account.id, "order.edit");
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

// POST /api/orders/bulk-status   { ids: ["...", ...], status: "Dispatched" }
// Changes ONLY the status of the chosen orders of this shop (one tap for a
// whole group, or "Next step" for a single order). Orders that already have
// that status are skipped. The answer lists the orders that really changed,
// each with its `previousStatus` (so the screen can offer "Undo").
const MAX_BULK = 200;
exports.bulkStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== "string" || !mongoose.Types.ObjectId.isValid(i))) {
      return res.status(400).json({ message: "Please choose the orders first." });
    }
    if (ids.length > MAX_BULK) {
      return res.status(400).json({ message: `You can change up to ${MAX_BULK} orders at once.` });
    }
    if (typeof status !== "string" || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Please choose a valid status." });
    }
    if (status === CLOSED_OLD && req.account.role !== "admin") {
      return res.status(403).json({ message: "Only the admin can use the status Closed (old)." });
    }

    const found = await Order.find({ _id: { $in: [...new Set(ids)] }, shop: req.shop._id }).lean();
    const toChange = found.filter((o) => o.status !== status);
    if (toChange.length === 0) return res.status(200).json({ changed: 0, orders: [] });

    const previous = new Map(toChange.map((o) => [String(o._id), o.status]));
    const now = new Date();
    await Order.updateMany(
      { _id: { $in: toChange.map((o) => o._id) }, shop: req.shop._id },
      { $set: { status } }
    );
    // the answer is built from what we already read (one database trip less)
    const orders = toChange.map((o) => ({
      ...(seesAmounts(req) ? o : withoutAmounts(o)),
      status,
      updatedAt: now,
      previousStatus: previous.get(String(o._id)),
    }));

    if (orders.length === 1) {
      const o = orders[0];
      logActivity(req, {
        kind: "order",
        action: "order.update",
        targetLabel: o.orderId,
        summary: `Edited order ${o.orderId} (${shown(o.customerName)})`,
        changes: [{ field: "Status", from: o.previousStatus, to: status }],
      });
    } else {
      const from = [...new Set(orders.map((o) => o.previousStatus))].join(", ");
      logActivity(req, {
        kind: "order",
        action: "order.bulk_status",
        targetLabel: `${orders.length} orders`,
        summary: `Changed the status of ${orders.length} orders to ${status} (from ${from})`,
      });
    }
    if (!req.devMode) {
      recordUse(req.shop._id, req.account.id, orders.length === 1 ? "order.status" : "orders.bulk_status");
    }

    res.status(200).json({ changed: orders.length, orders });
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
    let namesCleared = 0;

    // Track duplicate orderIds within Excel itself
    const seenOrderIds = new Set();
    const cleanValues = [];

    orders.forEach((order, index) => {
      const rowNum = index + 2; // considering header row

      if (!order.item) {
        errors.push(`Row ${rowNum}: item is missing.`);
      }

      // An empty total is allowed here and saved as 0
      // (a name that is not a real name, like "NA", is saved empty here)
      const checked = checkOrderInput(order, { totalRequired: false, junkNameAsEmpty: true });
      if (checked.error) {
        errors.push(`Row ${rowNum}: ${checked.error}`);
      }
      cleanValues[index] = checked.values;
      if (checked.nameCleared) namesCleared += 1;

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
      namesCleared, // names that were not real names (like "NA") and were left empty
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

// @desc The Needs review list: open orders well past their delivery date,
// split into "probably delivered" (Ready / Dispatched) and "late, check".
// Oldest delivery date first. Only reads; nothing changes by itself.
const REVIEW_LIST_MAX = 200;
exports.getNeedsReview = async (req, res, next) => {
  try {
    const review = reviewSettingsOf(req.shop);
    if (!review.enabled) {
      return res.status(200).json({ enabled: false, days: review.days, probablyDelivered: { count: 0, orders: [] }, late: { count: 0, orders: [] } });
    }
    const base = reviewFilter(req.shop);
    const group = async (statusFilter) => {
      const filter = { ...base, status: statusFilter };
      const [count, orders] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter).sort({ expectedDeliveryDate: 1, _id: 1 }).limit(REVIEW_LIST_MAX).lean(),
      ]);
      return { count, orders: orders.map((o) => (seesAmounts(req) ? o : withoutAmounts(o))) };
    };
    const [probablyDelivered, late] = await Promise.all([
      group({ $in: PROBABLY_DELIVERED }),
      group({ $nin: [...FINISHED, ...PROBABLY_DELIVERED] }),
    ]);
    res.status(200).json({ enabled: true, days: review.days, probablyDelivered, late });
  } catch (error) {
    return next(error);
  }
};

// @desc "Not yet": leave these orders out of Needs review for a few days.
// Does not change the orders themselves (not even their "last changed" time).
exports.snoozeReview = async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== "string" || !mongoose.Types.ObjectId.isValid(i))) {
      return res.status(400).json({ message: "Please choose the orders first." });
    }
    if (ids.length > MAX_BULK) {
      return res.status(400).json({ message: `You can do up to ${MAX_BULK} orders at once.` });
    }
    const until = new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000);
    const result = await Order.updateMany(
      { _id: { $in: [...new Set(ids)] }, shop: req.shop._id },
      { $set: { reviewSnoozedUntil: until } },
      { timestamps: false }
    );
    if (!req.devMode) recordUse(req.shop._id, req.account.id, "orders.review_snooze");
    res.status(200).json({ snoozed: result.modifiedCount, days: SNOOZE_DAYS });
  } catch (error) {
    return next(error);
  }
};

// @desc Numbers for the strip at the top of the dashboard, for the whole shop
// (search and filters do not change them):
//  open      = orders not yet Delivered, Cancelled or Closed (old)
//  overdue   = open orders whose delivery date is before today
//  balance   = money still to collect (Cancelled and Closed (old) orders are left out)
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

    const finished = FINISHED;
    const review = reviewSettingsOf(req.shop);
    const countsBalance = { $not: [{ $in: ["$status", NO_BALANCE] }] };
    const isOpen = { $not: [{ $in: ["$status", finished] }] };

    // Needs review: open orders well past their delivery date (see utils/needsReview)
    const reviewCounts = review.enabled
      ? Promise.all([
          Order.countDocuments({ ...reviewFilter(req.shop), status: { $in: PROBABLY_DELIVERED } }),
          Order.countDocuments({ ...reviewFilter(req.shop), status: { $nin: [...FINISHED, ...PROBABLY_DELIVERED] } }),
        ])
      : Promise.resolve([0, 0]);

    const [[row], [probablyDelivered, late]] = await Promise.all([Order.aggregate([
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
            $sum: { $cond: [countsBalance, { $ifNull: ["$balance", 0] }, 0] },
          },
          balanceOrders: {
            $sum: {
              $cond: [
                { $and: [countsBalance, { $gt: [{ $ifNull: ["$balance", 0] }, 0] }] },
                1,
                0,
              ],
            },
          },
          today: { $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, 1, 0] } },
        },
      },
    ]), reviewCounts]);

    const numbers = {
      total: row?.total || 0,
      open: row?.open || 0,
      overdue: row?.overdue || 0,
      balance: row?.balance || 0,
      balanceOrders: row?.balanceOrders || 0,
      today: row?.today || 0,
      review: { enabled: review.enabled, days: review.days, probablyDelivered, late },
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
