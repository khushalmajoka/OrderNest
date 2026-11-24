// routes/orderRoutes.js
const express = require("express");
const {
  createOrder,
  getOrdersByShop,
  updateOrder,
  deleteOrder,
  trackOrder,
  bulkUploadOrders,
  bulkStatus,
  exportOrders,
  getOrderSummary,
  getNeedsReview,
  snoozeReview,
  getOrderChanges,
  getExecutiveNames,
} = require("../controllers/orderController");
const { checkNames, clearNames } = require("../controllers/nameCleanupController");
const { checkOldOrders, closeOldOrders } = require("../controllers/closeOldOrdersController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { requireAdmin, requirePermission } = require("../middlewares/access");
const { trackLimiter, exportLimiter } = require("../middlewares/rateLimiter");
const { countUse } = require("../utils/usage");

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
  countUse("order.create"),
  createOrder
);

// Excel upload: admin only
router.post(
  "/bulk-upload",
  authenticate,
  loadUser,
  loadShop,
  requireAdmin,
  countUse("orders.bulk_upload"),
  bulkUploadOrders
);

// Change the status of several orders at once (also "Next step" for one order)
router.post(
  "/bulk-status",
  authenticate,
  loadUser,
  loadShop,
  requirePermission("editOrders"),
  bulkStatus
);

// Get one page of a shop's orders
router.get("/shop/:shopId", authenticate, loadUser, loadShop, getOrdersByShop);

// The numbers at the top of the dashboard (whole shop)
// Cleaning old customer names such as "N" or "NA": admin only
router.get("/shop/:shopId/name-check", authenticate, loadUser, loadShop, requireAdmin, checkNames);
router.post("/shop/:shopId/clear-names", authenticate, loadUser, loadShop, requireAdmin, countUse("tool.clean_names"), clearNames);

// Closing old orders that never got a status update: admin only
router.get("/shop/:shopId/close-check", authenticate, loadUser, loadShop, requireAdmin, checkOldOrders);
router.post("/shop/:shopId/close-orders", authenticate, loadUser, loadShop, requireAdmin, countUse("tool.close_old"), closeOldOrders);

// A very light "has anything changed?" check (the dashboard asks every 30 seconds)
router.get("/shop/:shopId/changes", authenticate, loadUser, loadShop, getOrderChanges);

router.get("/review", authenticate, loadUser, loadShop, requirePermission("editOrders"), getNeedsReview);
router.post("/review-snooze", authenticate, loadUser, loadShop, requirePermission("editOrders"), snoozeReview);
router.get("/shop/:shopId/summary", authenticate, loadUser, loadShop, getOrderSummary);

// Names for the "Order executive" list
router.get("/shop/:shopId/executives", authenticate, loadUser, loadShop, getExecutiveNames);

// Orders for an Excel file (admin only): same search, filters and sort as the list
router.get(
  "/shop/:shopId/export",
  authenticate,
  loadUser,
  loadShop,
  requireAdmin,
  exportLimiter,
  countUse("orders.export"),
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
  countUse("order.delete"),
  deleteOrder
);

module.exports = router;
