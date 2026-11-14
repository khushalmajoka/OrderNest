// routes/orderRoutes.js
const express = require("express");
const {
  createOrder,
  getOrdersByShop,
  updateOrder,
  deleteOrder,
  trackOrder,
  bulkUploadOrders,
  exportOrders,
  getOrderSummary,
} = require("../controllers/orderController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { requireAdmin, requirePermission } = require("../middlewares/access");
const { trackLimiter, exportLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// Public: customers look up their order with Order ID + phone number
router.post("/track", trackLimiter, trackOrder);

// Create Order
router.post(
  "/create",
  authenticate,
  loadUser,
  loadShop,
  requirePermission("createOrders"),
  createOrder
);

// Excel upload: admin only
router.post(
  "/bulk-upload",
  authenticate,
  loadUser,
  loadShop,
  requireAdmin,
  bulkUploadOrders
);

// Get one page of a shop's orders
router.get("/shop/:shopId", authenticate, loadUser, loadShop, getOrdersByShop);

// The numbers at the top of the dashboard (whole shop)
router.get("/shop/:shopId/summary", authenticate, loadUser, loadShop, getOrderSummary);

// Orders for an Excel file (admin only): same search, filters and sort as the list
router.get(
  "/shop/:shopId/export",
  authenticate,
  loadUser,
  loadShop,
  requireAdmin,
  exportLimiter,
  exportOrders
);

// PUT /api/orders/:id => Update Order
router.put(
  "/:id",
  authenticate,
  loadUser,
  loadShop,
  requirePermission("editOrders"),
  updateOrder
);

// DELETE /api/orders/:id => Delete Order
router.delete(
  "/:id",
  authenticate,
  loadUser,
  loadShop,
  requirePermission("deleteOrders"),
  deleteOrder
);

module.exports = router;
