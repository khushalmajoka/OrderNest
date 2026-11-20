// Only the developer may pass. Who that is: see utils/developer.js. Everyone
// else (staff, shop admins, strangers) gets the same "Not found" as an address
// that does not exist, so the page is not even revealed. When DEVELOPER_EMAILS
// is empty, nobody can pass. Must run after authenticate + loadUser.
// (loadUser keeps `isDeveloper` of the REAL login, also while the developer is
// working inside a shop.)
const requireDeveloper = (req, res, next) => {
  if (!req.account?.isDeveloper) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  next();
};

module.exports = requireDeveloper;
