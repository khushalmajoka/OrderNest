import React, { useRef, useState } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { isValid } from "date-fns";
import { fromDateString, toDateString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import axios from "axios";
import { getErrorMessage } from "../utils/api";
import ModalShell, { Field, inputClass } from "./ModalShell";

// The order's saved values as the form boxes show them (numbers as text, so an
// emptied box stays empty instead of turning into 0)
const toForm = (order) => ({
  customerName: order?.customerName || "",
  item: order?.item || "",
  phone: order?.phone || "",
  address: order?.address || "",
  total: String(order?.total ?? ""),
  advance: String(order?.advance ?? ""),
  orderExecutive: order?.orderExecutive || "",
  status: order?.status || "Order Received",
  expectedDeliveryDate: order?.expectedDeliveryDate || "",
});

const EditOrderModal = ({ order, onClose, onUpdate }) => {
  const initial = useRef(toForm(order)).current;
  const [formData, setFormData] = useState(initial);
  const [loading, setLoading] = useState(false);

  // Anything changed yet? Then tapping outside or Escape will not close the window
  const dirty = JSON.stringify(formData) !== JSON.stringify(initial);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "phone"
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
    <ModalShell
      title="Edit Order"
      dirty={dirty}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Field label="Item / Product">
        <input
          type="text"
          name="item"
          value={formData.item}
          onChange={handleChange}
          required
          maxLength={200}
          className={inputClass}
        />
      </Field>

      <Field label="Customer name">
        <input
          type="text"
          name="customerName"
          value={formData.customerName}
          onChange={handleChange}
          required
          maxLength={100}
          className={inputClass}
        />
      </Field>

      <Field label="WhatsApp / Phone">
        <input
          type="text"
          inputMode="numeric"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className={inputClass}
        />
      </Field>

      <Field label="Delivery address" hint="(optional)">
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows={2}
          maxLength={500}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Total amount (₹)">
          <input
            type="number"
            inputMode="decimal"
            name="total"
            min={0}
            value={formData.total}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Advance paid (₹)">
          <input
            type="number"
            inputMode="decimal"
            name="advance"
            min={0}
            value={formData.advance}
            onChange={handleChange}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Order executive">
        <input
          type="text"
          name="orderExecutive"
          value={formData.orderExecutive}
          onChange={handleChange}
          required
          maxLength={100}
          className={inputClass}
        />
      </Field>

      <Field label="Status">
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className={inputClass}
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
      </Field>

      <DatePicker
        label="Expected delivery date"
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
          textField: {
            fullWidth: true,
            size: "small",
            name: "expectedDeliveryDate",
            // same font as the other boxes
            sx: { "& .MuiInputBase-root, & .MuiInputLabel-root": { fontFamily: "inherit" } },
          },
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
              ? "bg-orange-300 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {loading ? "Saving Changes..." : "Save Changes"}
        </button>
      </div>
    </ModalShell>
  );
};

export default EditOrderModal;
