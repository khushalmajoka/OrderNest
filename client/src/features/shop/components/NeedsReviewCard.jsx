import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";
import { reviewSettingsOf } from "../../orders/utils/statusInfo";

// Settings card (admin): list open orders that are well past their delivery
// date, so they can be checked and marked Delivered or Cancelled. It only
// LISTS them. No order is ever changed by itself.
const NeedsReviewCard = ({ shop, onSaved }) => {
  const start = reviewSettingsOf(shop);
  const [enabled, setEnabled] = useState(start.enabled);
  const [days, setDays] = useState(String(start.days));
  const [saving, setSaving] = useState(false);

  const n = Number(days);
  const valid = Number.isInteger(n) && n >= 1 && n <= 60;
  const changed = enabled !== start.enabled || n !== start.days;

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/needs-review`,
        { enabled, days: n },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Saved.");
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Check old open orders</h2>
      <p className="text-sm text-gray-600 mb-1">
        Orders are often delivered but never marked Delivered. When this is on, a line above your orders
        lists the ones that are still open some days after their delivery date, so you can mark them
        Delivered or Cancelled in one tap. <strong>No order is changed by itself.</strong>
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Example: with 5 days, an order due on 10 Nov that is still "Dispatched" on 15 Nov appears in the
        list. If you tap "Not yet", that order is left out for 3 days and then comes back.
      </p>
      <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 accent-orange-500"
        />
        Show orders that need a check
      </label>
      <label className="block text-sm text-gray-800 mb-1" htmlFor="review-days">
        Days after the delivery date
      </label>
      <input
        id="review-days"
        type="number"
        min="1"
        max="60"
        inputMode="numeric"
        value={days}
        disabled={!enabled}
        onChange={(e) => setDays(e.target.value)}
        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
      />
      {!valid && enabled && <p className="text-xs text-red-600 mt-1">Please type a whole number from 1 to 60.</p>}
      <div>
        <button
          type="button"
          onClick={save}
          disabled={!changed || saving || !valid}
          className={`mt-4 px-5 py-2 rounded-lg text-white font-medium ${
            !changed || saving || !valid ? "bg-orange-300 cursor-not-allowed" : "bg-orange-700 hover:bg-orange-800"
          }`}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default NeedsReviewCard;
