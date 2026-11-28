// Two servers can never produce the same ids, times, tokens or password
// fingerprints. This turns those into labels ("id#3", "<now>") so that only
// real differences are left. Everything else must match exactly, including
// number formats in answers (8 is not 8.0) and number types in the database.
const crypto = require("crypto");

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
// times the server works out from "now": code expiry, approval, "Not yet", sessions
const LATER = [
  ["10m", 10 * MINUTE],
  ["24h", 24 * HOUR],
  ["3d", 72 * HOUR],
];

const OBJECT_ID = /\b[a-f0-9]{24}\b/g;
const JWT = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const BCRYPT = /^\$2[aby]\$(\d\d)\$[./A-Za-z0-9]{53}$/;
const SECRET_LINK = /^[A-Za-z0-9_-]{24}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|\+00:00)$/;
const NUMBER = "#num:";

// One registry per server: the first id it shows is id#1, and so on.
const makeRegistry = () => {
  const seen = new Map();
  const counts = {};
  return (kind, value) => {
    const key = `${kind}:${value}`;
    if (!seen.has(key)) {
      counts[kind] = (counts[kind] || 0) + 1;
      seen.set(key, `${kind}#${counts[kind]}`);
    }
    return seen.get(key);
  };
};

const timeLabel = (ms, raw) => {
  const diff = ms - Date.now();
  if (Math.abs(diff) < 5 * MINUTE && diff < 1000) return "<now>";
  for (const [name, span] of LATER) if (Math.abs(diff - span) < 2 * MINUTE) return `<now+${name}>`;
  return raw;
};

const jwtLabel = (token, label) => {
  const [head, body] = token.split(".").map((p, i) => (i < 2 ? JSON.parse(Buffer.from(p, "base64url").toString()) : p));
  const keys = Object.keys(body).sort().join(",");
  return `<token alg=${head.alg} claims=${keys} user=${label("id", body.userId)} life=${body.exp - body.iat}s>`;
};

const text = (value, key, label) => {
  if (JWT.test(value)) return jwtLabel(value, label);
  const hash = value.match(BCRYPT);
  if (hash) return `<password fingerprint cost ${hash[1]}>`;
  if (/^[a-f0-9]{64}$/.test(value)) return "<code fingerprint>";
  if (ISO.test(value)) return timeLabel(Date.parse(value), value);
  if (/^[a-f0-9]{24}$/.test(value)) return label("id", value);
  if (key === "token") {
    if (SECRET_LINK.test(value)) return label("link", value);
    // "has anything changed" token: number of orders + time of the last change
    const change = value.match(/^(\d+)-(\d+)$/);
    if (change) return `${change[1]}-${change[2] === "0" ? "0" : "<time>"}`;
  }
  return value.replace(OBJECT_ID, (id) => label("id", id));
};

// For answers (parsed JSON, numbers kept as their written text)
const normalizeJson = (value, label, key = "") => {
  if (typeof value === "string") {
    if (value.startsWith(NUMBER)) return value;
    // the "changeToken" of the order list is the same kind of thing as "token"
    return text(value, key === "changeToken" ? "token" : key, label);
  }
  if (Array.isArray(value)) return value.map((v) => normalizeJson(v, label, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [text(k, "", label), normalizeJson(value[k], label, k)]));
  }
  return value;
};

const parseKeepingNumbers = (raw) => JSON.parse(raw, (k, v, ctx) => (typeof v === "number" ? NUMBER + ctx.source : v));

// For database documents (read without converting types)
const normalizeBson = (value, label, key = "") => {
  if (value === null || value === undefined) return null;
  const type = value._bsontype;
  if (type === "ObjectId") return label("id", value.toHexString());
  if (type === "Int32") return `int32 ${value.value}`;
  if (type === "Double") return `double ${value.value}`;
  if (type === "Long") return `long ${value.toString()}`;
  if (type === "Binary") return `binary ${value.length()} ${crypto.createHash("sha1").update(value.buffer).digest("hex").slice(0, 10)}`;
  if (value instanceof Date) return `date ${timeLabel(value.getTime(), value.toISOString())}`;
  if (Array.isArray(value)) return value.map((v) => normalizeBson(v, label, key));
  if (typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [text(k, "", label), normalizeBson(value[k], label, k)]));
  }
  if (typeof value === "string") return text(value, key, label);
  return value;
};

module.exports = { makeRegistry, normalizeJson, normalizeBson, parseKeepingNumbers };
