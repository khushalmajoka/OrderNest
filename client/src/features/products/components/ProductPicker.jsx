import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import { productLabel, priceText } from "../utils/productOptions";

const inputClass =
  "w-full border border-gray-300 rounded px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

// "Choose from your products": search the shop's product list and pick one.
// Picking is optional: an order can still be typed by hand.
//   selected: the picked product ({ _id, name, sizeLabel, price, priceUnit }) or null
//   onPick(product) / onClear()
//   showPrice: false for people who may not see prices
// If the shop has no products yet, nothing is shown (the Product box works as before).
const ProductPicker = ({ selected, onPick, onClear, showPrice = true }) => {
  const [products, setProducts] = useState(null); // null = loading
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    axios
      .get(`${process.env.REACT_APP_BASE_URL}/api/products?limit=500`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal: controller.signal,
      })
      .then((res) => setProducts(res.data.products || []))
      .catch((err) => {
        if (!axios.isCancel(err)) setProducts([]);
      });
    return () => controller.abort();
  }, []);

  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (products || [])
      .filter((p) => {
        const text = `${p.name} ${p.sizeLabel || ""}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .slice(0, 30);
  }, [products, query]);

  if (!products || products.length === 0) return null;

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 break-words">{productLabel(selected)}</p>
          {showPrice && priceText(selected) && <p className="text-xs text-gray-600">{priceText(selected)}</p>}
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove the chosen product"
          title="Remove the chosen product"
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded text-gray-600 hover:bg-black/10"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="search"
        aria-label="Search your products"
        placeholder="Search your products..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={inputClass}
      />
      {open && (
        <ul role="listbox" aria-label="Your products" className="mt-1 max-h-48 overflow-y-auto rounded border border-gray-200 bg-white divide-y divide-gray-100">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No product found. You can type the product below.</li>
          ) : (
            matches.map((p) => (
              <li key={p._id} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    onPick(p);
                  }}
                  className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-orange-50 focus:bg-orange-50 focus:outline-none"
                >
                  <span className="block text-sm text-gray-900">{productLabel(p)}</span>
                  {showPrice && priceText(p) && <span className="block text-xs text-gray-600">{priceText(p)}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default ProductPicker;
