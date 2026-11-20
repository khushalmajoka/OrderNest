import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import WhatsAppIcon from "../../../common/components/WhatsAppIcon";
import WhatsAppText from "../../../common/components/WhatsAppText";
import OrderCard from "../../../common/components/OrderCard";
import { useOrderPicture } from "../hooks/useOrderPicture";
import { trackUse } from "../../../common/utils/usage";
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

// Opens WhatsApp in a new tab. Returns false if the browser blocked the tab.
// (No "noopener" in the options: with it the browser never says whether the
// tab opened. The new tab is cut off from this page right after.)
const openWhatsApp = (url) => {
  const tab = window.open(url, "_blank");
  if (!tab) return false;
  try {
    tab.opener = null;
  } catch (err) {
    /* nothing to do */
  }
  return true;
};

// When the browser blocks the tab, a link the person can tap (a tap is always allowed)
const showOpenLink = (url, note) =>
  toast(
    (t) => (
      <span className="text-sm">
        {note}{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => toast.dismiss(t.id)}
          className="font-semibold text-green-700 underline"
        >
          Open WhatsApp
        </a>
      </span>
    ),
    { duration: 15000 }
  );

// The window that asks which language to use. Each choice shows the message
// that will be sent. Tapping one opens WhatsApp on the customer's chat with
// that message already typed in, and (unless switched off) the order's
// "Thank you" picture along with it:
//  - phone: the phone's share menu gets the picture and the message (the
//    person picks WhatsApp and the customer there);
//  - computer: the picture is copied and WhatsApp opens on the customer's chat
//    with the message typed in. A web page cannot press Paste inside WhatsApp,
//    so the person presses Ctrl+V / Cmd+V once, then Send. If copying is not
//    allowed, the picture is saved to Downloads instead.
//
// Everything that matters happens at the moment of the tap: browsers only
// allow a new tab, a share menu or a copy for a moment after a tap, so the
// picture is made BEFORE (as soon as this window opens) and the language
// buttons wait until it is ready.
const LanguageDialog = ({ order, shop, onClose }) => {
  const last = getLastLanguage();
  const [withPicture, setWithPicture] = useState(getWithPicture);
  const [ready, setReady] = useState(!getWithPicture()); // the picture is made
  const [failed, setFailed] = useState(false); // the picture could not be made
  const blobRef = useRef(null);
  const { cardRef, getPicture, fileName, downloadPicture, copyPicture } =
    useOrderPicture(order, withPicture);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Wait for the picture whenever the switch is on
  useEffect(() => {
    blobRef.current = null;
    setFailed(false);
    if (!withPicture) {
      setReady(true);
      return undefined;
    }
    setReady(false);
    let alive = true;
    getPicture()
      .then((blob) => {
        if (!alive) return;
        blobRef.current = blob;
        setReady(true);
      })
      .catch((err) => {
        console.error("Could not make the order picture:", err);
        if (!alive) return;
        setFailed(true);
        setReady(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withPicture]);

  const toggleSwitch = () => {
    rememberWithPicture(!withPicture);
    setWithPicture(!withPicture);
  };

  // NOTE: no "await" before the share menu / the new tab: it all has to
  // start in the same moment as the tap.
  // the window was opened
  useEffect(() => {
    trackUse("whatsapp.open");
  }, []);

  const send = (language) => {
    trackUse("whatsapp.send");
    if (!ready) return;
    rememberLanguage(language);
    const text = buildMessage({ shop, order, language });
    const url = whatsappLink(order.phone, text);
    const blob = withPicture ? blobRef.current : null;

    // No picture wanted (or it could not be made): just the message
    if (!blob) {
      const opened = openWhatsApp(url);
      if (!opened) showOpenLink(url, "Your browser blocked the new tab.");
      if (withPicture && failed) {
        toast.error("Could not make the picture. WhatsApp opened with the message only.");
      }
      onClose();
      return;
    }

    // Phone: the share menu sends the picture and the message together
    if (isPhoneDevice() && navigator.canShare && navigator.share) {
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        navigator
          .share({ files: [file], text })
          .then(() => onClose())
          .catch((err) => {
            if (err && err.name === "AbortError") return; // the person closed the share menu
            downloadPicture(blob);
            showOpenLink(url, "Could not open the share menu. Picture saved.");
          });
        return;
      }
    }

    // Computer: start the copy, and open WhatsApp in the same moment
    const copying = copyPicture(blob);
    const opened = openWhatsApp(url);
    copying.then((copied) => {
      if (!copied) downloadPicture(blob);
      if (!opened) {
        showOpenLink(
          url,
          copied
            ? `Picture copied. Your browser blocked the new tab; after opening WhatsApp press ${pasteKey()} to paste it.`
            : "Picture saved to Downloads. Your browser blocked the new tab."
        );
      } else {
        toast.success(
          copied
            ? `WhatsApp is open with the message. Click in the chat, press ${pasteKey()} to paste the picture, then Send.`
            : "WhatsApp is open with the message. The picture was saved to Downloads: attach it, then Send.",
          { duration: 12000 }
        );
      }
    });
    onClose();
  };

  const toggleHint = isPhoneDevice()
    ? "On a phone you pick WhatsApp and the customer in your share menu."
    : `The picture is copied. In the chat press ${pasteKey()} to paste it, then Send.`;

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
              {withPicture && !ready ? "Getting the picture ready..." : toggleHint}
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
              disabled={!ready}
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
  // A closed old order has no message (nobody should message about it by accident)
  const closedOld = order.status === "Closed (old)";
  const usable = Boolean(whatsappNumber(order.phone)) && !closedOld;
  const label = closedOld
    ? "Closed (old) orders have no WhatsApp message"
    : usable
    ? "Send a WhatsApp message"
    : "No phone number";

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
