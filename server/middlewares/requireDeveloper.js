// Only the developer may pass. Who that is: the emails in DEVELOPER_EMAILS on
// the server (comma separated). Everyone else (staff, shop admins, strangers)
// gets the same "Not found" as an address that does not exist, so the page is
// not even revealed. When DEVELOPER_EMAILS is empty, nobody can pass.
// Must run after authenticate + loadUser.
const User = require("../models/User");

const developerEmails = () =>
  (process.env.DEVELOPER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const notFound = (res) => res.status(404).json({ success: false, message: "Not found" });

const requireDeveloper = async (req, res, next) => {
  try {
    const list = developerEmails();
    const email = String(req.account?.email || "").toLowerCase();
    if (!list.length || req.account?.role !== "admin" || !email || !list.includes(email)) {
      return notFound(res);
    }
    // the address must be a confirmed one
    const user = await User.findById(req.account.id).select("emailVerified");
    if (!user || user.emailVerified === false) return notFound(res);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireDeveloper;
