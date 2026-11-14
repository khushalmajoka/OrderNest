// src/components/CreateOrderModal.jsx
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { isValid } from "date-fns";
import { fromDateString, toDateString } from "../utils/dateUtils";
import { getErrorMessage } from "../utils/api";
import ModalShell, { Field, inputClass } from "./ModalShell";

const EMPTY_ORDER = {
  item: "",
  customerName: "",
  phone: "",
  address: "",
  total: "",
  advance: "",
  orderExecutive: "",
  status: "Order Received",
  expectedDeliveryDate: "",
};

// `defaultExecutive`: the logged-in person's name, put in "Order executive" to
// save typing (it can be changed)
const CreateOrderModal = ({ onClose, onOrderCreated, defaultExecutive = "" }) => {
  const start = { ...EMPTY_ORDER, orderExecutive: defaultExecutive };
  const [initial] = useState(start);
  const [formData, setFormData] = useState(start);
  const [loading, setLoading] = useState(false);

  // Anything typed yet? Then tapping outside or Escape will not close the window
  const dirty = JSON.stringify(formData) !== JSON.stringify(initial);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/orders/create`,
        formData,
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
      toast.error(getErrorMessage(error, "Failed to create order. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Create New Order"
      dirty={dirty}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Field label="Item / Product">
        <input
          type="text"
          name="item"
          placeholder="e.g. Chocolate cake 1kg"
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
          placeholder="e.g. Asha Verma"
          value={formData.customerName}
          onChange={handleChange}
          required
          maxLength={100}
          className={inputClass}
        />
      </Field>

      <Field label="WhatsApp / Phone" hint="(10 digits)">
        <input
          type="tel"
          inputMode="numeric"
          name="phone"
          placeholder="e.g. 9876543210"
          value={formData.phone}
          onChange={handleChange}
          pattern="[6-9]{1}[0-9]{9}"
          title="Enter a valid 10-digit Mobile Number"
          required
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
          placeholder="Who took this order"
          value={formData.orderExecutive}
          onChange={handleChange}
          required
          maxLength={100}
          className={inputClass}
        />
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
        disablePast
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
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </ModalShell>
  );
};

export default CreateOrderModal;
