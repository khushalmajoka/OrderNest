const Order = require("../models/Order");
const Shop = require("../models/Shop");

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
      expectedDeliveryDate
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
    const { customerName, item, phone, total, advance, status, expectedDeliveryDate } = req.body;
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
