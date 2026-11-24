import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

const API = process.env.REACT_APP_BASE_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
// A usual total is offered as the price only when most orders agree on it
const AGREE = 0.7;

// "Build the list from old orders": the app reads the Product text of the
// orders and suggests products. Nothing is saved until "Add" is pressed, and
// no order is ever changed.
const BuildFromOrdersDialog = ({ onClose, onAdded }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showOnce, setShowOnce] = useState(false);
  const [rows, setRows] = useState([]); // { name, size, sizeLabel, count, usualPrice, usualCount, on, usePrice }
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError("");
    setData(null);
    axios
      .get(`${API}/api/products/from-orders${showOnce ? "?min=1" : ""}`, { headers: headers() })
      .then((res) => {
        setData(res.data);
        setRows(
          res.data.suggestions.map((s) => ({
            ...s,
            on: true,
            usePrice: s.usualPrice !== undefined && s.usualCount / s.count >= AGREE,
          }))
        );
      })
      .catch((err) => setError(getErrorMessage(err, "Could not read the orders.")));
  }, [showOnce]);
  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const change = (index, patch) => setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const chosen = rows.filter((r) => r.on && r.name.trim());
  const allOn = rows.length > 0 && rows.every((r) => r.on);

  const add = async () => {
    if (!chosen.length || saving) return;
    setSaving(true);
    try {
      const res = await axios.post(
        `${API}/api/products/from-orders`,
        {
          items: chosen.map((r) => ({
            name: r.name,
            ...(r.size && r.size.kind !== "none" ? { size: r.size } : {}),
            ...(r.usePrice && r.usualPrice !== undefined ? { price: r.usualPrice } : {}),
          })),
        },
        { headers: headers() }
      );
      const { created, skipped } = res.data;
      toast.success(`Added ${created} ${created === 1 ? "product" : "products"}${skipped ? ` (${skipped} already in your list)` : ""}.`);
      onAdded();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not add the products."));
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
      <div role="dialog" aria-modal="true" aria-label="Build the list from old orders" className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="p-5 pb-3 space-y-2 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800">Build the list from old orders</h2>
          <p className="text-sm text-gray-600">
            The app read the Product of your old orders and split each one into a <strong>name</strong> and a{" "}
            <strong>size</strong>, so "12 by 18 frame", "Frame 12x18" and "FRAME (12-18)" become one product:
            <em> Frame, 12 x 18 inch</em>. A number in front ("5 pcs cutout", "4 sachet") is a quantity, not part of the name.
            Names are written the same way everywhere (capital first letter). <strong>Nothing is saved until you press Add,
            and your orders are not changed.</strong>
          </p>
          {data && data.canSeePrices && (
            <p className="text-xs text-gray-600 bg-orange-50 border border-orange-100 rounded p-2">
              <strong>About the price:</strong> ticking "Use ₹120 as the price" only sets the price of that product in
              your list. <strong>No order changes, and no old total changes.</strong> Later, when you create a new order with
              this product, ₹120 fills the Total box, and you can change it there (what you type always wins).
              The price is for <em>one piece</em>: when an order said "5 pcs", the total is divided by 5.
            </p>
          )}
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">{error}</p>
              <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-orange-500 text-white">Try again</button>
            </div>
          )}
          {!data && !error && <p className="text-sm text-gray-500">Reading your orders...</p>}
          {data && (
            <>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={showOnce} onChange={(e) => setShowOnce(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                Also show products used in only one order (often spelling mistakes)
              </label>
              {rows.length === 0 ? (
                <p className="text-sm text-gray-700 py-3">Nothing new to suggest. {data.ordersRead ? "" : "You have no orders with a product yet."}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-700">
                      {rows.length} {rows.length === 1 ? "product" : "products"} found in {data.orders} orders
                      {data.alreadyInList > 0 && (
                        <span className="block text-xs text-gray-500">
                          {data.alreadyInList} already in your list, so not shown again.
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setRows((r) => r.map((row) => ({ ...row, on: !allOn })))}
                      className="px-3 py-2 min-h-[44px] text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      {allOn ? "Untick all" : "Tick all"}
                    </button>
                  </div>
                  <ul aria-label="Suggested products" className="divide-y divide-gray-100">
                    {rows.map((row, i) => (
                      <li key={i} className="py-2 flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={row.on}
                          onChange={(e) => change(i, { on: e.target.checked })}
                          aria-label={`Add ${row.name}`}
                          className="mt-3 w-5 h-5 accent-orange-500 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <input
                            type="text"
                            value={row.name}
                            maxLength={100}
                            onChange={(e) => change(i, { name: e.target.value })}
                            aria-label={`Name for ${row.name}`}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Size:</span> {row.sizeLabel || "none"} · Used in {row.count}{" "}
                            {row.count === 1 ? "order" : "orders"}
                          </p>
                          {row.usualPrice !== undefined && (
                            <label className="flex items-center gap-2 text-xs text-gray-700 min-h-[32px]">
                              <input type="checkbox" checked={row.usePrice} onChange={(e) => change(i, { usePrice: e.target.checked })} className="w-4 h-4 accent-orange-500" />
                              Use {money(row.usualPrice)} as the price of one piece ({row.usualCount} of {row.count} orders had it)
                            </label>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 min-h-[44px] border rounded hover:bg-gray-100 disabled:opacity-60">
            Close
          </button>
          <button
            type="button"
            onClick={add}
            disabled={!chosen.length || saving}
            className={`px-4 py-2 min-h-[44px] rounded text-white ${!chosen.length || saving ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}`}
          >
            {saving ? "Adding..." : `Add ${chosen.length} ${chosen.length === 1 ? "product" : "products"}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BuildFromOrdersDialog;
