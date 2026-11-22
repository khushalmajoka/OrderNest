import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";
import { STATUSES, CLOSED_OLD } from "../../orders/utils/filters";
import { promptStatusesOf, statusLabel } from "../../orders/utils/statusInfo";

// Settings card (admin): after which statuses the app asks "Tell the customer
// on WhatsApp?". It only decides when the question is SHOWN. Nothing is ever
// sent by itself: you still tap and press Send in WhatsApp.
const WhatsAppPromptCard = ({ shop, onSaved }) => {
  const start = promptStatusesOf(shop);
  const [chosen, setChosen] = useState(start);
  const [saving, setSaving] = useState(false);
  const changed = JSON.stringify([...chosen].sort()) !== JSON.stringify([...start].sort());

  const toggle = (status) =>
    setChosen((c) => (c.includes(status) ? c.filter((s) => s !== status) : [...c, status]));

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/whatsapp-prompt`,
        { statuses: chosen },
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
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Ask me to tell the customer</h2>
      <p className="text-sm text-gray-600 mb-1">
        When you move an order to a ticked status, a small message appears: "Tell the customer on
        WhatsApp?". You tap it only if you want to. <strong>Nothing is sent by itself.</strong>
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Example: with "Dispatched" ticked, after you move an order to Dispatched you can tap the message
        and WhatsApp opens with the customer's message ready. When you move many orders at once, you get
        a list with a WhatsApp button for each customer.
      </p>
      <ul className="space-y-2" aria-label="Statuses that ask">
        {STATUSES.filter((s) => s !== CLOSED_OLD).map((status) => (
          <li key={status}>
            <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={chosen.includes(status)}
                onChange={() => toggle(status)}
                className="w-4 h-4 accent-orange-500"
              />
              {statusLabel(status)}
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={save}
        disabled={!changed || saving}
        className={`mt-4 px-5 py-2 rounded-lg text-white font-medium ${
          !changed || saving ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
        }`}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
};

export default WhatsAppPromptCard;
