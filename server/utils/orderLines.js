// The products on an order ("lines"): which product, how many, at what price.
// Used by create and edit. The name and size are copied from the product when
// the order is saved, so renaming or archiving a product later never changes
// an old order.
const mongoose = require("mongoose");
const Product = require("../models/Product");

const MAX_LINES = 20;
const MAX_QUANTITY = 1000000;
const MAX_NOTE = 40;

// Returns { lines } (ready to save) or { error: "message" }.
//   raw:      what the screen sent (an array)
//   shopId:   products must belong to this shop
//   seesAmounts: false = the price comes from the product / the old line,
//                never from the screen (that person may not see prices)
//   existing: the lines the order has now (editing)
const checkLines = async (raw, { shopId, seesAmounts, existing = [] }) => {
  if (!Array.isArray(raw)) return { error: "The products must be a list." };
  if (raw.length > MAX_LINES) return { error: `An order can have up to ${MAX_LINES} products.` };
  if (raw.length === 0) return { lines: [] };

  const ids = [];
  for (const line of raw) {
    if (!line || typeof line !== "object" || typeof line.product !== "string" || !mongoose.Types.ObjectId.isValid(line.product)) {
      return { error: "Please choose a product from the list." };
    }
    ids.push(line.product);
  }
  const products = await Product.find({ _id: { $in: ids }, shop: shopId }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const had = new Map(existing.map((l) => [String(l.product), l]));

  const lines = [];
  for (const line of raw) {
    const product = byId.get(line.product);
    if (!product) return { error: "That product was not found in your shop." };
    // An archived product cannot be newly added (an order that already has it keeps it)
    if (product.active === false && !had.has(line.product)) {
      return { error: `"${product.name}" is archived. Choose another product.` };
    }

    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
      return { error: "Quantity must be more than 0." };
    }
    if (Math.round(quantity * 1000) / 1000 !== quantity) {
      return { error: "Quantity can have up to 3 decimal places." };
    }

    let unitPrice;
    if (seesAmounts) {
      if (line.unitPrice !== undefined && line.unitPrice !== null && line.unitPrice !== "") {
        unitPrice = Number(line.unitPrice);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) return { error: "Price must be a number, not below 0." };
      }
    } else {
      unitPrice = had.get(line.product)?.unitPrice ?? product.price;
    }

    const note = line.note === undefined || line.note === null ? "" : String(line.note).replace(/\s+/g, " ").trim();
    if (note.length > MAX_NOTE) return { error: `The note is too long (${MAX_NOTE} letters at most).` };
    if (typeof line.note === "object" && line.note !== null) return { error: "The note must be text." };

    lines.push({
      product: product._id,
      name: product.name,
      sizeLabel: product.sizeLabel || "",
      unit: product.priceUnit || "piece",
      quantity,
      ...(unitPrice !== undefined ? { unitPrice } : {}),
      ...(note ? { note } : {}),
    });
  }
  return { lines };
};

// The Product text of an order that has products: "Chocolate Cake (1 kg), Greeting Card"
// (at most 200 letters, like the Product box). The quantity is shown next to it
// on screen, so it is not part of this text.
const lineItemText = (lines) => {
  const text = lines.map((l) => (l.sizeLabel ? `${l.name} (${l.sizeLabel})` : l.name)).join(", ");
  return text.length > 200 ? `${text.slice(0, 197)}...` : text;
};

module.exports = { checkLines, lineItemText, MAX_LINES };
