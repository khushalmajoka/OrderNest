const Navbar = ({ shop, onLogout }) => (
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
      onClick={onLogout}
      className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium shadow"
    >
      Logout
    </button>
  </nav>
);

export default Navbar;