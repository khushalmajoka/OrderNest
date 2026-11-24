// A picture of a product, kept in the database (no outside picture service).
// The screen shrinks it first: a big one (full) and a small one (thumb) for lists.
// Kept apart from Product so the product list stays light and fast.
const mongoose = require("mongoose");

const productImageSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    contentType: { type: String, enum: ["image/jpeg", "image/png", "image/webp"], required: true },
    full: { type: Buffer, required: true },
    thumb: { type: Buffer, required: true },
  },
  { timestamps: true }
);

productImageSchema.index({ shop: 1, product: 1 });

module.exports = mongoose.model("ProductImage", productImageSchema);
