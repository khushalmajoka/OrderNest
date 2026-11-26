import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";
import { productLabel, priceText, sortSizes } from "../utils/productOptions";
import ProductThumb from "./ProductThumb";

const inputClass =
  "w-full border border-gray-300 rounded px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

// "Choose from your products": search the shop's product list and pick one.
// Every new order takes its products from here.
//   selected: the picked product ({ _id, name, sizeLabel, price, priceUnit }) or null
//   onPick(product) / onClear()
//   showPrice: false for people who may not see prices
//   canCreate: the person may add products ("Manage products"): when nothing
//     matches, "Add ... as a new product" is offered; canSetPrice: may type its price
// While the list is loading, if it cannot be loaded, or if the shop has no
// products and the person cannot add one, a line says so (never an empty space).
const ProductPicker = ({ selected, onPick, onClear, showPrice = true, canCreate = false, canSetPrice = false, label = "Search your products" }) => {
  const [products, setProducts] = useState(null); // null = loading
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(null); // { name, price, saving } while the "new product" form is open
  const [expanded, setExpanded] = useState(null); // the product whose sizes are shown
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // "Try again" asks once more

  useEffect(() => {
    const controller = new AbortController();
    axios
      .get(`${process.env.REACT_APP_BASE_URL}/api/products?limit=500`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal: controller.signal,
      })
      .then((res) => setProducts(res.data.products || []))
      .catch((err) => {
        if (!axios.isCancel(err)) setFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);

  // the products that match, each with its matching sizes (a product has several sizes)
  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const groups = new Map();
    for (const p of products || []) {
      const text = `${p.name} ${p.sizeLabel || ""}`.toLowerCase();
      if (!words.every((w) => text.includes(w))) continue;
      const id = p.family || p._id;
      if (!groups.has(id)) groups.set(id, { id, name: p.name, images: p.images || [], sizes: [] });
      groups.get(id).sizes.push(p);
    }
    return [...groups.values()].slice(0, 30).map((g) => ({ ...g, sizes: sortSizes(g.sizes) }));
  }, [products, query]);


  const createProduct = async () => {
    const name = adding.name.trim();
    if (!name) return toast.error("Please type the product name.");
    setAdding((a) => ({ ...a, saving: true }));
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/products`,
        { name, ...(canSetPrice && String(adding.price).trim() !== "" ? { price: adding.price } : {}) },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const created = res.data.product;
      setProducts((list) => [...(list || []), created]);
      setAdding(null);
      setOpen(false);
      setQuery("");
      toast.success("Product added to your list.");
      onPick(created);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not add the product."));
      setAdding((a) => (a ? { ...a, saving: false } : a));
    }
  };

  if (!selected && failed) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 space-y-2">
        <p>Your products could not be loaded. Check the internet and try again.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
          className="px-4 py-2 min-h-[44px] rounded border border-red-300 bg-white font-medium"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!selected && !products) {
    return (
      <p role="status" className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
        Loading your products...
      </p>
    );
  }
  if (!selected && products.length === 0 && !canCreate) {
    return (
      <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Your shop has no products yet. Ask the admin to add them on the Products page.
      </p>
    );
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
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
        placeholder={label === "Search your products" ? "Search your products..." : `${label}: search...`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={inputClass}
      />
      {open && (
        <ul role="listbox" aria-label="Your products" className="mt-1 max-h-64 overflow-y-auto rounded border border-gray-200 bg-white divide-y divide-gray-100">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500 space-y-2">
              <span className="block">{canCreate ? "No product found." : "No product found. Ask the admin to add it on the Products page."}</span>
              {canCreate && query.trim() && !adding && (
                <button
                  type="button"
                  onClick={() => setAdding({ name: query.trim(), price: "", saving: false })}
                  className="w-full text-left px-3 py-2 min-h-[44px] rounded border border-stone-300 text-stone-800 font-medium hover:bg-stone-100"
                >
                  Add "{query.trim()}" as a new product
                </button>
              )}
            </li>
          ) : (
            matches.map((g) => {
              const pick = (p) => {
                setOpen(false);
                setQuery("");
                setExpanded(null);
                onPick(p);
              };
              const sizeText = (p) => (p.sizeLabel ? p.sizeLabel : "No size");
              // one size: pick it straight away. Several: choose the size under the product.
              if (g.sizes.length === 1) {
                const p = g.sizes[0];
                return (
                  <li key={g.id} role="option" aria-selected="false">
                    <button type="button" onClick={() => pick(p)} className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-stone-100 focus:bg-stone-100 focus:outline-none flex items-center gap-3">
                      {g.images.length > 0 && <ProductThumb product={g} size="w-10 h-10" />}
                      <span className="min-w-0">
                        <span className="block text-sm text-gray-900">{productLabel(p)}</span>
                        {showPrice && priceText(p) && <span className="block text-xs text-gray-600">{priceText(p)}</span>}
                      </span>
                    </button>
                  </li>
                );
              }
              const open1 = expanded === g.id || matches.length === 1;
              return (
                <li key={g.id} role="group" aria-label={g.name}>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                    aria-expanded={open1}
                    className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-stone-100 focus:bg-stone-100 focus:outline-none flex items-center gap-3"
                  >
                    {g.images.length > 0 && <ProductThumb product={g} size="w-10 h-10" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900">{g.name}</span>
                      <span className="block text-xs text-gray-600">{g.sizes.length} sizes: choose one</span>
                    </span>
                    {open1 ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
                  </button>
                  {open1 && (
                    <ul className="bg-stone-50 border-t border-gray-100">
                      {g.sizes.map((p) => (
                        <li key={p._id} role="option" aria-selected="false">
                          <button type="button" onClick={() => pick(p)} className="w-full text-left pl-8 pr-3 py-2 min-h-[44px] hover:bg-stone-100 focus:bg-stone-100 focus:outline-none">
                            <span className="block text-sm text-gray-900">{sizeText(p)}</span>
                            {showPrice && priceText(p) && <span className="block text-xs text-gray-600">{priceText(p)}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
      {adding && (
        <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2" role="group" aria-label="New product">
          <p className="text-sm font-medium text-gray-800">Add a new product to your list</p>
          <label className="block text-xs text-gray-700">
            Name
            <input type="text" value={adding.name} maxLength={100} onChange={(e) => setAdding((a) => ({ ...a, name: e.target.value }))} className={`${inputClass} mt-1`} />
          </label>
          {canSetPrice && (
            <label className="block text-xs text-gray-700">
              Price per piece (optional)
              <input type="number" inputMode="decimal" min={0} value={adding.price} onChange={(e) => setAdding((a) => ({ ...a, price: e.target.value }))} className={`${inputClass} mt-1`} />
            </label>
          )}
          <p className="text-xs text-gray-500">You can add the size and more details later on the Products page.</p>
          <div className="flex gap-2">
            <button type="button" disabled={adding.saving} onClick={createProduct} className="px-4 py-2 min-h-[44px] rounded bg-orange-700 text-white font-medium hover:bg-orange-800 disabled:opacity-60">
              {adding.saving ? "Adding..." : "Add product"}
            </button>
            <button type="button" disabled={adding.saving} onClick={() => setAdding(null)} className="px-4 py-2 min-h-[44px] rounded border border-gray-300 hover:bg-white disabled:opacity-60">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPicker;
