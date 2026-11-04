// models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Unique per shop (see index below), not across shops
    orderId: {
      type: String,
      required: true,
    },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    item: {
      type: String,
      required: false,
    },
    customerName: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
    },
    total: {
      type: Number,
      required: true,
    },
    advance: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "Order Received",
        "Pending",
        "In Progress",
        "Completed",
        "Ready to Dispatch/Pick-Up",
        "Dispatched",
        "Delivered",
        "Cancelled" 
      ],
      default: "Order Received",
    },
    orderExecutive: {
      type: String,
      required: false,
    },
    expectedDeliveryDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Two shops may use the same order ID; within one shop it must be unique.
orderSchema.index({ shop: 1, orderId: 1 }, { unique: true });
// Plain lookup index for the public tracking endpoint (searches by orderId).
orderSchema.index({ orderId: 1 });

module.exports = mongoose.model("Order", orderSchema);
