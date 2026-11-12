// Turns the dashboard's filter choices (query string) into a MongoDB filter.
// Every filter given must match (AND). Returns { conditions } or { error }.
const ORDER_STATUSES = require("../models/orderStatuses");
const dateStamp = require("./dateStamp");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const asText = (value) => String(value ?? "").trim().slice(0, 100);

// Number box: empty means "not used"; anything else must be a number
const readNumber = (value) => {
  const text = asText(value);
  if (text === "") return { value: undefined };
  const number = Number(text);
  return Number.isFinite(number) ? { value: number } : { error: true };
};

// "2026-11-20" -> that day, or an error when it is not a real date
const readDay = (value) => {
  const text = asText(value);
  if (text === "") return { value: undefined };
  if (!DAY.test(text) || Number.isNaN(new Date(`${text}T00:00:00Z`).getTime())) {
    return { error: true };
  }
  return { value: text };
};

// Money columns: [query name prefix, field]
const AMOUNT_FILTERS = [
  ["total", "total"],
  ["advance", "advance"],
  ["balance", "balance"],
];
// Text columns: [query name, field]
const TEXT_FILTERS = [
  ["customer", "customerName"],
  ["item", "item"],
  ["phone", "phone"],
  ["executive", "orderExecutive"],
  ["orderId", "orderId"],
];

const buildOrderFilters = (query) => {
  const conditions = [];

  // Status: one or more, e.g. "Pending,In Progress"
  const statusText = asText(query.status);
  if (statusText) {
    const wanted = statusText.split(",").map((s) => s.trim()).filter(Boolean);
    if (wanted.some((s) => !ORDER_STATUSES.includes(s))) {
      return { error: "Unknown status in filter." };
    }
    conditions.push({ status: { $in: wanted } });
  }

  // Amount ranges (min / max, either one may be empty)
  for (const [name, field] of AMOUNT_FILTERS) {
    const min = readNumber(query[`${name}Min`]);
    const max = readNumber(query[`${name}Max`]);
    if (min.error || max.error) return { error: `${name} amount must be a number.` };
    const range = {};
    if (min.value !== undefined) range.$gte = min.value;
    if (max.value !== undefined) range.$lte = max.value;
    if (Object.keys(range).length) conditions.push({ [field]: range });
  }

  // Expected delivery date: stored as midnight UTC of the chosen day
  const dFrom = readDay(query.deliveryFrom);
  const dTo = readDay(query.deliveryTo);
  if (dFrom.error || dTo.error) return { error: "Delivery date is not valid." };
  const deliveryRange = {};
  if (dFrom.value) deliveryRange.$gte = new Date(`${dFrom.value}T00:00:00.000Z`);
  if (dTo.value) deliveryRange.$lte = new Date(`${dTo.value}T23:59:59.999Z`);
  if (Object.keys(deliveryRange).length) {
    conditions.push({ expectedDeliveryDate: deliveryRange });
  }

  // Created date: whole days in Indian time
  const cFrom = readDay(query.createdFrom);
  const cTo = readDay(query.createdTo);
  if (cFrom.error || cTo.error) return { error: "Created date is not valid." };
  const createdRange = {};
  if (cFrom.value) createdRange.$gte = new Date(`${cFrom.value}T00:00:00.000+05:30`);
  if (cTo.value) createdRange.$lte = new Date(`${cTo.value}T23:59:59.999+05:30`);
  if (Object.keys(createdRange).length) conditions.push({ createdAt: createdRange });

  // Text boxes: contains, any upper/lower case
  for (const [name, field] of TEXT_FILTERS) {
    const text = asText(query[name]);
    if (text) conditions.push({ [field]: new RegExp(escapeRegex(text), "i") });
  }

  // Order number range: the running number inside IDs like ORD-20261109-12-3
  // (the 12). IDs typed by hand in an Excel upload have no such number.
  const nFrom = readNumber(query.orderNoFrom);
  const nTo = readNumber(query.orderNoTo);
  if (nFrom.error || nTo.error) return { error: "Order number must be a number." };
  if (nFrom.value !== undefined || nTo.value !== undefined) {
    const checks = [
      { $eq: [{ $size: "$$parts" }, 4] },
      { $eq: [{ $arrayElemAt: ["$$parts", 0] }, "ORD"] },
      { $ne: ["$$num", null] },
    ];
    if (nFrom.value !== undefined) checks.push({ $gte: ["$$num", nFrom.value] });
    if (nTo.value !== undefined) checks.push({ $lte: ["$$num", nTo.value] });
    conditions.push({
      $expr: {
        $let: {
          vars: { parts: { $split: ["$orderId", "-"] } },
          in: {
            $let: {
              vars: {
                num: {
                  $convert: {
                    input: { $arrayElemAt: ["$$parts", 2] },
                    to: "int",
                    onError: null,
                    onNull: null,
                  },
                },
              },
              in: { $and: checks },
            },
          },
        },
      },
    });
  }

  // Quick switches
  if (query.overdue === "1") {
    const today = dateStamp();
    const todayDay = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;
    conditions.push({
      expectedDeliveryDate: { $lt: new Date(`${todayDay}T00:00:00.000Z`) },
      status: { $nin: ["Delivered", "Cancelled"] },
    });
  }
  if (query.hasBalance === "1") conditions.push({ balance: { $gt: 0 } });
  if (query.noPhone === "1") {
    conditions.push({ $or: [{ phone: { $exists: false } }, { phone: "" }, { phone: null }] });
  }

  return { conditions };
};

module.exports = buildOrderFilters;
