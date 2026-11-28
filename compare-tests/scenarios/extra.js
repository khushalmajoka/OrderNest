// Customer catalog, history, usage counting, developer pages, old data.
const { PASSWORD, get, post, put, del, freshIp, login, onboard, addStaff } = require("./helpers");
const { need, DEVELOPER } = require("../lib/env");

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(30, 3)]).toString("base64");
const settings = (name, body, extra = {}) => put(name, "/api/catalog-settings", body, { as: "admin", ...extra });
const token = (b, c) => (c.link = b.token || c.link);

const catalog = {
  name: "customer catalog",
  steps: [
    ...onboard(),
    post("category", "/api/products/categories", { name: "Frames" }, { as: "admin", status: 201, save: (b, c) => (c.cat = b.category._id) }),
    post("product", "/api/products/families", (c) => ({ name: "Frame", category: c.cat, notes: "Teak", sizes: [{ price: 200, size: { kind: "text", text: "Small" } }, { size: { kind: "text", text: "Big" } }] }), { as: "admin", status: 201, save: (b, c) => (c.fam = b.family._id) }),
    post("hidden product", "/api/products/families", { name: "Secret", sizes: [{ price: 5 }] }, { as: "admin", status: 201, save: (b, c) => (c.secret = b.family._id) }),
    post("picture", (c) => `/api/products/${c.fam}/images`, { full: JPG, thumb: JPG }, { as: "admin", status: 201, save: (b, c) => (c.img = b.image._id) }),
    post("picture of hidden", (c) => `/api/products/${c.secret}/images`, { full: JPG, thumb: JPG }, { as: "admin", status: 201, save: (b, c) => (c.hidden = b.image._id) }),
    get("settings at first", "/api/catalog-settings", { as: "admin" }),
    post("new link while off", "/api/catalog-settings/new-link", {}, { as: "admin", status: 400 }),
    settings("bad phone", { phone: "12" }, { status: 400 }),
    settings("switch on", { enabled: true, phone: " +91 98765 43210 " }, { save: token }),
    post("show a product", "/api/catalog-settings/products", (c) => ({ ids: [c.fam], show: true }), { as: "admin" }),
    post("show again", "/api/catalog-settings/products", (c) => ({ ids: [c.fam], show: true }), { as: "admin" }),
    post("show: nothing", "/api/catalog-settings/products", { ids: [], show: true }, { as: "admin", status: 400 }),
    post("show: bad switch", "/api/catalog-settings/products", (c) => ({ ids: [c.fam], show: "yes" }), { as: "admin", status: 400 }),
    freshIp(),
    get("public page without prices", (c) => `/api/catalog/${c.link}`),
    settings("show prices, clear phone", { showPrices: true, phone: "" }, { save: token }),
    get("public page with prices", (c) => `/api/catalog/${c.link}`),
    get("public picture", (c) => `/api/catalog/${c.link}/images/${c.img}?size=thumb`),
    get("public full picture", (c) => `/api/catalog/${c.link}/images/${c.img}`),
    get("hidden picture", (c) => `/api/catalog/${c.link}/images/${c.hidden}`, { status: 404 }),
    get("picture not an id", (c) => `/api/catalog/${c.link}/images/abc`, { status: 404 }),
    get("wrong link", "/api/catalog/aaaaaaaaaaaaaaaaaaaaaaaa", { status: 404 }),
    get("short link", "/api/catalog/abc", { status: 404 }),
    get("shop does not leak the link", (c) => `/api/shop/${c.adminId}`, { as: "admin" }),
    ...addStaff("keeper", "keeper", { manageProducts: true }),
    get("staff sees settings", "/api/catalog-settings", { as: "keeper" }),
    put("staff cannot change", "/api/catalog-settings", { enabled: false }, { as: "keeper", status: 403 }),
    post("staff hides", "/api/catalog-settings/products", (c) => ({ ids: [c.fam], show: false }), { as: "keeper" }),
    get("empty page", (c) => `/api/catalog/${c.link}`),
    post("new link", "/api/catalog-settings/new-link", {}, { as: "admin", save: (b, c) => { c.oldLink = c.link; c.link = b.token; } }),
    get("old link is dead", (c) => `/api/catalog/${c.oldLink}`, { status: 404 }),
    get("new link works", (c) => `/api/catalog/${c.link}`),
    settings("switch off", { enabled: false }),
    get("off", (c) => `/api/catalog/${c.link}`, { status: 404 }),
    settings("on again keeps the link", { enabled: true }),
    get("works again", (c) => `/api/catalog/${c.link}`),
  ],
};

