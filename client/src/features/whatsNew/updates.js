// What the "What's new" popup says.
//
// To announce a new update later: change WHATS_NEW_VERSION (any new text) and
// edit the list below. Everyone then sees the popup once more.
export const WHATS_NEW_VERSION = "2026-11-export";

export const WHATS_NEW_ITEMS = [
  {
    title: "Please save the phone number on every order",
    text: "Customers track their order with the Order ID and their phone number. If an order has no phone number, the customer cannot track it. Use the \"Phone number missing\" filter to find old orders without one.",
  },
  {
    title: "Export orders to Excel",
    text: "Admin: the new Export button saves your orders as an Excel file. It follows your search and filters, and you choose how many orders to include.",
  },
  {
    title: "Choose your table columns",
    text: "Admin: in Settings you decide which columns show in each order row. The rest show when you tap a row, so you do not need to scroll sideways. Rows and their opened details now use the same colour.",
  },
  {
    title: "Change your password",
    text: "Admin: you can now change your password in Settings. You stay logged in here, and other phones and computers are logged out.",
  },
  {
    title: "Change your email",
    text: "Admin: you can change your login email in Settings. Please make sure it is a real email you can open, because the forgot-password code is sent there.",
  },
];
