const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // select: false keeps the hash out of every query unless explicitly requested
  password: { type: String, required: true, select: false },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
  },
});

module.exports = mongoose.model("User", UserSchema);
