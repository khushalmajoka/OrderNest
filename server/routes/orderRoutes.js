// routes/orderRoutes.js
const express = require("express");
const {
  createOrder,
  getOrdersByShop,
  updateOrder,
  deleteOrder,
  trackOrder,
  bulkUploadOrders,
} = require("../controllers/orderController");
const authenticate = require("../middlewares/authenticate");
const loadShop = require("../middlewares/loadShop");
const { trackLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// Public: customers look up their order with Order ID + phone number
router.post("/track", trackLimiter, trackOrder);

// Create Order
router.post("/create", authenticate, loadShop, createOrder);

router.post("/bulk-upload", authenticate, loadShop, bulkUploadOrders);

// Get one page of a shop's orders
router.get("/shop/:shopId", authenticate, loadShop, getOrdersByShop);

// PUT /api/orders/:id => Update Order
router.put("/:id", authenticate, loadShop, updateOrder);

// DELETE /api/orders/:id => Delete Order
router.delete("/:id", authenticate, loadShop, deleteOrder);

module.exports = router;
