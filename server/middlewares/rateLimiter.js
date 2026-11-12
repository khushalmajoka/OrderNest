// rateLimiter.js
const rateLimit = require("express-rate-limit");

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

module.exports = {
  trackLimiter,
  loginLimiter,
  registerLimiter,
  staffPasswordLimiter,
};
