import React, { useState, useEffect } from "react";

const EditOrderModal = ({ order, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    item: "",
    phone: "",
    total: 0,
    advance: 0,
    status: "pending",
  });

  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customerName,
        item: order.item,
        phone: order.phone,
        total: order.total,
        advance: order.advance,
        status: order.status,
      });
    }
  }, [order]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "total" || name === "advance" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const balance = formData.total - formData.advance;
    onSave({ ...order, ...formData, balance });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-700">Edit Order</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            placeholder="Customer Name"
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            name="item"
            value={formData.item}
            onChange={handleChange}
            placeholder="Item/Product"
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone Number"
            className="w-full border p-2 rounded"
          />
          <input
            type="number"
            name="total"
            value={formData.total}
            onChange={handleChange}
            placeholder="Total Amount"
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="number"
            name="advance"
            value={formData.advance}
            onChange={handleChange}
            placeholder="Advance Paid"
            className="w-full border p-2 rounded"
            required
          />
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="pending">Pending</option>
            <option value="pending">In-Progress</option>
            <option value="completed">Completed</option>
          </select>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOrderModal;