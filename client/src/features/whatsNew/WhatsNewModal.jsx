import { useState } from "react";
import { WHATS_NEW_ITEMS } from "./updates";

// Shown once per update. It cannot be closed until the box is ticked.
const WhatsNewModal = ({ onConfirm }) => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-3">
          <h2
            id="whats-new-title"
            className="text-xl font-semibold text-gray-800"
          >
            🎉 What's new in OrderNest
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Please read these changes before you continue.
          </p>
        </div>

        <ul className="px-6 py-2 overflow-y-auto space-y-4">
          {WHATS_NEW_ITEMS.map((item) => (
            <li key={item.title}>
              <p className="font-medium text-gray-800">{item.title}</p>
              <p className="text-sm text-gray-600">{item.text}</p>
            </li>
          ))}
        </ul>

        <div className="px-6 pt-4 pb-6 border-t mt-3">
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-orange-500"
            />
            <span>I have read and understood these updates.</span>
          </label>

          <button
            onClick={onConfirm}
            disabled={!confirmed}
            className={`mt-4 w-full px-4 py-2 rounded text-white transition ${
              confirmed
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-orange-300 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
