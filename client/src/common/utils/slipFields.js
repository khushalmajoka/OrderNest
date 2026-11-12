// The parts of a delivery slip, and what is printed until the admin changes it.
export const SLIP_GROUPS = [
  {
    title: "Shop (top of the slip)",
    fields: [
      { key: "logo", label: "Shop logo" },
      { key: "shopName", label: "Shop name" },
      { key: "shopPhone", label: "Shop phone" },
      { key: "shopAddress", label: "Shop address" },
    ],
  },
  {
    title: "Order",
    fields: [
      { key: "orderId", label: "Order ID" },
      { key: "item", label: "Item" },
      { key: "expectedDelivery", label: "Expected delivery date" },
      { key: "orderDate", label: "Order date" },
      { key: "executive", label: "Order executive" },
    ],
  },
  {
    title: "Deliver to (customer)",
    fields: [
      { key: "customerName", label: "Customer name" },
      { key: "customerPhone", label: "Customer phone" },
      { key: "deliveryAddress", label: "Delivery address" },
    ],
  },
  {
    title: "Money",
    fields: [
      { key: "amount", label: "Amount to collect (or PAID)" },
      { key: "totals", label: "Total and advance paid line" },
    ],
  },
];

export const SLIP_FIELDS = SLIP_GROUPS.flatMap((group) => group.fields);

export const DEFAULT_SLIP_FIELDS = Object.fromEntries(
  SLIP_FIELDS.map((field) => [field.key, field.key !== "orderDate"])
);

// The shop's choice for every part (saved choice, else the default) and note
export const resolveSlip = (shop) => ({
  fields: Object.fromEntries(
    SLIP_FIELDS.map((field) => [
      field.key,
      typeof shop?.slipFields?.[field.key] === "boolean"
        ? shop.slipFields[field.key]
        : DEFAULT_SLIP_FIELDS[field.key],
    ])
  ),
  note: shop?.slipNote || "",
});
