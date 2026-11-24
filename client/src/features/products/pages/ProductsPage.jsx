import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight, FolderCog, History, Plus } from "lucide-react";
import Navbar from "../../shop/components/Navbar";
import LoadingScreen from "../../../common/components/LoadingScreen";
import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";
import { useShop } from "../../shop/hooks/useShop";
import { getErrorMessage } from "../../../common/utils/api";
import { can } from "../../../common/utils/permissions";
import { clearSession } from "../../whatsNew/whatsNewStorage";
import ProductFormModal from "../components/ProductFormModal";
import BuildFromOrdersDialog from "../components/BuildFromOrdersDialog";
import TidySizesDialog from "../components/TidySizesDialog";
import CategoriesDialog from "../components/CategoriesDialog";
import { priceText } from "../utils/productOptions";

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// The shop's products: add, edit, archive. For the admin, and for staff the
// admin gave "Manage products". Old orders are never changed by anything here.
const ProductsPage = () => {
  const navigate = useNavigate();
  const { shop, account, error, reload } = useShop();
  const allowed = can(account, "manageProducts");
  const canSetPrice = can(account, "viewAmounts");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [products, setProducts] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | a product
  const [busyId, setBusyId] = useState(null);
  const [showBuild, setShowBuild] = useState(false);
  const [tidyPlan, setTidyPlan] = useState([]); // products whose size is written the other way round
  const [showTidy, setShowTidy] = useState(false);
  // categories: made and filled by the admin only
  const [categories, setCategories] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterCat, setFilterCat] = useState("all"); // "all" | "none" | a category id
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [moveTo, setMoveTo] = useState("");
  const [moving, setMoving] = useState(false);
  const [showCats, setShowCats] = useState(false);

  useEffect(() => {
    if (account && !allowed) navigate("/shop/dashboard"); // not for this person
  }, [account, allowed, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/products`, {
        headers: headers(),
        params: { search: search || undefined, archived: showArchived ? 1 : undefined, limit: 500 },
      });
      setProducts(res.data.products);
      setCategories(res.data.categories || []);
      setIsAdmin(Boolean(res.data.canManageCategories));
      // forget ticks of products that are not in the list any more
      setSelected((old) => new Set([...old].filter((id) => res.data.products.some((p) => p._id === id))));
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load the products."));
    }
  }, [search, showArchived]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  // Products with a size written the other way round (10 x 8): offered to be fixed
  const loadTidy = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/products/tidy-sizes`, { headers: headers() });
      setTidyPlan(res.data.plan || []);
    } catch {
      setTidyPlan([]); // not important: the page works without it
    }
  }, []);
  useEffect(() => {
    if (allowed) loadTidy();
  }, [allowed, loadTidy]);

  const setActive = async (product, active) => {
    setBusyId(product._id);
    try {
      await axios.put(`${process.env.REACT_APP_BASE_URL}/api/products/${product._id}`, { active }, { headers: headers() });
      toast.success(active ? "Product restored." : "Product archived.");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the product."));
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => {
    const c = { none: 0 };
    const known = new Set(categories.map((x) => x._id));
    (products || []).forEach((p) => {
      const key = p.category && known.has(p.category) ? p.category : "none";
      c[key] = (c[key] || 0) + 1;
    });
    return c;
  }, [products, categories]);

  // the groups shown: each category, then Uncategorized (empty groups only when nothing is searched)
  const groups = useMemo(() => {
    if (!products) return [];
    const known = new Set(categories.map((x) => x._id));
    const all = [
      ...categories.map((c) => ({ id: c._id, name: c.name, items: products.filter((p) => p.category === c._id) })),
      { id: "none", name: "Uncategorized", items: products.filter((p) => !p.category || !known.has(p.category)) },
    ];
    return all.filter((g) => (filterCat === "all" || filterCat === g.id) && (g.items.length > 0 || (!search && isAdmin && g.id !== "none")));
  }, [products, categories, filterCat, search, isAdmin]);

  const toggleSelect = (id) =>
    setSelected((old) => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleGroup = (items) =>
    setSelected((old) => {
      const next = new Set(old);
      const all = items.every((p) => next.has(p._id));
      items.forEach((p) => (all ? next.delete(p._id) : next.add(p._id)));
      return next;
    });
  const toggleCollapsed = (id) =>
    setCollapsed((old) => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const moveSelected = async () => {
    if (!selected.size || moving) return;
    setMoving(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/products/move`,
        { ids: [...selected], category: moveTo === "none" ? null : moveTo },
        { headers: headers() }
      );
      toast.success(`Moved ${res.data.moved} ${res.data.moved === 1 ? "product" : "products"}.`);
      setSelected(new Set());
      setMoveTo("");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not move the products."));
    } finally {
      setMoving(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/shop");
  };

  if (!shop && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-orange-50 font-poppins px-4 text-center">
        <p className="text-gray-700">{error}</p>
        <button onClick={reload} className="px-5 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600">
          Try again
        </button>
      </div>
    );
  }
  if (!shop || !allowed) return <LoadingScreen message="Opening your products" />;

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <Navbar shop={shop} account={account} onLogout={handleLogout} />

      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h1 className="text-2xl font-bold text-orange-700 flex items-center gap-2">
            Products
            <span className="text-xs font-semibold uppercase rounded-full bg-amber-200 text-amber-900 px-2 py-0.5">Beta</span>
          </h1>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowCats(true)}
                className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg border border-orange-400 text-orange-700 font-medium hover:bg-orange-100"
              >
                <FolderCog size={18} /> Categories
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowBuild(true)}
              className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg border border-orange-400 text-orange-700 font-medium hover:bg-orange-100"
            >
              <History size={18} /> Build from old orders
            </button>
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600"
            >
              <Plus size={18} /> Add product
            </button>
          </div>
        </div>
        <p
          role="note"
          className="text-sm rounded-md bg-amber-50 border border-amber-300 text-amber-900 px-3 py-2 mb-3"
        >
          <strong>Beta, still being built.</strong> Products is new and is being tested, so it may have
          problems or change. It does not change your orders. If something looks wrong, please tell the
          developer.
        </p>
        {tidyPlan.length > 0 && (
          <div role="region" aria-label="Sizes to fix" className="mb-3 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-gray-800 flex-1">
              {tidyPlan.length} {tidyPlan.length === 1 ? "product has" : "products have"} a size written the other way round (like 18 x 12).
              8 x 10 and 10 x 8 are one size, so they should be written the same way.
            </p>
            <button type="button" onClick={() => setShowTidy(true)} className="px-4 py-2 min-h-[44px] rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600">
              Review and fix
            </button>
          </div>
        )}
        <p className="text-sm text-gray-600 mb-4">
          Your list of products. In Create order you pick from it, and its price fills in.
          Changing a product never changes an old order.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="w-4 h-4 accent-orange-500" />
            Show archived
          </label>
        </div>

        {(categories.length > 0 || counts.none < (products || []).length) && products && (
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2 mb-4">
            {[
              { id: "all", name: "All", n: products.length },
              ...categories.map((c) => ({ id: c._id, name: c.name, n: counts[c._id] || 0 })),
              { id: "none", name: "Uncategorized", n: counts.none },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterCat(chip.id)}
                aria-pressed={filterCat === chip.id}
                className={`px-3 py-1.5 min-h-[36px] rounded-full text-sm border ${
                  filterCat === chip.id ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-orange-50"
                }`}
              >
                {chip.name} <span className={filterCat === chip.id ? "text-orange-100" : "text-gray-500"}>{chip.n}</span>
              </button>
            ))}
          </div>
        )}

        {loadError ? (
          <div className="text-center py-8">
            <p className="text-gray-700 mb-3">{loadError}</p>
            <button onClick={load} className="px-5 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600">
              Try again
            </button>
          </div>
        ) : !products ? (
          <SkeletonRegion label="Loading the products" className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-orange-100 p-4 space-y-2">
                <Bar className="h-4 w-1/2" />
                <Bar className="h-3 w-1/3" />
              </div>
            ))}
          </SkeletonRegion>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg border border-orange-100 p-6 text-center text-sm text-gray-600">
            {search
              ? "No product matches your search."
              : "No products yet. Press \"Add product\" to add the first one."}
          </div>
        ) : (
          <div className="space-y-5">
            {isAdmin && categories.length === 0 && (
              <p className="text-sm rounded-lg bg-white border border-orange-100 px-3 py-2 text-gray-700">
                Tip: press <strong>Categories</strong> to make your own groups (like Frames or Albums). Then tick products and move them into a group.
              </p>
            )}
            {groups.map((g) => {
              const open = !collapsed.has(g.id);
              const allTicked = g.items.length > 0 && g.items.every((p) => selected.has(p._id));
              const showHeading = categories.length > 0;
              return (
                <section key={g.id} aria-label={`${g.name} products`}>
                  {showHeading && (
                    <div className="flex items-center gap-2 mb-2">
                      {isAdmin && g.items.length > 0 && (
                        <input
                          type="checkbox"
                          checked={allTicked}
                          onChange={() => toggleGroup(g.items)}
                          aria-label={`Tick all products in ${g.name}`}
                          className="w-5 h-5 accent-orange-500 shrink-0"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(g.id)}
                        aria-expanded={open}
                        className="flex items-center gap-1.5 text-left font-semibold text-gray-800 min-h-[36px]"
                      >
                        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        {g.name}
                        <span className="text-sm font-normal text-gray-500">({g.items.length})</span>
                      </button>
                    </div>
                  )}
                  {open && g.items.length === 0 && (
                    <p className="text-sm text-gray-500 bg-white rounded-lg border border-dashed border-orange-200 p-3">
                      No products here yet. Tick products below and use "Move to".
                    </p>
                  )}
                  {open && g.items.length > 0 && (
                    <ul className="space-y-2" aria-label={showHeading ? g.name : "Products"}>
                      {g.items.map((p) => (
                        <li
                          key={p._id}
                          className={`bg-white rounded-lg border border-orange-100 p-3 sm:p-4 flex flex-wrap items-start justify-between gap-3 ${p.active ? "" : "opacity-70"}`}
                        >
                          <div className="min-w-0 flex gap-3">
                            {isAdmin && (
                              <input
                                type="checkbox"
                                checked={selected.has(p._id)}
                                onChange={() => toggleSelect(p._id)}
                                aria-label={`Tick ${p.name}${p.sizeLabel ? " " + p.sizeLabel : ""}`}
                                className="w-5 h-5 mt-0.5 accent-orange-500 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 break-words">
                                {p.name}
                                {p.sizeLabel && <span className="text-gray-600 font-normal"> · {p.sizeLabel}</span>}
                                {!p.active && (
                                  <span className="ml-2 text-xs rounded-full bg-gray-200 text-gray-700 px-2 py-0.5">Archived</span>
                                )}
                              </p>
                              {priceText(p) && <p className="text-sm text-gray-700">{priceText(p)}</p>}
                              {p.notes && <p className="text-xs text-gray-500 break-words mt-0.5">{p.notes}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditing(p)}
                              aria-label={`Edit ${p.name}`}
                              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-orange-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busyId === p._id}
                              onClick={() => setActive(p, !p.active)}
                              aria-label={`${p.active ? "Archive" : "Restore"} ${p.name}`}
                              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-orange-50 disabled:opacity-60"
                            >
                              {p.active ? "Archive" : "Restore"}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {isAdmin && selected.size > 0 && (
        <div role="region" aria-label="Move the ticked products" className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-orange-200 shadow-lg p-3">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-800 mr-auto">
              {selected.size} {selected.size === 1 ? "product" : "products"} ticked
            </span>
            <select
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              aria-label="Move to category"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Move to...</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
              <option value="none">Uncategorized</option>
            </select>
            <button
              type="button"
              onClick={moveSelected}
              disabled={!moveTo || moving}
              className="px-4 py-2 min-h-[40px] rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:bg-orange-300"
            >
              {moving ? "Moving..." : "Move"}
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="px-3 py-2 min-h-[40px] rounded-lg border border-gray-300 text-sm hover:bg-gray-100">
              Clear
            </button>
          </div>
        </div>
      )}
      {selected.size > 0 && <div className="h-20" aria-hidden="true" />}
      {showCats && (
        <CategoriesDialog
          categories={categories}
          counts={counts}
          onClose={() => setShowCats(false)}
          onChanged={load}
        />
      )}
      {showBuild && <BuildFromOrdersDialog onClose={() => setShowBuild(false)} onAdded={() => { load(); loadTidy(); }} />}
      {showTidy && (
        <TidySizesDialog
          plan={tidyPlan}
          canSeePrices={canSetPrice}
          onClose={() => setShowTidy(false)}
          onDone={() => {
            load();
            loadTidy();
          }}
        />
      )}

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          canSetPrice={canSetPrice}
          categories={categories}
          canSetCategory={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
};

export default ProductsPage;
