import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";
import { downloadOrdersExcel } from "../utils/exportExcel";

const MAX_ROWS = 10000; // the most one file holds (the server enforces it too)

// "Export to Excel": follows the search and filters on the screen, and lets
// the user choose how many orders go in the file.
const ExportDialog = ({ shopId, params, totalOrders, summary, onClose }) => {
  const [mode, setMode] = useState("all"); // "all" | "first"
  const [howMany, setHowMany] = useState(String(Math.min(totalOrders, 100) || 1));
  const [busy, setBusy] = useState(false);

  const allCount = Math.min(totalOrders, MAX_ROWS);
  const firstCount = Math.floor(Number(howMany));
  const firstValid = Number.isInteger(firstCount) && firstCount >= 1;
  const rows = mode === "all" ? allCount : Math.min(firstCount, allCount);

  const handleDownload = async (e) => {
    e.preventDefault();
    if (mode === "first" && !firstValid) {
      toast.error("Please type how many orders, for example 50.");
      return;
    }
    setBusy(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/orders/shop/${shopId}/export`,
        {
          params: { ...params, limit: mode === "first" ? firstCount : undefined },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (!res.data.orders.length) {
        toast.error("There are no orders to export.");
        return;
      }
      downloadOrdersExcel(res.data.orders);
      toast.success(`Downloaded ${res.data.orders.length} orders.`);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not export the orders."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleDownload}
        className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[92vh] overflow-y-auto p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Export to Excel</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-gray-800 px-2"
          >
            ✕
          </button>
        </div>

        <div className="rounded-md bg-orange-50 p-3 text-sm text-gray-700 space-y-1">
          <p>
            Orders matching your screen now: <b>{totalOrders}</b>
          </p>
          {summary.length > 0 ? (
            <ul className="list-disc pl-5 text-gray-600">
              {summary.map((line) => (
                <li key={line} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No search or filter is on, so this is every order.</p>
          )}
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-700 mb-1">
            How many orders?
          </legend>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="mode"
              checked={mode === "all"}
              onChange={() => setMode("all")}
              className="mt-1 accent-orange-500"
            />
            <span>
              All of them ({allCount})
              {totalOrders > MAX_ROWS && (
                <span className="block text-xs text-gray-500">
                  One file holds at most {MAX_ROWS.toLocaleString()} orders. Use
                  filters to export the rest.
                </span>
              )}
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="mode"
              checked={mode === "first"}
              onChange={() => setMode("first")}
              className="accent-orange-500"
            />
            <span>Only the first</span>
            <input
              type="number"
              min={1}
              max={allCount}
              inputMode="numeric"
              aria-label="Number of orders"
              value={howMany}
              onFocus={() => setMode("first")}
              onChange={(e) => {
                setMode("first");
                setHowMany(e.target.value);
              }}
              className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <span>orders</span>
          </label>
          <p className="text-xs text-gray-500">
            The orders come in the same order as on your screen (the sort you
            chose).
          </p>
        </fieldset>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-md border text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || totalOrders === 0}
            className="flex-1 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300"
          >
            {busy ? "Preparing..." : `Download ${rows} order${rows === 1 ? "" : "s"}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExportDialog;
