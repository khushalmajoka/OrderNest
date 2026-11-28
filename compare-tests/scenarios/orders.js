const { get, post, put, del, freshIp, day, onboard, addStaff } = require("./helpers");

const keep = (key) => (b, c) => (c[key] = b.order._id);
const order = (name, body, extra = {}) => post(name, "/api/orders/create", body, { as: "admin", status: 201, ...extra });
const badOrder = (name, body, status = 400) => post(name, "/api/orders/create", body, { as: "admin", status });
const list = (name, query = "", extra = {}) => get(name, (c) => `/api/orders/shop/${c.adminShop}${query}`, { as: "admin", ...extra });
const shopPath = (suffix) => (c) => `/api/orders/shop/${c.adminShop}/${suffix}`;
const one = (key) => (c) => `/api/orders/${c[key]}`;

const SEED = [
  order("order 1", { customerName: "  Sunil   Sharma ", phone: 9876501234, item: "Frame 8x10", total: "1,500", advance: "₹ 500", address: "Plot 5", status: "Pending", orderExecutive: "Ravi", expectedDeliveryDate: day(-20) }, { save: keep("o1") }),
  order("order 2 (big and decimal amounts)", { customerName: "Neha", phone: "+91 98765-43210", item: "Banner (3 x 6)", total: 12345678.5, advance: 0.25, status: "Dispatched", expectedDeliveryDate: day(-10), orderExecutive: "ravi" }, { save: keep("o2") }),
  order("order 3 (minimum)", { total: 0 }, { save: keep("o3") }),
  order("order 4", { customerName: "अमित वर्मा", phone: "09876501234", item: "card.* [x]", total: 250.0, advance: 250, status: "Delivered", expectedDeliveryDate: `${day(3)}T00:00:00.000Z`, orderExecutive: "Meena" }, { save: keep("o4") }),
  order("order 5", { customerName: "Zoya", phone: "", item: "item 10", total: "75.50", status: "", expectedDeliveryDate: "" }, { status: 400 }),
  order("order 5 without status", { customerName: "Zoya", phone: "", item: "item 10", total: "75.50", expectedDeliveryDate: day(0), orderExecutive: "Ravi" }, { save: keep("o5") }),
  order("order 6", { customerName: "bina", item: "item 9", total: 9876543210, expectedDeliveryDate: day(1) }, { save: keep("o6") }),
];

const create = {
  name: "create orders",
  steps: [
    ...onboard(),
    ...SEED,
    badOrder("no total", { item: "x" }),
    badOrder("total not a number", { total: "abc" }),
    badOrder("negative total", { total: -1 }),
    badOrder("advance above total", { total: 10, advance: 11 }),
    badOrder("bad status", { total: 10, status: "Nope" }),
    badOrder("bad date", { total: 10, expectedDeliveryDate: "tomorrow" }),
    badOrder("bad phone", { total: 10, phone: "12345" }),
    badOrder("phone is an object", { total: 10, phone: {} }),
    badOrder("fake name", { total: 10, customerName: "N A" }),
    badOrder("name with numbers", { total: 10, customerName: "Raj 2" }),
    badOrder("executive with numbers", { total: 10, orderExecutive: "Ravi 2" }),
    badOrder("long item", { total: 10, item: "x".repeat(201) }),
    badOrder("long address", { total: 10, address: "x".repeat(501) }),
    badOrder("address not text", { total: 10, address: 5 }),
    badOrder("lines not a list", { total: 10, lines: "x" }),
    badOrder("line without product", { total: 10, lines: [{}] }),
    order("number as text fields", { customerName: "Om", item: 12, total: 5, orderExecutive: "", phone: 919876501234 }, { save: keep("o7") }),
    order("shop and user in the body are ignored", { total: 5, shop: "0123456789abcdef01234567", userId: "0123456789abcdef01234567", orderId: "MINE", balance: 999 }),
    order("closed (old) by admin", { total: 5, status: "Closed (old)" }),
  ],
};

const QUERIES = [
  "", "?page=2&limit=3", "?limit=0", "?limit=1000", "?page=abc", "?search=neha", "?search=card.*%20%5Bx%5D", "?search=98765", "?search=ORD",
  "?status=Pending,Dispatched", "?totalMin=100&totalMax=2000", "?advanceMin=1", "?balanceMax=100", "?deliveryFrom=2026-01-01&deliveryTo=2026-01-02",
  `?createdFrom=${day(0)}&createdTo=${day(0)}`, "?nameMissing=1", "?customer=SUN", "?item=item", "?phone=987", "?executive=ravi", "?orderId=ord-",
  "?orderNoFrom=2&orderNoTo=3", "?overdue=1", "?hasBalance=1", "?noPhone=1",
  "?sortBy=orderId&sortDir=asc", "?sortBy=customerName&sortDir=asc", "?sortBy=item&sortDir=desc", "?sortBy=total&sortDir=asc", "?sortBy=expectedDeliveryDate&sortDir=asc",
  "?sortBy=status", "?sortBy=orderExecutive&sortDir=asc", "?sortBy=createdAt&sortDir=asc", "?sortBy=nonsense", "?status=Pending&overdue=1&search=frame",
];
const BAD_QUERIES = ["?status=Nope", "?totalMin=abc", "?deliveryFrom=2026-13-45", "?createdTo=yesterday", "?orderNoFrom=x"];

