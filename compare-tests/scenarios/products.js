const { get, post, put, del, onboard, addStaff } = require("./helpers");

// the smallest things that look like pictures to the server
const picture = (bytes, extra = 40) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(extra, 7)]).toString("base64");
const JPG = picture([0xff, 0xd8, 0xff, 0xe0]);
const PNG = `data:image/png;base64,${picture([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])}`;

const family = (name, key, body, extra = {}) =>
  post(name, "/api/products/families", body, {
    as: "admin",
    status: 201,
    save: (b, c) => {
      c[key] = b.family._id;
      c[`${key}Size`] = b.sizes[0]._id;
      c[`${key}Size2`] = b.sizes[1]?._id;
    },
    ...extra,
  });
const category = (name, key, extra = {}) =>
  post(`category ${name}`, "/api/products/categories", { name }, { as: "admin", status: 201, save: (b, c) => (c[key] = b.category._id), ...extra });

const catalogue = [
  category("  Photo   Frames ", "cat1"),
  category("Mugs", "cat2"),
  family("frame with two sizes", "frame", (c) => ({
    name: "Frame",
    category: c.cat1,
    notes: " Teak  wood ",
    sizes: [
      { size: { kind: "dimensions", length: 10, breadth: 8 }, price: "250", priceUnit: "piece" },
      { size: { kind: "dimensions", length: 12, breadth: 18, height: 1.5, dimUnit: "cm" }, price: 400.555 },
    ],
  })),
  family("cake by weight", "cake", { name: "Cake", sizes: [{ size: { kind: "weight", weight: 1.0 }, price: 500.0, priceUnit: "kg" }, { size: { kind: "weight", weight: "0.5", weightUnit: "g" } }] }),
  family("product without size", "card", { name: "Greeting Card", inCatalog: true }),
];

