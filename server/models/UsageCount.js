// How many times a feature was used: ONE row per shop, day and feature.
// Only a number and the ids of the people who used it (to say "3 of 5 staff").
// No customer name, phone, amount or order is stored here.
const mongoose = require("mongoose");

const KEEP_SECONDS = 400 * 24 * 60 * 60;

const usageSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  day: { type: String, required: true }, // YYYYMMDD, Indian time
  feature: { type: String, required: true },
  count: { type: Number, default: 0 },
  users: [String], // account ids that used it that day
  lastAt: Date,
  createdAt: { type: Date, default: Date.now, expires: KEEP_SECONDS },
});

usageSchema.index({ shop: 1, day: 1, feature: 1 }, { unique: true });

module.exports = mongoose.model("UsageCount", usageSchema);
