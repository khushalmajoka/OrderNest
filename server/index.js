const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require("./routes/shopRoutes");
const orderRoutes = require("./routes/orderRoutes");
const staffRoutes = require("./routes/staffRoutes");
const activityRoutes = require("./routes/activityRoutes");
const usageRoutes = require("./routes/usageRoutes");
const developerRoutes = require("./routes/developerRoutes");
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

dotenv.config();

// Connect to DB
connectDB();

const app = express();

// Behind Render's proxy: use the real client IP (needed for rate limiting)
app.set('trust proxy', 1);

// Do not tell everyone which software runs here
app.disable('x-powered-by');

// Safe-browsing headers on every answer. This server only sends data (never
// web pages), so the strictest settings are fine.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // the app on another address must read the answers
  next();
});

// Middleware
// Which websites may call this API from a browser. Set CORS_ORIGINS on the
// server (comma separated, e.g. https://your-app.vercel.app) to allow only
// those; when it is not set, every website is allowed (as before).
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
app.use(
  cors(
    allowedOrigins.length
      ? {
          origin: (origin, callback) =>
            // no Origin header = not a browser page (health checks, tools)
            callback(null, !origin || allowedOrigins.includes(origin)),
        }
      : undefined
  )
);
app.use(express.json({ limit: '10mb' }));


// Routes
app.use('/api/auth', authRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/developer", developerRoutes);

// Default route (optional)
app.get('/', (req, res) => {
  res.send('API is running...');
});

// An address that does not exist: a clear answer in the same shape as the others
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));