import { LayoutDashboard, Settings, LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SideDrawer = ({ isOpen, onClose, onLogout }) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setShowDrawer(true);
    } else {
      const timer = setTimeout(() => setShowDrawer(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
        className={`w-64 bg-gradient-to-b from-orange-50 to-white h-full shadow-lg p-6 flex flex-col transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-orange-700">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-orange-100 transition"
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
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium shadow"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SideDrawer;