// Who the developer is: an admin account whose (confirmed) email is listed in
// DEVELOPER_EMAILS on the server (comma separated). Nobody else, ever; when
// the list is empty there is no developer.
const developerEmails = () =>
  (process.env.DEVELOPER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

// `user` is a User document (or plain object)
const isDeveloperUser = (user) => {
  const list = developerEmails();
  if (!user || !list.length) return false;
  if ((user.role || "admin") !== "admin") return false;
  if (user.emailVerified === false) return false;
  return list.includes(String(user.email || "").toLowerCase());
};

module.exports = { developerEmails, isDeveloperUser };
