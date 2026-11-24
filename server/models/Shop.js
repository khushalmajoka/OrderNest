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
  // Statuses the shop switched OFF (not offered when changing an order's status).
  // Not set = the app's default (Pending and Completed are off).
  hiddenStatuses: { type: [String], default: undefined },
  // The statuses after which the app asks "Tell the customer on WhatsApp?"
  // Not set = the app's default (Ready and Dispatched).
  whatsappPromptStatuses: { type: [String], default: undefined },
  // Needs review: open orders this many days after their delivery date are
  // listed for a check. Not set = on, 5 days.
  needsReview: {
    enabled: { type: Boolean },
    days: { type: Number },
  },
  // Main switches for the colouring: all colouring, the whole-row tint, and the
  // coloured line at the start of a row. Not set = on (as it always was).
  colorMaster: { type: Boolean },
  colorRow: { type: Boolean },
  colorStrip: { type: Boolean },

  // Which table columns sit in the order row (the rest show when a row is
  // opened). Not set = the app's default.
  tableColumns: { type: [String], default: undefined },

  // Delivery slip: which parts print ({ logo: true, ... }; missing = default)
  // and a short note printed at the bottom of every slip.
  slipFields: { type: mongoose.Schema.Types.Mixed },
  slipNote: { type: String, maxlength: 200, default: "" },

  // Texts the shop changed for the WhatsApp messages:
  // { en: { "Pending": "text..." }, hi: {...}, hinglish: {...} }
  // Anything missing uses the app's own text.
  whatsappMessages: { type: mongoose.Schema.Types.Mixed },
});

module.exports = mongoose.model("Shop", shopSchema);
