const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const { sendMail, isMailConfigured } = require("../utils/mailer");
const { issueCode, checkCode, CODE_MINUTES } = require("../utils/emailCodes");

// Only these fields are ever sent to the client (never the password hash)
const toPublicUser = (user) => {
  const role = user.role || "admin";
  return {
    _id: user._id,
    name: user.name,
    // Staff have no real email (the stored one is made up)
    email: role === "admin" ? user.email : undefined,
    username: user.username,
    role,
    shopId: user.shopId,
  };
};

// Emails are compared without caring about upper/lower case. Older accounts
// may have been saved with capitals, so look up case-insensitively too.
const CASE_INSENSITIVE = { locale: "en", strength: 2 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt ignores everything after 72 bytes

// Used when the email is unknown, so that case takes as long as a wrong
// password and the reply time does not reveal which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const cleanEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const passwordProblem = (password) =>
  typeof password !== "string" ||
  password.length < MIN_PASSWORD ||
  password.length > MAX_PASSWORD
    ? `Password must be ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`
    : null;

const NO_MAIL = {
  error: "Email is not set up yet, so a code cannot be sent. Please contact support.",
};
const WRONG_CODE = {
  error: "That code is not right or has expired. Please ask for a new one.",
};

// New sign-ups must confirm their email. (REQUIRE_EMAIL_VERIFICATION=false
// switches this off; meant for local testing only.)
const needsVerification = () => process.env.REQUIRE_EMAIL_VERIFICATION !== "false";

// Sends a code without making the person wait (and without telling anyone
// whether it worked: a failed send is only logged).
const mailCode = (to, subject, intro, code) =>
  sendMail({
    to,
    subject,
    text:
      `${intro}\n\nYour OrderNest code is ${code}\n\n` +
      `It works for ${CODE_MINUTES} minutes. If you did not ask for this, ignore this email.`,
  }).catch((err) => console.error("Could not send the email:", err.message));

// ---------- Sign-up and login ----------

const register = async (req, res, next) => {
  const { name, password } = req.body || {};
  const email = cleanEmail(req.body?.email);

  try {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Please enter your name." });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email." });
    }
    const problem = passwordProblem(password);
    if (problem) return res.status(400).json({ error: problem });

    const verify = needsVerification();
    if (verify && !isMailConfigured()) {
      return res.status(503).json({
        error: "Sign-up is not available right now (email is not set up yet). Please contact support.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user = await User.findOne({ email }).collation(CASE_INSENSITIVE);

    if (user && !(verify && user.emailVerified === false)) {
      return res.status(400).json({ error: "Email already registered" });
    }

    if (user) {
      // Signed up before but never confirmed (maybe a typo or a lost email):
      // such an account holds no data, so let them start again.
      user.name = name.trim();
      user.password = hashedPassword;
    } else {
      user = new User({
        name: name.trim(),
        email,
        password: hashedPassword,
        emailVerified: !verify,
      });
    }

    const code = verify ? issueCode(user, "emailCode", "verify") : null;
    await user.save();

    if (code) {
      mailCode(user.email, "Confirm your OrderNest email", "Welcome to OrderNest!", code);
    }

    res.status(201).json({ user: toPublicUser(user), needsVerification: verify });
  } catch (err) {
    // Two sign-ups with the same email at the same moment
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email already registered" });
    }
    return next(err);
  }
};