const manage = {
  name: "categories, products and sizes",
  steps: [
    ...onboard(),
    get("empty list", "/api/products", { as: "admin" }),
    ...catalogue,
    post("category: empty", "/api/products/categories", { name: " " }, { as: "admin", status: 400 }),
    post("category: taken", "/api/products/categories", { name: "mugs" }, { as: "admin", status: 400 }),
    put("rename category", (c) => `/api/products/categories/${c.cat2}`, { name: "Cups" }, { as: "admin" }),
    put("rename: same", (c) => `/api/products/categories/${c.cat2}`, { name: "Cups" }, { as: "admin" }),
    put("rename: taken", (c) => `/api/products/categories/${c.cat2}`, { name: "photo frames" }, { as: "admin", status: 400 }),
    put("rename: empty", (c) => `/api/products/categories/${c.cat2}`, {}, { as: "admin", status: 400 }),
    put("rename: unknown", "/api/products/categories/0123456789abcdef01234567", { name: "x" }, { as: "admin", status: 404 }),
    put("rename: not an id", "/api/products/categories/abc", { name: "x" }, { as: "admin", status: 404 }),
    post("family: no name", "/api/products/families", {}, { as: "admin", status: 400 }),
    post("family: taken", "/api/products/families", { name: "FRAME" }, { as: "admin", status: 400 }),
    post("family: same size twice", "/api/products/families", { name: "Pen", sizes: [{}, {}] }, { as: "admin", status: 400 }),
    post("family: bad size", "/api/products/families", { name: "Pen", sizes: [{ size: { kind: "weight" } }] }, { as: "admin", status: 400 }),
    post("family: bad price", "/api/products/families", { name: "Pen", sizes: [{ price: -1 }] }, { as: "admin", status: 400 }),
    post("family: bad unit", "/api/products/families", { name: "Pen", sizes: [{ priceUnit: "ton" }] }, { as: "admin", status: 400 }),
    post("family: bad category", "/api/products/families", { name: "Pen", category: "x" }, { as: "admin", status: 400 }),
    post("family: too many sizes", "/api/products/families", { name: "Pen", sizes: Array(51).fill({}) }, { as: "admin", status: 400 }),
    get("list", "/api/products", { as: "admin" }),
    get("search words in any order", "/api/products?search=10%20x%208%20teak", { as: "admin" }),
    get("limit", "/api/products?limit=2", { as: "admin" }),

    post("add a size", "/api/products", (c) => ({ family: c.frame, size: { kind: "text", text: " Large " }, price: 900 }), { as: "admin", status: 201, save: (b, c) => (c.large = b.product._id) }),
    post("add by name (new product)", "/api/products", (c) => ({ name: "Mug", price: "120", category: c.cat2, notes: "White" }), { as: "admin", status: 201, save: (b, c) => (c.mug = b.product._id) }),
    post("add: already there", "/api/products", { name: "mug" }, { as: "admin", status: 400 }),
    post("add: unknown product", "/api/products", { family: "abc" }, { as: "admin", status: 400 }),
    post("add: no name", "/api/products", {}, { as: "admin", status: 400 }),
    put("change price", (c) => `/api/products/${c.mug}`, { price: 150.0 }, { as: "admin" }),
    put("nothing changes", (c) => `/api/products/${c.mug}`, { price: 150 }, { as: "admin" }),
    put("remove price", (c) => `/api/products/${c.mug}`, { price: "" }, { as: "admin" }),
    put("archive size", (c) => `/api/products/${c.mug}`, { active: false }, { as: "admin" }),
    post("add: archived one exists", "/api/products", { name: "Mug" }, { as: "admin", status: 400 }),
    get("archived hidden", "/api/products", { as: "admin" }),
    get("archived shown", "/api/products?archived=1", { as: "admin" }),
    put("restore size", (c) => `/api/products/${c.mug}`, { active: true }, { as: "admin" }),
    put("rename through a size", (c) => `/api/products/${c.frameSize}`, { name: "Wood Frame" }, { as: "admin" }),
    put("size clash", (c) => `/api/products/${c.frameSize}`, { size: { kind: "text", text: "Large" } }, { as: "admin", status: 400 }),
    put("name clash", (c) => `/api/products/${c.frameSize}`, { name: "Mug" }, { as: "admin", status: 400 }),
    put("unknown size", "/api/products/0123456789abcdef01234567", {}, { as: "admin", status: 404 }),
    put("size: not an id", "/api/products/abc", {}, { as: "admin", status: 404 }),
    put("edit product", (c) => `/api/products/families/${c.cake}`, (c) => ({ name: "Fruit Cake", notes: "Eggless", category: c.cat2, inCatalog: true }), { as: "admin" }),
    put("archive whole product", (c) => `/api/products/families/${c.cake}`, { active: false }, { as: "admin" }),
    put("restore whole product", (c) => `/api/products/families/${c.cake}`, { active: true, category: "" }, { as: "admin" }),
    put("product: name taken", (c) => `/api/products/families/${c.cake}`, { name: "Mug" }, { as: "admin", status: 400 }),
    put("product: unknown", "/api/products/families/0123456789abcdef01234567", {}, { as: "admin", status: 404 }),
    put("product: not an id", "/api/products/families/abc", {}, { as: "admin", status: 404 }),
    post("move to category", "/api/products/move", (c) => ({ ids: [c.card, c.frameSize], category: c.cat2 }), { as: "admin" }),
    post("move to none", "/api/products/move", (c) => ({ ids: [c.card], category: null }), { as: "admin" }),
    post("move: nothing", "/api/products/move", { ids: [] }, { as: "admin", status: 400 }),
    post("move: bad id", "/api/products/move", { ids: ["x"] }, { as: "admin", status: 400 }),
    post("move: bad category", "/api/products/move", (c) => ({ ids: [c.card], category: "x" }), { as: "admin", status: 400 }),
    del("delete category", (c) => `/api/products/categories/${c.cat2}`, { as: "admin" }),
    del("delete category again", (c) => `/api/products/categories/${c.cat2}`, { as: "admin", status: 404 }),
    del("delete: not an id", "/api/products/categories/abc", { as: "admin", status: 404 }),
    get("history", "/api/activity?kind=product&limit=100", { as: "admin" }),
  ],
};

