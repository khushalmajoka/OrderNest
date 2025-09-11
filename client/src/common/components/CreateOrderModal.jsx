// src/components/CreateOrderModal.jsx
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import TextField from "@mui/material/TextField";

const CreateOrderModal = ({ onClose, onOrderCreated }) => {
  const [formData, setFormData] = useState({
    item: "",
    customerName: "",
    phone: "",
    total: "",
    advance: "",
    orderExecutive: "",
    status: "Order Received",
    expectedDeliveryDate: "",
  });

  const [loading, setLoading] = useState(false);

  const modalRef = useRef();

  // Close modal on outside click
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
          type="tel"
          name="phone"
          placeholder="WhatsApp/Phone"
          value={formData.phone}
          onChange={handleChange}
          pattern="[6-9]{1}[0-9]{9}"
          title="Enter a valid 10-digit Mobile Number"
          required
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
                ? "bg-orange-300 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrderModal;
