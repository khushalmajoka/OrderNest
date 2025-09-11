const Order = require("../models/Order");
const Shop = require("../models/Shop");

// @desc Public Track Order by Order ID or Phone
exports.trackOrder = async (req, res) => {
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
    return next(new Error("Something went wrong"));
  }
};

exports.createOrder = async (req, res) => {
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
      userId,
      shopId,
    } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

    // Update total order count
    shop.totalOrderCount = (shop.totalOrderCount || 0) + 1;

    // Update today's daily count
    const currentDailyCount = shop.dailyOrderCounts?.get(dateStr) || 0;
    const updatedDailyCount = currentDailyCount + 1;

    shop.dailyOrderCounts = shop.dailyOrderCounts || new Map();
    shop.dailyOrderCounts.set(dateStr, updatedDailyCount);

    await shop.save();

    const generatedOrderId = `ORD-${dateStr}-${shop.totalOrderCount}-${updatedDailyCount}`;

    const newOrder = new Order({
      orderId: generatedOrderId,
      shop: shopId,
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
    });

    await newOrder.save();
    res.status(201).json({ message: "Order created", order: newOrder });
  } catch (error) {
    return next(new Error("Create Order Error"));
  }
};

// @desc Get Orders by user
exports.getOrdersByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    return next(new Error("Fetch Orders Error"));
  }
};

// @desc Update Order
exports.updateOrder = async (req, res) => {
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

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
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
    return next(new Error("Update Order Error"));
  }
};

// @desc Delete Order
exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    return next(new Error("Delete Order Error"));
  }
};

exports.bulkUploadOrders = async (req, res) => {
  try {
    const { orders, shopId } = req.body;
    const userId = req.user.id;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // ✅ Check DB-level duplicate orderIds
    const incomingOrderIds = orders.map((o) => o.orderId).filter(Boolean);
    const existingOrders = await Order.find({
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
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    let currentDailyCount = shop.dailyOrderCounts?.get(dateStr) || 0;
    let totalCount = shop.totalOrderCount || 0;

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
        totalCount += 1;
        currentDailyCount += 1;
        orderId = `ORD-${dateStr}-${totalCount}-${currentDailyCount}`;
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

    shop.totalOrderCount = totalCount;
    shop.dailyOrderCounts = shop.dailyOrderCounts || new Map();
    shop.dailyOrderCounts.set(dateStr, currentDailyCount);
    await shop.save();

    res.status(201).json({
      message: `${insertedOrders.length} orders uploaded successfully.`,
      insertedOrders,
    });
  } catch (error) {
    return next(new Error("Bulk Upload Error"));
  }
};

// @desc Get Orders by Shop ID with pagination
exports.getOrdersByShop = async (req, res) => {
  try {
    const shopId = req.params.shopId;

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
    return next(new Error("Get Orders by Shop Error"));
  }
};
