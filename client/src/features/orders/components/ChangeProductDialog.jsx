import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";
import ProductPicker from "../../products/components/ProductPicker";
import { productLabel, quantityText, quantityUnit, totalFor } from "../../products/utils/productOptions";
import { toEditForm } from "../hooks/useInlineEdit";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

// "Change product" for an order that already exists: pick another product from
// the shop's list and set how many. If the product has a price, the person is
// ASKED whether the price and total should follow (the money never changes
// without that answer).
//   canSeePrices: false = no prices shown and the money is never touched
const ChangeProductDialog = ({ order, canSeePrices, onClose, onSaved }) => {
  const current = order.lines?.[0];
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(current ? String(current.quantity) : "1");
  const [updateMoney, setUpdateMoney] = useState(null); // null = not answered, true / false
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = Number(quantity);
  const qValid = q > 0;
  const hasPrice = Boolean(product) && product.price !== undefined && product.price !== null;
  const asksAboutMoney = canSeePrices && hasPrice;
  const newTotal = asksAboutMoney && qValid ? totalFor(product.price, q) : "";
  const advance = Number(order.advance) || 0;
  const advanceTooBig = updateMoney === true && newTotal !== "" && advance > Number(newTotal);
  const ready = Boolean(product) && qValid && (!asksAboutMoney || updateMoney !== null) && !advanceTooBig;

  const save = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      const form = { ...toEditForm(order), item: productLabel(product) };
      const changeMoney = asksAboutMoney && updateMoney === true;
      if (changeMoney) form.total = newTotal;
      const { total, advance: adv, ...withoutMoney } = form;
      const res = await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/orders/${order._id}`,
        {
          ...(canSeePrices ? form : withoutMoney),
          lines: [
            {
              product: product._id,
              quantity: q,
              ...(canSeePrices && hasPrice ? { unitPrice: product.price } : {}),
            },
          ],
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Product changed.");
      onSaved(res.data.order);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the product."));
      setSaving(false);
    }
  };

  const radio = (value, title, detail) => (
    <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${updateMoney === value ? "border-orange-400 bg-orange-50" : "border-gray-200"}`}>
      <input type="radio" name="update-money" checked={updateMoney === value} onChange={() => setUpdateMoney(value)} className="mt-1 w-4 h-4 accent-orange-500" />
      <span className="text-sm">
        <span className="block font-medium text-gray-900">{title}</span>
        <span className="block text-gray-600">{detail}</span>
      </span>
    </label>
  );

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Change product" className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Change product</h2>
        <p className="text-sm text-gray-600 break-words">
          Now: <b>{order.item || "-"}</b>
          {current ? ` × ${quantityText(current.quantity, current.unit)}` : ""}
        </p>

        <ProductPicker selected={product} onPick={(p) => setProduct(p)} onClear={() => { setProduct(null); setUpdateMoney(null); }} showPrice={canSeePrices} />

        {product && (
          <>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Quantity{quantityUnit(product.priceUnit) ? ` (${quantityUnit(product.priceUnit)})` : ""}
              </span>
              <input type="number" inputMode="decimal" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
            </label>

            {asksAboutMoney && qValid && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-gray-800 mb-1">Also update the price and total?</legend>
                {radio(true, "Yes, update the total", `Total becomes ${money(newTotal)} (${money(product.price)} × ${q}). Advance stays ${money(advance)}.`)}
                {radio(false, "No, only change the product", `Total stays ${money(order.total)}.`)}
                {advanceTooBig && (
                  <p className="text-xs text-red-600">The advance ({money(advance)}) is more than the new total. Choose "No", or fix the advance first.</p>
                )}
              </fieldset>
            )}
          </>
        )}

        {!product && <p className="text-xs text-gray-500">Search your products above and pick one. If your list is empty, add products on the Products page first.</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 min-h-[44px] border rounded hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!ready || saving}
            className={`px-4 py-2 min-h-[44px] rounded text-white ${!ready || saving ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}`}
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
