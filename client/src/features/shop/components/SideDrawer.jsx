import { LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoutDialog from "./LogoutDialog";
import { navItemsFor } from "./navItems";

// The side menu for phones (on a computer the pages are in the top bar).
const SideDrawer = ({ isOpen, onClose, onLogout, isAdmin, isDeveloper = false, account = null, onOpening }) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (isOpen) {
      setShowDrawer(true);
    } else {
      const timer = setTimeout(() => setShowDrawer(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape closes the question first, then the menu
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirmingLogout) setConfirmingLogout(false);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, confirmingLogout, onClose]);

  if (!isOpen && !showDrawer) return null;

  return (
    <div className="fixed inset-0 z-20 flex">
      {/* Overlay */}
      <div
        className={`flex-1 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`w-64 bg-gradient-to-b from-orange-50 to-white h-full shadow-lg p-6 flex flex-col transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-orange-700">Menu</h2>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2.5 rounded-md hover:bg-orange-100 transition"
          >
            <X className="text-orange-700" size={22} />
          </button>
        </div>

        {navItemsFor(isAdmin, isDeveloper, account).map(({ path, label, icon: Icon }) => {
          const current = pathname === path;
          return (
            <button
              key={path}
              onClick={() => {
                if (!current) onOpening?.(path);
                navigate(path);
                onClose();
              }}
              aria-current={current ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition ${
                current ? "bg-orange-200 text-orange-900 font-medium" : "hover:bg-orange-100"
              }`}
            >
              <Icon className="text-orange-700" size={20} />
              {label}
            </button>
          );
        })}

        <div className="mt-auto">
          <button
            onClick={() => setConfirmingLogout(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-md bg-orange-700 hover:bg-orange-800 text-white font-medium shadow"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>

      {confirmingLogout && (
        <LogoutDialog onStay={() => setConfirmingLogout(false)} onLogout={onLogout} />
      )}
    </div>
  );
};

export default SideDrawer;
