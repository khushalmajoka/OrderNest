import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import WhatsAppIcon from "../../../common/components/WhatsAppIcon";
import WhatsAppText from "../../../common/components/WhatsAppText";
import OrderCard from "../../../common/components/OrderCard";
import { useOrderPicture } from "../hooks/useOrderPicture";
import {
  LANGUAGES,
  buildMessage,
  getLastLanguage,
  getWithPicture,
  isPhoneDevice,
  pasteKey,
  rememberLanguage,
  rememberWithPicture,
  whatsappLink,
  whatsappNumber,
} from "../../../common/utils/whatsapp";

// The window that asks which language to use. Each choice shows the message
// that will be sent; tapping it opens WhatsApp with that message typed in,
// and (unless switched off) the order's "Thank you" picture along with it:
//  - phone: the phone's share menu gets the picture and the message (the
//    person picks WhatsApp and the customer there);
//  - computer: WhatsApp opens on the customer with the message, and the
//    picture is copied, ready to paste (Ctrl+V / Cmd+V). If copying is not
//    allowed, the picture is saved to Downloads instead.
const LanguageDialog = ({ order, shop, onClose }) => {
  const last = getLastLanguage();
  const [withPicture, setWithPicture] = useState(getWithPicture);
  const [busy, setBusy] = useState(false);
  const { cardRef, getPicture, fileName, downloadPicture, copyPicture } =
    useOrderPicture(order, withPicture);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleSwitch = () => {
    rememberWithPicture(!withPicture);
    setWithPicture(!withPicture);
  };

  const send = async (language) => {
    if (busy) return;
    rememberLanguage(language);
    const text = buildMessage({ shop, order, language });
    const open = () =>
      window.open(whatsappLink(order.phone, text), "_blank", "noopener,noreferrer");

    if (!withPicture) {
      open();
      onClose();
      return;
    }

    setBusy(true);
    try {
      let blob = null;
      try {
        blob = await getPicture(); // already made when the window opened
      } catch (err) {
        console.error("Could not make the order picture:", err);
      }
      if (!blob) {
        open();
        toast.error("Could not make the picture. WhatsApp opened with the message only.");
        onClose();
        return;
      }

      // Phone: the share menu sends the picture and the message together
      if (isPhoneDevice() && navigator.canShare && navigator.share) {
        try {
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text });
            onClose();
            return;
          }
        } catch (err) {
          if (err && err.name === "AbortError") return; // the person closed the share menu
          // any other trouble: use the way below
        }
      }

      // Computer (or a phone that cannot share a picture): copy it, then open WhatsApp
      const copied = await copyPicture();
      if (!copied) downloadPicture(blob);
      const opened = open();
      toast.success(
        copied
          ? `Picture copied. In WhatsApp, press ${pasteKey()} to paste it.`
          : opened
          ? "Picture saved. Attach it in WhatsApp."
          : "Picture saved. Open WhatsApp and attach it.",
        { duration: 8000 }
      );
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* The card that becomes the picture; off-screen, only while this window is open */}
      {withPicture && (
        <div className="absolute top-0 -left-[9999px]" aria-hidden="true">
          <OrderCard ref={cardRef} order={order} shop={shop} />
        </div>
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Send a WhatsApp message"
        className="bg-white rounded-lg shadow-lg w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 space-y-3 relative animate-fade-up motion-reduce:animate-none"
      >
        <h2 className="text-lg font-semibold text-gray-800 pr-8">Send on WhatsApp</h2>
        <p className="text-sm text-gray-600">
          To {order.customerName || "the customer"} ({order.phone}) about status{" "}
          <span className="font-medium">{order.status}</span>. Choose a language;
          WhatsApp opens with the message ready, then tap Send.
        </p>

        <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
          <span>
            Send the order picture too
            <span className="block text-xs text-gray-500">
              {isPhoneDevice()
                ? "On a phone you pick WhatsApp and the customer in your share menu."
                : `The picture is copied. Press ${pasteKey()} in the chat to paste it.`}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={withPicture}
            aria-label="Send the order picture too"
            onClick={toggleSwitch}
            className={`relative w-11 h-6 shrink-0 rounded-full transition ${
              withPicture ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                withPicture ? "translate-x-5" : ""
              }`}
            />
          </button>
        </label>

        <div className="space-y-2">
          {LANGUAGES.map((language) => (
            <button
              key={language.key}
              type="button"
              onClick={() => send(language.key)}
              disabled={busy}
              className={`w-full text-left rounded-lg border p-3 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-60 ${
                language.key === last ? "border-green-500 bg-green-50" : "border-gray-200"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-gray-800">
                <WhatsAppIcon size={16} className="text-green-600" />
                {language.label}
              </span>
              <span className="block mt-1 text-xs text-gray-500 line-clamp-3 whitespace-pre-line break-words">
                <WhatsAppText text={buildMessage({ shop, order, language: language.key })} />
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1 right-1 w-11 h-11 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
};

// The green WhatsApp button of an order. "icon" is the small one at the end of
// a table row; "card" is the wide one on a phone card. Without a usable phone
// number it is greyed out.
const WhatsAppButton = ({ order, shop, variant = "icon" }) => {
  const [open, setOpen] = useState(false);
  const usable = Boolean(whatsappNumber(order.phone));
  const label = usable ? "Send a WhatsApp message" : "No phone number";

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!usable}
          aria-label={label}
          title={label}
          className={`p-1.5 rounded-md ${
            usable ? "text-green-600 hover:bg-black/10" : "text-gray-300 cursor-not-allowed"
          }`}
        >
          <WhatsAppIcon size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!usable}
          aria-label={label}
          title={label}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 min-h-[44px] rounded border ${
            usable ? "text-green-600" : "text-gray-300 cursor-not-allowed"
          }`}
        >
          <WhatsAppIcon size={16} /> WhatsApp
        </button>
      )}
      {open && <LanguageDialog order={order} shop={shop} onClose={() => setOpen(false)} />}
    </>
  );
};

export default WhatsAppButton;
