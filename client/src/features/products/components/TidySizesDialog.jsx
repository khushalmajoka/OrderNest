import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

const API = process.env.REACT_APP_BASE_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// "Make sizes the same way": 8 x 10 and 10 x 8 are one size, kept with the
// smaller number first. Products made earlier may still have the bigger number
// first. Each one is either renamed, or (when the right one already exists)
// merged into it: the wrong one is archived. Orders are never changed.
const TidySizesDialog = ({ plan, canSeePrices, onClose, onDone }) => {
  const [on, setOn] = useState(() => new Set(plan.map((p) => p._id)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const toggle = (id) =>
    setOn((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const apply = async () => {
    if (!on.size || saving) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/products/tidy-sizes`, { ids: [...on] }, { headers: headers() });
      const { renamed, merged } = res.data;
      toast.success(`Done: ${renamed} renamed, ${merged} merged.`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not make the sizes the same way."));
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Make sizes the same way" className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="p-5 pb-3 space-y-2 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800">Make sizes the same way</h2>
          <p className="text-sm text-gray-600">
            8 x 10 and 10 x 8 are one size, so a size is always written with the <strong>smaller number first</strong>. These
            products were made the other way round. <strong>Nothing changes until you press Apply, and no order is changed</strong>:
            old orders keep the size they saved.
          </p>
          <ul aria-label="Products to fix" className="divide-y divide-gray-100">
            {plan.map((p) => (
              <li key={p._id} className="py-2 flex items-start gap-3">
                <input type="checkbox" checked={on.has(p._id)} onChange={() => toggle(p._id)} aria-label={`Fix ${p.name} ${p.from}`} className="mt-1 w-5 h-5 accent-orange-500 shrink-0" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-gray-900 break-words">
                    {p.name}: {p.from} → {p.to}
                  </p>
                  {p.action === "rename" ? (
                    <p className="text-xs text-gray-600">The size is written the other way round. Nothing else changes.</p>
                  ) : (
                    <p className="text-xs text-gray-600">
                      <em>{p.name} {p.to}</em> already exists, so this one is <strong>archived</strong> (moved out of the way).
                      {canSeePrices && p.price !== undefined && p.into?.price === undefined ? ` The one that stays has no price, so it takes ${money(p.price)}.` : ""}
                      {canSeePrices && p.price !== undefined && p.into?.price !== undefined && p.price !== p.into.price ? ` Prices differ (${money(p.price)} and ${money(p.into.price)}): the one that stays keeps ${money(p.into.price)}.` : ""}
                      {p.into?.active === false ? " The one that stays is archived, so it is brought back." : ""}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 min-h-[44px] border rounded hover:bg-gray-100 disabled:opacity-60">
            Close
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!on.size || saving}
            className={`px-4 py-2 min-h-[44px] rounded text-white ${!on.size || saving ? "bg-orange-300 cursor-not-allowed" : "bg-orange-700 hover:bg-orange-800"}`}
          >
            {saving ? "Applying..." : `Apply to ${on.size} ${on.size === 1 ? "product" : "products"}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TidySizesDialog;
