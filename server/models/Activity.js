// One line of the Activity history: who did what, and when.
// Kept for 6 months, then removed automatically.
const mongoose = require("mongoose");

const KEEP_SECONDS = 180 * 24 * 60 * 60;

const activitySchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    // Who did it (copied here, so the line still reads right if they are deleted later)
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      username: String,
      role: { type: String, enum: ["admin", "staff"] },
    },
    kind: { type: String, enum: ["order", "staff"], required: true },
    action: { type: String, required: true },
    targetLabel: String, // the order ID, or the staff member's name
    summary: { type: String, required: true, maxlength: 500 },
    // For edits: what changed, as readable text
    changes: [{ _id: false, field: String, from: String, to: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ shop: 1, createdAt: -1 });
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: KEEP_SECONDS });

module.exports = mongoose.model("Activity", activitySchema);
