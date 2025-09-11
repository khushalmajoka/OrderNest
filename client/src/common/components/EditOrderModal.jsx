import React, { useState, useEffect, useRef } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import TextField from "@mui/material/TextField";
import toast from "react-hot-toast";
import axios from "axios";

const EditOrderModal = ({ order, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    item: "",
    phone: "",
    total: 0,
    advance: 0,
    orderExecutive: "",
    status: "Order Received",
    expectedDeliveryDate: "",
  });
  const [loading, setLoading] = useState(false);

  const modalRef = useRef();

  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customerName || "",
        item: order.item || "",
        phone: order.phone || "",
        total: order.total || 0,
        advance: order.advance || 0,
        orderExecutive: order.orderExecutive || "",
        status: order.status || "Order Received",
        expectedDeliveryDate: order.expectedDeliveryDate || "",
      });
    }
  }, [order]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const path = e.composedPath?.() || [];

      const clickedInsideModal = path.includes(modalRef.current);
      const clickedInsideDatePicker = path.some((el) => {
        return (
          el?.classList &&
          [...el.classList].some(
            (cls) => cls.startsWith("MuiPickers") || cls.startsWith("MuiModal")
          )
        );
      });

      if (!clickedInsideModal && !clickedInsideDatePicker) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/orders/${order._id}`,
        { ...formData },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Order updated successfully!");
      onUpdate(res.data.order);
      onClose();
    } catch (error) {
      console.error("Order updation failed:", error);
      toast.error("Failed to update order. Try again.");
    } finally {
      setLoading(false);
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

        <input
          type="text"
          name="orderExecutive"
          placeholder="Order Executive"
          value={formData.orderExecutive}
          onChange={handleChange}
          required
          className="w-full border p-2 rounded"
        />

        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="Order Received">Order Received</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Ready to Dispatch/Pick-Up">
            Ready to Dispatch/Pick-Up
          </option>
          <option value="Dispatched">Dispatched</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <DatePicker
          label="Expected Delivery Date"
          value={
            formData.expectedDeliveryDate
              ? new Date(formData.expectedDeliveryDate)
              : null
          }
          onChange={(date) => {
            if (date) {
              setFormData((prev) => ({
                ...prev,
                expectedDeliveryDate: date.toISOString().split("T")[0],
              }));
            }
          }}
          disablePast
          renderInput={(params) => (
            <TextField
              fullWidth
              {...params}
              name="expectedDeliveryDate"
              variant="outlined"
              size="small"
            />
          )}
        />

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
            disabled={loading}
            className={`px-4 py-2 rounded text-white transition ${
              loading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditOrderModal;
