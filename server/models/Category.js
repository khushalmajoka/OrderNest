// A group of products (Frames, Albums, ...). Only the admin makes and changes them.
// Deleting a category never deletes a product: its products become "Uncategorized".
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    name: { type: String, required: true, maxlength: 60 },
    // lower case name: the same category cannot be made twice in a shop
    nameKey: { type: String, required: true },
  },
  { timestamps: true }
);

categorySchema.index({ shop: 1, nameKey: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
