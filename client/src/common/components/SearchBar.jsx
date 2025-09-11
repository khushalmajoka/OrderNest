const SearchBar = ({ value, onChange }) => (
  <div className="relative w-72">
    <input
      type="text"
      placeholder="Search by name, ID, item..."
      value={value}
      onChange={onChange}
      className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
    />
    <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
  </div>
);

export default SearchBar;
