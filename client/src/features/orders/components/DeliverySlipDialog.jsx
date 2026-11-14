import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import DeliverySlip from "./DeliverySlip";
import { slipToPdf } from "../utils/slipPdf";
import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";
import { SLIP_GROUPS, resolveSlip } from "../../../common/utils/slipFields";

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

// "Delivery slip" window: shows the slip as it will print, with buttons to
// download it as a PDF or print it. The shop's slip settings decide what is on
// it; "Edit this slip" changes things for THIS print only (the order itself is
// never changed). Only exists while it is open.
const DeliverySlipDialog = ({ order, shop, onClose }) => {
  const slipRef = useRef();
  const shopSlip = useMemo(() => resolveSlip(shop), [shop]);

  const [fields, setFields] = useState(shopSlip.fields);
  const [note, setNote] = useState(shopSlip.note);
  const [edits, setEdits] = useState({});
  const [editing, setEditing] = useState(false);

  const [canvas, setCanvas] = useState(null);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const changed = JSON.stringify({ fields, edits, note });

  // Take the picture of the slip once it is on the page, and again (after a
  // short pause in typing) whenever something on it changes
  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const { default: html2canvas } = await import("html2canvas");
        const picture = await html2canvas(slipRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        if (!cancelled) {
          setCanvas(picture);
          setFailed(false);
          setRendering(false);
        }
      } catch (err) {
        console.error("Could not make the delivery slip:", err);
        if (!cancelled) {
          setFailed(true);
          setRendering(false);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [changed]);

  const previewUrl = useMemo(() => (canvas ? canvas.toDataURL("image/png") : null), [canvas]);

  const fileName = `delivery-slip-${order.orderId || order._id.slice(-6)}.pdf`;

  const handleDownload = async () => {
    setBusy(true);
    try {
      const pdf = await slipToPdf(canvas);
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      toast.error("Could not make the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    setBusy(true);
    try {
      const pdf = await slipToPdf(canvas);
      pdf.autoPrint();
      const opened = window.open(pdf.output("bloburl"), "_blank");
      if (!opened) {
        toast.error("Your browser blocked the print window. Use Download PDF.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not open the print window. Use Download PDF.");
    } finally {
      setBusy(false);
    }
  };

  const setEdit = (key, value) => setEdits((current) => ({ ...current, [key]: value }));
  const shown = (key, original) => (edits[key] !== undefined ? edits[key] : original ?? "");

  const resetEverything = () => {
    setFields(shopSlip.fields);
    setNote(shopSlip.note);
    setEdits({});
  };

  const edited = Object.keys(edits).length > 0 || changed !== JSON.stringify({ fields: shopSlip.fields, edits: {}, note: shopSlip.note });

  return createPortal(
    <>
      {/* Full-size slip, off-screen: this is what the picture is taken of */}
      <div className="absolute top-0 -left-[9999px]">
        <DeliverySlip
          ref={slipRef}
          order={order}
          shop={shop}
          fields={fields}
          edits={edits}
          note={note.trim()}
        />
      </div>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-lg font-bold text-gray-800">Delivery slip</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-500 hover:text-gray-800 px-2"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-100 space-y-4">
            {previewUrl ? (
              <div className={`relative ${rendering ? "opacity-60" : ""}`}>
                <img
                  src={previewUrl}
                  alt="Delivery slip preview"
                  className="w-full shadow border bg-white"
                />
                {rendering && (
                  <p className="absolute top-2 right-2 text-xs bg-white/90 rounded px-2 py-1 shadow">
                    Updating...
                  </p>
                )}
              </div>
            ) : failed ? (
              <p className="text-center text-red-600 py-10">
                Could not make the slip. Please close and try again.
              </p>
            ) : (
              <SkeletonRegion label="Making the slip">
                <div className="bg-white border shadow p-5 space-y-4" style={{ aspectRatio: "105 / 148" }}>
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <Bar className="h-12 w-12 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Bar className="h-4 w-1/2" />
                      <Bar className="h-3 w-2/3" />
                    </div>
                  </div>
                  <Bar className="h-5 w-2/3" />
                  <div className="border rounded p-3 space-y-2">
                    <Bar className="h-3 w-1/4" />
                    <Bar className="h-6 w-3/4" />
                    <Bar className="h-4 w-1/2" />
                    <Bar className="h-4 w-full" />
                  </div>
                  <Bar className="h-3 w-3/4" />
                  <Bar className="h-14 w-full" />
                </div>
              </SkeletonRegion>
            )}

            <button
              type="button"
              onClick={() => setEditing((open) => !open)}
              className="w-full py-2 rounded-md border border-gray-400 bg-white text-sm text-gray-800 hover:bg-gray-50"
            >
              {editing ? "Hide editing" : "Edit this slip"}
            </button>

            {editing && (
              <div className="bg-white rounded-md border p-3 space-y-4">
                <p className="text-xs text-gray-500">
                  These changes are only for this slip. The order is not
                  changed.
                </p>

                <div className="space-y-2">
                  <label className="block text-xs text-gray-500">
                    Customer name
                    <input
                      value={shown("customerName", order.customerName)}
                      onChange={(e) => setEdit("customerName", e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="block text-xs text-gray-500">
                    Customer phone
                    <input
                      value={shown("customerPhone", order.phone)}
                      onChange={(e) => setEdit("customerPhone", e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="block text-xs text-gray-500">
                    Delivery address
                    <textarea
                      rows={3}
                      value={shown("address", order.address)}
                      onChange={(e) => setEdit("address", e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="block text-xs text-gray-500">
                    Item
                    <input
                      value={shown("item", order.item)}
                      onChange={(e) => setEdit("item", e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="block text-xs text-gray-500">
                    Amount to collect (₹). Type 0 to show PAID.
                    <input
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={shown("amount", order.balance)}
                      onChange={(e) => setEdit("amount", e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="block text-xs text-gray-500">
                    Note at the bottom
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-700">Show on this slip</p>
                  {SLIP_GROUPS.map((group) => (
                    <div key={group.title} className="grid grid-cols-1 gap-1">
                      {group.fields.map((field) => (
                        <label
                          key={field.key}
                          className="flex items-center gap-2 text-sm text-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={fields[field.key]}
                            onChange={(e) =>
                              setFields((f) => ({ ...f, [field.key]: e.target.checked }))
                            }
                            className="w-4 h-4 accent-orange-500"
                          />
                          {field.label}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>

                {edited && (
                  <button
                    type="button"
                    onClick={resetEverything}
                    className="text-sm text-gray-600 underline"
                  >
                    Go back to the shop's slip settings
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 p-4 border-t">
            <button
              onClick={handlePrint}
              disabled={!canvas || busy || rendering}
              className="py-2 rounded-md border border-orange-500 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
            >
              Print
            </button>
            <button
              onClick={handleDownload}
              disabled={!canvas || busy || rendering}
              className="py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default DeliverySlipDialog;
