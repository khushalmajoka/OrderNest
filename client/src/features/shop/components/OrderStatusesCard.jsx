import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";
import { STATUSES, CLOSED_OLD } from "../../orders/utils/filters";
import {
  HIDEABLE_STATUSES,
  hiddenStatusesOf,
  statusHint,
  statusLabel,
} from "../../orders/utils/statusInfo";

// Settings card (admin): which statuses the shop uses. A switched-off status
// is not offered when someone changes an order's status. It never changes
// existing orders.
const OrderStatusesCard = ({ shop, onSaved }) => {
  const start = hiddenStatusesOf(shop);
  const [hidden, setHidden] = useState(start);
  const [saving, setSaving] = useState(false);
  const changed = JSON.stringify([...hidden].sort()) !== JSON.stringify([...start].sort());

  const toggle = (status) =>
    setHidden((h) => (h.includes(status) ? h.filter((s) => s !== status) : [...h, status]));

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/statuses`,
        { hiddenStatuses: hidden },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Statuses saved.");
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save the statuses."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Order statuses</h2>
      <p className="text-sm text-gray-600 mb-1">
        Choose the statuses you use. A switched-off status is <strong>not offered</strong> when you
        change an order's status. Orders that already have it keep it, and you can still find them with
        Filters.
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Example: if you only do pick-up and never send orders, switch off "Dispatched".
      </p>

      <ul className="divide-y" aria-label="Statuses">
        {STATUSES.filter((s) => s !== CLOSED_OLD).map((status) => {
          const locked = !HIDEABLE_STATUSES.includes(status);
          const on = !hidden.includes(status);
          return (
            <li key={status} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{statusLabel(status)}</p>
                <p className="text-xs text-gray-500">{statusHint(status)}</p>
              </div>
              {locked ? (
                <span className="shrink-0 text-xs text-gray-500 pt-1">always on</span>
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Use the status ${statusLabel(status)}`}
                  onClick={() => toggle(status)}
                  className={`relative w-11 h-6 shrink-0 rounded-full transition ${on ? "bg-orange-600" : "bg-gray-300"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : ""}`}
                  />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-gray-500 mt-2">
        "Closed (old)" is only for the admin's "Close old orders" tool, so it is not in this list.
      </p>

      <button
        type="button"
        onClick={save}
        disabled={!changed || saving}
        className={`mt-4 px-5 py-2 rounded-lg text-white font-medium ${
          !changed || saving ? "bg-orange-300 cursor-not-allowed" : "bg-orange-700 hover:bg-orange-800"
        }`}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
};

export default OrderStatusesCard;