const pictures = {
  name: "product pictures",
  steps: [
    ...onboard(),
    ...onboard("other", "other@example.test", "Other Shop"),
    ...catalogue,
    post("add jpg", (c) => `/api/products/${c.frame}/images`, { full: JPG, thumb: JPG }, { as: "admin", status: 201, save: (b, c) => (c.img1 = b.image._id) }),
    post("add png through a size", (c) => `/api/products/${c.frameSize}/images`, { full: PNG, thumb: JPG }, { as: "admin", status: 201, save: (b, c) => (c.img2 = b.image._id) }),
    post("not a picture", (c) => `/api/products/${c.frame}/images`, { full: Buffer.from("hello world!!!").toString("base64"), thumb: JPG }, { as: "admin", status: 400 }),
    post("no picture", (c) => `/api/products/${c.frame}/images`, {}, { as: "admin", status: 400 }),
    post("too big", (c) => `/api/products/${c.frame}/images`, { full: picture([0xff, 0xd8, 0xff], 260 * 1024), thumb: JPG }, { as: "admin", status: 400 }),
    post("unknown product", "/api/products/0123456789abcdef01234567/images", { full: JPG, thumb: JPG }, { as: "admin", status: 404 }),
    post("product not an id", "/api/products/abc/images", { full: JPG, thumb: JPG }, { as: "admin", status: 404 }),
    get("see full", (c) => `/api/products/images/${c.img1}`, { as: "admin" }),
    get("see thumb", (c) => `/api/products/images/${c.img2}?size=thumb`, { as: "admin" }),
    get("other shop cannot see", (c) => `/api/products/images/${c.img1}`, { as: "other", status: 404 }),
    get("not an id", "/api/products/images/abc", { as: "admin", status: 404 }),
    put("make second the main one", (c) => `/api/products/${c.frame}/images/order`, (c) => ({ ids: [c.img2, c.img1] }), { as: "admin" }),
    put("same order", (c) => `/api/products/${c.frame}/images/order`, (c) => ({ ids: [c.img2, c.img1] }), { as: "admin" }),
    put("order: changed meanwhile", (c) => `/api/products/${c.frame}/images/order`, (c) => ({ ids: [c.img2] }), { as: "admin", status: 400 }),
    put("order: unknown product", "/api/products/abc/images/order", { ids: [] }, { as: "admin", status: 404 }),
    ...[3, 4, 5].map((n) => post(`picture ${n}`, (c) => `/api/products/${c.frame}/images`, { full: JPG, thumb: JPG }, { as: "admin", status: 201 })),
    post("sixth picture", (c) => `/api/products/${c.frame}/images`, { full: JPG, thumb: JPG }, { as: "admin", status: 400 }),
    del("other shop cannot remove", (c) => `/api/products/images/${c.img1}`, { as: "other", status: 404 }),
    del("remove", (c) => `/api/products/images/${c.img1}`, { as: "admin" }),
    del("remove again", (c) => `/api/products/images/${c.img1}`, { as: "admin", status: 404 }),
    del("remove: not an id", "/api/products/images/abc", { as: "admin", status: 404 }),
  ],
};

const orderLines = {
  name: "products on orders",
  steps: [
    ...onboard(),
    ...catalogue,
    ...addStaff("sell", "seller", { createOrders: true, editOrders: true }),
    post("order with products", "/api/orders/create", (c) => ({ customerName: "Gita", total: 900, lines: [{ product: c.frameSize, quantity: 2, unitPrice: "240", note: "  Land scape " }, { product: c.cakeSize, quantity: 1.5 }] }), { as: "admin", status: 201, save: (b, c) => (c.o1 = b.order._id) }),
    post("seller's price comes from the product", "/api/orders/create", (c) => ({ item: "ignored", total: 5, lines: [{ product: c.frameSize, quantity: "3", unitPrice: 1 }] }), { as: "sell", status: 201, save: (b, c) => (c.o2 = b.order._id) }),
    post("empty products", "/api/orders/create", { item: "Plain", total: 5, lines: [] }, { as: "admin", status: 201 }),
    ...[
      ["quantity 0", (c) => [{ product: c.frameSize, quantity: 0 }]],
      ["quantity 4 decimals", (c) => [{ product: c.frameSize, quantity: 1.2345 }]],
      ["bad price", (c) => [{ product: c.frameSize, quantity: 1, unitPrice: -1 }]],
      ["long note", (c) => [{ product: c.frameSize, quantity: 1, note: "x".repeat(41) }]],
      ["unknown product", () => [{ product: "0123456789abcdef01234567", quantity: 1 }]],
      ["too many", (c) => Array(21).fill({ product: c.frameSize, quantity: 1 })],
    ].map(([name, lines]) => post(`order: ${name}`, "/api/orders/create", (c) => ({ total: 5, lines: lines(c) }), { as: "admin", status: 400 })),
    put("archive one product", (c) => `/api/products/${c.cakeSize}`, { active: false }, { as: "admin" }),
    post("archived cannot be added", "/api/orders/create", (c) => ({ total: 5, lines: [{ product: c.cakeSize, quantity: 1 }] }), { as: "admin", status: 400 }),
    put("order keeps its archived product", (c) => `/api/orders/${c.o1}`, (c) => ({ total: 900, lines: [{ product: c.cakeSize, quantity: 2 }] }), { as: "admin" }),
    put("seller keeps the old price", (c) => `/api/orders/${c.o2}`, (c) => ({ lines: [{ product: c.frameSize, quantity: 4, unitPrice: 999 }] }), { as: "sell" }),
    put("remove products", (c) => `/api/orders/${c.o2}`, { lines: [], item: "By hand" }, { as: "sell" }),
    get("list", (c) => `/api/orders/shop/${c.adminShop}`, { as: "sell" }),
    get("products for the seller (no prices)", "/api/products?archived=1", { as: "sell" }),
    post("seller cannot add products", "/api/products", { name: "X" }, { as: "sell", status: 403 }),
    post("seller cannot add categories", "/api/products/categories", { name: "X" }, { as: "sell", status: 403 }),
    ...addStaff("keeper", "keeper", { manageProducts: true }),
    post("keeper adds without a price", "/api/products", { name: "Sticker", price: 10, priceUnit: "ton" }, { as: "keeper", status: 201 }),
    post("keeper cannot set a category", "/api/products", (c) => ({ name: "Badge", category: c.cat1 }), { as: "keeper", status: 201 }),
    ...addStaff("none", "nopower", {}),
    get("no powers, no list", "/api/products", { as: "none", status: 403 }),
    get("no powers, no picture", "/api/products/images/0123456789abcdef01234567", { as: "none", status: 403 }),
  ],
};

