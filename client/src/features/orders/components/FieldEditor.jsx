import { X } from "lucide-react";
import ExecutivePicker from "../../../common/components/ExecutivePicker";
import { STATUSES } from "../utils/filters";
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
const FieldEditor = ({ column, form, set, shopId, large = false, onEnter }) => {
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
    case "status":
      return (
        <select {...common} value={value} onChange={(e) => set(spec.field, e.target.value)}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      );
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
