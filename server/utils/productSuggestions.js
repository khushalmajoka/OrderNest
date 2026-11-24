// "Build the product list from old orders": reads the Product text of the
// shop's orders and splits it into a product NAME, a SIZE and a QUANTITY, so
// "12 by 18 frame", "Frame 12x18" and "FRAME (12-18)" all become the product
// "Frame" with the size "12 x 18 inch". Only reads; nothing is saved here.

const N = "\\d+(?:\\.\\d+)?";
const SEP = "(?:x|×|\\*|by|-|–)";
// 12x18, 12 by 18, 12-18, 12 X 18 x 2 (optionally followed by a unit)
const DIMENSIONS = new RegExp(`(?<![\\p{Nd}.])(${N})\\s*${SEP}\\s*(${N})(?:\\s*${SEP}\\s*(${N}))?(?:\\s*(inches|inch|in|cm|feet|foot|ft)\\b)?(?![\\p{Nd}])`, "iu");
const WEIGHT = new RegExp(`(?<![\\p{Nd}.])(${N})\\s*(kgs?|kilos?|grams?|gms?|g)\\b`, "iu");
// 12 18 (two numbers with only a space: "frame 12 18" is a frame of size 12 x 18)
const SPACE_DIMENSIONS = new RegExp(`(?<![\\p{Nd}.])(\\d{1,3}(?:\\.\\d+)?)\\s+(\\d{1,3}(?:\\.\\d+)?)(?![\\p{Nd}.])(?!\\s*(?:pcs|pc|pics|pic|pieces|piece|nos|kgs?|kilos?|grams?|gms?|g)\\b)(?:\\s*(inches|inch|in|cm|feet|foot|ft)\\b)?`, "iu");
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

// "Frames" -> "Frame", "Boxes" -> "Box": the product is written once, and the
// quantity says how many. Only the last word, and only when it is clearly a plural.
const KEEP_PLURAL = new Set(["glass", "dress", "canvas", "gas", "bus", "plus", "lens", "pants", "scissors", "jeans", "clothes", "series", "news", "tennis"]);
const singular = (word) => {
  const w = word.toLowerCase();
  if (w.length < 4 || KEEP_PLURAL.has(w) || !w.endsWith("s") || /(ss|us|is|ous)$/.test(w)) return word;
  if (/(xes|ches|shes|sses|zes)$/.test(w)) return word.slice(0, -2);
  if (/ies$/.test(w)) return word; // candies / cookies: not clear enough, left as written
  return word.slice(0, -1);
};
const singularName = (name) => {
  const words = name.split(" ");
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(" ");
};

// One product written in a piece of text -> { name, size, sizeLabel, quantity } or null
const parsePart = (text) => {
  let rest = String(text ?? "");
  let size = { kind: "none" };
  let sizeLabel = "";
  let written = "";

  let threeQuantity = null;
  let dim = rest.match(DIMENSIONS);
  if (!dim || !(Number(dim[1]) > 0 && Number(dim[2]) > 0)) {
    // only a space between the two numbers (a number in front of them, as in "5 12 18 frame", is too unclear to read)
    // three numbers in a row ("5 12 18 frame"): the first is how many, the last two are the size
    const three = rest.match(/(?<![\p{Nd}.])(\d{1,3})\s+(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)(?![\p{Nd}.])/u);
    if (three && Number(three[2]) > 0 && Number(three[3]) > 0) {
      threeQuantity = Number(three[1]);
      dim = [three[0], three[2], three[3], undefined, undefined];
    } else {
      const spaced = rest.match(SPACE_DIMENSIONS);
      dim = spaced && Number(spaced[1]) > 0 && Number(spaced[2]) > 0 ? [spaced[0], spaced[1], spaced[2], undefined, spaced[3]] : null;
    }
  }
  if (dim) {
    const nums = [dim[1], dim[2], dim[3]].filter(Boolean).map(numberText);
    const dimUnit = unitOf(dim[4]);
    // 8 x 10 and 10 x 8 are one size: the smaller number first (how it was typed is kept in `written`)
    const first = Math.min(Number(nums[0]), Number(nums[1]));
    const second = Math.max(Number(nums[0]), Number(nums[1]));
    size = { kind: "dimensions", length: first, breadth: second, ...(nums[2] ? { height: Number(nums[2]) } : {}), dimUnit };
    sizeLabel = `${[first, second, nums[2]].filter((n) => n !== undefined).map(numberText).join(" x ")} ${dimUnit}`;
    written = `${nums.join(" x ")} ${dimUnit}`;
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
  let quantity = threeQuantity;
  const pieces = rest.match(PIECES);
  if (pieces) {
    if (quantity === null) quantity = Number(pieces[1]);
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
  const name = singularName(titleCase(words.join(" "))).slice(0, 100).trim();
  if (name.length < 2 || !/\p{L}{2}/u.test(name)) return null;

  return { name, size, sizeLabel, written, quantity };
};

// The text of an order -> its products ("Frame 12x18 + Resin 8x11" is two)
const parseItem = (item) => {
  const text = String(item ?? "");
  const pieces = text.split("+");
  const parts = pieces.map(parsePart).filter(Boolean);
  return parts.map((p) => ({ ...p, multi: pieces.length > 1 }));
};

// name + size as one key. The name is compared the same way new suggestions are
// written (capitals and a plural "s" do not matter), so "Frames" in the list and "frame" in an old order are the same product.
const keyOf = (name, sizeLabel) => `${singularName(titleCase(String(name).replace(/\s+/g, " ").trim())).toLowerCase()}|${String(sizeLabel || "").toLowerCase()}`;

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
        g = { key, name: part.name, size: part.size, sizeLabel: part.sizeLabel, count: 0, prices: new Map(), written: new Map() };
        groups.set(key, g);
      }
      g.count += 1;
      if (part.written) g.written.set(part.written, (g.written.get(part.written) || 0) + 1);
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
    // how the size was typed in the orders, when it was typed both ways (8 x 10 and 10 x 8)
    const writtenAs = g.written.size > 1 ? [...g.written.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })) : undefined;
    return { name: g.name, size: g.size, sizeLabel: g.sizeLabel, count: g.count, ...(writtenAs ? { writtenAs } : {}), ...(top ? { usualPrice: top[0], usualCount: top[1] } : {}) };
  });
  return { suggestions, groups: all.length, orders: all.reduce((sum, g) => sum + g.count, 0), alreadyInList: known.size };
};

// The size of a saved product with the smaller number first ("18 x 12 inch" -> "12 x 18 inch").
// Products made before this rule may still be written the other way round.
const sizeLabelOf = (product) => {
  const size = product.size;
  if (size && size.kind === "dimensions" && size.length > size.breadth) {
    const nums = [size.breadth, size.length, size.height].filter((n) => n !== undefined && n !== null);
    return `${nums.map(numberText).join(" x ")} ${size.dimUnit}`;
  }
  return product.sizeLabel || "";
};

module.exports = { parseItem, parsePart, suggestProducts, keyOf, sizeLabelOf, MAX_SUGGESTIONS };
