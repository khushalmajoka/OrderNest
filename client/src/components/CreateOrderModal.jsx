// src/components/CreateOrderModal.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const CreateOrderModal = ({ onClose, onOrderCreated }) => {
  const [formData, setFormData] = useState({
    item: "",
    customerName: "",
    phone: "",
    total: "",
    advance: "",
    status: "Pending",
  });

  const modalRef = useRef();

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const shopId = localStorage.getItem("shopId");

    const balance =
      parseFloat(formData.total || 0) - parseFloat(formData.advance || 0);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/orders/create`,
        { ...formData, shopId, userId, balance },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Order created successfully!");
      onOrderCreated(res.data.order);
      onClose();
    } catch (error) {
      console.error("Order creation failed:", error);
      toast.error("Failed to create order. Try again.");
    }
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
          Create New Order
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
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrderModal;