const reading = {
  name: "list, search, filter, sort, summary, export",
  steps: [
    ...onboard(),
    ...SEED,
    ...QUERIES.map((q) => list(`list ${q}`, q)),
    ...BAD_QUERIES.map((q) => list(`bad ${q}`, q, { status: 400 })),
    get("someone else's shop", "/api/orders/shop/0123456789abcdef01234567", { as: "admin", status: 403 }),
    get("changes", shopPath("changes"), { as: "admin" }),
    get("summary", shopPath("summary"), { as: "admin" }),
    get("executives", shopPath("executives"), { as: "admin" }),
    get("review list", "/api/orders/review", { as: "admin" }),
    get("export all", shopPath("export"), { as: "admin" }),
    get("export two", shopPath("export?limit=2&sortBy=total&sortDir=desc&status=Pending,Dispatched,Order%20Received"), { as: "admin" }),
    get("export bad limit", shopPath("export?limit=1.5"), { as: "admin", status: 400 }),
    get("export bad filter", shopPath("export?status=x"), { as: "admin", status: 400 }),
    ...["changes", "summary", "executives", "export", "name-check", "close-check"].map((p) =>
      get(`${p} of another shop`, `/api/orders/shop/0123456789abcdef01234567/${p}`, { as: "admin", status: 403 })
    ),
    freshIp(),
    post("track", "/api/orders/track", (c) => ({ orderId: ` ${c.firstId.toLowerCase()} `, phone: "+91 98765 01234" })),
    post("track wrong phone", "/api/orders/track", (c) => ({ orderId: c.firstId, phone: "9999999999" })),
    post("track unknown id", "/api/orders/track", { orderId: "ORD-0", phone: "9999999999" }),
    post("track without phone", "/api/orders/track", { orderId: "ORD-0" }, { status: 400 }),
  ],
};
// remember the first order's ID for the tracking test
reading.steps.splice(reading.steps.indexOf(SEED[1]), 0, list("find first id", "", { save: (b, c) => (c.firstId = b.orders[0].orderId) }));

const edit = {
  name: "edit, status, delete",
  steps: [
    ...onboard(),
    ...SEED,
    put("edit everything", one("o1"), { customerName: "Sunil S", phone: "9876501299", item: "Frame 10x12", address: "", total: 2000, advance: 100, status: "In Progress", orderExecutive: "Meena", expectedDeliveryDate: day(5) }, { as: "admin" }),
    put("edit with nothing new", one("o1"), { total: 2000, advance: 100 }, { as: "admin" }),
    put("remove date", one("o1"), { total: 2000, advance: 100, expectedDeliveryDate: "" }, { as: "admin" }),
    put("remove date with null", one("o2"), { total: 20, expectedDeliveryDate: null }, { as: "admin" }),
    put("status only, amounts missing", one("o2"), { status: "Delivered" }, { as: "admin", status: 400 }),
    put("keeps an old fake name", one("o3"), { total: 1, customerName: "" }, { as: "admin" }),
    put("edit: bad name", one("o3"), { total: 1, customerName: "xx" }, { as: "admin", status: 400 }),
    put("edit: unknown order", "/api/orders/0123456789abcdef01234567", { total: 1 }, { as: "admin", status: 404 }),
    put("edit: not an id", "/api/orders/abc", { total: 1 }, { as: "admin", status: 400 }),
    post("next step for one", "/api/orders/bulk-status", (c) => ({ ids: [c.o3], status: "In Progress" }), { as: "admin" }),
    post("several", "/api/orders/bulk-status", (c) => ({ ids: [c.o3, c.o5, c.o6, c.o6, "0123456789abcdef01234567"], status: "Dispatched" }), { as: "admin" }),
    post("no change", "/api/orders/bulk-status", (c) => ({ ids: [c.o3], status: "Dispatched" }), { as: "admin" }),
    post("bulk: no ids", "/api/orders/bulk-status", { ids: [], status: "Pending" }, { as: "admin", status: 400 }),
    post("bulk: bad id", "/api/orders/bulk-status", { ids: ["x"], status: "Pending" }, { as: "admin", status: 400 }),
    post("bulk: too many", "/api/orders/bulk-status", { ids: Array(201).fill("0123456789abcdef01234567"), status: "Pending" }, { as: "admin", status: 400 }),
    post("bulk: bad status", "/api/orders/bulk-status", (c) => ({ ids: [c.o3], status: "x" }), { as: "admin", status: 400 }),
    { db: (db) => db.collection("orders").updateMany({}, { $set: { expectedDeliveryDate: new Date("2026-01-15T00:00:00Z") } }) },
    get("review with old dates", "/api/orders/review", { as: "admin" }),
    post("not yet", "/api/orders/review-snooze", (c) => ({ ids: [c.o1, c.o2] }), { as: "admin" }),
    get("review after not yet", "/api/orders/review", { as: "admin" }),
    post("not yet: nothing", "/api/orders/review-snooze", { ids: [] }, { as: "admin", status: 400 }),
    post("not yet: too many", "/api/orders/review-snooze", { ids: Array(201).fill("0123456789abcdef01234567") }, { as: "admin", status: 400 }),
    put("review off", "/api/shop/settings/needs-review", { enabled: false, days: 5 }, { as: "admin" }),
    get("review list when off", "/api/orders/review", { as: "admin" }),
    del("delete", one("o4"), { as: "admin" }),
    del("delete again", one("o4"), { as: "admin", status: 404 }),
    del("delete: not an id", "/api/orders/abc", { as: "admin", status: 400 }),
    get("history", "/api/activity?limit=100", { as: "admin" }),
  ],
};

