import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

// Turns an order's hidden "Thank you" card into an image and downloads it.
// Used by both the desktop table row and the phone card. The card exists only
// while the share window is open (see OrderShareDialog).
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
    // Not built yet: say so straight away instead of making a picture first
    if (type === "whatsapp") {
      toast("📲 WhatsApp share coming soon!");
      return;
    }
    if (type === "instagram") {
      toast("📸 Instagram share coming soon!");
      return;
    }

    try {
      const image = await generateImage();
      if (!image) return;

      const link = document.createElement("a");
      link.href = image;
      link.download = `order-${order.orderId || order._id.slice(-6)}.png`;
      link.click();
      setIsShareOpen(false);
    } catch (err) {
      console.error("Could not make the order image:", err);
      toast.error("Could not make the picture. Please try again.");
    }
  };

  return { cardRef, isShareOpen, setIsShareOpen, handleShare };
};
