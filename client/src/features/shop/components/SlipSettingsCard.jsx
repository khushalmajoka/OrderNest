import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import DeliverySlip from "../../orders/components/DeliverySlip";
import {
  DEFAULT_SLIP_FIELDS,
  SLIP_GROUPS,
  resolveSlip,
} from "../../../common/utils/slipFields";
import { getErrorMessage } from "../../../common/utils/api";

// A made-up order, only to show what the slip will look like
const SAMPLE_ORDER = {
  _id: "000000000000000000000000",
  orderId: "ORD-20261112-5-3",
  customerName: "Asha Verma",
  phone: "9876543210",
  address: "Flat 4, Shanti Apartments\nNear City Mall, Indore 452010",
  item: "Chocolate cake 1kg",
  total: 1500,
  advance: 500,
  balance: 1000,
  orderExecutive: "Ravi",
  expectedDeliveryDate: "2026-11-20",
  createdAt: "2026-11-12T10:00:00.000Z",
};

const PREVIEW_SCALE = 0.62;

// Settings card: what is printed on every delivery slip, with a live preview.
const SlipSettingsCard = ({ shop }) => {
  const initial = resolveSlip(shop);
  const [fields, setFields] = useState(initial.fields);
  const [note, setNote] = useState(initial.note);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/slip`,
        { fields, note },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Delivery slip settings saved.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save the slip settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Delivery slip</h2>
      <p className="text-sm text-gray-600 mb-4">
        Choose what is printed on every delivery slip. The picture on the right
        shows how it will look (with example details). For one parcel you can
        still change things before printing.
      </p>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-4">
          {SLIP_GROUPS.map((group) => (
            <fieldset key={group.title} className="space-y-2">
              <legend className="text-sm font-semibold text-gray-700 mb-1">
                {group.title}
              </legend>
              {group.fields.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center justify-between gap-3 text-sm text-gray-700"
                >
                  {field.label}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={fields[field.key]}
                    aria-label={`Print ${field.label}`}
                    onClick={() =>
                      setFields((f) => ({ ...f, [field.key]: !f[field.key] }))
                    }
                    className={`relative w-11 h-6 shrink-0 rounded-full transition ${
                      fields[field.key] ? "bg-orange-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        fields[field.key] ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </label>
              ))}
            </fieldset>
          ))}

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Note at the bottom (optional)
            </span>
            <textarea
              rows={2}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="For example: Handle with care. Thank you!"
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </label>
        </div>

        <div className="shrink-0 mx-auto sm:mx-0">
          <div
            style={{ width: 420 * PREVIEW_SCALE, height: 592 * PREVIEW_SCALE }}
            className="overflow-hidden rounded shadow border bg-gray-100"
            aria-label="Slip preview"
          >
            <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
              <DeliverySlip order={SAMPLE_ORDER} shop={shop} fields={fields} note={note.trim()} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-5">
        <button
          type="button"
          onClick={() => {
            setFields(DEFAULT_SLIP_FIELDS);
            setNote("");
          }}
          className="text-sm text-gray-600 underline"
        >
          Use default slip
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

export default SlipSettingsCard;
