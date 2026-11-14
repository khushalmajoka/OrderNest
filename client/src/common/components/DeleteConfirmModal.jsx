import { useEffect } from "react";

// "Delete this order?" question. Escape or tapping the dark area is the same
// as Cancel (nothing is typed here, so nothing can be lost).
const DeleteConfirmModal = ({ onCancel, handleDelete, deleteId, isDeleting }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !isDeleting) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, isDeleting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xs animate-fade-up motion-reduce:animate-none"
      >
        <h2 id="delete-title" className="text-lg font-semibold text-gray-800 mb-3">
          Delete Order?
        </h2>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete this order?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            autoFocus
            className="px-4 py-2 min-h-[44px] text-gray-600 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              handleDelete(deleteId);
            }}
            disabled={isDeleting}
            className={`px-4 py-2 min-h-[44px] text-white rounded transition ${
              isDeleting ? "bg-red-300 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {isDeleting ? "Deleting..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
