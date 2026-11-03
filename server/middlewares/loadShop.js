// loadShop.js
// Must run after `authenticate`. Attaches the logged-in user's own shop to
// req.shop so handlers never trust a shopId/userId sent by the client.
const Shop = require("../models/Shop");

const loadShop = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    req.shop = shop;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = loadShop;
