// Checks the money, status and date fields of an order before it is saved.
// Used by create, edit and Excel upload so all three follow the same rules.
const ORDER_STATUSES = require("../models/orderStatuses");

// "1,500", "₹ 1500" and 1500 all mean 1500. Empty means "not given".
// Returns { value } or { error: true } when it is not a number.
const parseAmount = (raw) => {
  if (raw === undefined || raw === null) return { value: undefined };
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? { value: raw } : { error: true };
  }
  if (typeof raw !== "string") return { error: true };

  const cleaned = raw.replace(/[,\s₹]/g, "");
  if (cleaned === "") return { value: undefined };
  const value = Number(cleaned);
  return Number.isFinite(value) ? { value } : { error: true };
};

// "2026-11-20", a full ISO date or an Excel date string -> Date (or undefined)
const parseDeliveryDate = (raw) => {
  if (raw === undefined || raw === null || raw === "") return { value: undefined };
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? { error: true } : { value: date };
};

const MAX_ADDRESS = 500;

// Longest text each field may hold (Excel can hand over numbers: those count as text)
const TEXT_LIMITS = [
  ["customerName", "Customer name", 100],
  ["item", "Item", 200],
  ["orderExecutive", "Order executive", 100],
];

// Phone: 10 digits, or with a country/zero prefix (+91, 91, 0). Spaces, dashes
// and brackets are allowed. Empty is allowed (old orders have no phone).
const phoneProblem = (raw) => {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" && typeof raw !== "number") return "Phone must be text or a number.";
  const digits = String(raw).trim().replace(/[\s\-()]/g, "").replace(/^\+/, "");
  if (digits === "") return null;
  if (!/^\d{10,13}$/.test(digits)) {
    return "Phone number must be 10 digits (a +91 or 0 in front is fine).";
  }
  return null;
};

// Returns { values } with clean numbers/balance, or { error: "message" }.
// `totalRequired`: create/edit need a total; Excel rows may leave it empty (0).
// `clearDate` is true when the date was sent empty on purpose (remove it).
const checkOrderInput = (input, { totalRequired = true } = {}) => {
  for (const [key, label, max] of TEXT_LIMITS) {
    const value = input[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "object") return { error: `${label} must be text.` };
    if (String(value).length > max) {
      return { error: `${label} is too long (${max} letters at most).` };
    }
  }
  const badPhone = phoneProblem(input.phone);
  if (badPhone) return { error: badPhone };

  if (input.address !== undefined && input.address !== null) {
    if (typeof input.address !== "string") return { error: "Address must be text." };
    if (input.address.length > MAX_ADDRESS) {
      return { error: `Address is too long (${MAX_ADDRESS} letters at most).` };
    }
  }

  const total = parseAmount(input.total);
  const advance = parseAmount(input.advance);
  const date = parseDeliveryDate(input.expectedDeliveryDate);

  if (total.error) return { error: "Total amount must be a number." };
  if (advance.error) return { error: "Advance must be a number." };
  if (date.error) return { error: "Expected delivery date is not a valid date." };

  if (total.value === undefined && totalRequired) {
    return { error: "Total amount is required." };
  }

  const totalValue = total.value ?? 0;
  const advanceValue = advance.value ?? 0;

  if (totalValue < 0) return { error: "Total amount cannot be negative." };
  if (advanceValue < 0) return { error: "Advance cannot be negative." };
  if (advanceValue > totalValue) {
    return { error: "Advance cannot be more than the total amount." };
  }

  if (input.status !== undefined && input.status !== "") {
    if (!ORDER_STATUSES.includes(input.status)) {
      return { error: `Status must be one of: ${ORDER_STATUSES.join(", ")}.` };
    }
  }

  return {
    values: {
      total: totalValue,
      advance: advanceValue,
      balance: totalValue - advanceValue, // always worked out here, never trusted from the client
      expectedDeliveryDate: date.value,
    },
    clearDate:
      date.value === undefined &&
      (input.expectedDeliveryDate === "" || input.expectedDeliveryDate === null),
  };
};

module.exports = { checkOrderInput, parseAmount };
