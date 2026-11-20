import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  buildMessage,
  getLastLanguage,
  whatsappLink,
} from "../../../common/utils/whatsapp";

// Turns an order's hidden "Thank you" card into a picture (PNG) to download or
// to send on WhatsApp. Used by both the desktop table row and the phone card.
// The card exists only while the share window is open (see OrderShareDialog).
//
// The picture is made as soon as the window opens, not when a button is
// tapped: phones only allow "share" and computers only allow "copy" for a
// moment after a tap, and making the picture can take longer than that.
export const useOrderShare = (order, shop) => {
  const cardRef = useRef();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const picture = useRef(null); // a promise of the PNG, made once per opening

  const makePicture = async () => {
    // The card sits inside a window that may still be on its way
    for (let i = 0; i < 100 && !cardRef.current; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    if (!cardRef.current) throw new Error("The order card is not there.");
    // The picture maker is a big library: downloaded only when it is needed
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No picture."))),
        "image/png"
      )
    );
  };

  // Gets the picture (the same one if it is already being made)
  const getPicture = () => {
    if (!picture.current) {
      picture.current = makePicture();
      picture.current.catch(() => {
        picture.current = null; // try again next time
      });
    }
    return picture.current;
  };

  useEffect(() => {
    if (isShareOpen) {
      getPicture().catch(() => {}); // a real problem shows when a button is tapped
    } else {
      picture.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShareOpen]);

  const fileName = `order-${order.orderId || order._id.slice(-6)}.png`;

  const downloadPicture = (blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Copies the picture so it can be pasted into WhatsApp (Ctrl+V / Cmd+V).
  // Returns false where the browser does not allow it.
  const copyPicture = async () => {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) return false;
      // Handing over the promise keeps the "just tapped" permission valid
      // even if the picture is not ready yet
      await navigator.clipboard.write([
        new window.ClipboardItem({ "image/png": getPicture() }),
      ]);
      return true;
    } catch (err) {
      return false;
    }
  };

  // WhatsApp: on a phone the picture goes straight to WhatsApp through the
  // phone's own share menu. On a computer the picture is copied and WhatsApp
  // opens with the message; the person pastes the picture into the chat.
  const shareOnWhatsApp = async () => {
    const text = buildMessage({ shop, order, language: getLastLanguage() });
    const openWhatsApp = () =>
      window.open(whatsappLink(order.phone, text), "_blank", "noopener,noreferrer");

    // Phone: needs the finished picture at the moment of the tap
    let blob = null;
    try {
      blob = await getPicture(); // already made when the window opened
    } catch (err) {
      blob = null;
    }
    if (blob && navigator.canShare && navigator.share) {
      try {
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text });
          setIsShareOpen(false);
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return; // the person closed the share menu
        // any other trouble: use the computer way below
      }
    }

    // Computer: copy the picture first (while the tap is fresh), then open WhatsApp
    const copied = await copyPicture();
    const opened = openWhatsApp();
    if (copied) {
      toast.success(
        "Picture copied. In WhatsApp, press Ctrl+V (Cmd+V on a Mac) to paste it.",
        { duration: 8000 }
      );
    } else {
      // Copying is not possible here: save the picture instead
      downloadPicture(await getPicture());
      toast.success(
        opened
          ? "Picture saved. Attach it in WhatsApp."
          : "Picture saved. Open WhatsApp and attach it.",
        { duration: 8000 }
      );
    }
    setIsShareOpen(false);
  };

  const handleShare = async (type) => {
    if (type === "whatsapp") {
      try {
        await shareOnWhatsApp();
      } catch (err) {
        console.error("Could not share on WhatsApp:", err);
        toast.error("Could not make the picture. Please try again.");
      }
      return;
    }
    // Not built yet: say so straight away instead of making a picture first
    if (type === "instagram") {
      toast("📸 Instagram share coming soon!");
      return;
    }

    try {
      downloadPicture(await getPicture());
      setIsShareOpen(false);
    } catch (err) {
      console.error("Could not make the order image:", err);
      toast.error("Could not make the picture. Please try again.");
    }
  };

  return { cardRef, isShareOpen, setIsShareOpen, handleShare };
};
