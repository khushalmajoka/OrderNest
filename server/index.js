const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require("./routes/shopRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

dotenv.config();

// Connect to DB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));


// Routes
app.use('/api/auth', authRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/orders", orderRoutes);

app.use(errorHandler);


// Default route (optional)
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling middleware (optional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));