const Shop = require("../models/Shop");
const User = require("../models/User");

// POST /api/shop/setup
const setupShop = async (req, res) => {
  try {
    const { name, logo, address, phone, category } = req.body;
    const userId = req.user?.id; // Set by auth middleware

    if (!name || !address || !phone || !category) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if shop already exists for this user
    const existingShop = await Shop.findOne({ owner: userId });
    if (existingShop) {
      return res.status(400).json({ error: "Shop already setup for this user" });
    }

    // Create and save new shop
    const newShop = new Shop({
      name,
      logo,
      address,
      phone,
      category,
      owner: userId,
      isSetupComplete: true,
    });

    const savedShop = await newShop.save();

    // Link shop to user
    await User.findByIdAndUpdate(userId, { shopId: savedShop._id });

    res.status(201).json({ message: "Shop setup complete", shop: savedShop });
  } catch (error) {
    console.error("Setup Shop Error:", error);
    res.status(500).json({ error: "Failed to setup shop" });
  }
};

// GET /api/shop/me
const getMyShop = async (req, res) => {
  try {
    const userId = req.user?.id;
    const shop = await Shop.findOne({ owner: userId });

    if (!shop) return res.status(404).json({ error: "Shop not found" });

    res.status(200).json({ shop });
  } catch (error) {
    console.error("Get Shop Error:", error);
    res.status(500).json({ error: "Failed to fetch shop" });
  }
};

// GET /api/shop/:userId
const getShopByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Optional: Check if req.user.id === userId if you want to prevent unauthorized access

    const shop = await Shop.findOne({ owner: userId });

    if (!shop) return res.status(404).json({ error: "Shop not found" });

    res.status(200).json({ shop });
  } catch (error) {
    console.error("Get Shop By User ID Error:", error);
    res.status(500).json({ error: "Failed to fetch shop" });
  }
};

module.exports = {
  setupShop,
  getMyShop,
  getShopByUserId
};