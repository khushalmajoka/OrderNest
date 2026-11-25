import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";
import { formatDay } from "../../../common/utils/formatDate";
import { statusLabel } from "../utils/statusInfo";

const API = process.env.REACT_APP_BASE_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// How many days ago a delivery date was ("12 days ago")
const daysAgo = (value) => {
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y) return "";
  const today = new Date();
  const then = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((now - then) / 86400000);
  return days === 1 ? "1 day ago" : `${days} days ago`;
};

// The Needs review window: open orders well past their delivery date, in two
// groups. One tap per order: Delivered, Cancelled, or Not yet (ask again in a
// few days). Money is never touched. `onChanged(orders)` updates the list
// behind; `onSnoozed()` only refreshes the numbers.
const NeedsReviewDialog = ({ onClose, onChanged, onSnoozed }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState({}); // id -> { text, previous } after a tap
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(() => {
    setError("");
    axios
      .get(`${API}/api/orders/review`, { headers: headers() })
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, "Could not load the list.")));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setStatus = async (orders, status) => {
    const res = await axios.post(`${API}/api/orders/bulk-status`, { ids: orders.map((o) => o._id), status }, { headers: headers() });
    const changed = res.data.orders;
    if (changed.length && onChanged) onChanged(changed.map(({ previousStatus, ...o }) => o));
    return changed;
  };

  const choose = async (order, status) => {
    if (busy) return;
    setBusy(true);
    try {
      const changed = await setStatus([order], status);
      setDone((d) => ({ ...d, [order._id]: { text: `Marked ${statusLabel(status)}`, previous: changed[0]?.previousStatus || order.status } }));
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the status."));
    } finally {
      setBusy(false);
    }
  };

  const notYet = async (order) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await axios.post(`${API}/api/orders/review-snooze`, { ids: [order._id] }, { headers: headers() });
      setDone((d) => ({ ...d, [order._id]: { text: `Left for ${res.data.days} days` } }));
      if (onSnoozed) onSnoozed();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not do that."));
    } finally {
      setBusy(false);
    }
  };

  const undo = async (order) => {
    const state = done[order._id];
    if (!state?.previous || busy) return;
    setBusy(true);
    try {
      await setStatus([order], state.previous);
      setDone((d) => {
        const next = { ...d };
        delete next[order._id];
        return next;
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not undo."));
    } finally {
      setBusy(false);
    }
  };

  const markAllDelivered = async (orders) => {
    setBusy(true);
    setConfirmAll(false);
    try {
      const changed = await setStatus(orders, "Delivered");
      setDone((d) => {
        const next = { ...d };
        changed.forEach((o) => {
          next[o._id] = { text: "Marked Delivered", previous: o.previousStatus };
        });
        return next;
      });
      toast.success(`${changed.length} ${changed.length === 1 ? "order" : "orders"} marked Delivered.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the status."));
    } finally {
      setBusy(false);
    }
  };

  const renderRow = (order) => {
    const state = done[order._id];
    const name = String(order.customerName || "").trim() || "No name";
    return (
      <li key={order._id} className="py-3 border-t border-gray-100 first:border-t-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-gray-900 text-sm">{name}</span>
          <span className="text-xs text-gray-500">{order.orderId}</span>
        </div>
        <p className="text-xs text-gray-600">
          {order.item || "No item"} · {statusLabel(order.status)} · due {formatDay(order.expectedDeliveryDate)} ({daysAgo(order.expectedDeliveryDate)})
        </p>
        {state ? (
          <p className="mt-2 text-sm text-green-700">
            {state.text}
            {state.previous && (
              <button type="button" onClick={() => undo(order)} disabled={busy} className="ml-3 underline text-gray-700 hover:text-gray-900">
                Undo
              </button>
            )}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => choose(order, "Delivered")} className="px-3 py-2 min-h-[44px] rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-60">
              Delivered
            </button>
            <button type="button" disabled={busy} onClick={() => choose(order, "Cancelled")} className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
              Cancelled
            </button>
            <button type="button" disabled={busy} onClick={() => notYet(order)} className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
              Not yet
            </button>
          </div>
        )}
      </li>
    );
  };

  const renderGroup = ({ title, hint, group, withAll }) => {
    if (!group || group.count === 0) return null;
    const waiting = group.orders.filter((o) => !done[o._id]);
    return (
      <section key={title} className="space-y-1" aria-label={title}>
        <h3 className="font-semibold text-gray-800">
          {title} <span className="text-gray-500 font-normal">({group.count})</span>
        </h3>
        <p className="text-xs text-gray-600">{hint}</p>
        {withAll && waiting.length > 1 && (
          confirmAll ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm space-y-2">
              <p>Mark these {waiting.length} orders as Delivered? The money on them does not change.</p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => markAllDelivered(waiting)} className="px-3 py-2 min-h-[44px] rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-60">
                  Yes, mark them
                </button>
                <button type="button" onClick={() => setConfirmAll(false)} className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-50">
                  No
                </button>
              </div>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmAll(true)} className="px-3 py-2 min-h-[44px] rounded-lg border border-green-600 text-green-700 text-sm font-medium hover:bg-green-50 disabled:opacity-60">
              Mark all {waiting.length} as Delivered
            </button>
          )
        )}
        {group.count > group.orders.length && (
          <p className="text-xs text-gray-500">Showing the oldest {group.orders.length}. Check these, then open this window again for the rest.</p>
        )}
        <ul>
          {group.orders.map(renderRow)}
        </ul>
      </section>
    );
  };

  const empty = data && data.probablyDelivered.count + data.late.count === 0;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Orders that need a check" className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Orders that need a check</h2>
        {data && (
          <p className="text-sm text-gray-600">
            These open orders are {data.days} or more days past their delivery date. Tell the app what happened. Nothing changes by itself.
          </p>
        )}
        {error && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{error}</p>
            <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-orange-700 text-white">Try again</button>
          </div>
        )}
        {!data && !error && <p className="text-sm text-gray-500">Loading...</p>}
        {empty && <p className="text-sm text-gray-700">Nothing to check. All good.</p>}
        {data && (
          <>
            {renderGroup({
              title: "Probably delivered",
              hint: "Ready or Dispatched, but not marked Delivered.",
              group: data.probablyDelivered,
              withAll: true,
            })}
            {renderGroup({
              title: "Late, please check",
              hint: "Still being worked on, or not started.",
              group: data.late,
            })}
          </>
        )}
        <button type="button" onClick={onClose} className="w-full px-4 py-2 min-h-[44px] rounded-lg bg-orange-700 text-white font-medium hover:bg-orange-800">
          Close
        </button>
      </div>
    </div>,
    document.body
  );
};

export default NeedsReviewDialog;
