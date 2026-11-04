// Reserves order numbers for a shop.
//
// Numbering is per shop and continuous: the counters are bumped with a single
// atomic $inc, so two requests arriving at the same moment never get the same
// number and no number is skipped. The same ID may exist in different shops.
//
// The only time we skip is when this shop already has an order with the
// reserved ID (e.g. the counters were reset the same day); then we move ahead.
const Shop = require("../models/Shop");
const Order = require("../models/Order");
const dateStamp = require("./dateStamp");

const MAX_ATTEMPTS = 20;

// `now` is only passed in by tests; the day follows Indian time (see dateStamp)
async function reserveOrderIds(shopId, count = 1, now = new Date()) {
  const dateStr = dateStamp(now);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Normally nothing is skipped. After a clash inside this shop, skip ahead
    // by 1, 2, 4... so a crowded range is cleared quickly.
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

    const taken = await Order.exists({ shop: shopId, orderId: { $in: ids } });
    if (!taken) return ids;
  }

  throw new Error("Could not allocate unique order IDs");
}

module.exports = reserveOrderIds;
