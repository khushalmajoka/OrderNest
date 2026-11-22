// The short names shown for each status, and what each one means.
// Only the NAME SHOWN on screen is shorter: the status saved on an order stays
// the same ("Ready to Dispatch/Pick-Up"), so nothing old is touched.
const CLOSED_OLD = "Closed (old)";

// The usual order of the statuses (first to last); the same as the filter list
export const STATUS_ORDER = [
  "Order Received",
  "Pending",
  "In Progress",
  "Completed",
  "Ready to Dispatch/Pick-Up",
  "Dispatched",
  "Delivered",
  "Cancelled",
  CLOSED_OLD,
];

export const STATUS_LABELS = {
  "Order Received": "Order Received",
  Pending: "Pending",
  "In Progress": "In Progress",
  Completed: "Completed",
  "Ready to Dispatch/Pick-Up": "Ready",
  Dispatched: "Dispatched",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
  [CLOSED_OLD]: "Closed (old)",
};

// The meaning, in plain words (shown on hover, in the status list and in Settings)
export const STATUS_HINTS = {
  "Order Received": "The order is taken. Work has not started yet.",
  Pending: "Waiting for something, for example the customer's reply or payment.",
  "In Progress": "You are making or preparing the order.",
  Completed: "The work is done. (Old status: use Ready instead.)",
  "Ready to Dispatch/Pick-Up": "The order is ready. Waiting to be sent, or for the customer to pick it up.",
  Dispatched: "The order has been sent to the customer and is on the way.",
  Delivered: "The customer has the order. Finished.",
  Cancelled: "The order will not happen. Finished.",
  [CLOSED_OLD]: "An old order closed by the admin, because nobody updated it. Finished.",
};

export const statusLabel = (status) => STATUS_LABELS[status] || status;
export const statusHint = (status) => STATUS_HINTS[status] || "";

// What a shop may switch off (the same list the server accepts)
export const HIDEABLE_STATUSES = ["Pending", "In Progress", "Completed", "Ready to Dispatch/Pick-Up", "Dispatched"];
// Switched off until the shop chooses otherwise
export const DEFAULT_HIDDEN_STATUSES = ["Pending", "Completed"];

export const hiddenStatusesOf = (shop) =>
  Array.isArray(shop?.hiddenStatuses) ? shop.hiddenStatuses : DEFAULT_HIDDEN_STATUSES;

// The statuses to OFFER when someone changes an order's status, in the usual
// order. A status the order already has is always included, so editing an old
// order never loses its status. Closed (old) is only for the admin.
export const offeredStatuses = (shop, { current, canCloseOld = false } = {}) => {
  const hidden = hiddenStatusesOf(shop);
  return STATUS_ORDER.filter((s) => {
    if (s === current) return true;
    if (s === CLOSED_OLD) return canCloseOld;
    return !hidden.includes(s);
  });
};
