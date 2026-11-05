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

module.exports = { trackLimiter };
