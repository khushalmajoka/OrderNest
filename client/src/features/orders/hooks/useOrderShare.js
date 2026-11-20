import { useState } from "react";
import toast from "react-hot-toast";
import { useOrderPicture } from "./useOrderPicture";

// The "Share" window of an order: save the "Thank you" card as a picture.
// Used by both the desktop table row and the phone card. The card exists only
// while the share window is open (see OrderShareDialog).
// (Sending on WhatsApp is the green WhatsApp button, see WhatsAppButton.)
export const useOrderShare = (order) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { cardRef, getPicture, downloadPicture } = useOrderPicture(order, isShareOpen);

  const handleShare = async (type) => {
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
