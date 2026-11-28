// The parts every request goes through: headers, CORS, bodies, unknown
// addresses and the login check. This is what Java is compared on first.
const { req, get, post, del } = require("./helpers");
const { need, TEST_KEY, WEB_APP, DEVELOPER } = require("../lib/env");

const jwt = need("jsonwebtoken");
const { ObjectId } = need("mongodb");

const id = (n) => `aaaaaaaaaaaaaaaaaaaaaa${String(n).padStart(2, "0")}`;
const OWNER = id(1);
const STAFF = id(2);
const OFF = id(3);
const CHANGED = id(4);
const OLD = id(5);
const DEV = id(6);
const SHOP = id(10);
const NOW = Math.floor(Date.now() / 1000);
const token = (userId, claims = {}) => jwt.sign({ userId, iat: NOW - 100, ...claims }, TEST_KEY, claims.exp ? {} : { expiresIn: "7d" });

const people = {
  db: async (db) => {
    const user = (_id, extra) => ({ _id: new ObjectId(_id), password: "x", ...extra });
    const shopId = new ObjectId(SHOP);
    await db.collection("users").insertMany([
      user(OWNER, { name: "Owner", email: "Owner@Example.test", role: "admin", shopId }),
      user(STAFF, { name: "Staff", email: "s@staff.invalid", username: "s", role: "staff", shopId, active: true }),
      user(OFF, { name: "Off", email: "o@staff.invalid", username: "o", role: "staff", shopId, active: false }),
      user(CHANGED, { name: "Changed", email: "changed@example.test", passwordChangedAt: new Date((NOW - 50) * 1000) }),
      user(OLD, { name: "Old account", email: "old@example.test" }),
      user(DEV, { name: "Developer", email: DEVELOPER, role: "admin", emailVerified: true }),
    ]);
    await db.collection("shops").insertOne({ _id: shopId, name: "Shop", phone: "9876543210", category: "Printing", owner: new ObjectId(OWNER) });
  },
};

const me = (name, bearer, status = 200, extra = {}) => get(name, "/api/auth/me", { as: bearer, status, ...extra });
const inside = (shop) => ({ headers: { "x-dev-shop": shop } });
const from = (origin) => ({ headers: { origin } });
const preflight = (name, path, headers, status = 204, extra = {}) =>
  req(name, "OPTIONS", path, { headers: { "access-control-request-method": "POST", ...headers }, status, ...extra });

module.exports = [
  {
    name: "foundation",
    steps: [
      get("home", "/"),
      get("unknown address", "/api/nothing-here", { status: 404 }),
      post("unknown address, POST", "/api/nothing/at/all", { a: 1 }, { status: 404 }),
      del("wrong method on a real address", "/api/auth/me", { status: 404 }),
      post("wrong method with a body", "/api/auth/me", { a: 1 }, { status: 404 }),
      get("another site", "/", from("http://evil.example.test")),
      get("web app", "/", from(WEB_APP)),
      get("no origin (not a browser)", "/", from(undefined)),
      preflight("pre-check from the web app", "/api/auth/me", { "access-control-request-headers": "content-type,authorization,x-dev-shop" }),
      preflight("pre-check on an unknown address", "/api/nothing", {}),
      // not allowed: no CORS headers, so the browser blocks it whatever the body says
      preflight("pre-check from another site", "/api/auth/me", { origin: "http://evil.example.test" }, 200, { loose: ["body", "type"] }),
      // the two languages word the "not JSON" message differently
      post("body that is not JSON", "/api/nothing", undefined, { rawBody: '{"a":', status: 400, loose: ["body.message"] }),
      post("body that is only a text", "/api/nothing", undefined, { rawBody: '"hello"', status: 400, loose: ["body.message"] }),
      post("body too big", "/api/nothing", undefined, { rawBody: `{"a":"${"x".repeat(11 * 1024 * 1024)}"}`, status: 413 }),
      post("not marked as JSON", "/api/nothing", undefined, { rawBody: "{oops", headers: { "content-type": "text/plain" }, status: 404 }),

      people,
      me("no token", undefined, 401),
      get("not a Bearer token", "/api/auth/me", { headers: { authorization: "Basic abc" }, status: 401 }),
      me("broken token", "not.a.token", 401),
      me("another key", jwt.sign({ userId: OWNER }, "another-key"), 401),
      me("expired", token(OWNER, { exp: 1000 }), 401),
      me("account that does not exist", token(id(99)), 401),
      me("id that is not an id", token("abc"), 400),
      me("owner", token(OWNER)),
      me("owner, address with a slash", token(OWNER), 200, { path: "/api/auth/me/" }),
      me("token without an end date", jwt.sign({ userId: OWNER }, TEST_KEY)),
      me("token made by a faster clock", token(OWNER, { iat: NOW + 30 })),
      me("staff has no email", token(STAFF)),
      me("staff turned off", token(OFF), 401),
      me("login from before a password change", token(CHANGED), 401),
      me("login from after a password change", token(CHANGED, { iat: NOW })),
      me("account saved before roles existed", token(OLD)),
      me("developer", token(DEV)),
      me("developer inside a shop", token(DEV), 200, inside(SHOP)),
      me("developer, shop that is gone", token(DEV), 404, inside(id(98))),
      me("developer, nonsense shop", token(DEV), 404, inside("x")),
      me("others cannot use the header", token(STAFF), 200, inside("x")),
    ],
  },
];
