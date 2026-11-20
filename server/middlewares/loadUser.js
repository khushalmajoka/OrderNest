// loadUser.js
// Must run after `authenticate`. Looks up the logged-in account so that every
// request is judged by the CURRENT role and permissions (an admin's change, or
// turning a staff account off, takes effect at once, not at next login).
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const { isDeveloperUser } = require("../utils/developer");

const loadUser = async (req, res, next) => {
  try {
    let user = await User.findById(req.user.id);
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

    // DEVELOPER: with the header X-Dev-Shop the developer works INSIDE that shop:
    // the request is treated exactly like the shop owner's, so everything an
    // admin can do works. Only the developer's own account (checked above, from
    // the login) can do this; for everybody else the header is ignored.
    const developer = isDeveloperUser(user);
    const wanted = req.header("X-Dev-Shop");
    if (developer && wanted) {
      const shop = mongoose.Types.ObjectId.isValid(wanted) ? await Shop.findById(wanted) : null;
      const owner = shop ? await User.findById(shop.owner) : null;
      if (!shop || !owner) {
        return res.status(404).json({ error: "That shop no longer exists.", devShopGone: true });
      }
      req.devMode = {
        developer: { id: String(user._id), name: user.name, email: user.email },
        shopId: String(shop._id),
      };
      req.user = { ...req.user, id: String(owner._id) };
      user = owner;
    }

    const role2 = user.role || "admin";
    req.account = {
      isDeveloper: developer,
      devMode: Boolean(req.devMode),
      id: String(user._id),
      role: role2,
      name: user.name,
      email: role2 === "admin" ? user.email : undefined,
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
