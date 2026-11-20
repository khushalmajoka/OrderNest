// Counting how much each feature is used (see models/UsageCount.js).
// Counting never slows down or breaks the action itself: a failure is only
// printed in the server log.
const UsageCount = require("../models/UsageCount");
const Shop = require("../models/Shop");
const FEATURES = require("./usageFeatures");
const dateStamp = require("./dateStamp");

const KNOWN = new Set(FEATURES.map((f) => f.key));
const FROM_APP = new Set(FEATURES.filter((f) => f.where === "client").map((f) => f.key));

// Adds 1 for this shop, today. `userId` may be empty (a customer on the tracking page).
const recordUse = (shopId, userId, feature) => {
  if (!shopId || !KNOWN.has(feature)) return;
  const update = {
    $inc: { count: 1 },
    $set: { lastAt: new Date() },
    $setOnInsert: { createdAt: new Date() },
  };
  if (userId) update.$addToSet = { users: String(userId) };
  UsageCount.updateOne({ shop: shopId, day: dateStamp(), feature }, update, { upsert: true }).catch(
    (err) => {
      // two first-uses at the same moment can collide on the unique row: try once more
      if (err && err.code === 11000) {
        UsageCount.updateOne({ shop: shopId, day: dateStamp(), feature }, update).catch(() => {});
      } else {
        console.error("Could not count a feature use:", err.message);
      }
    }
  );
};

// Route step: counts the feature when the request ended well (answer below 400).
// `when(req)` (optional) says if this request should count at all.
const countUse = (feature, when) => (req, res, next) => {
  res.on("finish", async () => {
    if (res.statusCode >= 400) return;
    if (when && !when(req)) return;
    if (req.devMode) return; // the developer testing inside a shop is not the shop's use
    try {
      let shopId = req.shop?._id || req.account?.shopId;
      // routes that do not load the shop: an admin's shop is the one they own
      if (!shopId && req.account?.role === "admin") {
        const shop = await Shop.findOne({ owner: req.account.id }).select("_id").lean();
        shopId = shop?._id;
      }
      recordUse(shopId, req.account?.id, feature);
    } catch (err) {
      console.error("Could not count a feature use:", err.message);
    }
  });
  next();
};

module.exports = { recordUse, countUse, FROM_APP };
