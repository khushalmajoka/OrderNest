// loadShop.js
// Must run after `authenticate` and `loadUser`. Attaches the logged-in user's
// shop to req.shop (the owner's own shop, or the shop a staff member works
// for) so handlers never trust a shopId/userId sent by the client.
const Shop = require("../models/Shop");

const loadShop = async (req, res, next) => {
  try {
    const shop =
      req.account.role === "staff"
        ? await Shop.findById(req.account.shopId)
        : await Shop.findOne({ owner: req.account.id });
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
