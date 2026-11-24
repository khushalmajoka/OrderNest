import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

const API = process.env.REACT_APP_BASE_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
// A usual price is filled in only when most orders agree on it
const AGREE = 0.7;

// A tick box that can show "some of them" (when only some sizes are ticked)
const GroupTick = ({ state, onChange, label }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return <input ref={ref} type="checkbox" checked={state === "all"} onChange={onChange} aria-label={label} className="mt-3 w-5 h-5 accent-orange-500 shrink-0" />;
};

// "Build the list from old orders": the app reads the Product of the orders and
// suggests products. A product with several sizes ("Frame") is shown ONCE, with
// a line for each size and its own price. Each size becomes its own product in
// the list, because the price can differ by size. Nothing is saved until "Add"
// is pressed, and no order is ever changed.
const BuildFromOrdersDialog = ({ onClose, onAdded }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showOnce, setShowOnce] = useState(false);
  const [rows, setRows] = useState([]); // one per size: { key, name, size, sizeLabel, count, usualPrice, usualCount, on, price }
  const [names, setNames] = useState({}); // group key -> the name as edited
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError("");
    setData(null);
    axios
      .get(`${API}/api/products/from-orders${showOnce ? "?min=1" : ""}`, { headers: headers() })
      .then((res) => {
        setData(res.data);
        setNames({});
        setRows(
          res.data.suggestions.map((s) => ({
            ...s,
            key: s.name.toLowerCase(),
            on: true,
            // filled in only when most of its orders had the same price
            price: s.usualPrice !== undefined && s.usualCount / s.count >= AGREE ? String(s.usualPrice) : "",
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

  // One card for each product name, its sizes inside (most used first)
  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((row, index) => {
      if (!map.has(row.key)) map.set(row.key, { key: row.key, name: row.name, items: [], count: 0 });
      const g = map.get(row.key);
      g.items.push({ ...row, index });
      g.count += row.count;
    });
    return [...map.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [rows]);

  const nameOf = (g) => (names[g.key] !== undefined ? names[g.key] : g.name);
  const changeRow = (index, patch) => setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const setGroupOn = (g, on) => setRows((r) => r.map((row) => (row.key === g.key ? { ...row, on } : row)));
  const stateOf = (g) => {
    const on = g.items.filter((i) => i.on).length;
    return on === 0 ? "none" : on === g.items.length ? "all" : "some";
  };

  const chosen = groups.flatMap((g) => g.items.filter((i) => i.on && nameOf(g).trim()).map((i) => ({ ...i, name: nameOf(g).trim() })));
  const allOn = rows.length > 0 && rows.every((r) => r.on);
  const badPrice = chosen.some((r) => r.price !== "" && !(Number(r.price) >= 0));

  const add = async () => {
    if (!chosen.length || saving || badPrice) return;
    setSaving(true);
    try {
      const res = await axios.post(
        `${API}/api/products/from-orders`,
        {
          items: chosen.map((r) => ({
            name: r.name,
            ...(r.size && r.size.kind !== "none" ? { size: r.size } : {}),
            ...(data.canSeePrices && r.price !== "" ? { price: Number(r.price) } : {}),
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
            <strong>size</strong>, so "12 by 18 frame", "Frame 12x18" and "FRAME (12-18)" are one size of the product <em>Frame</em>.
            A number in front ("5 pcs cutout", "4 sachet") is a quantity, not part of the name. 8 x 10 and 10 x 8 are one size (the smaller number first). Each product is shown once,
            with a line for each of its sizes. <strong>Each size is added as its own product</strong>, because the price can be different for each size.{" "}
            <strong>Nothing is saved until you press Add, and your orders are not changed.</strong>
          </p>
          {data && data.canSeePrices && (
            <p className="text-xs text-gray-600 bg-orange-50 border border-orange-100 rounded p-2">
              <strong>About the price:</strong> the price box is the default price of <em>one piece</em> of that size. It is filled in
              only when most of those orders had the same price (when an order said "5 pcs", its total is divided by 5). Change it, or
              empty it if you are not sure. <strong>No order changes, and no old total changes.</strong> Later, when you create a new order
              with this product, the price fills the Total box, and you can change it there (what you type always wins).
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
                <p className="text-sm text-gray-700 py-3">
                  Nothing new to suggest.
                  {data.alreadyInList > 0 ? ` ${data.alreadyInList} are already in your list.` : ""}
                  {data.ordersRead ? "" : " You have no orders with a product yet."}
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-700">
                      {groups.length} {groups.length === 1 ? "product" : "products"} found ({rows.length} counting each size) in {data.orders} orders
                      {data.alreadyInList > 0 && (
                        <span className="block text-xs text-gray-500">
                          {data.alreadyInList} already in your list, so not shown again.
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setRows((r) => r.map((row) => ({ ...row, on: !allOn })))}
                      className="px-3 py-2 min-h-[44px] text-sm rounded-lg border border-gray-300 hover:bg-gray-50 shrink-0"
                    >
                      {allOn ? "Untick all" : "Tick all"}
                    </button>
                  </div>
                  <ul aria-label="Suggested products" className="divide-y divide-gray-100">
                    {groups.map((g) => (
                      <li key={g.key} className="py-3">
                        <div className="flex items-start gap-3">
                          <GroupTick state={stateOf(g)} onChange={(e) => setGroupOn(g, e.target.checked)} label={`Add all sizes of ${nameOf(g)}`} />
                          <div className="min-w-0 flex-1 space-y-1">
                            <input
                              type="text"
                              value={nameOf(g)}
                              maxLength={100}
                              onChange={(e) => setNames((n) => ({ ...n, [g.key]: e.target.value }))}
                              aria-label={`Name for ${g.name}`}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                            <p className="text-xs text-gray-500">
                              {g.items.length === 1 && !g.items[0].sizeLabel
                                ? `Used in ${g.count} ${g.count === 1 ? "order" : "orders"}`
                                : `${g.items.length} ${g.items.length === 1 ? "size" : "sizes"} · used in ${g.count} ${g.count === 1 ? "order" : "orders"}`}
                            </p>
                          </div>
                        </div>
                        <ul aria-label={`Sizes of ${g.name}`} className="mt-2 ml-8 space-y-2">
                          {g.items.map((item) => (
                            <li key={item.index} className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg bg-orange-50/60 border border-orange-100 p-2">
                              <input
                                type="checkbox"
                                checked={item.on}
                                onChange={(e) => changeRow(item.index, { on: e.target.checked })}
                                aria-label={`Add ${g.name} ${item.sizeLabel || "no size"}`}
                                className="mt-1 w-5 h-5 accent-orange-500 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-gray-800">
                                  <span className="font-medium">Size:</span> {item.sizeLabel || "none"}
                                </p>
                                <p className="text-xs text-gray-500">Used in {item.count} {item.count === 1 ? "order" : "orders"}</p>
                                {item.writtenAs && (
                                  <p className="text-xs text-gray-500">
                                    Typed both ways: {item.writtenAs.map((w) => `${w.label} (${w.count} ${w.count === 1 ? "order" : "orders"})`).join(", ")}. It is one size.
                                  </p>
                                )}
                              </div>
                              {data.canSeePrices && (
                                <label className="text-xs text-gray-700 w-full sm:w-auto sm:shrink-0 pl-8 sm:pl-0">
                                  Price of one piece (₹)
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    value={item.price}
                                    onChange={(e) => changeRow(item.index, { price: e.target.value })}
                                    aria-label={`Price for ${g.name} ${item.sizeLabel || "no size"}`}
                                    placeholder="none"
                                    className="mt-1 block w-28 border border-gray-300 rounded px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                  />
                                  {item.usualPrice !== undefined && (
                                    <span className="block text-gray-500 mt-0.5">
                                      {item.usualCount} of {item.count} orders: {money(item.usualPrice)}
                                    </span>
                                  )}
                                </label>
                              )}
                            </li>
                          ))}
                        </ul>
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
            disabled={!chosen.length || saving || badPrice}
            className={`px-4 py-2 min-h-[44px] rounded text-white ${!chosen.length || saving || badPrice ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}`}
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
