const express = require("express");
const { listProducts, createProduct, updateProduct, suggestFromOrders, createFromOrders, tidySizesPlan, tidySizesApply } = require("../controllers/productController");
const authenticate = require("../middlewares/authenticate");
const loadUser = require("../middlewares/loadUser");
const loadShop = require("../middlewares/loadShop");
const { requirePermission, requireAdmin } = require("../middlewares/access");
const { createCategory, renameCategory, deleteCategory, moveProducts } = require("../controllers/categoryController");
const { countUse } = require("../utils/usage");

const router = express.Router();

// See the list (the controller checks who may); the picker in Create order uses this too
router.get("/", authenticate, loadUser, loadShop, listProducts);
// Build the list from old orders: look first (reads only), then add what was chosen
router.get("/from-orders", authenticate, loadUser, loadShop, requirePermission("manageProducts"), suggestFromOrders);
router.post("/from-orders", authenticate, loadUser, loadShop, requirePermission("manageProducts"), countUse("product.from_orders"), createFromOrders);
// Make sizes the same way (8 x 10 and 10 x 8 are one size): look first, then apply
router.get("/tidy-sizes", authenticate, loadUser, loadShop, requirePermission("manageProducts"), tidySizesPlan);
router.post("/tidy-sizes", authenticate, loadUser, loadShop, requirePermission("manageProducts"), countUse("products.tidy_sizes"), tidySizesApply);
// Add / edit / archive: the admin and staff with "Manage products"
router.post("/", authenticate, loadUser, loadShop, requirePermission("manageProducts"), countUse("product.create"), createProduct);
router.put("/:id", authenticate, loadUser, loadShop, requirePermission("manageProducts"), countUse("product.edit"), updateProduct);

// Categories: the admin only (made, renamed, deleted, and products moved into them)
router.post("/categories", authenticate, loadUser, loadShop, requireAdmin, countUse("category.manage"), createCategory);
router.put("/categories/:id", authenticate, loadUser, loadShop, requireAdmin, countUse("category.manage"), renameCategory);
router.delete("/categories/:id", authenticate, loadUser, loadShop, requireAdmin, countUse("category.manage"), deleteCategory);
router.post("/move", authenticate, loadUser, loadShop, requireAdmin, countUse("category.move"), moveProducts);

module.exports = router;
