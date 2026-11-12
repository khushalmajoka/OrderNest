// What the "What's new" popup says.
//
// To announce a new update later: change WHATS_NEW_VERSION (any new text) and
// edit the list below. Everyone then sees the popup once more.
export const WHATS_NEW_VERSION = "2026-11-12-staff-filters-slip";

export const WHATS_NEW_ITEMS = [
  {
    title: "Staff logins",
    text: "The admin can now add staff in the new Staff page. Each staff member logs in with a username and can only do what the admin allows: view, create, edit, delete, or print slips. A staff member who wants a new password must ask the admin to approve it first.",
  },
  {
    title: "Filters",
    text: "Use the new Filters button to find orders by status, amount, dates, order number, phone, customer and more. Overdue orders and orders with balance due are one tap away.",
  },
  {
    title: "Status colours",
    text: "Orders are now coloured by status, for example Pending in yellow. In Settings the admin can choose a colour for each status, or switch the colour off.",
  },
  {
    title: "Delivery slip",
    text: "Print a delivery slip for any order, ready to paste on the parcel. It shows the customer name, phone, delivery address, and the amount to collect. You can now save an address on every order, also from Excel.",
  },
  {
    title: "Forgot password",
    text: "If the admin forgets the password, tap \"Forgot password?\" on the login page. A 6-digit code is sent to the admin's email.",
  },
  {
    title: "Overdue orders",
    text: "Orders past their delivery date now show \"N days late\" in red, instead of 0 days. Excel upload now saves the delivery date and amounts correctly.",
  },
];