const fromOrders = {
  name: "products from old orders, tidy sizes, old products",
  steps: [
    ...onboard(),
    ...["Frame 8x10", "frame 10 x 8", "Frame 8 x 10 inch", "Cake 1kg", "Cake 1 kg", "Mug", "Mug", "Visiting card"].map((item, i) =>
      post(`old order ${i}`, "/api/orders/create", { item, total: 100 + i }, { as: "admin", status: 201 })
    ),
    get("suggestions", "/api/products/from-orders", { as: "admin" }),
    get("suggestions from one order", "/api/products/from-orders?min=1", { as: "admin" }),
    post("add chosen", "/api/products/from-orders", { items: [{ name: "Frame", size: { kind: "dimensions", length: 8, breadth: 10 }, price: 200 }, { name: "Mug" }, { name: "mug" }] }, { as: "admin", status: 201 }),
    post("add again", "/api/products/from-orders", { items: [{ name: "Mug" }] }, { as: "admin", status: 201 }),
    post("add: nothing", "/api/products/from-orders", { items: [] }, { as: "admin", status: 400 }),
    post("add: bad", "/api/products/from-orders", { items: [{ name: "" }] }, { as: "admin", status: 400 }),
    // products saved before sizes lived inside products, some with the bigger number first
    {
      db: async (db) => {
        const shop = await db.collection("shops").findOne({});
        const at = new Date("2026-02-01T00:00:00Z");
        const old = (name, length, breadth, extra = {}) => ({
          shop: shop._id,
          name,
          size: { kind: "dimensions", length, breadth, dimUnit: "inch" },
          sizeLabel: `${length} x ${breadth} inch`,
          priceUnit: "piece",
          active: true,
          nameKey: `${name.toLowerCase()}|${length} x ${breadth} inch`,
          images: [],
          createdAt: at,
          updatedAt: at,
          ...extra,
        });
        await db.collection("products").insertOne(old("Poster", 18, 12, { price: 90, notes: "Matte" }));
        await db.collection("products").insertOne(old("Frame", 10, 8, { price: 300 }));
        await db.collection("products").insertOne(old("Banner", 6, 3, { active: false }));
      },
    },
    get("list groups old products", "/api/products?archived=1", { as: "admin" }),
    get("tidy plan", "/api/products/tidy-sizes", { as: "admin", save: (b, c) => (c.tidy = b.plan.map((p) => p._id)) }),
    post("tidy: nothing chosen", "/api/products/tidy-sizes", { ids: [] }, { as: "admin", status: 400 }),
    post("tidy sizes", "/api/products/tidy-sizes", (c) => ({ ids: c.tidy }), { as: "admin" }),
    get("tidy plan after", "/api/products/tidy-sizes", { as: "admin" }),
    get("list after", "/api/products?archived=1", { as: "admin" }),
  ],
};

module.exports = [manage, pictures, orderLines, fromOrders];
