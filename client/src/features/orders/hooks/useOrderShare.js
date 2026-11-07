import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

// Turns an order's hidden "Thank you" card into an image and shares/downloads it.
// Used by both the desktop table row and the phone card.
export const useOrderShare = (order) => {
  const cardRef = useRef();
  const [isShareOpen, setIsShareOpen] = useState(false);

  const generateImage = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    return canvas.toDataURL("image/png", 1.0);
  };

  const handleShare = async (type) => {
    const image = await generateImage();
    if (!image) return;

    if (type === "download") {
      const link = document.createElement("a");
      link.href = image;
      link.download = `order-${order.orderId || order._id.slice(-6)}.png`;
      link.click();
    } else if (type === "whatsapp") {
      toast("📲 WhatsApp share coming soon!");
    } else if (type === "instagram") {
      toast("📸 Instagram share coming soon!");
    }

    setIsShareOpen(false);
  };

  return { cardRef, isShareOpen, setIsShareOpen, handleShare };
};
