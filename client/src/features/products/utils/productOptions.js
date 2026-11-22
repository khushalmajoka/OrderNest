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
