// The choices in the product form (the server checks the same lists).
export const WEIGHT_UNITS = ["kg", "g"];
export const DIM_UNITS = [
  { value: "cm", label: "cm" },
  { value: "inch", label: "inches" },
  { value: "ft", label: "feet" },
];
export const PRICE_UNITS = [
  { value: "piece", label: "per piece" },
  { value: "kg", label: "per kg" },
  { value: "g", label: "per g" },
  { value: "sq ft", label: "per sq ft" },
  { value: "sq inch", label: "per sq inch" },
  { value: "sq m", label: "per sq m" },
  { value: "metre", label: "per metre" },
  { value: "foot", label: "per foot" },
  { value: "dozen", label: "per dozen" },
  { value: "set", label: "per set" },
  { value: "box", label: "per box" },
];
export const SIZE_KINDS = [
  { value: "none", label: "No size" },
  { value: "weight", label: "Weight (kg, g)" },
  { value: "dimensions", label: "Length x breadth" },
  { value: "text", label: "Other (write it)" },
];

export const priceText = (product) =>
  product.price === undefined || product.price === null
    ? ""
    : `₹${Number(product.price).toLocaleString("en-IN")} per ${product.priceUnit || "piece"}`;

// "Chocolate Cake (1 kg)": the text put in an order's Product box
export const productLabel = (product) =>
  product.sizeLabel ? `${product.name} (${product.sizeLabel})` : product.name;

// What the quantity counts: nothing extra for pieces, else the price unit ("kg", "sq ft")
export const quantityUnit = (unit) => (!unit || unit === "piece" ? "" : unit);

// "2" or "2.5 kg"
export const quantityText = (quantity, unit) => `${quantity}${quantityUnit(unit) ? ` ${quantityUnit(unit)}` : ""}`;

// price x quantity, rounded to paise, as text for the Total box ("" when unknown)
export const totalFor = (price, quantity) => {
  const p = Number(price);
  const q = Number(quantity);
  if (price === undefined || price === null || price === "" || !Number.isFinite(p) || !Number.isFinite(q) || q <= 0) return "";
  return String(Math.round(p * q * 100) / 100);
};

// How many of the product an order has: "2", "2.5 kg", or "" when the order has none picked
export const orderQuantity = (order) => {
  const line = order?.lines?.[0];
  return line && Number(line.quantity) > 0 ? quantityText(line.quantity, line.unit) : "";
};

// "Chocolate Cake (1 kg)" for one line of an order (name and size copied at save time)
export const lineLabel = (line) => (line.sizeLabel ? `${line.name} (${line.sizeLabel})` : line.name);

// The products of an order as [{ label, qty }] (empty for an order typed by hand)
export const orderLineTexts = (order) =>
  (order?.lines || []).map((l) => ({ label: lineLabel(l), qty: quantityText(l.quantity, l.unit), note: String(l.note || "").trim() }));

// Total of the lines being edited: "" when any line has no price (then nothing can be worked out)
export const linesTotal = (lines) => {
  if (!lines.length) return "";
  let sum = 0;
  for (const l of lines) {
    const t = totalFor(l.product.price, l.quantity);
    if (t === "") return "";
    sum += Number(t);
  }
  return String(Math.round(sum * 100) / 100);
};
