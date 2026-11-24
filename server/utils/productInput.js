// Checks and cleans what is sent for a product (the server never trusts the screen).
const WEIGHT_UNITS = ["kg", "g"];
const DIM_UNITS = ["cm", "inch", "ft"];
const PRICE_UNITS = ["piece", "kg", "g", "sq ft", "sq inch", "sq m", "metre", "foot", "dozen", "set", "box"];
const MAX_NUMBER = 1000000;

const text = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// a positive number, or null
const positive = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_NUMBER) return null;
  return Math.round(n * 1000) / 1000;
};

const show = (n) => String(n);

// Returns { error } or { values } (name, size, sizeLabel, price, priceUnit, notes, nameKey).
// `partial`: only the fields that are present are checked (for edits).
const checkProductInput = (input = {}, { existing } = {}) => {
  const name = text(input.name ?? existing?.name, 100);
  if (!name) return { error: "Please enter the product name." };

  // ---- size ----
  const sizeIn = input.size ?? existing?.size ?? { kind: "none" };
  const kind = ["none", "weight", "dimensions", "text"].includes(sizeIn.kind) ? sizeIn.kind : "none";
  let size = { kind: "none" };
  let sizeLabel = "";
  if (kind === "weight") {
    const weight = positive(sizeIn.weight);
    if (!weight) return { error: "Please enter the weight as a number above 0." };
    const weightUnit = WEIGHT_UNITS.includes(sizeIn.weightUnit) ? sizeIn.weightUnit : "kg";
    size = { kind, weight, weightUnit };
    sizeLabel = `${show(weight)} ${weightUnit}`;
  } else if (kind === "dimensions") {
    const typedLength = positive(sizeIn.length);
    const typedBreadth = positive(sizeIn.breadth);
    // 8 x 10 and 10 x 8 are the same size: it is always kept with the smaller number first
    const length = typedLength && typedBreadth ? Math.min(typedLength, typedBreadth) : typedLength;
    const breadth = typedLength && typedBreadth ? Math.max(typedLength, typedBreadth) : typedBreadth;
    const height = positive(sizeIn.height);
    if (!length || !breadth) return { error: "Please enter the length and the breadth as numbers above 0." };
    if (sizeIn.height !== "" && sizeIn.height != null && !height) {
      return { error: "The height must be a number above 0 (or leave it empty)." };
    }
    const dimUnit = DIM_UNITS.includes(sizeIn.dimUnit) ? sizeIn.dimUnit : "inch";
    size = { kind, length, breadth, ...(height ? { height } : {}), dimUnit };
    sizeLabel = `${[length, breadth, height].filter(Boolean).map(show).join(" x ")} ${dimUnit}`;
  } else if (kind === "text") {
    const label = text(sizeIn.text, 60);
    if (!label) return { error: "Please write the size, or choose No size." };
    size = { kind, text: label };
    sizeLabel = label;
  }

  // ---- price ----
  let price = input.price !== undefined ? input.price : existing?.price;
  if (price === "" || price === null) price = undefined;
  if (price !== undefined) {
    price = Number(price);
    if (!Number.isFinite(price) || price < 0 || price > MAX_NUMBER) {
      return { error: "The price must be a number, 0 or more." };
    }
    price = Math.round(price * 100) / 100;
  }
  const priceUnit = input.priceUnit !== undefined ? input.priceUnit : existing?.priceUnit || "piece";
  if (!PRICE_UNITS.includes(priceUnit)) return { error: "Please choose what the price is for (per piece, per kg, ...)." };

  const notes = text(input.notes !== undefined ? input.notes : existing?.notes, 300);

  return {
    values: {
      name,
      size,
      sizeLabel,
      price,
      priceUnit,
      notes,
      nameKey: `${name.toLowerCase()}|${sizeLabel.toLowerCase()}`,
    },
  };
};

module.exports = { checkProductInput, PRICE_UNITS };
