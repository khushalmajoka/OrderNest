// What one request changed in a database: added, removed and changed records.
// Comparing changes (not just the end state) shows, for example, whether
// "updatedAt" moved when it should not have.
const { normalizeBson } = require("./normalize");
const { need, sleep } = require("./env");

const { BSON } = need("mongodb");
const COLLECTIONS = ["users", "shops", "orders", "categories", "productfamilies", "products", "productimages", "activities", "usagecounts"];

const read = async (db) => {
  const state = new Map();
  for (const name of COLLECTIONS) {
    const docs = await db.collection(name).find({}, { promoteValues: false }).sort({ _id: 1 }).toArray();
    for (const doc of docs) state.set(`${name}/${doc._id.toHexString()}`, { name, doc, key: BSON.EJSON.stringify(doc, { relaxed: false }) });
  }
  return state;
};

const fingerprintOf = (state) => [...state.values()].map((s) => s.key).join("\n");

// The server writes some things after it has answered (history lines, usage
// counts), so wait until the database stops changing.
const readWhenQuiet = async (db) => {
  await sleep(80);
  let state = await read(db);
  for (let i = 0; i < 30; i++) {
    await sleep(60);
    const again = await read(db);
    if (fingerprintOf(again) === fingerprintOf(state)) return again;
    state = again;
  }
  return state;
};

const flatten = (value, prefix, out) => {
  const plain = value && typeof value === "object" && !Array.isArray(value) && !value._bsontype && !(value instanceof Date);
  if (!plain || !Object.keys(value).length) {
    out.set(prefix, value);
    return out;
  }
  for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
};

const raw = (v) => BSON.EJSON.stringify({ v }, { relaxed: false });

// Records made at the same moment can be saved in either order: sort them by
// what is in them (ids blanked, field names in order) before labelling them.
const shape = (entry) => JSON.stringify(normalizeBson(entry.doc, () => "ID"));

const changes = (before, after, label) => {
  const out = [];
  const order = (a, b) => COLLECTIONS.indexOf(a.name) - COLLECTIONS.indexOf(b.name) || shape(a).localeCompare(shape(b));

  const added = [...after].filter(([k]) => !before.has(k)).map(([, v]) => v).sort(order);
  for (const { name, doc } of added) out.push({ added: name, record: normalizeBson(doc, label) });

  const removed = [...before].filter(([k]) => !after.has(k)).map(([, v]) => v).sort(order);
  for (const { name, doc } of removed) out.push({ removed: name, id: normalizeBson(doc._id, label) });

  for (const [k, now] of after) {
    const was = before.get(k);
    if (!was || was.key === now.key) continue;
    const a = flatten(was.doc, "", new Map());
    const b = flatten(now.doc, "", new Map());
    const fields = {};
    for (const path of [...new Set([...a.keys(), ...b.keys()])].sort()) {
      if (a.has(path) && b.has(path) && raw(a.get(path)) === raw(b.get(path))) continue;
      const shown = path.replace(/[a-f0-9]{24}/g, (id) => label("id", id));
      fields[shown] = b.has(path) ? normalizeBson(b.get(path), label, path.split(".").pop()) : "(removed)";
    }
    out.push({ changed: now.name, id: normalizeBson(now.doc._id, label), fields });
  }
  return out;
};

module.exports = { readWhenQuiet, read, changes };
