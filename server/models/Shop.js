// models/Shop.js

const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  category: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isSetupComplete: { type: Boolean, default: false },

  totalOrderCount: { type: Number, default: 0 },
  dailyOrderCounts: { type: Map, of: Number },
});

module.exports = mongoose.model("Shop", shopSchema);
