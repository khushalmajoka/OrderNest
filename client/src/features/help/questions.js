// The questions on the Help page. When a screen changes, change its answer here.
// who: not set = everyone; "admin" = the owner only; or a staff permission
// (the owner and staff who have it see the question).
export const HELP_TOPICS = [
  {
    title: "Orders",
    questions: [
      { who: "createOrders", q: "How do I make a new order?", a: "On the Dashboard press Create Order. Choose the products from your list (and their sizes), fill in the customer details and press Create. If you do not know the customer's name, leave it empty." },
      { who: "createOrders", q: "The product I need is not in the list. What do I do?", a: "It has to be added to Products first. If you may manage products, use \"Add as a new product\" in Create Order or the Products page. If not, ask your admin." },
      { who: "editOrders", q: "How do I change an order?", a: "On a computer, double-click the order's row. On a phone, double-tap the card or press Edit. Make your change and press the tick (or Enter). Press the cross (or Esc) to leave it as it was." },
      { who: "editOrders", q: "How do I change the products of an order?", a: "Open the menu of the order and choose Change products." },
      { who: "editOrders", q: "How do I change the status?", a: "Press Next step on the order to move it forward by one, or edit the order and choose any status. To change many orders at once, tick them and use the bar at the bottom. Right after a change you can press Undo." },
      { q: "What do the statuses mean?", a: "Press \"What do the statuses mean?\" above the order list. It explains every status your shop uses." },
      { who: "editOrders", q: "What is \"Orders that need a check\"?", a: "These are open orders whose delivery date passed some days ago. Open the list and say whether each one was delivered, was cancelled, or is not finished yet." },
      { q: "How do I find an order?", a: "Type a name, phone number, Order ID or product in the search box. Filters lets you choose by status, dates and more. The boxes at the top (Open, Overdue and so on) also show those orders when you tap them." },
      { who: "deleteOrders", q: "How do I delete an order?", a: "Open the menu of the order and choose Delete order. A deleted order cannot be brought back. If the customer only cancelled, change the status to Cancelled instead, so you keep the record." },
    ],
  },
  {
    title: "Customers",
    questions: [
      { who: "shareSlip", q: "How do I send a WhatsApp message to a customer?", a: "Press the green WhatsApp button on the order, choose the language, and WhatsApp opens with the message ready. You press send there. The order needs a phone number. You can also send the order picture along with it." },
      { who: "shareSlip", q: "How do I print or save a delivery slip?", a: "Open the menu of the order and choose Delivery slip. You can print it or download a PDF. \"Edit this slip\" changes only that print, not the order." },
      { who: "shareSlip", q: "How do I get a picture of an order?", a: "Open the menu of the order, choose Share, then the download button." },
      { q: "How does a customer check their order?", a: "They open the first page of the app and enter the Order ID and the phone number they gave you. An order saved without a phone number cannot be checked this way." },
    ],
  },
  {
    title: "Products and catalog",
    questions: [
      { who: "manageProducts", q: "How do I add a product or a size?", a: "On the Products page press Add product. Give the product one name and add each size with its own price. To add a size later, press Edit on the product." },
      { who: "manageProducts", q: "How do I add pictures to a product?", a: "Press Edit on the product and add up to 5 pictures. The first one is the main picture." },
      { who: "manageProducts", q: "If I change a price, do old orders change?", a: "No. Changing, renaming or archiving a product never changes an old order." },
      { who: "manageProducts", q: "What is the customer catalog?", a: "A page your customers open with a link, without any login. It shows your shop name, logo, phone and only the products you chose. It never shows orders, customers or staff." },
      { who: "manageProducts", q: "How do I choose what customers see in the catalog?", a: "Press Edit on a product, tick \"Show in catalog\" and save. The admin can also tick several products on the Products page and press \"Show in catalog\". Every product is hidden until you tick it." },
      { who: "manageProducts", q: "How do I send the catalog to a customer?", a: "On the Products page press Share catalog, then Copy or WhatsApp. If it says the catalog is switched off, the admin has to switch it on." },
      { who: "admin", q: "Can customers see my prices in the catalog?", a: "Only if you want. In Share catalog, tick \"Show prices to customers\". It is off until you tick it." },
      { who: "admin", q: "Someone has my catalog link who should not. What do I do?", a: "In Share catalog press \"Make a new link\". The old link stops working. You can also switch the catalog off." },
      { who: "admin", q: "How do I make categories?", a: "On the Products page press Categories. Then tick products and use Move to." },
    ],
  },
  {
    title: "Staff and shop",
    questions: [
      { who: "admin", q: "How do I add a staff member?", a: "Open Staff, press Add staff and choose what they can do. They log in with the username you give them." },
      { who: "admin", q: "A staff member forgot their password. What do I do?", a: "Open Staff and set a new password for them." },
      { who: "admin", q: "Where do I change the shop name, logo or phone?", a: "Settings, then Shop. The delivery slip settings are there too." },
      { who: "admin", q: "Where do I change the WhatsApp messages?", a: "Settings, then WhatsApp." },
      { who: "admin", q: "Can I switch off statuses I do not use?", a: "Yes, in Settings, then Orders. Old orders keep their status." },
      { who: "admin", q: "How do I see who changed something?", a: "Open Activity. It keeps the last 6 months." },
      { who: "admin", q: "How do I save my orders to Excel, or add orders from Excel?", a: "On the Dashboard, Export saves the orders you are looking at to an Excel file. Upload adds orders from an Excel file and asks which column is which." },
      { who: "admin", q: "Many old orders still show as open. What do I do?", a: "Settings, then Clean up, then Close old orders. It shows what will change before anything is done." },
    ],
  },
  {
    title: "My account and this device",
    questions: [
      { who: "admin", q: "How do I change my email or password?", a: "Settings, then My login. If you forgot the password, use \"Forgot password?\" on the login page." },
      { who: "staff", q: "How do I change my password?", a: "Open Settings and, under My password, ask your admin to approve. After they approve you can change it. If you forgot it, ask your admin to set a new one." },
      { who: "viewAmounts", q: "How do I hide amounts when someone is looking at my screen?", a: "Tap the eye on the Balance box on the Dashboard. To hide the amounts in the order list, use \"Amounts in the order list\" in Settings. This choice is kept on this device only." },
      { q: "Can I use a dark screen?", a: "Yes. Open Settings, then Appearance (staff: scroll down in Settings) and choose Calm, Classic orange or Dark. It changes only this device." },
      { q: "The app is slow to open. Why?", a: "After a quiet time the first request can take up to a minute while the server wakes up. After that it is quick. If something looks stuck, check the internet and refresh the page." },
    ],
  },
];

// Only the questions this person can act on
export const helpFor = (account) => {
  const admin = account?.role === "admin";
  const allowed = (who) => {
    if (!who) return true;
    if (who === "admin") return admin;
    if (who === "staff") return !admin;
    return admin || Boolean(account?.permissions?.[who]);
  };
  return HELP_TOPICS.map((t) => ({ ...t, questions: t.questions.filter((x) => allowed(x.who)) })).filter((t) => t.questions.length);
};
