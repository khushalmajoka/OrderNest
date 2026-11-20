import { LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SideDrawer from "./SideDrawer";
import LogoutDialog from "./LogoutDialog";
import { navItemsFor } from "./navItems";
import { getShopLogo } from "../../../common/utils/utils";

// The top bar. On a computer (768 px and wider) the pages and Logout are right
// here as icons, one click away (names are written next to the icons on wider
// screens). On a phone there is the menu button, which opens the side menu.
const Navbar = ({ shop, account, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const { pathname } = useLocation();
  const isAdmin = account?.role === "admin";
  const items = navItemsFor(isAdmin);

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
      <nav className="sticky top-0 z-10 bg-orange-50 border-b border-orange-200 shadow-md px-4 md:px-6 py-3 flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={getShopLogo(shop)}
            alt="Shop Logo"
            className="w-10 h-10 shrink-0 rounded-full border border-orange-400 object-cover"
          />
          <span className="text-lg md:text-xl font-semibold text-orange-800 truncate">
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
                    aria-current={current ? "page" : undefined}
                    aria-label={label}
                    title={label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                      current
                        ? "bg-orange-200 text-orange-900"
                        : "text-orange-800 hover:bg-orange-100"
                    }`}
                  >
                    <Icon size={20} className={current ? "text-orange-800" : "text-orange-600"} />
                    <span className="hidden lg:inline">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <span className="mx-1 h-6 w-px bg-orange-200" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setConfirmingLogout(true)}
            aria-label="Logout"
            title="Logout"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-orange-800 hover:bg-orange-100 transition"
          >
            <LogOut size={20} className="text-orange-600" />
            <span className="hidden lg:inline">Logout</span>
          </button>
        </div>

        {/* Phone: the menu button */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          aria-haspopup="dialog"
          className="md:hidden p-2.5 rounded-md hover:bg-orange-100 transition"
        >
          <Menu size={24} className="text-orange-700" />
        </button>
      </nav>

      {/* The side menu is only for phones (hidden on a computer) */}
      <div className="md:hidden">
        <SideDrawer
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onLogout={onLogout}
          isAdmin={isAdmin}
        />
      </div>

      {confirmingLogout && (
        <LogoutDialog onStay={() => setConfirmingLogout(false)} onLogout={onLogout} />
      )}
    </>
  );
};

export default Navbar;
