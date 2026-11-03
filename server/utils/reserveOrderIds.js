// Reserves order numbers for a shop.
//
// The counters are bumped with a single atomic $inc, so two requests arriving
// at the same moment can never receive the same number. Order IDs are unique
// across all shops but numbered per shop, so if a reserved ID is already taken
// (another shop, or a counter that was reset) we skip ahead and reserve again.
const Shop = require("../models/Shop");
const Order = require("../models/Order");

const MAX_ATTEMPTS = 20;

// YYYYMMDD
const todayStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

async function reserveOrderIds(shopId, count = 1) {
  const dateStr = todayStamp();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // First try takes the next numbers. After a clash, skip ahead by 1, 2, 4...
    // so a crowded range (e.g. after a counter reset) is cleared quickly.
    const skip = attempt === 0 ? 0 : 2 ** (attempt - 1);
    const step = count + skip;

    const shop = await Shop.findOneAndUpdate(
      { _id: shopId },
      {
        $inc: {
          totalOrderCount: step,
          [`dailyOrderCounts.${dateStr}`]: step,
        },
      },
      { new: true }
    );
    if (!shop) throw new Error("Shop not found");

    const endTotal = shop.totalOrderCount;
    const endDaily = shop.dailyOrderCounts.get(dateStr);

    const ids = Array.from(
      { length: count },
      (_, i) =>
        `ORD-${dateStr}-${endTotal - count + 1 + i}-${endDaily - count + 1 + i}`
    );

    const taken = await Order.exists({ orderId: { $in: ids } });
    if (!taken) return ids;
  }

  throw new Error("Could not allocate unique order IDs");
}

module.exports = reserveOrderIds;
