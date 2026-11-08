const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// Only these fields are ever sent to the client (never the password hash)
const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  shopId: user.shopId,
});

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

const login = async (req, res, next) => {
  const { password } = req.body || {};
  const email = cleanEmail(req.body?.email);

  try {
    if (!email || typeof password !== "string" || !password) {
      return res
        .status(400)
        .json({ error: "Please enter your email and password." });
    }

    const user = await User.findOne({ email })
      .collation(CASE_INSENSITIVE)
      .select("+password");

    // Same answer for "no such email" and "wrong password"
    const isMatch = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_HASH
    );
    if (!user || !isMatch) {
      return res.status(401).json({ error: "Wrong email or password." });
    }

    const token = generateToken(user._id);

    res.status(200).json({ user: toPublicUser(user), token });
  } catch (err) {
    return next(err);
  }
};

module.exports = { register, login };
