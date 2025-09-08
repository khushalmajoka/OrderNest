import { useState } from "react";

const DeleteConfirmModal = ({ setDeleteId, handleDelete, deleteId}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Delete Order?
        </h2>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete this order?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setDeleteId(null)}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              handleDelete(deleteId);
              setIsDeleting(true);
            }}
            disabled={isDeleting}
            className={`px-4 py-2 text-white rounded transition ${
              isDeleting ? "bg-red-300 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
