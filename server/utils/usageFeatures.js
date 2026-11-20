// Every feature that is counted. `where`: "server" = counted by the server
// itself, "client" = reported by the app (things that only happen on screen).
// `group` is only for tidy headings on the developer page.
module.exports = [
  // Orders
  { key: "order.create", label: "Create order", group: "Orders", where: "server" },
  { key: "order.edit", label: "Edit order details", group: "Orders", where: "server" },
  { key: "order.status", label: "Change an order's status", group: "Orders", where: "server" },
  { key: "order.delete", label: "Delete order", group: "Orders", where: "server" },
  { key: "orders.search", label: "Search orders", group: "Orders", where: "client" },
  { key: "orders.filter", label: "Use filters", group: "Orders", where: "client" },
  { key: "orders.sort", label: "Sort the list", group: "Orders", where: "client" },
  { key: "orders.tile", label: "Tap a dashboard tile", group: "Orders", where: "client" },
  { key: "orders.refresh", label: "Press Refresh", group: "Orders", where: "client" },
  { key: "orders.bulk_upload", label: "Bulk upload (Excel)", group: "Orders", where: "server" },
  { key: "orders.export", label: "Export (Excel)", group: "Orders", where: "server" },
  // Sharing
  { key: "whatsapp.open", label: "WhatsApp window opened", group: "Sharing", where: "client" },
  { key: "whatsapp.send", label: "WhatsApp message started", group: "Sharing", where: "client" },
  { key: "share.open", label: "Share picture window", group: "Sharing", where: "client" },
  { key: "slip.open", label: "Delivery slip window", group: "Sharing", where: "client" },
  // Customers
  { key: "tracking.view", label: "Customer tracked an order", group: "Customers", where: "server" },
  // Admin
  { key: "activity.view", label: "Activity history opened", group: "Admin", where: "server" },
  { key: "staff.manage", label: "Staff changes", group: "Admin", where: "server" },
  { key: "settings.profile", label: "Shop details saved", group: "Settings", where: "server" },
  { key: "settings.colors", label: "Status colours saved", group: "Settings", where: "server" },
  { key: "settings.columns", label: "Table columns saved", group: "Settings", where: "server" },
  { key: "settings.slip", label: "Delivery slip settings saved", group: "Settings", where: "server" },
  { key: "settings.whatsapp", label: "WhatsApp messages saved", group: "Settings", where: "server" },
  { key: "tool.close_old", label: "Close old orders tool used", group: "Settings", where: "server" },
  { key: "tool.clean_names", label: "Clean customer names tool used", group: "Settings", where: "server" },
];
