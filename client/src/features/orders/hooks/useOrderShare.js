import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  buildMessage,
  getLastLanguage,
  whatsappLink,
} from "../../../common/utils/whatsapp";

// Turns an order's hidden "Thank you" card into an image and downloads it.
// Used by both the desktop table row and the phone card. The card exists only
// while the share window is open (see OrderShareDialog).
export const useOrderShare = (order, shop) => {
  const cardRef = useRef();
  const [isShareOpen, setIsShareOpen] = useState(false);

  const generateImage = async () => {
    if (!cardRef.current) return;
    // The picture maker is a big library: downloaded only when it is needed
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    return canvas.toDataURL("image/png", 1.0);
  };

  const fileName = `order-${order.orderId || order._id.slice(-6)}.png`;

  const downloadImage = (image) => {
    const link = document.createElement("a");
    link.href = image;
    link.download = fileName;
    link.click();
  };

  // WhatsApp: on a phone the picture goes straight to WhatsApp through the
  // phone's own share menu. Where that is not possible (a computer), the
  // picture is saved and WhatsApp opens with the message, so the person can
  // attach the saved picture.
  const shareOnWhatsApp = async () => {
    const image = await generateImage();
    if (!image) return;
    const text = buildMessage({ shop, order, language: getLastLanguage() });

    try {
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text });
        setIsShareOpen(false);
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return; // the person closed the share menu
      // any other trouble: use the save-and-open way below
    }

    downloadImage(image);
    const opened = window.open(whatsappLink(order.phone, text), "_blank", "noopener,noreferrer");
    toast.success(
      opened
        ? "Picture saved. Attach it in WhatsApp."
        : "Picture saved. Open WhatsApp and attach it."
    );
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
      const image = await generateImage();
      if (!image) return;

      downloadImage(image);
      setIsShareOpen(false);
    } catch (err) {
      console.error("Could not make the order image:", err);
      toast.error("Could not make the picture. Please try again.");
    }
  };

  return { cardRef, isShareOpen, setIsShareOpen, handleShare };
};
