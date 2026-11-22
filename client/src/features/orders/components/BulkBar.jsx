import { ArrowRight, X } from "lucide-react";
import StatusPicker from "../../../common/components/StatusPicker";

// The bar at the bottom while orders are ticked: "Next step" for all of them,
// or "Change status" to one chosen status. Nothing happens until a button is pressed.
const BulkBar = ({ count, options, onNext, onPick, onClear }) => (
  <div
    role="region"
    aria-label="Selected orders"
    className="fixed bottom-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto z-40 bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
  >
    <span className="text-sm font-medium">
      {count} order{count === 1 ? "" : "s"} selected
    </span>
    <button
      type="button"
      onClick={onNext}
      className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
    >
      Next step <ArrowRight size={16} aria-hidden="true" />
    </button>
    <StatusPicker
      compact
      label="Change status"
      buttonText="Change status"
      options={options}
      onChange={onPick}
    />
    <button
      type="button"
      onClick={onClear}
      aria-label="Clear the selection"
      className="flex items-center gap-1 text-sm text-gray-300 hover:text-white underline"
    >
      <X size={14} aria-hidden="true" /> Clear
    </button>
  </div>
);

export default BulkBar;
