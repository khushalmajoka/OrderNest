import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

const API = process.env.REACT_APP_BASE_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// One category: rename it, or delete it (its products are kept, as Uncategorized)
const CategoryRow = ({ category, count, onChanged }) => {
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const changed = name.trim() !== category.name;

  const save = async () => {
    if (!changed || busy) return;
    setBusy(true);
    try {
      await axios.put(`${API}/api/products/categories/${category._id}`, { name }, { headers: headers() });
      toast.success("Category renamed.");
      await onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not rename the category."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await axios.delete(`${API}/api/products/categories/${category._id}`, { headers: headers() });
      toast.success("Category deleted. Its products are kept.");
      await onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the category."));
      setBusy(false);
    }
  };

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          aria-label={`Name of category ${category.name}`}
          className="flex-1 min-w-[140px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <span className="text-xs text-gray-500 w-16">{count} {count === 1 ? "product" : "products"}</span>
        {changed && (
          <button type="button" onClick={save} disabled={busy} className="px-3 py-2 min-h-[40px] rounded-lg bg-orange-700 text-white text-sm hover:bg-orange-800 disabled:opacity-60">
            Save
          </button>
        )}
        <button type="button" onClick={() => setAsking(true)} disabled={busy} aria-label={`Delete category ${category.name}`} className="px-3 py-2 min-h-[40px] rounded-lg border border-gray-300 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60">
          Delete
        </button>
      </div>
      {asking && (
        <div role="alert" className="mt-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-gray-800">
          Delete <strong>{category.name}</strong>? {count > 0 ? `Its ${count} ${count === 1 ? "product stays" : "products stay"} in your list as Uncategorized.` : "It has no products."}
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={remove} disabled={busy} className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
              Yes, delete
            </button>
            <button type="button" onClick={() => setAsking(false)} disabled={busy} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100">
              No, keep it
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

// The admin's window to make, rename and delete categories.
// counts: { categoryId: number of products }
const CategoriesDialog = ({ categories, counts, onClose, onChanged }) => {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const add = async (e) => {
    e.preventDefault();
    if (!newName.trim() || adding) return;
    setAdding(true);
    try {
      await axios.post(`${API}/api/products/categories`, { name: newName }, { headers: headers() });
      setNewName("");
      toast.success("Category added.");
      await onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not add the category."));
    } finally {
      setAdding(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label="Categories" className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="p-5 pb-3 space-y-3 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800">Categories</h2>
          <p className="text-sm text-gray-600">
            Make your own groups (like Frames or Albums), then move products into them. Only you (the admin) can do this.
            Deleting a category never deletes a product.
          </p>
          <form onSubmit={add} className="flex gap-2">
            <input
              type="text"
              value={newName}
              maxLength={60}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category, e.g. Frames"
              aria-label="New category name"
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button type="submit" disabled={!newName.trim() || adding} className="px-4 py-2 min-h-[40px] rounded-lg bg-orange-700 text-white text-sm font-medium hover:bg-orange-800 disabled:bg-orange-300">
              Add
            </button>
          </form>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">No categories yet.</p>
          ) : (
            <ul aria-label="Your categories" className="divide-y divide-gray-100">
              {categories.map((c) => (
                <CategoryRow key={c._id} category={c} count={counts[c._id] || 0} onChanged={onChanged} />
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 min-h-[44px] border rounded hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CategoriesDialog;
