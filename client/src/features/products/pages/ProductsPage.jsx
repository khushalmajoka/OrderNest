import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import Navbar from "../../shop/components/Navbar";
import LoadingScreen from "../../../common/components/LoadingScreen";
import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";
import { useShop } from "../../shop/hooks/useShop";
import { getErrorMessage } from "../../../common/utils/api";
import { can } from "../../../common/utils/permissions";
import { clearSession } from "../../whatsNew/whatsNewStorage";
import ProductFormModal from "../components/ProductFormModal";
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
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load the products."));
    }
  }, [search, showArchived]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

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
          <h1 className="text-2xl font-bold text-orange-700">Products</h1>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600"
          >
            <Plus size={18} /> Add product
          </button>
        </div>
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
          <ul className="space-y-2" aria-label="Products">
            {products.map((p) => (
              <li
                key={p._id}
                className={`bg-white rounded-lg border border-orange-100 p-3 sm:p-4 flex flex-wrap items-start justify-between gap-3 ${p.active ? "" : "opacity-70"}`}
              >
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
      </div>

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          canSetPrice={canSetPrice}
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
