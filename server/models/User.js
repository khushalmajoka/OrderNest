const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Admins log in with this. Staff get a made-up one (username@staff.invalid)
  // because they log in with their username instead.
  email: { type: String, required: true, unique: true },
  // select: false keeps the hash out of every query unless explicitly requested
  password: { type: String, required: true, select: false },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
  },

  // "admin" = the shop owner (everything). "staff" = made by the admin, with
  // only the powers listed in `permissions`. Accounts from before roles
  // existed have no role and count as admin.
  role: { type: String, enum: ["admin", "staff"], default: "admin" },
  // Staff only: unique across the app, lower case
  username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  // Staff only: what the admin switched on (viewing orders is always allowed)
  permissions: {
    createOrders: { type: Boolean, default: false },
    editOrders: { type: Boolean, default: false },
    deleteOrders: { type: Boolean, default: false },
    shareSlip: { type: Boolean, default: false },
  },
  // Staff only: the admin can turn an account off without deleting it
  active: { type: Boolean, default: true },

  // Staff may not change their password on their own: they ask, the admin
  // approves, and then they have until `approvedUntil` to set a new one.
  passwordChange: {
    status: { type: String, enum: ["none", "requested", "approved"], default: "none" },
    requestedAt: Date,
    approvedUntil: Date,
  },
  // Admin forgot-password: only a fingerprint of the emailed code is kept
  resetCode: {
    hash: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 },
    sentAt: Date,
  },
  // Logins made before this moment stop working (set when a password changes)
  passwordChangedAt: Date,
});

module.exports = mongoose.model("User", UserSchema);
