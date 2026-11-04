const mongoose = require('mongoose');
const Order = require('../models/Order');

// Order IDs are unique per shop, not globally. Databases created earlier still
// have a unique index on orderId alone, which would keep blocking two shops
// from using the same ID, so replace it with the per-shop one.
const migrateOrderIndexes = async () => {
  try {
    const existing = await Order.collection.indexes().catch(() => []);
    const legacy = existing.find((i) => i.name === 'orderId_1' && i.unique);

    if (legacy) {
      await Order.collection.dropIndex('orderId_1');
      console.log('Dropped legacy unique index orderId_1 on orders');
    }

    await Order.createIndexes();
  } catch (err) {
    console.error('Order index migration failed:', err.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  await migrateOrderIndexes();
};

module.exports = connectDB;
