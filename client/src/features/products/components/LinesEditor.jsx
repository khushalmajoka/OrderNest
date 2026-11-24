import { X } from "lucide-react";
import ProductPicker from "./ProductPicker";
import { priceText, productLabel, quantityUnit } from "../utils/productOptions";

// The products of an order: one row for each (name, quantity, remove), and a
// search box to add another. Used in Create order and in "Change products".
//   lines: [{ product: { _id, name, sizeLabel, price, priceUnit }, quantity: "1" }]
//   onChange(lines)
//   showPrice: false for people who may not see prices
//   canCreate / canSetPrice: may add a brand new product when nothing matches
const LinesEditor = ({ lines, onChange, showPrice = true, canCreate = false, canSetPrice = false }) => {
  const setQuantity = (index, quantity) =>
    onChange(lines.map((l, i) => (i === index ? { ...l, quantity } : l)));
  const setNote = (index, note) =>
    onChange(lines.map((l, i) => (i === index ? { ...l, note } : l)));
  const remove = (index) => onChange(lines.filter((_, i) => i !== index));
  const add = (product) => {
    // the same product again: one more of it
    const at = lines.findIndex((l) => l.product._id === product._id);
    if (at >= 0) {
      onChange(lines.map((l, i) => (i === at ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l)));
    } else {
      onChange([...lines, { product, quantity: "1", note: "" }]);
    }
  };

  return (
    <div className="space-y-2">
      {lines.length > 0 && (
        <ul aria-label="Products in this order" className="space-y-2">
          {lines.map((line, i) => {
            const unit = quantityUnit(line.product.priceUnit);
            return (
              <li key={line.product._id} className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words">{productLabel(line.product)}</p>
                    {showPrice && priceText(line.product) && <p className="text-xs text-gray-600">{priceText(line.product)}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Remove ${productLabel(line.product)}`}
                    title="Remove this product"
                    className="shrink-0 w-11 h-11 -mt-2 -mr-2 flex items-center justify-center rounded text-gray-600 hover:bg-black/10"
                  >
                    <X size={18} />
                  </button>
                </div>
                <label className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                  <span>Quantity{unit ? ` (${unit})` : ""}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={line.quantity}
                    onChange={(e) => setQuantity(i, e.target.value)}
                    aria-label={`Quantity of ${productLabel(line.product)}`}
                    className="w-28 border border-gray-300 rounded px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  />
                </label>
                {/* sizes like 8 x 10 are one size either way round: the direction is a small note on the order */}
                {(/\d\s*x\s*\d/i.test(line.product.sizeLabel || "") || line.note) && (
                  <div className="mt-2">
                    <label className="block text-sm text-gray-700">
                      Direction or note (optional)
                      <input
                        type="text"
                        value={line.note || ""}
                        maxLength={40}
                        onChange={(e) => setNote(i, e.target.value)}
                        placeholder="e.g. Landscape"
                        aria-label={`Note for ${productLabel(line.product)}`}
                        className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                      />
                    </label>
                    <div className="mt-1 flex gap-2">
                      {["Portrait", "Landscape"].map((word) => (
                        <button
                          key={word}
                          type="button"
                          onClick={() => setNote(i, line.note === word ? "" : word)}
                          aria-pressed={line.note === word}
                          className={`px-3 py-2 min-h-[44px] rounded-full border text-sm ${line.note === word ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 text-gray-700 bg-white hover:bg-orange-50"}`}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ProductPicker
        selected={null}
        onPick={add}
        showPrice={showPrice}
        canCreate={canCreate}
        canSetPrice={canSetPrice}
        label={lines.length ? "Add another product" : "Choose from your products"}
      />
    </div>
  );
};

export default LinesEditor;