const upload = {
  name: "Excel upload",
  steps: [
    ...onboard(),
    post("upload", "/api/orders/bulk-upload", {
      orders: [
        { item: "Mug", customerName: "NA", phone: 9876501234, address: 4521, total: "1,200", advance: 200, orderId: " old-001 " },
        { item: "Cap", customerName: "Kiran", total: "", status: "Delivered", expectedDeliveryDate: "2026-03-05", orderExecutive: "Ravi" },
        { item: 42, total: 9876543210.75, phone: "0141 2345678" },
      ],
    }, { as: "admin", status: 201 }),
    post("upload: nothing", "/api/orders/bulk-upload", { orders: [] }, { as: "admin", status: 400 }),
    post("upload: too many", "/api/orders/bulk-upload", { orders: Array(2001).fill({ item: "x" }) }, { as: "admin", status: 400 }),
    post("upload: bad rows", "/api/orders/bulk-upload", {
      orders: [
        { total: 5 },
        { item: "x", orderId: "OLD-001" },
        { item: "x", orderId: "dup" },
        { item: "x", orderId: "DUP" },
        { item: "x", total: "abc" },
        ...Array(30).fill({ item: "x", status: "Nope" }),
      ],
    }, { as: "admin", status: 400 }),
    list("list after upload", "?sortBy=orderId&sortDir=asc"),
    order("typed id is not used up", { total: 1 }),
    post("track an old id", "/api/orders/track", { orderId: "old-001", phone: "9876501234" }),
  ],
};

