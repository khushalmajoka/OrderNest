import { Menu } from "lucide-react";
import { useState } from "react";
import SideDrawer from "./SideDrawer";

const Navbar = ({ shop, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-10 backdrop-blur-lg bg-white/30 border-b border-orange-200 shadow-md px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src={shop.logo}
            alt="Shop Logo"
            className="w-10 h-10 rounded-full border border-orange-400"
          />
          <span className="text-xl font-semibold text-orange-800">
            {shop.name || "Your Shop"}
          </span>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-md hover:bg-orange-100 transition"
        >
          <Menu size={24} className="text-orange-700" />
        </button>
      </nav>

      <SideDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onLogout={onLogout}
      />
    </>
  );
};

export default Navbar;