// "Build the product list from old orders": reads the Product text of the
// shop's orders and groups the same product written in slightly different ways
// ("Choc cake 1 kg", "choc cake 1kg"). Only reads; nothing is saved here.

// The key two spellings share: lower case, no punctuation, one space, "1 kg" = "1kg"
const normalize = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{Nd}\s.]/gu, " ")
    .replace(/(?<!\d)\.|\.(?!\d)/g, " ") // a dot only stays inside a number (2.5)
    .replace(/(\d)\s+(kg|g|gm|ml|l|ltr|pcs|pc|cm|inch|ft)\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();

const clean = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// Not worth suggesting: too short, or only numbers/punctuation
const isJunk = (key) => key.length < 2 || !/\p{L}/u.test(key);

const MAX_SUGGESTIONS = 300;

// orders: [{ item, total }]; existingKeys: Set of normalize(name / name (size)) of products already in the list
// Returns { suggestions: [{ name, count, usualTotal, usualCount }], groups, orders }
//   `min` = how many orders must have it (2 = ignore one-off typos)
const suggestProducts = (orders, existingKeys, { min = 2, withTotals = true } = {}) => {
  const groups = new Map();
  for (const order of orders) {
    const key = normalize(order.item);
    if (isJunk(key) || existingKeys.has(key)) continue;
    let g = groups.get(key);
    if (!g) {
      g = { key, count: 0, spellings: new Map(), totals: new Map() };
      groups.set(key, g);
    }
    g.count += 1;
    const spelling = clean(order.item).slice(0, 100);
    g.spellings.set(spelling, (g.spellings.get(spelling) || 0) + 1);
    const total = Number(order.total);
    if (Number.isFinite(total) && total > 0) g.totals.set(total, (g.totals.get(total) || 0) + 1);
  }

  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0];
  const all = [...groups.values()].filter((g) => g.count >= min).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const suggestions = all.slice(0, MAX_SUGGESTIONS).map((g) => {
    const [name] = top(g.spellings);
    const best = withTotals && g.totals.size ? top(g.totals) : null;
    return { name, count: g.count, ...(best ? { usualTotal: best[0], usualCount: best[1] } : {}) };
  });
  return { suggestions, groups: all.length, orders: all.reduce((sum, g) => sum + g.count, 0) };
};

module.exports = { normalize, suggestProducts, MAX_SUGGESTIONS };
