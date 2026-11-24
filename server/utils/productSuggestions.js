// "Build the product list from old orders": reads the Product text of the
// shop's orders and splits it into a product NAME, a SIZE and a QUANTITY, so
// "12 by 18 frame", "Frame 12x18" and "FRAME (12-18)" all become the product
// "Frame" with the size "12 x 18 inch". Only reads; nothing is saved here.

const N = "\\d+(?:\\.\\d+)?";
const SEP = "(?:x|×|\\*|by|-|–)";
// 12x18, 12 by 18, 12-18, 12 X 18 x 2 (optionally followed by a unit)
const DIMENSIONS = new RegExp(`(?<![\\p{Nd}.])(${N})\\s*${SEP}\\s*(${N})(?:\\s*${SEP}\\s*(${N}))?(?:\\s*(inches|inch|in|cm|feet|foot|ft)\\b)?(?![\\p{Nd}])`, "iu");
const WEIGHT = new RegExp(`(?<![\\p{Nd}.])(${N})\\s*(kgs?|kilos?|grams?|gms?|g)\\b`, "iu");
// "5 pcs", "5 pic", "5 pieces", "5 nos"
const PIECES = new RegExp(`(?<![\\p{Nd}.])(\\d+)\\s*(?:pcs|pc|pics|pic|pieces|piece|nos)\\b\\.?`, "iu");

// Words that stay in capitals ("LED frame")
const KEEP_UPPER = new Set(["LED", "MDF", "PVC", "UV", "ABS", "RGB", "DIY", "USB", "3D", "A3", "A4", "A5", "PET", "HD"]);
// Little words that add nothing to a product name ("18 by 11 ka frame", "size 12x18")
const NOISE = new Set(["ka", "ke", "ki", "size", "sz"]);
const EDGE_WORDS = new Set(["of", "for", "and", "with"]);

const unitOf = (raw) => {
  const u = String(raw || "").toLowerCase();
  if (u === "cm") return "cm";
  if (["ft", "feet", "foot"].includes(u)) return "ft";
  return "inch"; // frames and prints: inches unless it says otherwise
};
const numberText = (value) => String(Number(value));

const titleCase = (text) =>
  text
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => {
          if (!part) return part;
          if (KEEP_UPPER.has(part.toUpperCase())) return part.toUpperCase();
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("-")
    )
    .join(" ");

// One product written in a piece of text -> { name, size, sizeLabel, quantity } or null
const parsePart = (text) => {
  let rest = String(text ?? "");
  let size = { kind: "none" };
  let sizeLabel = "";

  const dim = rest.match(DIMENSIONS);
  if (dim && Number(dim[1]) > 0 && Number(dim[2]) > 0) {
    const nums = [dim[1], dim[2], dim[3]].filter(Boolean).map(numberText);
    const dimUnit = unitOf(dim[4]);
    size = { kind: "dimensions", length: Number(nums[0]), breadth: Number(nums[1]), ...(nums[2] ? { height: Number(nums[2]) } : {}), dimUnit };
    sizeLabel = `${nums.join(" x ")} ${dimUnit}`;
    rest = rest.replace(dim[0], " ");
  } else {
    const weight = rest.match(WEIGHT);
    if (weight && Number(weight[1]) > 0) {
      const weightUnit = /^k/i.test(weight[2]) ? "kg" : "g";
      size = { kind: "weight", weight: Number(weight[1]), weightUnit };
      sizeLabel = `${numberText(weight[1])} ${weightUnit}`;
      rest = rest.replace(weight[0], " ");
    }
  }

  // How many (not part of the product): "5 pcs", or a number in front: "4 sachet"
  let quantity = null;
  const pieces = rest.match(PIECES);
  if (pieces) {
    quantity = Number(pieces[1]);
    rest = rest.replace(pieces[0], " ");
  }
  rest = rest.replace(/[()[\]{}]/g, " ").replace(/\s+/g, " ").trim();
  const leading = rest.match(/^(\d{1,5})\s+(?=\p{L})/u);
  if (leading) {
    if (quantity === null) quantity = Number(leading[1]);
    rest = rest.slice(leading[0].length);
  }

  // tidy the name
  let words = rest
    .replace(/[,:;/\\|]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w.toLowerCase()));
  const edge = /^[-–.\s]+|[-–.\s]+$/g;
  words = words.map((w) => w.replace(edge, "")).filter(Boolean);
  while (words.length && EDGE_WORDS.has(words[0].toLowerCase())) words.shift();
  while (words.length && EDGE_WORDS.has(words[words.length - 1].toLowerCase())) words.pop();
  const name = titleCase(words.join(" ")).slice(0, 100).trim();
  if (name.length < 2 || !/\p{L}{2}/u.test(name)) return null;

  return { name, size, sizeLabel, quantity };
};

// The text of an order -> its products ("Frame 12x18 + Resin 8x11" is two)
const parseItem = (item) => {
  const text = String(item ?? "");
  const pieces = text.split("+");
  const parts = pieces.map(parsePart).filter(Boolean);
  return parts.map((p) => ({ ...p, multi: pieces.length > 1 }));
};

const keyOf = (name, sizeLabel) => `${name.toLowerCase()}|${String(sizeLabel || "").toLowerCase()}`;

const MAX_SUGGESTIONS = 300;

// orders: [{ item, total, lines? }]; existingKeys: Set of the nameKey of products already in the list
// Returns { suggestions: [{ name, size, sizeLabel, count, usualPrice, usualCount }], groups, orders, alreadyInList }
//   `min` = how many orders must have it (2 = ignore one-off typos)
//   usualPrice = the price of ONE piece most of those orders had (total / quantity)
const suggestProducts = (orders, existingKeys, { min = 2, withPrices = true } = {}) => {
  const groups = new Map();
  const known = new Set();
  for (const order of orders) {
    if (Array.isArray(order.lines) && order.lines.length) continue; // already built from the list
    for (const part of parseItem(order.item)) {
      const key = keyOf(part.name, part.sizeLabel);
      if (existingKeys.has(key)) {
        known.add(key);
        continue;
      }
      let g = groups.get(key);
      if (!g) {
        g = { key, name: part.name, size: part.size, sizeLabel: part.sizeLabel, count: 0, prices: new Map() };
        groups.set(key, g);
      }
      g.count += 1;
      const total = Number(order.total);
      if (!part.multi && Number.isFinite(total) && total > 0) {
        const unit = Math.round((part.quantity ? total / part.quantity : total) * 100) / 100;
        if (unit > 0) g.prices.set(unit, (g.prices.get(unit) || 0) + 1);
      }
    }
  }

  const best = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const all = [...groups.values()].filter((g) => g.count >= min).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const suggestions = all.slice(0, MAX_SUGGESTIONS).map((g) => {
    const top = withPrices && g.prices.size ? best(g.prices) : null;
    return { name: g.name, size: g.size, sizeLabel: g.sizeLabel, count: g.count, ...(top ? { usualPrice: top[0], usualCount: top[1] } : {}) };
  });
  return { suggestions, groups: all.length, orders: all.reduce((sum, g) => sum + g.count, 0), alreadyInList: known.size };
};

module.exports = { parseItem, parsePart, suggestProducts, MAX_SUGGESTIONS };
