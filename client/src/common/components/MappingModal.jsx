import { useState } from "react";
import toast from "react-hot-toast";

// [field name the server uses, label shown to the user]
// (Balance is always worked out from Total and Advance, so it is not listed.)
const ORDER_FIELDS = [
  ["orderId", "Order ID"],
  ["customerName", "Customer Name"],
  ["item", "Product"],
  ["phone", "Phone"],
  ["address", "Address"],
  ["total", "Total"],
  ["advance", "Advance"],
  ["status", "Status"],
  ["orderExecutive", "Order Executive"],
  ["expectedDeliveryDate", "Expected Delivery"],
];

const MappingModal = ({ headers, onConfirm, onClose }) => {
  const [mapping, setMapping] = useState({});

  const handleChange = (excelHeader, value) => {
    setMapping((prev) => ({ ...prev, [excelHeader]: value }));
  };

  const handleSubmit = () => {
    const chosen = Object.values(mapping).filter(Boolean);

    if (!chosen.includes("item")) {
      toast.error("Please choose which column is the Product.");
      return;
    }
    if (new Set(chosen).size !== chosen.length) {
      toast.error("Two columns are set to the same field. Please fix it.");
      return;
    }
    onConfirm(mapping);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 sm:p-6 rounded shadow-lg w-full md:w-[500px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Map Excel Columns</h2>
        {headers.map((header) => (
          <div key={header} className="mb-3">
            <label className="block font-medium mb-1">{header}</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={mapping[header] || ""}
              onChange={(e) => handleChange(header, e.target.value)}
            >
              <option value="">-- Map to --</option>
              {ORDER_FIELDS.map(([field, label]) => (
                <option key={field} value={field}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex justify-end mt-4 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default MappingModal;
