import { History, LayoutDashboard, Settings, LogOut, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SideDrawer = ({ isOpen, onClose, onLogout, isAdmin }) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const navigate = useNavigate();

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

        <button
          onClick={() => {
            navigate("/shop/dashboard");
            onClose();
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-orange-100 transition"
        >
          <LayoutDashboard className="text-orange-600" size={20} />
          Dashboard
        </button>

        {isAdmin && (
          <button
            onClick={() => {
              navigate("/shop/staff");
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-orange-100 transition"
          >
            <Users className="text-orange-600" size={20} />
            Staff
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => {
              navigate("/shop/activity");
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-orange-100 transition"
          >
            <History className="text-orange-600" size={20} />
            Activity
          </button>
        )}

        <button
          onClick={() => {
            navigate("/shop/settings");
            onClose();
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-orange-100 transition"
        >
          <Settings className="text-orange-600" size={20} />
          Settings
        </button>

        <div className="mt-auto">
          <button
            onClick={() => setConfirmingLogout(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium shadow"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>

      {confirmingLogout && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmingLogout(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="bg-white rounded-lg shadow-lg w-full max-w-xs p-6 animate-fade-up motion-reduce:animate-none"
          >
            <h2 id="logout-title" className="text-lg font-semibold text-gray-800 mb-2">
              Log out?
            </h2>
            <p className="text-sm text-gray-600 mb-5">You will need to login again.</p>
            <div className="flex justify-end gap-3">
              <button
                autoFocus
                onClick={() => setConfirmingLogout(false)}
                className="px-4 py-2 min-h-[44px] text-gray-700 border rounded hover:bg-gray-100"
              >
                Stay
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 min-h-[44px] text-white rounded bg-orange-500 hover:bg-orange-600"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SideDrawer;