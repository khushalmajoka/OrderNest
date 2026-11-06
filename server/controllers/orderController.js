const Order = require("../models/Order");
const reserveOrderIds = require("../utils/reserveOrderIds");

const lastTenDigits = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(-10);

// @desc Public Track Order: needs BOTH the Order ID and the customer's phone.
// Returns only what the tracking page shows. A wrong phone and an unknown ID
// give the same empty answer, so nobody can probe which IDs exist.
exports.trackOrder = async (req, res, next) => {
  try {
    const { orderId: rawOrderId, phone: rawPhone } = req.body || {};
    const orderId = String(rawOrderId ?? "").trim().toUpperCase();
    const phone = lastTenDigits(rawPhone);

    if (!orderId || phone.length !== 10) {
      return res
        .status(400)
        .json({ message: "Enter your Order ID and 10-digit phone number" });
    }

    // Order IDs are only unique per shop, so several shops can match the ID;
    // the phone number then picks out the customer's own order(s).
    const candidates = await Order.find({ orderId })
      .populate("shop", "name")
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
        shopName: order.shop ? order.shop.name : undefined,
      }));

    res.status(200).json({ orders });
  } catch (err) {
    console.error("Track Order Error:", err);
    return next(err);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const {
      item,
      customerName,
      phone,
      total,
      advance,
      balance,
      status,
      orderExecutive,
      expectedDeliveryDate,
    } = req.body;

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
          total,
          advance,
          balance,
          status,
          orderExecutive,
          expectedDeliveryDate,
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

    res.status(201).json({ message: "Order created", order: newOrder });
  } catch (error) {
    return next(error);
  }
};

// @desc Get Orders by user
exports.getOrdersByUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    if (userId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    return next(error);
  }
};

// @desc Update Order
exports.updateOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      item,
      phone,
      total,
      advance,
      status,
      orderExecutive,
      expectedDeliveryDate,
    } = req.body;
    const balance = total - advance;

    // Only match an order that belongs to the caller's own shop
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id, shop: req.shop._id },
      {
        customerName,
        item,
        phone,
        total,
        advance,
        balance,
        status,
        orderExecutive,
        expectedDeliveryDate,
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order updated", order: updatedOrder });
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

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

exports.bulkUploadOrders = async (req, res, next) => {
  try {
    const { orders } = req.body;
    const userId = req.user.id;
    const shop = req.shop;

    // ✅ Check DB-level duplicate orderIds (within this shop only)
    const incomingOrderIds = orders.map((o) => o.orderId).filter(Boolean);
    const existingOrders = await Order.find({
      shop: shop._id,
      orderId: { $in: incomingOrderIds },
    }).select("orderId");
    const existingOrderIdSet = new Set(existingOrders.map((o) => o.orderId));

    const errors = [];

    // ✅ Track duplicate orderIds within Excel itself
    const seenOrderIds = new Set();

    orders.forEach((order, index) => {
      const rowNum = index + 2; // considering header row

      if (!order.item) {
        errors.push(`Row ${rowNum}: item is missing.`);
      }

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
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // ✅ All clear — continue with upload
    // Reserve one block of numbers up front for every row without its own ID
    const missingIds = orders.filter((o) => !o.orderId).length;
    const generatedIds = missingIds
      ? await reserveOrderIds(shop._id, missingIds)
      : [];
    let nextGenerated = 0;

    const newOrders = [];

    for (const order of orders) {
      let {
        orderId,
        customerName,
        item,
        phone,
        total,
        advance = 0,
        status = "Order Received",
        orderExecutive,
        expectedDeliveryDate,
      } = order;

      if (!orderId) {
        orderId = generatedIds[nextGenerated++];
      }

      const parsedTotal = isNaN(Number(total)) ? 0 : Number(total);
      const parsedAdvance = isNaN(Number(advance)) ? 0 : Number(advance);
      const balance = parsedTotal - parsedAdvance;

      newOrders.push({
        orderId,
        shop: shop._id,
        userId,
        item,
        customerName,
        phone,
        total: parsedTotal,
        advance: parsedAdvance,
        balance,
        status,
        orderExecutive,
        expectedDeliveryDate,
      });
    }

    const insertedOrders = await Order.insertMany(newOrders);

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

// @desc Get this shop's orders, one page at a time.
// Query: page (from 1), limit (max 200), search, sortBy, sortDir (asc|desc)
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

    const filter = { shop: req.shop._id };

    // Search is plain text, so special characters are matched literally
    const search = String(req.query.search ?? "").trim().slice(0, 100);
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = SEARCH_FIELDS.map((field) => ({ [field]: pattern }));
    }

    const sortBy = SORTABLE_FIELDS.includes(req.query.sortBy)
      ? req.query.sortBy
      : "createdAt";
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    // _id as a tie-breaker keeps pages stable when many rows share a value
    let query = Order.find(filter)
      .sort({ [sortBy]: sortDir, _id: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Text columns: ignore upper/lower case and sort numbers inside text by value
    if (TEXT_FIELDS.includes(sortBy)) {
      query = query.collation({
        locale: "en",
        strength: 2,
        numericOrdering: true,
      });
    }

    const [orders, totalOrders] = await Promise.all([
      query,
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      limit,
    });
  } catch (error) {
    return next(error);
  }
};
