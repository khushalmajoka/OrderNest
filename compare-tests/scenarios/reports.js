// History, usage counting and the developer pages, with records written
// straight into the database. (extra.js tests the same pages after real use;
// this one needs no other endpoint, and it holds the awkward records.)
const { get, post, freshIp, day } = require("./helpers");
const { need, TEST_KEY, DEVELOPER } = require("../lib/env");

const jwt = need("jsonwebtoken");
const { ObjectId } = need("mongodb");

const id = (n) => `bbbbbbbbbbbbbbbbbbbbbb${String(n).padStart(2, "0")}`;
const [OWNER, STAFF, DEV, OTHER, OFF] = [1, 2, 3, 4, 5].map(id);
const [SHOP, DEV_SHOP, EMPTY_SHOP, LOST_SHOP] = [10, 11, 12, 13].map(id);
const token = (userId) => jwt.sign({ userId }, TEST_KEY, { expiresIn: "7d" });
const [owner, staff, dev] = [OWNER, STAFF, DEV].map(token);

const NOW = Date.now();
const ago = (days, extra = 0) => new Date(NOW - days * 86400000 - extra);
const stamp = (days) => day(-days).replace(/-/g, "");
const oid = (hex) => new ObjectId(hex);

const records = {
  db: async (db) => {
    const user = (_id, extra) => ({ _id: oid(_id), password: "x", ...extra });
    await db.collection("users").insertMany([
      user(OWNER, { name: "Asha", email: "asha@example.test", role: "admin", shopId: oid(SHOP) }),
      user(STAFF, { name: "Ravi", email: "ravi@staff.invalid", username: "ravi", role: "staff", shopId: oid(SHOP), active: true }),
      user(OFF, { name: "Old staff", email: "off@staff.invalid", username: "off", role: "staff", shopId: oid(SHOP), active: false }),
      user(DEV, { name: "Dev", email: DEVELOPER, role: "admin", emailVerified: true, shopId: oid(DEV_SHOP) }),
      user(OTHER, { name: "No email" }),
    ]);
    const shop = (_id, name, who, extra = {}) => ({ _id: oid(_id), name, phone: "9876543210", category: "Printing", owner: oid(who), ...extra });
    await db.collection("shops").insertMany([
      shop(SHOP, "asha prints", OWNER, { createdAt: ago(30) }),
      shop(DEV_SHOP, "Zed Shop", DEV, { createdAt: ago(20) }),
      shop(EMPTY_SHOP, "Beta", OTHER),
      shop(LOST_SHOP, "Alpha, owner gone", id(99)),
    ]);

    const line = (n, kind, summary, extra = {}) => ({
      _id: oid(id(20 + n)),
      shop: oid(SHOP),
      actor: { id: oid(OWNER), name: "Asha", role: "admin" },
      byDeveloper: false,
      kind,
      action: "edit",
      summary,
      changes: [],
      createdAt: ago(0, n * 1000),
      __v: 0,
      ...extra,
    });
    await db.collection("activities").insertMany([
      line(1, "order", "Edited order 1 (₹500)", { targetLabel: "20260101-1", changes: [{ field: "Total", from: "₹100", to: "₹500" }] }),
      line(2, "staff", "Added staff Ravi", { actor: { id: oid(STAFF), name: "Ravi", username: "ravi", role: "staff" } }),
      line(3, "product", "Added product a.b*c [x] \\ done?"),
      line(4, "order", "Deleted order", { targetLabel: "ABC-9", byDeveloper: true }),
      // the same moment as line 4: the newest id comes first
      line(5, "order", "Created order", { createdAt: ago(0, 4000), changes: undefined }),
      { _id: oid(id(30)), shop: oid(DEV_SHOP), kind: "order", action: "x", summary: "another shop's line", createdAt: ago(1) },
    ]);

    const use = (shopId, daysAgo, feature, count, users, extra = {}) => ({
      shop: oid(shopId), day: stamp(daysAgo), feature, count, users, lastAt: ago(daysAgo, count), createdAt: ago(daysAgo), ...extra,
    });
    await db.collection("usagecounts").insertMany([
      use(SHOP, 0, "whatsapp.open", 3, [OWNER, STAFF]),
      use(SHOP, 2, "whatsapp.open", 4, [OWNER]),
      use(DEV_SHOP, 2, "order.create", 7, [DEV]),
      use(SHOP, 10, "orders.search", 1, [], { lastAt: undefined }),
      use(SHOP, 45, "tracking.view", 5, []),
      use(SHOP, 120, "order.edit", 9, [OWNER]),
      use(SHOP, 1, "a.feature.that.is.gone", 2, [OWNER]),
    ]);

    let n = 0;
    const order = (shopId, extra) => ({ _id: oid(id(40 + n++)), shop: oid(shopId), orderId: `t-${n}`, userId: oid(OWNER), total: 100, createdAt: ago(5), updatedAt: ago(n), ...extra });
    await db.collection("orders").insertMany([
      order(SHOP, { customerName: "Isha", phone: "9876501234", item: "Lamp", address: "Road 1", orderExecutive: "Ravi", advance: 50, expectedDeliveryDate: ago(1) }),
      order(SHOP, { customerName: "N", phone: "   ", item: "", advance: 0, expectedDeliveryDate: "2026-01-01" }),
      order(SHOP, { customerName: "xx", address: "\n\t", advance: null }),
      order(SHOP, { customerName: "राम", item: "Bulb" }),
      order(SHOP, { customerName: "Ravi 2", phone: 9876501234 }),
      order(SHOP, { customerName: "   " }),
      order(DEV_SHOP, { customerName: "O’Brien & Sons", advance: 10 }),
      order(DEV_SHOP, {}),
    ]);
  },
};

