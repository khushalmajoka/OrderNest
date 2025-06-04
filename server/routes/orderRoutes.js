// routes/orderRoutes.js
const express = require("express");
const { createOrder, getOrdersByUser, updateOrder, deleteOrder, trackOrder} = require("../controllers/orderController");
const authenticate = require("../middlewares/authenticate");

const router = express.Router();

router.get("/track", trackOrder);

// Create Order
router.post("/create", authenticate, createOrder);

// Get Orders for User
router.get("/:userId", authenticate, getOrdersByUser);

// PUT /api/orders/:id => Update Order
router.put("/:id", authenticate, updateOrder);

// DELETE /api/orders/:id => Delete Order
router.delete("/:id", authenticate, deleteOrder);

module.exports = router;