const OLD = (suffix) => (c) => `/api/orders/shop/${c.adminShop}/${suffix}`;
const tools = {
  name: "close old orders and clean names",
  steps: [
    ...onboard(),
    ...SEED,
    {
      db: async (db) => {
        await db.collection("orders").updateMany({}, { $set: { createdAt: new Date("2026-01-05T10:00:00Z"), updatedAt: new Date("2026-01-06T10:00:00Z") } });
        await db.collection("orders").updateMany({ total: 0 }, { $set: { customerName: "NA" } });
        await db.collection("orders").updateMany({ total: 250 }, { $set: { customerName: "na" } });
        await db.collection("orders").updateMany({ total: 5 }, { $set: { customerName: "xx" } });
      },
    },
    get("name check", OLD("name-check"), { as: "admin" }),
    post("clear: nothing chosen", OLD("clear-names"), {}, { as: "admin", status: 400 }),
    post("clear a real name (ignored)", OLD("clear-names"), { keys: ["neha"] }, { as: "admin" }),
    post("clear names", OLD("clear-names"), { keys: ["NA"] }, { as: "admin" }),
    get("check by created date", OLD("close-check?basis=created&before=2026-02-01&statuses=Pending,Order%20Received,Dispatched"), { as: "admin" }),
    get("check by changed date", OLD("close-check?basis=updated&before=2026-02-01&statuses=Pending"), { as: "admin" }),
    get("check by delivery date", OLD(`close-check?basis=delivery&before=${day(2)}&statuses=Pending,Order%20Received,Dispatched`), {
      as: "admin",
      save: (b, c) => (c.found = b.count),
    }),
    get("check: no basis", OLD("close-check?before=2026-02-01&statuses=Pending"), { as: "admin", status: 400 }),
    get("check: bad date", OLD("close-check?basis=created&before=2026-02-30&statuses=Pending"), { as: "admin", status: 400 }),
    get("check: closed status", OLD("close-check?basis=created&before=2026-02-01&statuses=Delivered"), { as: "admin", status: 400 }),
    get("check: no status", OLD("close-check?basis=created&before=2026-02-01&statuses="), { as: "admin", status: 400 }),
    post("close: wrong count", OLD("close-orders"), { basis: "delivery", before: day(2), statuses: ["Pending"], newStatus: "Delivered", expectedCount: 99 }, { as: "admin", status: 409 }),
    post("close: bad new status", OLD("close-orders"), { basis: "delivery", before: day(2), statuses: ["Pending"], newStatus: "Pending", expectedCount: 1 }, { as: "admin", status: 400 }),
    post("close: bad paid", OLD("close-orders"), { basis: "delivery", before: day(2), statuses: ["Pending"], newStatus: "Delivered", markPaid: "yes", expectedCount: 1 }, { as: "admin", status: 400 }),
    post("close: no count", OLD("close-orders"), { basis: "delivery", before: day(2), statuses: ["Pending"], newStatus: "Delivered" }, { as: "admin", status: 400 }),
    post("close as delivered and paid", OLD("close-orders"), (c) => ({ basis: "delivery", before: day(2), statuses: ["Pending", "Order Received", "Dispatched"], newStatus: "Delivered", markPaid: true, expectedCount: c.found }), { as: "admin" }),
    post("close: nothing left", OLD("close-orders"), { basis: "delivery", before: day(2), statuses: ["Pending"], newStatus: "Closed (old)", expectedCount: 0 }, { as: "admin" }),
    list("list after closing", "?sortBy=orderId&sortDir=asc"),
  ],
};

const rights = {
  name: "what staff may see and do",
  steps: [
    ...onboard(),
    ...onboard("other", "other@example.test", "Other Shop"),
    ...SEED,
    ...addStaff("none", "nopower", {}),
    ...addStaff("work", "worker", { createOrders: true, editOrders: true, deleteOrders: true }),
    get("list without amounts", (c) => `/api/orders/shop/${c.adminShop}?sortBy=total&totalMin=100&hasBalance=1`, { as: "none" }),
    get("summary without amounts", shopPath("summary"), { as: "none" }),
    get("changes", shopPath("changes"), { as: "none" }),
    get("executives", shopPath("executives"), { as: "none" }),
    get("no export for staff", shopPath("export"), { as: "work", status: 403 }),
    get("no name check for staff", shopPath("name-check"), { as: "work", status: 403 }),
    post("no upload for staff", "/api/orders/bulk-upload", { orders: [{ item: "x" }] }, { as: "work", status: 403 }),
    post("no create", "/api/orders/create", { total: 1 }, { as: "none", status: 403 }),
    put("no edit", one("o1"), { total: 1 }, { as: "none", status: 403 }),
    del("no delete", one("o1"), { as: "none", status: 403 }),
    get("no review", "/api/orders/review", { as: "none", status: 403 }),
    post("create without seeing amounts", "/api/orders/create", { customerName: "Tara", item: "Pen", total: 40, advance: 10 }, { as: "work", status: 201, save: keep("w1") }),
    put("edit cannot change amounts", one("o1"), { customerName: "Sunil", total: 1, advance: 1, status: "Completed" }, { as: "work" }),
    put("staff cannot close as old", one("o1"), { status: "Closed (old)" }, { as: "work", status: 403 }),
    post("staff cannot create closed", "/api/orders/create", { total: 1, status: "Closed (old)" }, { as: "work", status: 403 }),
    post("staff cannot bulk close", "/api/orders/bulk-status", (c) => ({ ids: [c.o1], status: "Closed (old)" }), { as: "work", status: 403 }),
    post("staff bulk status", "/api/orders/bulk-status", (c) => ({ ids: [c.o1, c.o2], status: "Dispatched" }), { as: "work" }),
    get("staff review", "/api/orders/review", { as: "work" }),
    // the other shop must not reach these orders
    put("other shop cannot edit", one("o1"), { total: 1 }, { as: "other", status: 404 }),
    del("other shop cannot delete", one("o1"), { as: "other", status: 404 }),
    post("other shop cannot change status", "/api/orders/bulk-status", (c) => ({ ids: [c.o1], status: "Pending" }), { as: "other" }),
    del("staff deletes", one("w1"), { as: "work" }),
  ],
};

module.exports = [create, reading, edit, upload, tools, rights];
