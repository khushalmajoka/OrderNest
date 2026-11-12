const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const generateToken = require("../utils/generateToken");
const { sendMail, isMailConfigured } = require("../utils/mailer");

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
    if (
      typeof password !== "string" ||
      password.length < MIN_PASSWORD ||
      password.length > MAX_PASSWORD
    ) {
      return res.status(400).json({
        error: `Password must be ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`,
      });
    }

    const existing = await User.findOne({ email }).collation(CASE_INSENSITIVE);
    if (existing)
      return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email,
      password: hashedPassword,
    });

    res.status(201).json({ user: toPublicUser(user) });
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

    const token = generateToken(user._id);

    res.status(200).json({ user: toPublicUser(user), token });
  } catch (err) {
    return next(err);
  }
};

// ---------- Forgot password (admins, by emailed code) ----------

const CODE_MINUTES = 10;
const RESEND_SECONDS = 60;
const MAX_CODE_TRIES = 5;

// Only a fingerprint of the code is stored, tied to the account
const fingerprint = (code, userId) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId}:${code}`)
    .digest("hex");

const sameText = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Staff have no real email: they ask their admin to set a new password.
const findAdminByEmail = (email) =>
  User.findOne({ email, role: { $ne: "staff" } })
    .collation(CASE_INSENSITIVE);

// POST /api/auth/forgot-password   { email }
// The answer is the same whether or not the email has an account, and it is
// sent back before the email goes out, so nobody can learn which emails exist.
const forgotPassword = async (req, res, next) => {
  const email = cleanEmail(req.body?.email);

  try {
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email." });
    }
    if (!isMailConfigured()) {
      return res.status(503).json({
        error: "Email is not set up yet, so a code cannot be sent. Please contact support.",
      });
    }

    const reply = () =>
      res.status(200).json({
        message: `If this email has an account, we sent a 6-digit code. It works for ${CODE_MINUTES} minutes.`,
      });

    const user = await findAdminByEmail(email);
    const sentAt = user?.resetCode?.sentAt;
    if (!user || (sentAt && Date.now() - sentAt.getTime() < RESEND_SECONDS * 1000)) {
      return reply(); // unknown email, or asked again too soon: same answer, nothing sent
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    user.resetCode = {
      hash: fingerprint(code, user._id),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
      attempts: 0,
      sentAt: new Date(),
    };
    await user.save();

    reply();

    sendMail({
      to: user.email,
      subject: "Your OrderNest password code",
      text:
        `Your OrderNest code is ${code}\n\n` +
        `It works for ${CODE_MINUTES} minutes. If you did not ask to reset your password, ignore this email.`,
    }).catch((err) => console.error("Could not send the reset email:", err.message));
  } catch (err) {
    return next(err);
  }
};

// POST /api/auth/reset-password   { email, code, newPassword }
const resetPassword = async (req, res, next) => {
  const email = cleanEmail(req.body?.email);
  const { code, newPassword } = req.body || {};
  const wrong = { error: "That code is not right or has expired. Please ask for a new one." };

  try {
    if (!EMAIL_PATTERN.test(email) || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return res.status(400).json(wrong);
    }
    if (
      typeof newPassword !== "string" ||
      newPassword.length < MIN_PASSWORD ||
      newPassword.length > MAX_PASSWORD
    ) {
      return res.status(400).json({
        error: `Password must be ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`,
      });
    }

    const user = await findAdminByEmail(email);
    const saved = user?.resetCode;
    if (!user || !saved?.hash || !saved.expiresAt || saved.expiresAt < new Date()) {
      return res.status(400).json(wrong);
    }

    // Every try counts; after a few wrong ones the code is thrown away
    user.resetCode.attempts = (saved.attempts || 0) + 1;
    if (user.resetCode.attempts > MAX_CODE_TRIES) {
      user.resetCode = undefined;
      await user.save();
      return res.status(400).json(wrong);
    }

    if (!sameText(saved.hash, fingerprint(code.trim(), user._id))) {
      await user.save();
      return res.status(400).json(wrong);
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

module.exports = { register, login, forgotPassword, resetPassword };
