import React, { useState, useEffect, useRef } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { isValid } from "date-fns";
import { fromDateString, toDateString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import axios from "axios";
import { getErrorMessage } from "../utils/api";

const EditOrderModal = ({ order, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    item: "",
    phone: "",
    address: "",
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
        address: order.address || "",
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
      [name]:
        name === "total" || name === "advance"
          ? Number(value)
          : name === "phone"
          ? value.replace(/\D/g, "").slice(0, 10) // digits only, like the Create window
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    // A phone typed or changed here must be a proper 10-digit mobile number.
    // An old phone that is left alone is not checked, so old orders can still
    // be saved.
    const phone = formData.phone.trim();
    if (phone && phone !== (order.phone || "") && !/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
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
      toast.error(getErrorMessage(error, "Failed to update order. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <form
        ref={modalRef}
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 relative"
      >
        <h2 className="text-xl font-bold text-center text-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 sm:left-7 text-gray-600 hover:text-black px-2"
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

        <textarea
          name="address"
          placeholder="Delivery Address (optional)"
          value={formData.address}
          onChange={handleChange}
          rows={2}
          maxLength={500}
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
          value={fromDateString(formData.expectedDeliveryDate)}
          onChange={(date) => {
            // Cleared: remove the date. A half-typed date is ignored (an
            // Invalid Date would throw).
            if (date === null) {
              setFormData((prev) => ({ ...prev, expectedDeliveryDate: "" }));
            } else if (isValid(date)) {
              setFormData((prev) => ({
                ...prev,
                expectedDeliveryDate: toDateString(date),
              }));
            }
          }}
          slotProps={{
            field: { clearable: true },
            textField: { fullWidth: true, size: "small", name: "expectedDeliveryDate" },
          }}
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
