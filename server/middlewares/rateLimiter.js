// rateLimiter.js
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// Public order tracking: limits guessing of order IDs / phone numbers.
// Counted per client IP (index.js sets `trust proxy` so this is the real IP).
const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

// Login: limits password guessing. Only failed logins are counted, so a shop
// with many staff on one Wi-Fi is not blocked by normal use.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many failed attempts. Please try again in 15 minutes.",
  },
});

// Login, counted per ACCOUNT (the email or username typed) on top of the
// per-address limit above. Someone guessing one password from many different
// internet addresses is stopped here. The number is high on purpose: it is far
// too few guesses to find a real password, but a person who mistypes a few
// times is never blocked. Only failed logins count. Unknown accounts are
// counted the same way, so the answer never shows which accounts exist.
const loginAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const typed = req.body?.identifier ?? req.body?.email;
    const who = typeof typed === "string" ? typed.trim().toLowerCase().slice(0, 200) : "";
    return who ? `account:${who}` : ipKeyGenerator(req.ip);
  },
  message: {
    error: "Too many failed attempts for this account. Please try again in an hour, or use Forgot password.",
  },
});

// Sign-up: stops bulk creation of fake accounts.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many sign-ups from this network. Please try again later.",
  },
});

// Staff changing their own password: limits guessing of the current password.
const staffPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

// Forgot password: limits how many codes can be asked for / guessed.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in 15 minutes." },
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

// Logged-in admin changing their password: limits guessing of the current one.
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

// Excel export is heavy: a few per minute is plenty.
const exportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many exports. Please wait a few minutes." },
});

module.exports = {
  exportLimiter,
  changePasswordLimiter,
  forgotLimiter,
  resetLimiter,
  trackLimiter,
  loginLimiter,
  loginAccountLimiter,
  registerLimiter,
  staffPasswordLimiter,
};
