import { Menu } from "lucide-react";
import { useState } from "react";
import SideDrawer from "./SideDrawer";
import { getShopLogo } from "../../../common/utils/utils";

const Navbar = ({ shop, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-10 backdrop-blur-lg bg-white/30 border-b border-orange-200 shadow-md px-4 md:px-6 py-3 flex justify-between items-center gap-3">
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