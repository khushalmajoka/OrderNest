import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// The name of each page in the browser tab (and what a screen reader says when
// a page opens). A page not listed here (like the developer page) is just "OrderNest".
const TITLES = {
  "/": "Track your order",
  "/shop": "Login",
  "/shop/signup": "Sign up",
  "/shop/forgot-password": "Forgot password",
  "/shop/verify-email": "Verify your email",
  "/shop/dashboard": "Dashboard",
  "/shop/onboarding": "Set up your shop",
  "/shop/settings": "Settings",
  "/shop/staff": "Staff",
  "/shop/activity": "Activity",
  "/shop/products": "Products",
};

const PageTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const name = TITLES[pathname.replace(/\/+$/, "") || "/"];
    document.title = name ? `${name} - OrderNest` : "OrderNest";
  }, [pathname]);
  return null;
};

export default PageTitle;
