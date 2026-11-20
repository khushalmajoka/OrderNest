import { useEffect } from "react";
import { Download } from "lucide-react";

// The two brand pictures, drawn here so the app does not carry a whole icon library
const BrandIcon = ({ path, size = 40 }) => (
  <svg
    viewBox="0 0 448 512"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d={path} />
  </svg>
);

const ShareModal = ({ isOpen, onClose, onShare }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share order"
        className="bg-white rounded-lg shadow-lg w-full max-w-xs p-6 space-y-4 relative animate-fade-up motion-reduce:animate-none"
      >
        <h2 className="text-lg font-semibold text-gray-800">Share Order</h2>

        <div className="flex gap-7 justify-center">
          <button
            onClick={() => onShare("instagram")}
            aria-label="Share on Instagram"
            className="p-2 bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600"
          >
            <BrandIcon path="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
          </button>
          <button
            onClick={() => onShare("download")}
            aria-label="Download as a picture"
            className="p-2 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-800"
          >
            <Download size={40} />
          </button>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1 right-1 w-11 h-11 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
