const express = require("express");
const { listProducts, createProduct, updateProduct, suggestFromOrders, createFromOrders } = require("../controllers/productController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { requirePermission } = require("../middlewares/access");
const { countUse } = require("../utils/usage");

const router = express.Router();

// See the list (the controller checks who may); the picker in Create order uses this too
router.get("/", authenticate, loadUser, loadShop, listProducts);
// Build the list from old orders: look first (reads only), then add what was chosen
router.get("/from-orders", authenticate, loadUser, loadShop, requirePermission("manageProducts"), suggestFromOrders);
router.post("/from-orders", authenticate, loadUser, loadShop, requirePermission("manageProducts"), countUse("product.from_orders"), createFromOrders);
// Add / edit / archive: the admin and staff with "Manage products"
router.post("/", authenticate, loadUser, loadShop, requirePermission("manageProducts"), countUse("product.create"), createProduct);
router.put("/:id", authenticate, loadUser, loadShop, requirePermission("manageProducts"), countUse("product.edit"), updateProduct);

module.exports = router;
