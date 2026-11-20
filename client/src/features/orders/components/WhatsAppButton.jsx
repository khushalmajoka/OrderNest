import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import WhatsAppIcon from "../../../common/components/WhatsAppIcon";
import WhatsAppText from "../../../common/components/WhatsAppText";
import {
  LANGUAGES,
  buildMessage,
  getLastLanguage,
  rememberLanguage,
  whatsappLink,
  whatsappNumber,
} from "../../../common/utils/whatsapp";

// The window that asks which language to use. Each choice shows the message
// that will be sent; tapping it opens WhatsApp with that message typed in.
const LanguageDialog = ({ order, shop, onClose }) => {
  const last = getLastLanguage();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = (language) => {
    rememberLanguage(language);
    const text = buildMessage({ shop, order, language });
    window.open(whatsappLink(order.phone, text), "_blank", "noopener,noreferrer");
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
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

        <div className="space-y-2">
          {LANGUAGES.map((language) => (
            <button
              key={language.key}
              type="button"
              onClick={() => send(language.key)}
              className={`w-full text-left rounded-lg border p-3 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-400 ${
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
