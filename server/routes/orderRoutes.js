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

const router = express.Router();

router.get("/track", trackOrder);

// Create Order
router.post("/create", authenticate, createOrder);

router.post("/bulk-upload", authenticate, bulkUploadOrders);

// Get Orders for User
router.get("/:userId", authenticate, getOrdersByUser);
router.get("/shop/:shopId", authenticate, getOrdersByShop);

// PUT /api/orders/:id => Update Order
router.put("/:id", authenticate, updateOrder);

// DELETE /api/orders/:id => Delete Order
router.delete("/:id", authenticate, deleteOrder);

module.exports = router;
