// models/Shop.js

const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String },
  address: { type: String, default: "" },
  phone: { type: String, required: true },
  category: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isSetupComplete: { type: Boolean, default: false },

  totalOrderCount: { type: Number, default: 0 },
  dailyOrderCounts: { type: Map, of: Number },

  // Row colour per order status: { "Pending": { enabled: true, color: "yellow" } }
  // Statuses missing here use the app's defaults.
  statusColors: { type: mongoose.Schema.Types.Mixed },

  // Which table columns sit in the order row (the rest show when a row is
  // opened). Not set = the app's default.
  tableColumns: { type: [String], default: undefined },

  // Delivery slip: which parts print ({ logo: true, ... }; missing = default)
  // and a short note printed at the bottom of every slip.
  slipFields: { type: mongoose.Schema.Types.Mixed },
  slipNote: { type: String, maxlength: 200, default: "" },
});

module.exports = mongoose.model("Shop", shopSchema);
