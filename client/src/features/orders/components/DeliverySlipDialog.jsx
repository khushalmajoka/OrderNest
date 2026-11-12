import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import DeliverySlip from "./DeliverySlip";
import { slipToPdf } from "../utils/slipPdf";

// "Delivery slip" window: shows the slip as it will print, with buttons to
// download it as a PDF or print it. Only exists while it is open.
const DeliverySlipDialog = ({ order, shop, onClose }) => {
  const slipRef = useRef();
  const [canvas, setCanvas] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Take the picture of the slip once it is on the page
  useEffect(() => {
    let cancelled = false;
    const makePicture = async () => {
      try {
        const picture = await html2canvas(slipRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        if (!cancelled) setCanvas(picture);
      } catch (err) {
        console.error("Could not make the delivery slip:", err);
        if (!cancelled) setFailed(true);
      }
    };
    makePicture();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return createPortal(
    <>
      {/* Full-size slip, off-screen: this is what the picture is taken of */}
      <div className="absolute top-0 -left-[9999px]">
        <DeliverySlip ref={slipRef} order={order} shop={shop} />
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

          <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
            {canvas ? (
              <img
                src={canvas.toDataURL("image/png")}
                alt="Delivery slip preview"
                className="w-full shadow border bg-white"
              />
            ) : failed ? (
              <p className="text-center text-red-600 py-10">
                Could not make the slip. Please close and try again.
              </p>
            ) : (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-orange-500 border-dashed rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 p-4 border-t">
            <button
              onClick={handlePrint}
              disabled={!canvas || busy}
              className="py-2 rounded-md border border-orange-500 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
            >
              Print
            </button>
            <button
              onClick={handleDownload}
              disabled={!canvas || busy}
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
