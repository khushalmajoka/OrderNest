import { useState } from "react";

const ConfirmResetModal = ({ isOpen, onClose, onConfirm, title }) => {
  const [input, setInput] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-orange-700 mb-4">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">
          Type <span className="font-bold text-red-600">reset</span> below to confirm.
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type 'reset'"
          className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              setInput("");
            }}
            disabled={input !== "reset"}
            className={`px-4 py-2 rounded-md text-white font-medium shadow 
              ${input === "reset" ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-400 cursor-not-allowed"}
            `}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmResetModal;