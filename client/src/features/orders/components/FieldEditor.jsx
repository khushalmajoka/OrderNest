import { Package, X } from "lucide-react";
import { orderLineTexts } from "../../products/utils/productOptions";
import ExecutivePicker from "../../../common/components/ExecutivePicker";
import StatusPicker from "../../../common/components/StatusPicker";
import { offeredStatuses } from "../utils/statusInfo";
import { COLUMN_EDITORS } from "../utils/orderColumns";

const base =
  "w-full border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400";

// The box that replaces a value while an order is being edited in place.
//   column: the column (from ORDER_COLUMNS) that says which field this is
//   form / set: the order being edited and how to change one of its fields
//   large: bigger boxes for fingers (phone cards)
//   onEnter: what the Enter key does (save)
// Fields that cannot be edited (Order ID, Balance, Created, Updated) have no
// editor: the caller shows them greyed out.
const FieldEditor = ({ column, form, set, shopId, shop, originalStatus, large = false, onEnter, canCloseOld = false, order, onChangeProduct }) => {
  const spec = COLUMN_EDITORS[column.key];
  if (!spec) return null;

  const size = large ? "min-h-[44px] px-3 py-2 text-base" : "h-8 px-2 text-sm";
  const value = form[spec.field] ?? "";
  const common = { "aria-label": column.label, className: `${base} ${size}` };
  const enter = (e) => {
    if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  // The Product of an order whose products were picked from the list is not a
  // text box: it is changed in "Change products". An order typed by hand keeps
  // its text box, plus a button to pick a product instead.
  if (column.key === "item" && order && onChangeProduct) {
    const texts = orderLineTexts(order);
    const btn = `shrink-0 inline-flex items-center gap-1 rounded border border-orange-400 text-orange-700 hover:bg-orange-50 ${large ? "min-h-[44px] px-3 text-sm" : "h-8 px-2 text-xs"}`;
    if (texts.length) {
      return (
        <div className="space-y-1">
          <div className={`rounded bg-black/5 text-gray-800 ${large ? "px-3 py-2 text-base" : "px-2 py-1 text-sm"}`} aria-label={column.label}>
            {texts.map((t, i) => (
              <p key={i} className="flex items-start gap-1">
                <Package size={13} className="mt-1 shrink-0 text-orange-700" aria-hidden="true" />
                <span className="break-words">{t.label} × {t.qty}{t.note ? ` · ${t.note}` : ""}</span>
              </p>
            ))}
          </div>
          <button type="button" onClick={onChangeProduct} className={btn}>
            <Package size={14} /> Change products
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <input {...common} type="text" maxLength={spec.max} value={value} onChange={(e) => set(spec.field, e.target.value)} onKeyDown={enter} />
        <button type="button" onClick={onChangeProduct} className={btn}>
          <Package size={14} /> Pick a product
        </button>
      </div>
    );
  }

  switch (spec.type) {
    case "text":
      return (
        <input
          {...common}
          type="text"
          maxLength={spec.max}
          value={value}
          onChange={(e) => set(spec.field, e.target.value)}
          onKeyDown={enter}
        />
      );
    case "textarea":
      return (
        <textarea
          {...common}
          rows={2}
          maxLength={spec.max}
          value={value}
          onChange={(e) => set(spec.field, e.target.value)}
          className={`${base} px-2 py-1 text-sm ${large ? "text-base px-3 py-2" : ""}`}
        />
      );
    case "phone":
      return (
        <input
          {...common}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => set(spec.field, e.target.value.replace(/\D/g, "").slice(0, 10))}
          onKeyDown={enter}
        />
      );
    case "money":
      return (
        <input
          {...common}
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={(e) => set(spec.field, e.target.value)}
          onKeyDown={enter}
        />
      );
    case "status": {
      // the statuses the shop uses (and the one this order already has)
      const options = offeredStatuses(shop, { current: value, canCloseOld });
      if (originalStatus && !options.includes(originalStatus)) options.push(originalStatus);
      return (
        <StatusPicker
          value={value}
          options={options}
          onChange={(status) => set(spec.field, status)}
          onEnter={onEnter}
          large={large}
          label={column.label}
        />
      );
    }
    case "date":
      return (
        <div className="flex items-center gap-1">
          <input
            {...common}
            type="date"
            value={value}
            onChange={(e) => set(spec.field, e.target.value)}
            onKeyDown={enter}
          />
          {value && (
            <button
              type="button"
              onClick={() => set(spec.field, "")}
              aria-label="Remove the delivery date"
              title="Remove the delivery date"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-black/10"
            >
              <X size={16} />
            </button>
          )}
        </div>
      );
    case "executive":
      return (
        <ExecutivePicker
          shopId={shopId}
          value={value}
          compact={!large}
          onChange={(name) => set(spec.field, name)}
        />
      );
    default:
      return null;
  }
};

export default FieldEditor;
