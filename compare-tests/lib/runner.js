// Runs one step on both servers and compares: status, important headers,
// the answer, what changed in the database, and the emails sent.
const crypto = require("crypto");
const { normalizeJson, normalizeBson, parseKeepingNumbers } = require("./normalize");
const { readWhenQuiet, changes } = require("./snapshot");
const { sleep, WEB_APP } = require("./env");

const HEADERS = [
  "cache-control",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "content-security-policy",
  "strict-transport-security",
  "cross-origin-resource-policy",
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "ratelimit-policy",
  "x-powered-by",
];

const value = (v, ctx) => (typeof v === "function" ? v(ctx) : v);

const send = async (side, step) => {
  const ctx = side.ctx;
  const headers = { origin: WEB_APP, "x-forwarded-for": side.ip };
  const who = step.as;
  if (who) headers.authorization = `Bearer ${ctx.tokens[who] ?? who}`;
  Object.assign(headers, value(step.headers, ctx) || {});
  let body;
  if (step.rawBody !== undefined) body = step.rawBody;
  else if (step.body !== undefined) body = JSON.stringify(value(step.body, ctx));
  if (body !== undefined && !headers["content-type"]) headers["content-type"] = "application/json";
  const url = side.server.base + value(step.path, ctx);
  const res = await fetch(url, { method: step.method, headers, body });
  const buffer = Buffer.from(await res.arrayBuffer());
  return { res, buffer };
};

const describe = (side, { res, buffer }) => {
  const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const headers = {};
  for (const name of HEADERS) {
    const v = res.headers.get(name);
    if (v !== null) headers[name] = v;
  }
  const out = { status: res.status, type, headers };
  let json;
  if (type === "application/json") {
    json = JSON.parse(buffer.toString());
    out.body = normalizeJson(parseKeepingNumbers(buffer.toString()), side.label);
  } else if (type.startsWith("image/")) {
    out.body = `picture ${buffer.length} bytes ${crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 10)}`;
  } else {
    out.body = buffer.toString();
  }
  return { out, json };
};

const mailOf = (side, from) =>
  side.mail.slice(from).map((m) => ({
    from: m.sender,
    to: m.to,
    subject: m.subject,
    text: String(m.textContent).replace(/\b\d{6}\b/g, "<code>"),
  }));

// First differences between two results, as "where: A | B"
const differences = (a, b, path = "", out = []) => {
  if (out.length >= 8) return out;
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) differences(a[k], b[k], path ? `${path}.${k}` : k, out);
  } else if (JSON.stringify(a) !== JSON.stringify(b)) {
    const short = (v) => String(JSON.stringify(v)).slice(0, 160);
    out.push(`${path}: A=${short(a)} | B=${short(b)}`);
  }
  return out;
};

const runStep = async (step, sides, report) => {
  // a change made straight in both databases (old data, expired codes, ...)
  if (step.db) {
    for (const side of sides) {
      await step.db(side.db, side.ctx, side.name);
      side.state = await readWhenQuiet(side.db);
      // label any new ids now, in the same order on both sides
      changes(new Map(), side.state, side.label);
    }
    return;
  }
  if (step.sleep) return sleep(step.sleep);
  if (step.ip) return sides.forEach((s) => (s.ip = step.ip));
  if (step.run) return sides.forEach((s) => step.run(s.ctx));

  // the two servers and databases are independent, so both run at once
  const results = await Promise.all(sides.map(async (side) => {
    const mailFrom = side.mail.length;
    const answer = await send(side, step);
    const after = await readWhenQuiet(side.db);
    if (step.waitMail) for (let i = 0; i < 40 && side.mail.length === mailFrom; i++) await sleep(50);
    const { out, json } = describe(side, answer);
    out.database = changes(side.state, after, side.label);
    out.mail = mailOf(side, mailFrom);
    side.state = after;

    const code = side.mail.slice(mailFrom).map((m) => String(m.textContent).match(/\b\d{6}\b/)?.[0]).find(Boolean);
    if (code) side.ctx.code = code;
    if (step.save && answer.res.status < 400) step.save(json, side.ctx, answer);
    return out;
  }));

  report.steps += 1;
  const [a, b] = results;
  report.hits.push({ method: step.method, path: sides[0].lastPath(step), status: a.status });
  const expected = step.status ?? 200;
  if (a.status !== expected) {
    report.wrong.push(`${step.name}: expected ${expected}, server A answered ${a.status} ${JSON.stringify(a.body).slice(0, 200)}`);
  }
  const diff = differences(a, b);
  if (diff.length) report.diffs.push({ step: step.name, diff });
};

module.exports = { runStep, differences, value, normalizeBson };
