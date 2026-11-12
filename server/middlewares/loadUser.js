// loadUser.js
// Must run after `authenticate`. Looks up the logged-in account so that every
// request is judged by the CURRENT role and permissions (an admin's change, or
// turning a staff account off, takes effect at once, not at next login).
const User = require("../models/User");

const loadUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "Your account no longer exists." });
    }

    const role = user.role || "admin";

    if (role === "staff" && user.active === false) {
      return res
        .status(401)
        .json({ error: "Your account is turned off. Please ask your admin." });
    }

    // A password change logs out the logins made before it
    if (user.passwordChangedAt && req.user.iat) {
      if (req.user.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
        return res
          .status(401)
          .json({ error: "Your password was changed. Please login again." });
      }
    }

    req.account = {
      id: String(user._id),
      role,
      name: user.name,
      username: user.username,
      shopId: user.shopId,
      permissions: user.permissions ? user.permissions.toObject() : {},
      passwordChange: user.passwordChange ? user.passwordChange.toObject() : { status: "none" },
    };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = loadUser;
