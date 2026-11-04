const Order = require("../models/Order");
const reserveOrderIds = require("../utils/reserveOrderIds");

// @desc Public Track Order by Order ID or Phone
exports.trackOrder = async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: "Query parameter is required" });
  }

  try {
    const isPhone = /^\d{10}$/.test(query);
    const filter = isPhone
      ? { phone: query }
      : { orderId: query.toUpperCase() };

    const orders = await Order.find(filter).sort({ createdAt: -1 });

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

// @desc Get Orders by Shop ID with pagination
exports.getOrdersByShop = async (req, res, next) => {
  try {
    const shopId = req.params.shopId;
    if (shopId !== String(req.shop._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.max(1, parseInt(req.query.limit)) || 10;
    const skip = (page - 1) * limit;

    // Total count for pagination
    const totalOrders = await Order.countDocuments({ shop: shopId });

    const orders = await Order.find({ shop: shopId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
    });
  } catch (error) {
    return next(error);
  }
};
