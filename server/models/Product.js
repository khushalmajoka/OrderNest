// A product the shop sells (name, size, price). Orders keep their own typed
// item text, so renaming or archiving a product never changes an old order.
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    name: { type: String, required: true, maxlength: 100 },
    // The size can be a weight, length x breadth (x height) with a unit, or plain text
    size: {
      kind: { type: String, enum: ["none", "weight", "dimensions", "text"], default: "none" },
      weight: Number,
      weightUnit: { type: String, enum: ["kg", "g"] },
      length: Number,
      breadth: Number,
      height: Number,
      dimUnit: { type: String, enum: ["cm", "inch", "ft"] },
      text: { type: String, maxlength: 60 },
    },
    // The size written out, e.g. "1 kg", "12 x 8 inch", "Large" (for lists and the duplicate check)
    sizeLabel: { type: String, default: "" },
    // The usual price and what it is for (a rate: per kg, per sq ft, ...)
    price: { type: Number, min: 0 },
    priceUnit: { type: String, default: "piece" },
    notes: { type: String, maxlength: 300 },
    active: { type: Boolean, default: true },
    // lower case "name|size": the same product cannot be added twice in a shop
    nameKey: { type: String, required: true },
  },
  { timestamps: true }
);

productSchema.index({ shop: 1, nameKey: 1 }, { unique: true });
productSchema.index({ shop: 1, active: 1, name: 1 });

module.exports = mongoose.model("Product", productSchema);
