// A product as the shop thinks of it ("Frame", "Mug"): its name, category, pictures
// and notes. The sizes (and their prices) are the Product records that point to it.
// Orders keep pointing at those size records, so no old order changes.
const mongoose = require("mongoose");

const familySchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    name: { type: String, required: true, maxlength: 100 },
    // lower case name: the same product cannot be made twice in a shop
    nameKey: { type: String, required: true },
    notes: { type: String, maxlength: 300, default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    // pictures in the order shown (the first is the main one); they live in ProductImage
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductImage" }],
  },
  { timestamps: true }
);

familySchema.index({ shop: 1, nameKey: 1 }, { unique: true });
familySchema.index({ shop: 1, category: 1 });

module.exports = mongoose.model("ProductFamily", familySchema);
