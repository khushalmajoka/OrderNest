import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  DEFAULT_ROW_COLUMNS,
  ORDER_COLUMNS,
  resolveColumns,
} from "../../orders/utils/orderColumns";
import { getErrorMessage } from "../../../common/utils/api";

// Settings card: which columns sit in the order row, and which only show when
// a row is opened. Fewer columns in the row means no sideways scrolling.
const TableColumnsCard = ({ shop }) => {
  const [inRow, setInRow] = useState(() =>
    resolveColumns(shop).rowColumns.map((column) => column.key)
  );
  const [saving, setSaving] = useState(false);

  const toggle = (key) =>
    setInRow((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/table-columns`,
        { columns: inRow },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Table columns saved.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save the columns."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Table columns</h2>
      <p className="text-sm text-gray-600 mb-4">
        Choose what to show in each order row. The rest appear when you tap a
        row. Fewer columns means no sideways scrolling.
      </p>

      <div className="space-y-3">
        {ORDER_COLUMNS.map((column) => {
          const on = column.fixed || inRow.includes(column.key);
          return (
            <div key={column.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-800">{column.label}</p>
                <p className="text-xs text-gray-500">
                  {column.fixed
                    ? "Always in the row"
                    : on
                    ? "In the row"
                    : "Only when a row is opened"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Show ${column.label} in the row`}
                disabled={column.fixed}
                onClick={() => toggle(column.key)}
                className={`relative w-11 h-6 shrink-0 rounded-full transition ${
                  on ? "bg-orange-500" : "bg-gray-300"
                } ${column.fixed ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    on ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 mt-5">
        <button
          type="button"
          onClick={() => setInRow(DEFAULT_ROW_COLUMNS)}
          className="text-sm text-gray-600 underline"
        >
          Use default columns
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

export default TableColumnsCard;
