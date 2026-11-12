// Columns of the orders table, in the order they are shown. The admin picks
// which ones sit in the row; the others are shown when a row is opened.
// "orderId" is always in the row.
module.exports = [
  "orderId",
  "customerName",
  "item",
  "phone",
  "total",
  "advance",
  "balance",
  "status",
  "delivery",
  "orderExecutive",
  "address",
  "createdAt",
  "updatedAt",
];