// Admins log in with their email, staff with their username (same box).
// The old field name `email` still works.
const login = async (req, res, next) => {
  const { password } = req.body || {};
  const typed = req.body?.identifier ?? req.body?.email;
  const identifier = cleanEmail(typed); // trims and lower-cases any text

  try {
    if (!identifier || typeof password !== "string" || !password) {
      return res
        .status(400)
        .json({ error: "Please enter your email or username and password." });
    }

    const user = identifier.includes("@")
      ? await User.findOne({ email: identifier })
          .collation(CASE_INSENSITIVE)
          .select("+password")
      : await User.findOne({ username: identifier }).select("+password");

    // Same answer for "no such account" and "wrong password"
    const isMatch = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_HASH
    );
    if (!user || !isMatch) {
      return res.status(401).json({ error: "Wrong email, username or password." });
    }

    if ((user.role || "admin") === "staff" && user.active === false) {
      return res
        .status(403)
        .json({ error: "Your account is turned off. Please ask your admin." });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        error: "Please confirm your email first.",
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({ user: toPublicUser(user), token });
  } catch (err) {
    return next(err);
  }
};

// ---------- Change the password (logged-in admin) ----------

// POST /api/auth/change-password   { currentPassword, newPassword }
// Logins on other devices stop working; this one gets a fresh token.
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.account.id).select("+password");

    if (
      typeof currentPassword !== "string" ||
      !(await bcrypt.compare(currentPassword, user.password))
    ) {
      return res.status(400).json({ error: "Your current password is not right." });
    }
    const problem = passwordProblem(newPassword);
    if (problem) return res.status(400).json({ error: problem });
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: "The new password must be different." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date(); // logs out every older login
    user.resetCode = undefined; // an unused forgot-password code must not work any more
    await user.save();

    res.status(200).json({
      message: "Password changed. Other devices were logged out.",
      token: generateToken(user._id),
    });
  } catch (err) {
    return next(err);
  }
};

// ---------- Confirm the email after sign-up ----------

// POST /api/auth/verify-email   { email, code }
const verifyEmail = async (req, res, next) => {
  const email = cleanEmail(req.body?.email);
  try {
    const user = EMAIL_PATTERN.test(email)
      ? await User.findOne({ email, emailVerified: false }).collation(CASE_INSENSITIVE)
      : null;
    if (!user) return res.status(400).json(WRONG_CODE);

    const ok = checkCode(user, "emailCode", "verify", req.body?.code);
    if (!ok) {
      await user.save();
      return res.status(400).json(WRONG_CODE);
    }

    user.emailVerified = true;
    user.emailCode = undefined;
    await user.save();
    res.status(200).json({ message: "Email confirmed. You can login now." });
  } catch (err) {
    return next(err);
  }
};

// POST /api/auth/resend-verification   { email }
// Same answer whether or not there is a waiting account.
const resendVerification = async (req, res, next) => {
  const email = cleanEmail(req.body?.email);
  try {
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email." });
    }
    if (!isMailConfigured()) return res.status(503).json(NO_MAIL);

    res.status(200).json({
      message: `If this email is waiting to be confirmed, we sent a new 6-digit code. It works for ${CODE_MINUTES} minutes.`,
    });

    const user = await User.findOne({ email, emailVerified: false }).collation(CASE_INSENSITIVE);
    if (!user) return;
    const code = issueCode(user, "emailCode", "verify");
    if (!code) return; // asked again too soon
    await user.save();
    mailCode(user.email, "Confirm your OrderNest email", "Welcome to OrderNest!", code);
  } catch (err) {
    console.error("Resend verification failed:", err.message);
  }
};

// ---------- Change the email (logged-in admin) ----------

