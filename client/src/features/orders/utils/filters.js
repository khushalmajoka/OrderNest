// Order filters: what the filter window holds, how it is sent to the server,
// and how it is shown as removable chips.

export const STATUSES = [
  "Order Received",
  "Pending",
  "In Progress",
  "Completed",
  "Ready to Dispatch/Pick-Up",
  "Dispatched",
  "Delivered",
  "Cancelled",
];

export const EMPTY_FILTERS = {
  status: [],
  overdue: false,
  hasBalance: false,
  noPhone: false,
  totalMin: "",
  totalMax: "",
  advanceMin: "",
  advanceMax: "",
  balanceMin: "",
  balanceMax: "",
  deliveryFrom: "",
  deliveryTo: "",
  createdFrom: "",
  createdTo: "",
  customer: "",
  item: "",
  phone: "",
  executive: "",
  orderId: "",
  orderNoFrom: "",
  orderNoTo: "",
};

// Query-string values for the server (only what is actually set)
export const filtersToParams = (filters) => {
  const params = {};
  for (const [key, value] of Object.entries(filters)) {
    if (key === "status") {
      if (value.length) params.status = value.join(",");
    } else if (typeof value === "boolean") {
      if (value) params[key] = "1";
    } else if (String(value).trim() !== "") {
      params[key] = String(value).trim();
    }
  }
  return params;
};

export const countActiveFilters = (filters) =>
  Object.keys(filtersToParams(filters)).length;

const range = (name, from, to, prefix = "") => {
  if (from && to) return `${name}: ${prefix}${from} to ${prefix}${to}`;
  if (from) return `${name}: from ${prefix}${from}`;
  return `${name}: up to ${prefix}${to}`;
};

const niceDate = (value) => {
  const [y, m, d] = value.split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
};

// One chip per filter: { id, label, clear: partial filters that switches it off }
export const filterChips = (f) => {
  const chips = [];
  if (f.status.length) {
    chips.push({ id: "status", label: `Status: ${f.status.join(", ")}`, clear: { status: [] } });
  }
  if (f.overdue) chips.push({ id: "overdue", label: "Overdue", clear: { overdue: false } });
  if (f.hasBalance) chips.push({ id: "hasBalance", label: "Balance due", clear: { hasBalance: false } });
  if (f.noPhone) chips.push({ id: "noPhone", label: "No phone number", clear: { noPhone: false } });

  for (const [id, name] of [["total", "Total"], ["advance", "Advance"], ["balance", "Balance"]]) {
    const min = String(f[`${id}Min`]).trim();
    const max = String(f[`${id}Max`]).trim();
    if (min || max) {
      chips.push({ id, label: range(name, min, max, "₹"), clear: { [`${id}Min`]: "", [`${id}Max`]: "" } });
    }
  }

  if (f.deliveryFrom || f.deliveryTo) {
    chips.push({
      id: "delivery",
      label: range("Delivery", f.deliveryFrom && niceDate(f.deliveryFrom), f.deliveryTo && niceDate(f.deliveryTo)),
      clear: { deliveryFrom: "", deliveryTo: "" },
    });
  }
  if (f.createdFrom || f.createdTo) {
    chips.push({
      id: "created",
      label: range("Created", f.createdFrom && niceDate(f.createdFrom), f.createdTo && niceDate(f.createdTo)),
      clear: { createdFrom: "", createdTo: "" },
    });
  }
  if (String(f.orderNoFrom).trim() || String(f.orderNoTo).trim()) {
    chips.push({
      id: "orderNo",
      label: range("Order no.", String(f.orderNoFrom).trim(), String(f.orderNoTo).trim()),
      clear: { orderNoFrom: "", orderNoTo: "" },
    });
  }

  for (const [id, name] of [["customer", "Customer"], ["item", "Product"], ["phone", "Phone"], ["executive", "Executive"], ["orderId", "Order ID"]]) {
    if (String(f[id]).trim()) chips.push({ id, label: `${name}: ${String(f[id]).trim()}`, clear: { [id]: "" } });
  }
  return chips;
};
