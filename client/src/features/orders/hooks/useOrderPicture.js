import { useEffect, useRef } from "react";

// The order's "Thank you" card as a picture (PNG), to save, copy or send.
// `cardRef` goes on the card (it only has to exist while `active` is true).
//
// The picture is made as soon as `active` turns true, not when a button is
// tapped: phones only allow "share" and computers only allow "copy" for a
// moment after a tap, and making the picture can take longer than that.
export const useOrderPicture = (order, active) => {
  const cardRef = useRef();
  const picture = useRef(null); // a promise of the PNG, made once

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
    if (active) {
      getPicture().catch(() => {}); // a real problem shows when it is needed
    } else {
      picture.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const fileName = `order-${order.orderId || order._id.slice(-6)}.png`;

  const downloadPicture = (blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Copies the picture so it can be pasted into a chat. Returns false where
  // the browser does not allow it.
  // Give it the finished picture (the PNG) so the copy starts at once.
  const copyPicture = async (blob) => {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) return false;
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      return true;
    } catch (err) {
      return false;
    }
  };

  return { cardRef, getPicture, fileName, downloadPicture, copyPicture };
};