const history = {
  name: "history, usage and developer",
  steps: [
    ...onboard(),
    ...onboard("dev", DEVELOPER, "Developer Shop"),
    ...addStaff("rav", "ravi", { createOrders: true }),
    post("order", "/api/orders/create", { customerName: "Isha", item: "Lamp", total: 500, phone: "9876501234" }, { as: "admin", status: 201 }),
    post("order by staff", "/api/orders/create", { item: "Bulb", total: 50 }, { as: "rav", status: 201 }),
    get("history", "/api/activity", { as: "admin" }),
    get("history page 2", "/api/activity?page=2&limit=1", { as: "admin" }),
    get("history of orders", "/api/activity?kind=order&limit=500", { as: "admin" }),
    get("history search", "/api/activity?search=ravi", { as: "admin" }),
    get("history for staff", "/api/activity", { as: "rav", status: 403 }),
    post("count something done on screen", "/api/usage", { feature: "whatsapp.open" }, { as: "rav", status: 204 }),
    post("count again", "/api/usage", { feature: "whatsapp.open" }, { as: "admin", status: 204 }),
    post("server-only feature is not counted", "/api/usage", { feature: "order.create" }, { as: "admin", status: 204 }),
    post("unknown feature", "/api/usage", { feature: "nope" }, { as: "admin", status: 204 }),
    get("developer page hidden from owners", "/api/developer/usage", { as: "admin", status: 404 }),
    get("hidden shops", "/api/developer/shops", { as: "rav", status: 404 }),
    get("usage", "/api/developer/usage", { as: "dev" }),
    get("usage 7 days, one shop", (c) => `/api/developer/usage?days=7&shop=${c.adminShop}`, { as: "dev" }),
    get("usage: unknown shop", "/api/developer/usage?shop=0123456789abcdef01234567", { as: "dev", status: 400 }),
    get("usage: bad shop", "/api/developer/usage?shop=x", { as: "dev", status: 400 }),
    get("completeness", "/api/developer/completeness", { as: "dev" }),
    get("completeness of one", (c) => `/api/developer/completeness?shop=${c.adminShop}`, { as: "dev" }),
    get("completeness: bad shop", "/api/developer/completeness?shop=x", { as: "dev", status: 400 }),
    get("shops", "/api/developer/shops", { as: "dev" }),

    get("developer inside a shop", (c) => `/api/shop/${c.devId}`, { as: "dev", headers: (c) => ({ "x-dev-shop": c.adminShop }) }),
    post("developer creates an order there", "/api/orders/create", { item: "Test", total: 1 }, { as: "dev", headers: (c) => ({ "x-dev-shop": c.adminShop }), status: 201 }),
    post("developer use is not counted", "/api/usage", { feature: "whatsapp.send" }, { as: "dev", headers: (c) => ({ "x-dev-shop": c.adminShop }), status: 204 }),
    put("developer changes a setting", "/api/shop/settings/needs-review", { enabled: true, days: 9 }, { as: "dev", headers: (c) => ({ "x-dev-shop": c.adminShop }) }),
    get("owner sees it marked", "/api/activity", { as: "admin" }),
    get("shop that is gone", "/api/orders/review", { as: "dev", headers: { "x-dev-shop": "0123456789abcdef01234567" }, status: 404 }),
    get("nonsense shop", "/api/orders/review", { as: "dev", headers: { "x-dev-shop": "x" }, status: 404 }),
    get("others cannot use the header", "/api/orders/review", { as: "admin", headers: (c) => ({ "x-dev-shop": c.devShop }) }),
  ],
};

// Records as they were saved by older versions of the app.
const oldData = {
  name: "old data",
  steps: [
    {
      db: async (db, ctx) => {
        const { ObjectId } = need("mongodb");
        const bcrypt = need("bcryptjs");
        const ownerId = new ObjectId();
        const shopId = new ObjectId();
        const orderId = new ObjectId();
        await db.collection("users").insertOne({ _id: ownerId, name: "Old Owner", email: "Old.Owner@Example.test", password: bcrypt.hashSync(PASSWORD, 10), shopId, __v: 0 });
        await db.collection("shops").insertOne({ _id: shopId, name: "Old Shop", phone: "9876543210", category: "Printing", owner: ownerId, __v: 0 });
        await db.collection("orders").insertOne({ _id: orderId, orderId: "abc-1", shop: shopId, userId: ownerId, total: 100, customerName: "N", createdAt: new Date("2025-01-01"), updatedAt: new Date("2025-01-01"), __v: 0 });
        ctx.o = orderId.toHexString();
        ctx.shop = shopId.toHexString();
      },
    },
    freshIp(),
    login("old", "old.owner@example.test"),
    get("old shop", (c) => `/api/shop/${c.oldId}`, { as: "old" }),
    get("old orders", (c) => `/api/orders/shop/${c.shop}`, { as: "old" }),
    get("old summary", (c) => `/api/orders/shop/${c.shop}/summary`, { as: "old" }),
    get("old export", (c) => `/api/orders/shop/${c.shop}/export`, { as: "old" }),
    put("edit old order, name left alone", (c) => `/api/orders/${c.o}`, { total: 100, customerName: "N", status: "Delivered" }, { as: "old" }),
    post("first new order", "/api/orders/create", { total: 10 }, { as: "old", status: 201 }),
    put("first colour setting", "/api/shop/settings/status-colors", { statusColors: { Pending: { enabled: false, color: "red" } } }, { as: "old" }),
    post("track old id", "/api/orders/track", { orderId: "abc-1", phone: "9999999999" }),
    del("delete old order", (c) => `/api/orders/${c.o}`, { as: "old" }),
  ],
};

module.exports = [catalog, history, oldData];
