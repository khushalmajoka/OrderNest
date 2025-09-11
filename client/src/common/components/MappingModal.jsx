import { useState } from "react";

const OrderFields = [
  "orderId",
  "customerName",
  "item",
  "phone",
  "total",
  "advance",
  "balance",
  "status",
  "orderExecutive",
  "expectedDelivery",
  "createdDate",
];

const OrderFieldsUI = [
  "Order ID",
  "Customer Name",
  "Product",
  "Phone",
  "Total",
  "Advance",
  "Balance",
  "Status",
  "Order Executive",
  "Expected Delivery",
  "Created Date",
];

const MappingModal = ({ headers, onConfirm, onClose }) => {
  const [mapping, setMapping] = useState({});

  const handleChange = (excelHeader, value) => {
    setMapping((prev) => ({ ...prev, [excelHeader]: value }));
  };

  const handleSubmit = () => {
    onConfirm(mapping);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-[90%] md:w-[500px]">
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
              {OrderFields.map((field, index) => (
                <option key={field} value={field}>
                  {OrderFieldsUI[index]}
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
