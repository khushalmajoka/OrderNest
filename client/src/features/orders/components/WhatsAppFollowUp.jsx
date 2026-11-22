import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import WhatsAppIcon from "../../../common/components/WhatsAppIcon";
import { LanguageDialog } from "./WhatsAppButton";
import { statusLabel } from "../utils/statusInfo";

// After a status change: tell the customers on WhatsApp.
//  - one order: the usual WhatsApp window opens at once
//  - several orders: a checklist. Each row has its own WhatsApp button; you
//    tap it, press Send in WhatsApp, come back and tap the next. A tick shows
//    who you already started. Nothing is ever sent by itself.
const WhatsAppFollowUp = ({ orders, shop, onClose }) => {
  const [current, setCurrent] = useState(orders.length === 1 ? orders[0] : null);
  const [done, setDone] = useState(() => new Set());

  useEffect(() => {
    if (orders.length === 1) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !current) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [orders.length, current, onClose]);

  const markSent = (order) => setDone((d) => new Set(d).add(order._id));

  if (orders.length === 1) {
    return <LanguageDialog order={orders[0]} shop={shop} onClose={onClose} onSent={markSent} />;
  }

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !current) onClose();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tell the customers on WhatsApp"
            className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-3"
          >
            <h2 className="text-lg font-semibold text-gray-800">Tell the customers on WhatsApp</h2>
            <p className="text-sm text-gray-600">
              Tap WhatsApp next to a customer, press Send there, then come back for the next one.
              Nothing is sent by itself. You can close this any time.
            </p>
            <ul className="divide-y border rounded-lg" aria-label="Customers to tell">
              {orders.map((o) => (
                <li key={o._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {o.customerName || o.orderId}
                    </p>
                    <p className="text-xs text-gray-500 break-words">
                      {o.customerName ? `${o.orderId} · ` : ""}
                      {statusLabel(o.status)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrent(o)}
                    aria-label={`WhatsApp ${o.customerName || o.orderId}`}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm ${
                      done.has(o._id)
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-green-500 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {done.has(o._id) ? <Check size={16} aria-hidden="true" /> : <WhatsAppIcon size={16} />}
                    {done.has(o._id) ? "Started" : "WhatsApp"}
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500" aria-live="polite">
              {done.size} of {orders.length} started.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
      {current && (
        <LanguageDialog order={current} shop={shop} onClose={() => setCurrent(null)} onSent={markSent} />
      )}
    </>
  );
};

export default WhatsAppFollowUp;
