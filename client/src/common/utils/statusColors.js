import { STATUSES } from "../../features/orders/utils/filters";

// Colours an order status can have. Full class names are written out (not
// built from text) so the styling tool keeps them.
export const COLOR_OPTIONS = {
  yellow: { label: "Yellow", row: "bg-yellow-50", strip: "border-l-yellow-400", badge: "bg-yellow-200 text-yellow-900", swatch: "bg-yellow-400" },
  orange: { label: "Orange", row: "bg-orange-100", strip: "border-l-orange-500", badge: "bg-orange-200 text-orange-900", swatch: "bg-orange-500" },
  red: { label: "Red", row: "bg-red-50", strip: "border-l-red-400", badge: "bg-red-200 text-red-900", swatch: "bg-red-500" },
  pink: { label: "Pink", row: "bg-pink-50", strip: "border-l-pink-400", badge: "bg-pink-200 text-pink-900", swatch: "bg-pink-400" },
  purple: { label: "Purple", row: "bg-purple-50", strip: "border-l-purple-400", badge: "bg-purple-200 text-purple-900", swatch: "bg-purple-500" },
  blue: { label: "Blue", row: "bg-blue-50", strip: "border-l-blue-400", badge: "bg-blue-200 text-blue-900", swatch: "bg-blue-500" },
  teal: { label: "Teal", row: "bg-teal-50", strip: "border-l-teal-400", badge: "bg-teal-200 text-teal-900", swatch: "bg-teal-500" },
  green: { label: "Green", row: "bg-green-50", strip: "border-l-green-500", badge: "bg-green-200 text-green-900", swatch: "bg-green-500" },
  gray: { label: "Grey", row: "bg-gray-100", strip: "border-l-gray-400", badge: "bg-gray-200 text-gray-800", swatch: "bg-gray-500" },
};

// Used until the shop owner changes something in Settings
export const DEFAULT_STATUS_COLORS = {
  "Order Received": { enabled: true, color: "blue" },
  Pending: { enabled: true, color: "yellow" },
  "In Progress": { enabled: true, color: "orange" },
  Completed: { enabled: true, color: "teal" },
  "Ready to Dispatch/Pick-Up": { enabled: true, color: "purple" },
  Dispatched: { enabled: true, color: "pink" },
  Delivered: { enabled: true, color: "green" },
  Cancelled: { enabled: true, color: "red" },
};

// The shop's choice for every status (saved choice, else the default)
export const resolveStatusColors = (shop) =>
  Object.fromEntries(
    STATUSES.map((status) => [
      status,
      shop?.statusColors?.[status] || DEFAULT_STATUS_COLORS[status],
    ])
  );

// Classes for an order's status, or null when the owner switched it off
export const getStatusStyle = (shop, status) => {
  const choice = shop?.statusColors?.[status] || DEFAULT_STATUS_COLORS[status];
  if (!choice || !choice.enabled) return null;
  return COLOR_OPTIONS[choice.color] || null;
};
