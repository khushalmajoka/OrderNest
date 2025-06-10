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
    res.status(500).json({ message: "Something went wrong" });
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
      expectedDeliveryDate,
    });

    await newOrder.save();
    res.status(201).json({ message: "Order created", order: newOrder });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// @desc Get Orders by user
exports.getOrdersByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Fetch Orders Error:", error);
    res.status(500).json({ message: "Something went wrong" });
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
        expectedDeliveryDate,
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order updated", order: updatedOrder });
  } catch (error) {
    console.error("Update Order Error:", error);
    res.status(500).json({ message: "Something went wrong" });
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
    console.error("Delete Order Error:", error);
    res.status(500).json({ message: "Something went wrong" });
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

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    let currentDailyCount = shop.dailyOrderCounts?.get(dateStr) || 0;
    let totalCount = shop.totalOrderCount || 0;

    const newOrders = [];

    for (const order of orders) {
      totalCount += 1;
      currentDailyCount += 1;

      const generatedOrderId = `ORD-${dateStr}-${totalCount}-${currentDailyCount}`;

      const {
        orderId,
        customerName,
        item,
        phone,
        total,
        advance = 0,
        status = "Order Received",
        expectedDeliveryDate,
      } = order;

      // 🔥 Safely parse total and advance
      const parsedTotal = isNaN(Number(total)) ? 0 : Number(total);
      const parsedAdvance = isNaN(Number(advance)) ? 0 : Number(advance);
      const balance = parsedTotal - parsedAdvance;

      newOrders.push({
        orderId: orderId || generatedOrderId,
        shop: shop._id,
        userId,
        item,
        customerName,
        phone,
        total: parsedTotal,
        advance: parsedAdvance,
        balance,
        status,
        expectedDeliveryDate,
      });
    }

    const insertedOrders = await Order.insertMany(newOrders);

    // Update shop counts
    shop.totalOrderCount = totalCount;
    shop.dailyOrderCounts = shop.dailyOrderCounts || new Map();
    shop.dailyOrderCounts.set(dateStr, currentDailyCount);
    await shop.save();

    res.status(201).json({ message: "Orders uploaded", insertedOrders });
  } catch (error) {
    console.error("Bulk Upload Error:", error);
    res.status(500).json({ message: "Something went wrong" });
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
    console.error("Get Orders By Shop Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
