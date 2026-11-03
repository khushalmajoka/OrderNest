// routes/orderRoutes.js
const express = require("express");
const {
  createOrder,
  getOrdersByShop,
  getOrdersByUser,
  updateOrder,
  deleteOrder,
  trackOrder,
  bulkUploadOrders,
} = require("../controllers/orderController");
const authenticate = require("../middlewares/authenticate");
const loadShop = require("../middlewares/loadShop");

const router = express.Router();

router.get("/track", trackOrder);

// Create Order
router.post("/create", authenticate, loadShop, createOrder);

router.post("/bulk-upload", authenticate, loadShop, bulkUploadOrders);

// Get Orders for User
router.get("/:userId", authenticate, getOrdersByUser);
router.get("/shop/:shopId", authenticate, loadShop, getOrdersByShop);

// PUT /api/orders/:id => Update Order
router.put("/:id", authenticate, loadShop, updateOrder);

// DELETE /api/orders/:id => Delete Order
router.delete("/:id", authenticate, loadShop, deleteOrder);

module.exports = router;
