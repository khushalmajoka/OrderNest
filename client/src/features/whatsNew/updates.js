// What the "What's new" popup says.
//
// To announce a new update later: change WHATS_NEW_VERSION (any new text) and
// edit the list below. Everyone then sees the popup once more.
// An item with highlight: true is shown in an orange box at the top.
export const WHATS_NEW_VERSION = "2026-11-products-2";

export const WHATS_NEW_ITEMS = [
  {
    highlight: true,
    title: "Please start using Products: typing the item will go away soon",
    text: "Today you can still type anything in the Item box when you create an order. This is going to be removed soon, when the Products page is no longer in BETA. From now on, please add your items on the Products page (name, size and price once), and always pick them from the list when you create or edit an order. This links every order to its product, so names and sizes stay the same everywhere and you never type them again.",
  },
  {
    title: "One product, many sizes",
    text: "A product like \"Frame\" now appears once, with all its sizes inside, each size with its own price. A product with no size (like a Mug) has just one price. In Create order, pick the product first, then its size. The same product in two sizes is two lines. Your old products were grouped by name automatically: nothing was deleted and no order was changed.",
  },
  {
    title: "Product pictures",
    text: "Add up to 5 pictures to a product (the first one is the main picture). On the Products page you can switch between List and Cards, and tap a picture to see it big. Pictures also show when you pick a product in Create order.",
  },
  {
    title: "Product categories (admin)",
    text: "Admin: make your own categories (for example Frames, Mugs, Gifts) with the \"Categories\" button, and move products into them. The Products page then shows products in groups, with buttons at the top to see one category at a time. Staff can see the groups but cannot change them.",
  },
  {
    title: "Several products in one order",
    text: "One order can now have many products, each with its own quantity. Search and pick them in Create order. To change them later, double-click the order and use \"Change products\". The delivery slip and the share picture list every product.",
  },
  {
    title: "The Products page",
    text: "Add products with their sizes and prices (needs the \"Manage products\" permission for staff). Not sure where to start? Use \"Build from old orders\": it reads your old orders, suggests products with sizes and a price, and you tick what you want to add. No old order is changed.",
  },
  {
    title: "One size, either way round",
    text: "8 x 10 and 10 x 8 are now the same size. Sizes are always kept with the smaller number first. If you already have products made the old way, use \"Make sizes the same way\" on the Products page: it shows a preview first and changes no order.",
  },
  {
    title: "A note on a product (Portrait or Landscape)",
    text: "On a product in an order you can add a small note, with buttons for Portrait and Landscape. It shows in the list, in Activity, on the delivery slip and on the share picture. Admin: in Settings (\"Share picture\") you choose whether the note is printed.",
  },
  {
    title: "Simpler order statuses",
    text: "Status names are shorter and have hints. Use \"Next step\" on an order to move it forward. You can also tick many orders and press \"Change status\" (with Undo). After Ready or Dispatched, the app asks if you want to tell the customer on WhatsApp.",
  },
  {
    title: "Old open orders are checked for you",
    text: "Orders that stayed open for a long time are shown in \"Needs review\", so you can close or fix them. Admin: you can set this in Settings (\"Check old open orders\").",
  },
];
