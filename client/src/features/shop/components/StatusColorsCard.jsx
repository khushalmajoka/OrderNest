import { useSavedFlash } from "../../../common/hooks/useSavedFlash";
import { statusLabel } from "../../orders/utils/statusInfo";
import SavedLabel from "../../../common/components/SavedLabel";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { STATUSES } from "../../orders/utils/filters";
import {
  COLOR_OPTIONS,
  DEFAULT_STATUS_COLORS,
  resolveColorSwitches,
  resolveStatusColors,
} from "../../../common/utils/statusColors";
import { getErrorMessage } from "../../../common/utils/api";

// Settings card: for each order status, switch the colour on or off and pick
// which colour. The choice is saved on the shop, so it shows on every device.
const StatusColorsCard = ({ shop }) => {
  const [choices, setChoices] = useState(() => resolveStatusColors(shop));
  const [switches, setSwitches] = useState(() => resolveColorSwitches(shop));
  const [saving, setSaving] = useState(false);
  const [saved, flashSaved] = useSavedFlash();

  const change = (status, patch) =>
    setChoices((prev) => ({ ...prev, [status]: { ...prev[status], ...patch } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/status-colors`,
        { statusColors: choices, ...switches },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Status colours saved.");
      flashSaved();
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

      {/* Main switches */}
      <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 mb-5">
        {[
          ["master", "Colour orders by status", "Off: no colours at all, everything in the app's own colours"],
          ["row", "Colour the whole row", "The soft colour behind the row"],
          ["strip", "Colour the line at the start of the row", "Off: the line uses the app's own colour"],
        ].map(([key, label, hint]) => {
          const on = switches[key];
          const locked = key !== "master" && !switches.master;
          return (
            <div key={key} className={`flex items-center justify-between gap-3 p-3 ${locked ? "opacity-40" : ""}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                disabled={locked}
                onClick={() => setSwitches((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`relative w-11 h-6 shrink-0 rounded-full transition ${on ? "bg-orange-600" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : ""}`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className={`space-y-4 ${switches.master ? "" : "opacity-40 pointer-events-none"}`} aria-disabled={!switches.master}>
        {STATUSES.map((status) => {
          const { enabled, color } = choices[status];
          const style = COLOR_OPTIONS[color];
          return (
            <div key={status} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    enabled ? style.badge : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {statusLabel(status)}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Colour for ${status}`}
                  onClick={() => change(status, { enabled: !enabled })}
                  className={`relative w-11 h-6 shrink-0 rounded-full transition ${
                    enabled ? "bg-orange-600" : "bg-gray-300"
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
          onClick={() => {
            setChoices(DEFAULT_STATUS_COLORS);
            setSwitches({ master: true, row: true, strip: true });
          }}
          className="text-sm text-gray-600 underline"
        >
          Use default colours
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2 rounded-lg text-white font-medium ${
            saving ? "bg-orange-300" : "bg-orange-700 hover:bg-orange-800"
          }`}
        >
          {saving ? "Saving..." : saved ? <SavedLabel /> : "Save"}
        </button>
      </div>
    </div>
  );
};

export default StatusColorsCard;
