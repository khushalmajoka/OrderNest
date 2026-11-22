import { useState } from "react";
import { statusLabel } from "../../orders/utils/statusInfo";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const OPEN_STATUSES = [
  "Order Received",
  "Pending",
  "In Progress",
  "Completed",
  "Ready to Dispatch/Pick-Up",
  "Dispatched",
];
const DEFAULT_STATUSES = ["Order Received", "Pending", "In Progress"];

const BASES = [
  { value: "delivery", label: "Delivery date", hint: "If an order has no delivery date, its created date is used." },
  { value: "created", label: "Created date", hint: "The day the order was made." },
  { value: "updated", label: "Last changed date", hint: "The last time someone changed the order." },
];

const pad = (n) => String(n).padStart(2, "0");
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthsAgo = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return toInputDate(d);
};
const showDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The old statuses as an Excel file (the backup)
const downloadBackup = async (orders) => {
  // The Excel library is big: downloaded only when it is needed
  const XLSX = await import("xlsx");
  const rows = [["Order ID", "Customer", "Product", "Phone", "Old status", "Total", "Advance", "Balance", "Created", "Delivery date"]];
  for (const o of orders) {
    rows.push([
      o.orderId || "",
      o.customerName || "",
      o.item || "",
      o.phone || "",
      o.status || "",
      o.total ?? "",
      o.advance ?? "",
      o.balance ?? "",
      o.createdAt ? new Date(o.createdAt).toLocaleString("en-GB") : "",
      o.expectedDeliveryDate ? showDate(o.expectedDeliveryDate) : "",
    ]);
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Old statuses");
  XLSX.writeFile(workbook, `old-order-statuses-${toInputDate(new Date())}.xlsx`);
};

// Settings card (admin): many old orders never got a status update, so they
// still count as "Open". This lets the admin choose which old orders to close
// (Delivered or Cancelled). The admin sees a preview first and confirms.
// Only the status (and, if ticked, the balance) changes; the orders keep their
// "last changed" time so they do not jump in the list.
const CloseOldOrdersCard = ({ shop }) => {
  const [basis, setBasis] = useState("delivery");
  const [before, setBefore] = useState("");
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [newStatus, setNewStatus] = useState("Closed (old)");
  const [markPaid, setMarkPaid] = useState(false);

  const [stage, setStage] = useState("form"); // form | checking | preview | confirming | closing
  const [preview, setPreview] = useState(null);
  const [lastClosed, setLastClosed] = useState(null);

  const base = `${process.env.REACT_APP_BASE_URL}/api/orders/shop/${shop._id}`;
  const canCheck = before && statuses.length > 0;

  // changing any choice throws away an old preview (it would not match)
  const change = (setter) => (value) => {
    setter(value);
    setPreview(null);
    setStage("form");
  };

  const toggleStatus = (status) =>
    change(setStatuses)(
      statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]
    );

  const check = async () => {
    setStage("checking");
    setLastClosed(null);
    try {
      const res = await axios.get(`${base}/close-check`, {
        headers: headers(),
        params: { basis, before, statuses: statuses.join(",") },
      });
      setPreview(res.data);
      setStage("preview");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not check the orders."));
      setStage("form");
    }
  };

  const close = async () => {
    setStage("closing");
    try {
      const res = await axios.post(
        `${base}/close-orders`,
        { basis, before, statuses, newStatus, markPaid: newStatus === "Delivered" && markPaid, expectedCount: preview.count },
        { headers: headers() }
      );
      setLastClosed({ count: res.data.closed, status: newStatus });
      toast.success(`Closed ${plural(res.data.closed, "order")}.`);
      setPreview(null);
      setStage("form");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not close the orders."));
      // the numbers may have changed: go back to the form so the admin checks again
      setPreview(null);
      setStage("form");
    }
  };

  const backup = async () => {
    try {
      await downloadBackup(preview.orders);
    } catch (err) {
      console.error("Could not make the backup file:", err);
      toast.error("Could not make the backup file.");
    }
  };

  const busy = stage === "checking" || stage === "closing";
  const paidApplies = newStatus === "Delivered" && markPaid;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Close old orders</h2>
      <p className="text-sm text-gray-600 mb-4">
        Old orders that never got a status update still count as "Open". Here you
        choose which old orders to close. The best choice is "Closed (old)": we
        do not know what happened to them, so they are simply marked as old and
        finished. You see a preview first, and you can download an Excel backup
        before you confirm. Only the status changes (and the balance, if you
        tick it, for Delivered).
      </p>

      {lastClosed && (
        <p className="text-sm rounded-md bg-green-50 border border-green-200 text-green-800 px-3 py-2 mb-4" role="status">
          Closed {plural(lastClosed.count, "order")} as {lastClosed.status}. The Dashboard numbers
          are updated.
        </p>
      )}

      <div className="space-y-5">
        <fieldset className="space-y-2" disabled={busy || stage === "confirming"}>
          <legend className="text-sm font-medium text-gray-800 mb-1">1. Which date decides if an order is old?</legend>
          {BASES.map((b) => (
            <label key={b.value} className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="close-basis"
                checked={basis === b.value}
                onChange={() => change(setBasis)(b.value)}
                className="mt-1 w-4 h-4 accent-orange-500"
              />
              <span className="text-sm">
                <span className="text-gray-800">{b.label}</span>
                <span className="block text-xs text-gray-500">{b.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="close-before" className="text-sm font-medium text-gray-800 block">
            2. Close orders older than this date
          </label>
          <input
            id="close-before"
            type="date"
            value={before}
            onChange={(e) => change(setBefore)(e.target.value)}
            disabled={busy || stage === "confirming"}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              [1, "1 month ago"],
              [3, "3 months ago"],
              [6, "6 months ago"],
              [12, "1 year ago"],
            ].map(([months, label]) => (
              <button
                key={months}
                type="button"
                onClick={() => change(setBefore)(monthsAgo(months))}
                disabled={busy || stage === "confirming"}
                className="px-2.5 py-1 rounded-full border border-gray-300 text-gray-700 hover:bg-orange-50"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">The chosen day itself stays as it is. Only earlier days are closed.</p>
        </div>

        <fieldset className="space-y-2" disabled={busy || stage === "confirming"}>
          <legend className="text-sm font-medium text-gray-800 mb-1">3. Which current statuses?</legend>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {OPEN_STATUSES.map((status) => (
              <label key={status} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statuses.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="w-4 h-4 accent-orange-500"
                />
                {statusLabel(status)}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">Delivered and Cancelled orders are never touched.</p>
        </fieldset>

        <fieldset className="space-y-2" disabled={busy || stage === "confirming"}>
          <legend className="text-sm font-medium text-gray-800 mb-1">4. Change them to</legend>
          <div className="flex flex-wrap gap-4">
            {["Closed (old)", "Delivered", "Cancelled"].map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="close-new-status"
                  checked={newStatus === s}
                  onChange={() => change(setNewStatus)(s)}
                  className="w-4 h-4 accent-orange-500"
                />
                {s}
              </label>
            ))}
          </div>
          {newStatus === "Delivered" ? (
            <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={markPaid}
                onChange={(e) => change(setMarkPaid)(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-orange-500"
              />
              <span>
                Also mark the balance as fully paid
                <span className="block text-xs text-gray-500">
                  Advance becomes the full total and the balance becomes 0. This lowers "Balance to collect".
                </span>
              </span>
            </label>
          ) : (
            <p className="text-xs text-gray-500">
              {newStatus} orders are not Open and are left out of "Balance to collect". Their
              amounts stay saved on the orders and are not changed.
            </p>
          )}
        </fieldset>

        {(stage === "form" || stage === "checking") && (
          <button
            type="button"
            onClick={check}
            disabled={!canCheck || busy}
            className={`px-5 py-2 rounded-lg text-white font-medium ${
              !canCheck || busy ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {stage === "checking" ? "Checking..." : "Show what will change"}
          </button>
        )}

        {(stage === "preview" || stage === "confirming" || stage === "closing") && preview && (
          <div className="space-y-3" aria-live="polite">
            {preview.count === 0 ? (
              <p className="text-sm rounded-md bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2">
                No orders match. Nothing to close. Try a later date or more statuses.
              </p>
            ) : preview.tooMany ? (
              <p className="text-sm rounded-md bg-red-50 border border-red-200 text-red-800 px-3 py-2">
                That is more than {preview.limit} orders. Please choose an earlier date, and
                close them in parts.
              </p>
            ) : (
              <>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 space-y-1">
                  <p>
                    <strong>{plural(preview.count, "order")}</strong> will change to <strong>{newStatus}</strong>.
                  </p>
                  <p className="text-gray-600">
                    Created from {showDate(preview.oldest)} to {showDate(preview.newest)}.
                  </p>
                  <p className="text-gray-600">
                    {Object.entries(preview.byStatus)
                      .map(([status, n]) => `${statusLabel(status)}: ${n}`)
                      .join(" · ")}
                  </p>
                  <p className="text-gray-600">
                    Balance on these orders: {money(preview.balance)} ({plural(preview.withBalance, "order")} with a balance).
                    {paidApplies
                      ? " It will be marked as paid."
                      : newStatus !== "Delivered"
                      ? " It will drop out of Balance to collect; the amounts stay saved on the orders."
                      : " The balance stays as it is."}
                  </p>
                  <p className="text-gray-600 break-words">
                    For example: {preview.orders.slice(0, 5).map((o) => o.orderId).join(", ")}
                    {preview.count > 5 ? ` and ${preview.count - 5} more` : ""}
                  </p>
                </div>

                {preview.dueLater > 0 && (
                  <p className="text-sm rounded-md bg-amber-50 border border-amber-300 text-amber-900 px-3 py-2" role="alert">
                    Careful: {plural(preview.dueLater, "of these orders")} {preview.dueLater === 1 ? "has" : "have"} a
                    delivery date of today or later, so {preview.dueLater === 1 ? "it" : "they"} may still be live.
                  </p>
                )}

                {stage === "preview" && (
                  <button
                    type="button"
                    onClick={() => setStage("confirming")}
                    className="px-5 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600"
                  >
                    Close {plural(preview.count, "order")} as {newStatus}
                  </button>
                )}

                {(stage === "confirming" || stage === "closing") && (
                  <div
                    role="alertdialog"
                    aria-label="Confirm closing old orders"
                    className="rounded-lg border border-orange-300 bg-orange-50 p-4 space-y-3"
                  >
                    <p className="text-sm text-gray-800">
                      This changes the status of <strong>{plural(preview.count, "order")}</strong> to{" "}
                      <strong>{newStatus}</strong>
                      {paidApplies ? " and marks their balance as paid" : ""}. This cannot be undone
                      from the app, so it is a good idea to download the old statuses first.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={backup}
                        disabled={stage === "closing"}
                        className="px-4 py-2 rounded-lg border border-orange-400 bg-white text-orange-700 font-medium hover:bg-orange-100"
                      >
                        Download the old statuses (Excel)
                      </button>
                      <button
                        type="button"
                        onClick={close}
                        disabled={stage === "closing"}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
                      >
                        {stage === "closing" ? "Closing..." : `Yes, close ${preview.count}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage("preview")}
                        disabled={stage === "closing"}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloseOldOrdersCard;
