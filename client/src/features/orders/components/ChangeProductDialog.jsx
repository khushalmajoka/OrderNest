import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";
import LinesEditor from "../../products/components/LinesEditor";
import { linesTotal, orderLineTexts, productLabel } from "../../products/utils/productOptions";
import { toEditForm } from "../hooks/useInlineEdit";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// The order's saved lines as the editor holds them (the price is the one saved on the order)
const startLines = (order) =>
  (order.lines || []).map((l) => ({
    product: { _id: String(l.product), name: l.name, sizeLabel: l.sizeLabel || "", price: l.unitPrice, priceUnit: l.unit || "piece" },
    quantity: String(l.quantity),
    note: l.note || "",
  }));
// the products and quantities (money follows these), and the notes (money does not)
const sameLines = (a, b) =>
  JSON.stringify(a.map((l) => [l.product._id, Number(l.quantity)])) === JSON.stringify(b.map((l) => [l.product._id, Number(l.quantity)]));
const sameNotes = (a, b) => JSON.stringify(a.map((l) => (l.note || "").trim())) === JSON.stringify(b.map((l) => (l.note || "").trim()));

// "Change products" for an order that already exists: one or several products
// from the shop's list, each with its quantity. If the prices are known, the
// person is ASKED whether the total should follow (money never changes without
// that answer).
//   canSeePrices: false = no prices shown and the money is never touched
const ChangeProductDialog = ({ order, canSeePrices, canManageProducts = false, onClose, onSaved }) => {
  const [initial] = useState(() => startLines(order));
  const [lines, setLines] = useState(initial);
  const [updateMoney, setUpdateMoney] = useState(null); // null = not answered, true / false
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const quantitiesOk = lines.every((l) => Number(l.quantity) > 0);
  const moneyChanged = !sameLines(lines, initial);
  const changed = moneyChanged || !sameNotes(lines, initial);
  const newTotal = canSeePrices && quantitiesOk ? linesTotal(lines) : "";
  const asksAboutMoney = moneyChanged && newTotal !== "";
  const advance = Number(order.advance) || 0;
  const advanceTooBig = asksAboutMoney && updateMoney === true && advance > Number(newTotal);
  const ready = lines.length > 0 && quantitiesOk && changed && (!asksAboutMoney || updateMoney !== null) && !advanceTooBig;
  const someNoPrice = canSeePrices && moneyChanged && quantitiesOk && lines.length > 0 && newTotal === "";

  const change = (next) => {
    setLines(next);
    setUpdateMoney(null);
  };

  const save = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      const form = { ...toEditForm(order), item: lines.map((l) => productLabel(l.product)).join(", ").slice(0, 200) };
      if (asksAboutMoney && updateMoney === true) form.total = newTotal;
      const { total, advance: adv, ...withoutMoney } = form;
      const res = await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/orders/${order._id}`,
        {
          ...(canSeePrices ? form : withoutMoney),
          lines: lines.map((l) => ({
            product: l.product._id,
            quantity: Number(l.quantity),
            ...(l.note && l.note.trim() ? { note: l.note.trim() } : {}),
            ...(canSeePrices && l.product.price !== undefined && l.product.price !== null ? { unitPrice: l.product.price } : {}),
          })),
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Products changed.");
      onSaved(res.data.order);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the products."));
      setSaving(false);
    }
  };

  const radio = (value, title, detail) => (
    <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${updateMoney === value ? "border-stone-300 bg-stone-50" : "border-gray-200"}`}>
      <input type="radio" name="update-money" checked={updateMoney === value} onChange={() => setUpdateMoney(value)} className="mt-1 w-4 h-4 accent-orange-500" />
      <span className="text-sm">
        <span className="block font-medium text-gray-900">{title}</span>
        <span className="block text-gray-600">{detail}</span>
      </span>
    </label>
  );

  const nowTexts = orderLineTexts(order);

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Change products" className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Change products</h2>
        <p className="text-sm text-gray-600 break-words">
          Now: <b>{order.item || "-"}</b>
          {nowTexts.length === 1 ? ` × ${nowTexts[0].qty}` : ""}
        </p>

        <LinesEditor lines={lines} onChange={change} showPrice={canSeePrices} canCreate={canManageProducts} canSetPrice={canManageProducts && canSeePrices} />

        {lines.length === 0 && (
          <p className="text-xs text-gray-500">Search your products above and pick one. You can add more than one. If your list is empty, add products on the Products page first.</p>
        )}

        {asksAboutMoney && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-800 mb-1">Also update the price and total?</legend>
            {radio(true, "Yes, update the total", `Total becomes ${money(newTotal)} (${lines.map((l) => `${money(l.product.price)} × ${Number(l.quantity)}`).join(" + ")}). Advance stays ${money(advance)}.`)}
            {radio(false, "No, only change the products", `Total stays ${money(order.total)}.`)}
            {advanceTooBig && (
              <p className="text-xs text-red-600">The advance ({money(advance)}) is more than the new total. Choose "No", or fix the advance first.</p>
            )}
          </fieldset>
        )}
        {someNoPrice && (
          <p className="text-xs text-gray-600">A product has no price, so the total cannot be worked out. The total stays {money(order.total)}.</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 min-h-[44px] border rounded hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!ready || saving}
            className={`px-4 py-2 min-h-[44px] rounded text-white ${!ready || saving ? "bg-orange-300 cursor-not-allowed" : "bg-orange-700 hover:bg-orange-800"}`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChangeProductDialog;
