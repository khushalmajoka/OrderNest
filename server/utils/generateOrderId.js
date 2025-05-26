const Shop = require("../models/Shop");

async function generateOrderId(shopId) {
  const shop = await Shop.findById(shopId);
  if (!shop) throw new Error("Shop not found");

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

  // Increment total order count
  shop.totalOrderCount += 1;

  // Get today's count from map
  const todayCount = shop.dailyOrderCounts?.get(dateStr) || 0;
  const newTodayCount = todayCount + 1;

  // Update map
  shop.dailyOrderCounts.set(dateStr, newTodayCount);

  await shop.save();

  return `ORD-${dateStr}-${shop.totalOrderCount}-${newTodayCount}`;
}

module.exports = generateOrderId;