import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { STATUSES } from "../../orders/utils/filters";
import {
  COLOR_OPTIONS,
  DEFAULT_STATUS_COLORS,
  resolveStatusColors,
} from "../../../common/utils/statusColors";
import { getErrorMessage } from "../../../common/utils/api";

// Settings card: for each order status, switch the colour on or off and pick
// which colour. The choice is saved on the shop, so it shows on every device.
const StatusColorsCard = ({ shop }) => {
  const [choices, setChoices] = useState(() => resolveStatusColors(shop));
  const [saving, setSaving] = useState(false);

  const change = (status, patch) =>
    setChoices((prev) => ({ ...prev, [status]: { ...prev[status], ...patch } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/status-colors`,
        { statusColors: choices },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Status colours saved.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save the colours."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Status colours</h2>
      <p className="text-sm text-gray-600 mb-4">
        Colour the orders by status so they are easy to spot. Switch a status
        off if you do not want it coloured.
      </p>

      <div className="space-y-4">
        {STATUSES.map((status) => {
          const { enabled, color } = choices[status];
          const style = COLOR_OPTIONS[color];
          return (
            <div key={status} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    enabled ? style.badge : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {status}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Colour for ${status}`}
                  onClick={() => change(status, { enabled: !enabled })}
                  className={`relative w-11 h-6 shrink-0 rounded-full transition ${
                    enabled ? "bg-orange-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      enabled ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              <div className={`flex flex-wrap gap-2 mt-2 ${enabled ? "" : "opacity-40"}`}>
                {Object.entries(COLOR_OPTIONS).map(([key, option]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={!enabled}
                    aria-label={`${status}: ${option.label}`}
                    aria-pressed={color === key}
                    onClick={() => change(status, { color: key })}
                    className={`w-7 h-7 rounded-full ${option.swatch} ${
                      color === key
                        ? "ring-2 ring-offset-2 ring-gray-700"
                        : ""
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 mt-5">
        <button
          type="button"
          onClick={() => setChoices(DEFAULT_STATUS_COLORS)}
          className="text-sm text-gray-600 underline"
        >
          Use default colours
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2 rounded-lg text-white font-medium ${
            saving ? "bg-orange-300" : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default StatusColorsCard;
