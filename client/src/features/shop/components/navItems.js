import { Code2, History, LayoutDashboard, Package, Settings, Users } from "lucide-react";

// The pages of the shop area, in the order they appear in the top bar and in
// the phone menu. adminOnly = the owner only (staff do not see it).
export const NAV_ITEMS = [
  { path: "/shop/dashboard", label: "Dashboard", icon: LayoutDashboard },
  // the admin, and staff who were given "Manage products"
  { path: "/shop/products", label: "Products", icon: Package, permission: "manageProducts" },
  { path: "/shop/staff", label: "Staff", icon: Users, adminOnly: true },
  { path: "/shop/activity", label: "Activity", icon: History, adminOnly: true },
  { path: "/shop/settings", label: "Settings", icon: Settings },
  // only the developer sees this one
  { path: "/developer", label: "Developer", icon: Code2, developerOnly: true },
];

export const navItemsFor = (isAdmin, isDeveloper = false, account = null) =>
  NAV_ITEMS.filter((item) => {
    if (item.developerOnly) return isDeveloper;
    if (item.permission) return isAdmin || Boolean(account?.permissions?.[item.permission]);
    return isAdmin || !item.adminOnly;
  });
