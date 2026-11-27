import { lazyWithRetry } from "./lazyWithRetry";

// Every page is downloaded only when it is opened, so a customer who just
// tracks an order does not download the whole shop app. The shop pages are also
// fetched quietly in the background once the shop area is open (and when a menu
// item is pointed at), so a click on them is instant.
const loaders = {
  TrackOrderPage: () => import("../../features/tracking/pages/TrackOrderPage"),
  LoginPage: () => import("../../features/auth/pages/LoginPage"),
  SignupPage: () => import("../../features/auth/pages/SignupPage"),
  ForgotPasswordPage: () => import("../../features/auth/pages/ForgotPasswordPage"),
  VerifyEmailPage: () => import("../../features/auth/pages/VerifyEmailPage"),
  DashboardPage: () => import("../../features/orders/pages/DashboardPage"),
  Onboarding: () => import("../../features/shop/pages/Onboarding"),
  Settings: () => import("../../features/shop/pages/Settings"),
  StaffPage: () => import("../../features/shop/pages/StaffPage"),
  ActivityPage: () => import("../../features/shop/pages/ActivityPage"),
  ProductsPage: () => import("../../features/products/pages/ProductsPage"),
  DeveloperPage: () => import("../../features/developer/pages/DeveloperPage"),
  CatalogPage: () => import("../../features/catalog/pages/CatalogPage"),
};

export const pages = Object.fromEntries(Object.entries(loaders).map(([name, load]) => [name, lazyWithRetry(load)]));

// the page of each menu item
const byPath = {
  "/shop/dashboard": loaders.DashboardPage,
  "/shop/products": loaders.ProductsPage,
  "/shop/staff": loaders.StaffPage,
  "/shop/activity": loaders.ActivityPage,
  "/shop/settings": loaders.Settings,
  "/developer": loaders.DeveloperPage,
};

// Start downloading a page now (a failure is ignored: opening it later tries again)
export const preloadPage = (path) => {
  const load = byPath[path];
  if (load) load().catch(() => {});
};

// Download the pages when the browser is idle (not while something else is loading)
export const preloadWhenIdle = (paths) => {
  const run = () => paths.forEach(preloadPage);
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 4000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = setTimeout(run, 1500);
  return () => clearTimeout(id);
};
