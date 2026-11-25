import { useEffect } from "react";
import { createPortal } from "react-dom";
import { STATUSES } from "../utils/filters";
import { hiddenStatusesOf, statusHint, statusLabel } from "../utils/statusInfo";

// "What do the statuses mean?": a small window listing every status the shop
// uses, with its meaning. Opened from the Orders page.
const StatusGuideDialog = ({ shop, onClose }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hidden = hiddenStatusesOf(shop);
  const used = STATUSES.filter((s) => !hidden.includes(s));
  const off = STATUSES.filter((s) => hidden.includes(s));

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="What the statuses mean"
        className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-3"
      >
        <h2 className="text-lg font-semibold text-gray-800">What the statuses mean</h2>
        <p className="text-sm text-gray-600">
          An order moves along these steps, from the first to the last. Change it when something happens.
        </p>
        <ol className="space-y-2">
          {used.map((s) => (
            <li key={s} className="text-sm">
              <span className="font-medium text-gray-900">{statusLabel(s)}</span>
              <span className="block text-xs text-gray-600">{statusHint(s)}</span>
            </li>
          ))}
        </ol>
        {off.length > 0 && (
          <p className="text-xs text-gray-500">
            Switched off in Settings (not offered, but old orders keep them):{" "}
            {off.map(statusLabel).join(", ")}.
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-1 px-4 py-2 rounded-lg bg-orange-700 text-white font-medium hover:bg-orange-800"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
};

export default StatusGuideDialog;
