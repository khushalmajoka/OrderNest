import React, { useState, useEffect, useRef } from "react";

const EditOrderModal = ({ order, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    item: "",
    phone: "",
    total: 0,
    advance: 0,
    status: "Pending",
  });

  const modalRef = useRef();

  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customerName || "",
        item: order.item || "",
        phone: order.phone || "",
        total: order.total || 0,
        advance: order.advance || 0,
        status: order.status || "Pending",
      });
    }
  }, [order]);

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form
        ref={modalRef}
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md space-y-4 relative"
      >
        <h2 className="text-xl font-bold text-center text-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-7 text-gray-600 hover:text-black"
          >
            ←
          </button>
          Edit Order
        </h2>

        <input
          type="text"
          name="item"
          placeholder="Item/Product"
          value={formData.item}
          onChange={handleChange}
          required
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          name="customerName"
          placeholder="Customer Name"
          value={formData.customerName}
          onChange={handleChange}
          required
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          name="phone"
          placeholder="WhatsApp/Phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          type="number"
          name="total"
          placeholder="Total Amount"
          value={formData.total}
          onChange={handleChange}
          required
          className="w-full border p-2 rounded"
        />

        <input
          type="number"
          name="advance"
          placeholder="Advance Paid"
          value={formData.advance}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
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
  );
};

export default EditOrderModal;