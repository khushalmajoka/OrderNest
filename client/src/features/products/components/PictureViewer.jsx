import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePicture } from "../utils/pictures";

// A big view of a product's pictures, one at a time (arrows, swipe-free: buttons and keys).
const PictureViewer = ({ product, start = 0, onClose }) => {
  const ids = product.images || [];
  const [index, setIndex] = useState(Math.min(start, Math.max(0, ids.length - 1)));
  const src = usePicture(ids[index], "full");
  const go = (step) => setIndex((i) => (i + step + ids.length) % ids.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && ids.length > 1) go(-1);
      if (e.key === "ArrowRight" && ids.length > 1) go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!ids.length) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-3"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={`Pictures of ${product.name}`} className="relative w-full max-w-3xl">
        <p className="text-white text-sm mb-2 pr-12 truncate">
          {product.name}
          {product.sizeLabel ? ` · ${product.sizeLabel}` : ""} <span className="text-gray-300">({index + 1} of {ids.length})</span>
        </p>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-0 right-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white bg-opacity-20 text-white hover:bg-opacity-40">
          <X size={22} />
        </button>
        <div className="flex items-center justify-center bg-black rounded-lg min-h-[40vh] max-h-[78vh] overflow-hidden">
          {src ? <img src={src} alt={`${product.name}, number ${index + 1} of ${ids.length}`} className="max-w-full max-h-[78vh] object-contain" /> : <span className="text-gray-300 text-sm">Loading the picture...</span>}
        </div>
        {ids.length > 1 && (
          <div className="flex justify-between mt-3">
            <button type="button" onClick={() => go(-1)} aria-label="Previous picture" className="flex items-center gap-1 px-4 py-2 min-h-[44px] rounded-lg bg-white bg-opacity-20 text-white hover:bg-opacity-40">
              <ChevronLeft size={20} /> Previous
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next picture" className="flex items-center gap-1 px-4 py-2 min-h-[44px] rounded-lg bg-white bg-opacity-20 text-white hover:bg-opacity-40">
              Next <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PictureViewer;
