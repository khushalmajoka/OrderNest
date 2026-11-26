import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// A list of the old names as an Excel file (the backup), for the chosen groups
const downloadBackup = async (groups) => {
  // The Excel library is big: downloaded only when it is needed
  const XLSX = await import("xlsx");
  const rows = [["Order ID", "Old customer name", "Product", "Phone", "Created"]];
  for (const group of groups) {
    for (const order of group.orders) {
      rows.push([
        order.orderId || "",
        order.customerName || "",
        order.item || "",
        order.phone || "",
        order.createdAt ? new Date(order.createdAt).toLocaleString("en-GB") : "",
      ]);
    }
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 20 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Old names");
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  XLSX.writeFile(workbook, `old-customer-names-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.xlsx`);
};

// Settings card (admin): find old orders whose customer name is not a real
// name (like "N", "NA", "xx", "123") and empty those names, after the admin
// has looked at them and said yes. Only the name is changed.
const CleanNamesCard = ({ shop }) => {
  const [stage, setStage] = useState("idle"); // idle | checking | result | confirming | clearing
  const [result, setResult] = useState(null); // { totalOrders, truncated, groups }
  const [picked, setPicked] = useState(new Set()); // group keys the admin ticked
  const [lastCleared, setLastCleared] = useState(null);

  const base = `${process.env.REACT_APP_BASE_URL}/api/orders/shop/${shop._id}`;

  const check = async () => {
    setStage("checking");
    try {
      const res = await axios.get(`${base}/name-check`, { headers: headers() });
      setResult(res.data);
      setPicked(new Set()); // nothing is ticked by default
      setStage("result");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not check the names."));
      setStage(result ? "result" : "idle");
    }
  };

  const toggle = (key) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const chosenGroups = result ? result.groups.filter((g) => picked.has(g.key)) : [];
  const chosenCount = chosenGroups.reduce((sum, g) => sum + g.count, 0);

  const clear = async () => {
    setStage("clearing");
    try {
      const res = await axios.post(
        `${base}/clear-names`,
        { keys: chosenGroups.map((g) => g.key) },
        { headers: headers() }
      );
      setLastCleared(res.data.cleared);
      toast.success(`Cleared ${res.data.cleared} customer name${res.data.cleared === 1 ? "" : "s"}.`);
      // look again, to show what is left
      const again = await axios.get(`${base}/name-check`, { headers: headers() });
      setResult(again.data);
      setPicked(new Set());
      setStage("result");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not clear the names."));
      setStage("result");
    }
  };

  const backup = async () => {
    try {
      await downloadBackup(chosenGroups);
    } catch (err) {
      console.error("Could not make the backup file:", err);
      toast.error("Could not make the backup file.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Clean customer names</h2>
      <p className="text-sm text-gray-600 mb-4">
        Finds old orders whose customer name is not a real name (like N, NA, xx
        or 123). You look at the list, choose what to clear, and confirm. Only
        the customer name is emptied; phone, product and amounts stay as they
        are. Those orders then show "Name missing", and you can add the real
        names later.
      </p>

      {stage === "idle" && (
        <button
          type="button"
          onClick={check}
          className="px-5 py-2 rounded-lg bg-orange-700 text-white font-medium hover:bg-orange-800"
        >
          Check my orders
        </button>
      )}

      {stage === "checking" && <p className="text-sm text-gray-600">Checking your orders...</p>}

      {(stage === "result" || stage === "confirming" || stage === "clearing") && result && (
        <div className="space-y-4">
          {lastCleared !== null && (
            <p className="text-sm rounded-md bg-green-50 border border-green-200 text-green-800 px-3 py-2" role="status">
              Cleared {lastCleared} name{lastCleared === 1 ? "" : "s"}. On the Orders page,
              use Filters → "Customer name missing" to find these orders and add the real names.
            </p>
          )}

          {result.groups.length === 0 ? (
            <p className="text-sm rounded-md bg-green-50 border border-green-200 text-green-800 px-3 py-2">
              All customer names look fine. Nothing to clean.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                Found <strong>{result.totalOrders}</strong> order{result.totalOrders === 1 ? "" : "s"} with
                an unclear name, in <strong>{result.groups.length}</strong> kind{result.groups.length === 1 ? "" : "s"}.
                Tick the ones to clear.
                {result.truncated && " (Only the newest 5000 are shown; check again after clearing.)"}
              </p>

              <div className="flex items-center gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => setPicked(new Set(result.groups.map((g) => g.key)))}
                  className="text-orange-700 underline"
                  disabled={stage !== "result"}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setPicked(new Set())}
                  className="text-gray-600 underline"
                  disabled={stage !== "result"}
                >
                  Select none
                </button>
              </div>

              <ul className="divide-y border rounded-lg" aria-label="Unclear customer names">
                {result.groups.map((group) => {
                  const ids = group.orders.slice(0, 3).map((o) => o.orderId).join(", ");
                  const more = group.count - Math.min(3, group.orders.length);
                  return (
                    <li key={group.key}>
                      <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-stone-100">
                        <input
                          type="checkbox"
                          checked={picked.has(group.key)}
                          onChange={() => toggle(group.key)}
                          disabled={stage !== "result"}
                          aria-label={`Clear the name "${group.name}"`}
                          className="mt-1 w-4 h-4 accent-orange-500 shrink-0"
                        />
                        <span className="min-w-0 text-sm">
                          <span className="font-medium text-gray-800 break-words">"{group.name}"</span>
                          <span className="text-gray-500"> · {group.count} order{group.count === 1 ? "" : "s"}</span>
                          <span className="block text-xs text-gray-500 break-words">
                            {ids}
                            {more > 0 ? ` and ${more} more` : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {stage === "result" && (
                <button
                  type="button"
                  disabled={chosenCount === 0}
                  onClick={() => setStage("confirming")}
                  className={`px-5 py-2 rounded-lg text-white font-medium ${
                    chosenCount === 0 ? "bg-orange-300 cursor-not-allowed" : "bg-orange-700 hover:bg-orange-800"
                  }`}
                >
                  {chosenCount === 0
                    ? "Clear the chosen names"
                    : `Clear the names of ${chosenCount} order${chosenCount === 1 ? "" : "s"}`}
                </button>
              )}

              {(stage === "confirming" || stage === "clearing") && (
                <div
                  role="alertdialog"
                  aria-label="Confirm clearing names"
                  className="rounded-lg border border-stone-300 bg-stone-50 p-4 space-y-3"
                >
                  <p className="text-sm text-gray-800">
                    This empties the customer name of <strong>{chosenCount}</strong> order
                    {chosenCount === 1 ? "" : "s"}. Phone, product and amounts are not touched. This
                    cannot be undone from the app, so it is a good idea to download the list of the
                    old names first.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={backup}
                      disabled={stage === "clearing"}
                      className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-stone-800 font-medium hover:bg-stone-100"
                    >
                      Download the old names (Excel)
                    </button>
                    <button
                      type="button"
                      onClick={clear}
                      disabled={stage === "clearing"}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
                    >
                      {stage === "clearing" ? "Clearing..." : `Yes, clear ${chosenCount}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStage("result")}
                      disabled={stage === "clearing"}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {stage === "result" && (
            <button type="button" onClick={check} className="text-sm text-gray-600 underline">
              Check again
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CleanNamesCard;
