import { LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SideDrawer from "./SideDrawer";
import LogoutDialog from "./LogoutDialog";
import DevBanner from "./DevBanner";
import { navItemsFor } from "./navItems";
import { getShopLogo } from "../../../common/utils/utils";
import { preloadPage, preloadWhenIdle } from "../../../common/utils/pages";

// The top bar. On a computer (768 px and wider) the pages and Logout are right
// here as icons, one click away (names are written next to the icons on wider
// screens). On a phone there is the menu button, which opens the side menu.
const Navbar = ({ shop, account, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const { pathname } = useLocation();
  const isAdmin = account?.role === "admin";
  const items = navItemsFor(isAdmin, Boolean(account?.isDeveloper), account);
  // the page being opened: a page that is not downloaded yet takes a moment, so say so
  const [opening, setOpening] = useState(null);
  const paths = items.map((i) => i.path).join("|");

  // quietly download the other pages, so a click on them is instant
  useEffect(() => preloadWhenIdle(paths ? paths.split("|") : []), [paths]);

  // if it never opens (a bad connection), stop saying "opening" after a while
  useEffect(() => {
    if (!opening) return undefined;
    const timer = setTimeout(() => setOpening(null), 20000);
    return () => clearTimeout(timer);
  }, [opening]);
  const openingItem = items.find((i) => i.path === opening);

  // Escape closes the logout question
  useEffect(() => {
    if (!confirmingLogout) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setConfirmingLogout(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmingLogout]);

  return (
    <>
      {/* For the keyboard and screen readers: jump over the bar. Seen only when it has focus */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:font-medium focus:text-orange-800 focus:shadow-lg focus:ring-2 focus:ring-orange-500"
      >
        Skip to content
      </a>
      {/* One sticky block: the developer banner (if any) and the bar stay together */}
      <div className="sticky top-0 z-10">
      {openingItem && (
        <div role="status" className="absolute top-0 inset-x-0 h-1 bg-orange-500 animate-pulse motion-reduce:animate-none z-10">
          <span className="sr-only">Opening {openingItem.label}</span>
        </div>
      )}
      {account?.devMode && <DevBanner shop={shop} />}
      <nav className="app-bar bg-white border-b border-stone-200 shadow-sm px-4 md:px-6 py-3 flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={getShopLogo(shop)}
            alt="Shop Logo"
            className="w-10 h-10 shrink-0 rounded-full border border-stone-300 object-cover"
          />
          <span className="text-lg md:text-xl font-semibold text-stone-900 truncate">
            {shop.name || "Your Shop"}
          </span>
        </div>

        {/* Computer: the pages and Logout, right in the bar */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <ul className="flex items-center gap-1" aria-label="Pages">
            {items.map(({ path, label, icon: Icon }) => {
              const current = pathname === path;
              return (
                <li key={path}>
                  <Link
                    to={path}
                    onClick={() => !current && setOpening(path)}
                    onPointerEnter={() => preloadPage(path)}
                    onFocus={() => preloadPage(path)}
                    onTouchStart={() => preloadPage(path)}
                    aria-busy={opening === path ? "true" : undefined}
                    aria-current={current ? "page" : undefined}
                    aria-label={label}
                    title={label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                      current
                        ? "bg-orange-100 text-orange-900"
                        : opening === path
                          ? "bg-stone-100 text-stone-900 animate-pulse motion-reduce:animate-none"
                          : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <Icon size={20} className={current ? "text-orange-800" : "text-stone-500"} />
                    <span className="hidden lg:inline">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <span className="mx-1 h-6 w-px bg-stone-200" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setConfirmingLogout(true)}
            aria-label="Logout"
            title="Logout"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-stone-700 hover:bg-stone-100 transition"
          >
            <LogOut size={20} className="text-stone-500" />
            <span className="hidden lg:inline">Logout</span>
          </button>
        </div>

        {/* Phone: the menu button */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          aria-haspopup="dialog"
          className="md:hidden p-2.5 rounded-md hover:bg-stone-100 transition"
        >
          <Menu size={24} className="text-stone-700" />
        </button>
      </nav>
      </div>

      {/* The side menu is only for phones (hidden on a computer) */}
      <div className="md:hidden">
        <SideDrawer
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onLogout={onLogout}
          isAdmin={isAdmin}
          isDeveloper={Boolean(account?.isDeveloper)}
          account={account}
          onOpening={setOpening}
        />
      </div>

      {confirmingLogout && (
        <LogoutDialog onStay={() => setConfirmingLogout(false)} onLogout={onLogout} />
      )}
    </>
  );
};

export default Navbar;
