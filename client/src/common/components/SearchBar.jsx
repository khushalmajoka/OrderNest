const SearchBar = ({ value, onChange }) => (
  <div className="relative w-full md:w-72">
    <input
      type="search"
      aria-label="Search orders"
      placeholder="Search orders..."
      value={value}
      onChange={onChange}
      className="w-full pl-10 pr-4 py-2 min-h-[44px] md:min-h-0 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
    />
    <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
  </div>
);

export default SearchBar;
