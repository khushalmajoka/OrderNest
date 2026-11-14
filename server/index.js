const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require("./routes/shopRoutes");
const orderRoutes = require("./routes/orderRoutes");
const staffRoutes = require("./routes/staffRoutes");
const activityRoutes = require("./routes/activityRoutes");
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

dotenv.config();

// Connect to DB
connectDB();

const app = express();

// Behind Render's proxy: use the real client IP (needed for rate limiting)
app.set('trust proxy', 1);

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

app.use(errorHandler);


// Default route (optional)
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));