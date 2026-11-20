import { History, LayoutDashboard, Settings, Users } from "lucide-react";

// The pages of the shop area, in the order they appear in the top bar and in
// the phone menu. adminOnly = the owner only (staff do not see it).
export const NAV_ITEMS = [
  { path: "/shop/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/shop/staff", label: "Staff", icon: Users, adminOnly: true },
  { path: "/shop/activity", label: "Activity", icon: History, adminOnly: true },
  { path: "/shop/settings", label: "Settings", icon: Settings },
];

export const navItemsFor = (isAdmin) => NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);