// POST /api/auth/change-email/request   { newEmail, password }
// The code goes to the NEW address, so only someone who can read it can use it.
const requestEmailChange = async (req, res, next) => {
  const newEmail = cleanEmail(req.body?.newEmail);
  try {
    if (!EMAIL_PATTERN.test(newEmail)) {
      return res.status(400).json({ error: "Please enter a valid email." });
    }
    if (!isMailConfigured()) return res.status(503).json(NO_MAIL);

    const user = await User.findById(req.account.id).select("+password");
    if (
      typeof req.body?.password !== "string" ||
      !(await bcrypt.compare(req.body.password, user.password))
    ) {
      return res.status(400).json({ error: "Your password is not right." });
    }
    if (newEmail === user.email.toLowerCase()) {
      return res.status(400).json({ error: "This is already your email." });
    }
    if (await User.exists({ email: newEmail }).collation(CASE_INSENSITIVE)) {
      return res.status(400).json({ error: "This email is already used by another account." });
    }

    const code = issueCode(user, "emailCode", "change", { newEmail });
    if (!code) {
      return res
        .status(400)
        .json({ error: "A code was just sent. Please wait a minute before asking again." });
    }
    await user.save();

    mailCode(newEmail, "Confirm your new OrderNest email", "You asked to change your OrderNest email.", code);
    res.status(200).json({
      message: `We sent a 6-digit code to ${newEmail}. It works for ${CODE_MINUTES} minutes.`,
    });
  } catch (err) {
    return next(err);
  }
};

// POST /api/auth/change-email/confirm   { code }
const confirmEmailChange = async (req, res, next) => {
  try {
    const user = await User.findById(req.account.id);
    const newEmail = user.emailCode?.newEmail;

    if (!newEmail || !checkCode(user, "emailCode", "change", req.body?.code)) {
      await user.save();
      return res.status(400).json(WRONG_CODE);
    }

    // Someone may have taken it in the meantime
    if (await User.exists({ email: newEmail, _id: { $ne: user._id } }).collation(CASE_INSENSITIVE)) {
      return res.status(400).json({ error: "This email is already used by another account." });
    }

    user.email = newEmail;
    user.emailVerified = true;
    user.emailCode = undefined;
    await user.save();
    res.status(200).json({ email: user.email, message: "Your email was changed." });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "This email is already used by another account." });
    }
    return next(err);
  }
};

// ---------- Forgot password (admins, by emailed code) ----------

// Staff have no real email: they ask their admin to set a new password.
const findAdminByEmail = (email) =>
  User.findOne({ email, role: { $ne: "staff" } }).collation(CASE_INSENSITIVE);

// POST /api/auth/forgot-password   { email }
// The answer is the same whether or not the email has an account, and it is
// sent back before the email goes out, so nobody can learn which emails exist.
const forgotPassword = async (req, res, next) => {
  const email = cleanEmail(req.body?.email);

  try {
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email." });
    }
    if (!isMailConfigured()) return res.status(503).json(NO_MAIL);

    const reply = () =>
      res.status(200).json({
        message: `If this email has an account, we sent a 6-digit code. It works for ${CODE_MINUTES} minutes.`,
      });

    const user = await findAdminByEmail(email);
    const code = user && user.emailVerified !== false
      ? issueCode(user, "resetCode", "reset")
      : null;
    if (!code) return reply(); // unknown email, or asked again too soon: same answer, nothing sent

    await user.save();
    reply();

    mailCode(user.email, "Your OrderNest password code", "You asked to reset your OrderNest password.", code);
  } catch (err) {
    return next(err);
  }
};

// POST /api/auth/reset-password   { email, code, newPassword }
const resetPassword = async (req, res, next) => {
  const email = cleanEmail(req.body?.email);
  const { code, newPassword } = req.body || {};

  try {
    if (!EMAIL_PATTERN.test(email) || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return res.status(400).json(WRONG_CODE);
    }
    const problem = passwordProblem(newPassword);
    if (problem) return res.status(400).json({ error: problem });

    const user = await findAdminByEmail(email);
    if (!user) return res.status(400).json(WRONG_CODE);

    if (!checkCode(user, "resetCode", "reset", code)) {
      await user.save(); // keeps the count of wrong tries
      return res.status(400).json(WRONG_CODE);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date(); // logs out older logins
    user.resetCode = undefined;
    await user.save();

    res.status(200).json({ message: "Password changed. You can login now." });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  register,
  login,
  changePassword,
  verifyEmail,
  resendVerification,
  requestEmailChange,
  confirmEmailChange,
  forgotPassword,
  resetPassword,
};
