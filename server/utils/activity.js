// Writes lines of the Activity history. Logging never slows down or breaks
// the action itself: a failure is only printed in the server log.
const Activity = require("../models/Activity");

// Needs req.account (from loadUser). The shop comes from req.shop when it is
// loaded, else from the account (staff "about myself" routes).
const logActivity = (req, { kind, action, targetLabel, summary, changes = [] }) => {
  const account = req.account;
  const shop = req.shop?._id || account.shopId;
  if (!shop) return;

  Activity.create({
    shop,
    actor: {
      id: account.id,
      name: account.name,
      username: account.username,
      role: account.role,
    },
    kind,
    action,
    targetLabel,
    summary: String(summary).slice(0, 500),
    changes: changes.map((c) => ({
      field: c.field,
      from: String(c.from ?? "").slice(0, 200),
      to: String(c.to ?? "").slice(0, 200),
    })),
  }).catch((err) => console.error("Could not write the activity:", err.message));
};

const money = (value) => `₹${Number(value) || 0}`;
const showDay = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

// The order fields an edit can change, how to compare them, and how to show them
const ORDER_FIELDS = [
  { key: "customerName", label: "Customer", read: (v) => String(v ?? "").trim() },
  { key: "phone", label: "Phone", read: (v) => String(v ?? "").trim() },
  { key: "address", label: "Address", read: (v) => String(v ?? "").trim() },
  { key: "item", label: "Product", read: (v) => String(v ?? "").trim() },
  { key: "total", label: "Total", read: (v) => Number(v) || 0, show: money },
  { key: "advance", label: "Advance", read: (v) => Number(v) || 0, show: money },
  { key: "status", label: "Status", read: (v) => String(v ?? "") },
  { key: "orderExecutive", label: "Executive", read: (v) => String(v ?? "").trim() },
  {
    key: "expectedDeliveryDate",
    label: "Delivery date",
    read: (v) => (v ? new Date(v).toISOString().slice(0, 10) : ""),
    show: showDay,
  },
];

// What changed between two versions of an order (empty list = nothing changed)
const diffOrder = (before, after) =>
  ORDER_FIELDS.flatMap((field) => {
    const from = field.read(before[field.key]);
    const to = field.read(after[field.key]);
    if (from === to) return [];
    const show = field.show || ((v) => v);
    return [{ field: field.label, from: show(from) || "(empty)", to: show(to) || "(empty)" }];
  });

module.exports = { logActivity, diffOrder, money };