const history = (name, query = "", as = owner, extra = {}) => get(name, `/api/activity${query}`, { as, ...extra });
const count = (name, body, as, extra = {}) => post(name, "/api/usage", body, { as, status: 204, ...extra });
const page = (name, path, as = dev, extra = {}) => get(name, `/api/developer/${path}`, { as, ...extra });
const inside = (shop) => ({ headers: { "x-dev-shop": shop } });

module.exports = [
  {
    name: "seeded reports",
    steps: [
      records,
      freshIp(),
      history("history"),
      history("page 1", "?page=1&limit=2"),
      history("page 2 is not counted again", "?page=2&limit=2"),
      history("page past the end", "?page=9"),
      history("nonsense page and limit", "?page=abc&limit=xyz"),
      history("limit zero", "?limit=0"),
      history("limit below zero, page below zero", "?limit=-5&page=-2"),
      history("limit too big, number with letters", "?limit=5000&page=1abc"),
      history("page given twice", "?page=1&page=2&limit=2"),
      history("empty page", "?page="),
      history("orders only", "?kind=order"),
      history("products only", "?kind=product"),
      history("unknown kind", "?kind=other"),
      history("kind given twice", "?kind=order&kind=staff"),
      history("search, any capitals", "?search=RAVI"),
      history("search a username inside a kind", "?search=ravi&kind=staff"),
      history("search an amount", `?search=${encodeURIComponent("₹500")}`),
      history("search special characters", `?search=${encodeURIComponent("a.b*c [x] \\ done?")}`),
      history("a dot is only a dot", "?search=."),
      history("a pattern is only text", `?search=${encodeURIComponent(".*")}`),
      history("search with spaces around", "?search=%20%20abc-9%20"),
      history("search of spaces", "?search=%20%20"),
      history("very long search", `?search=${"a".repeat(300)}`),
      history("search given twice", "?search=ravi&search=asha"),
      history("staff refused", "", staff, { status: 403 }),
      history("no login", "", null, { status: 401 }),
      history("owner without a shop", "", token(id(98)), { status: 401 }),

      count("on screen", { feature: "whatsapp.open" }, staff),
      count("again, another person", { feature: "whatsapp.open" }, owner),
      count("a new feature today", { feature: "slip.open" }, owner),
      count("the same person again", { feature: "slip.open" }, owner),
      count("counted by the server only", { feature: "order.create" }, owner),
      count("unknown", { feature: "nope" }, owner),
      count("not a text", { feature: 5 }, owner),
      count("a list", { feature: ["slip.open"] }, owner),
      count("nothing sent", {}, owner),
      count("no body", undefined, owner),
      count("no login", { feature: "slip.open" }, undefined, { status: 401 }),
      count("developer in own shop", { feature: "share.open" }, dev),
      count("developer inside a shop is not counted", { feature: "share.open" }, dev, inside(SHOP)),
      history("developer looks at the history there", "", dev, inside(SHOP)),

      page("hidden from an owner", "usage", owner, { status: 404 }),
      page("hidden from staff", "shops", staff, { status: 404 }),
      page("completeness hidden", "completeness", owner, { status: 404 }),
      page("no login", "usage", null, { status: 401 }),
      page("usage", "usage"),
      page("7 days", "usage?days=7"),
      page("90 days", "usage?days=90&shop=all"),
      page("days written oddly", "usage?days=7.0"),
      page("days not offered", "usage?days=31"),
      page("days nonsense, empty shop name", "usage?days=abc&shop="),
      page("one shop", `usage?shop=${SHOP}`),
      page("a shop with nothing", `usage?shop=${EMPTY_SHOP}`),
      page("a shop whose owner is gone", `usage?days=90&shop=${LOST_SHOP}`),
      page("unknown shop", `usage?shop=${id(97)}`, dev, { status: 400 }),
      page("not a shop id", "usage?shop=x", dev, { status: 400 }),
      page("shop given twice", `usage?shop=${SHOP}&shop=${SHOP}`, dev, { status: 400 }),
      page("developer inside a shop still sees it", "usage", dev, inside(SHOP)),
      page("completeness", "completeness"),
      page("completeness of one", `completeness?shop=${SHOP}`),
      page("completeness with no orders", `completeness?shop=${EMPTY_SHOP}`),
      page("completeness: unknown", `completeness?shop=${id(97)}`, dev, { status: 400 }),
      page("shops", "shops"),

      // 120 a minute from one address, counted before the login is looked at
      freshIp(),
      ...Array.from({ length: 119 }, () => count("filling the limit", {}, undefined, { status: 401 })),
      count("the last one allowed", { feature: "slip.open" }, owner),
      count("one too many", { feature: "slip.open" }, owner, { status: 429 }),
    ],
  },
];
