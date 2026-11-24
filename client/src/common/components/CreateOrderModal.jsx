// src/components/CreateOrderModal.jsx
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { isValid } from "date-fns";
import { fromDateString, toDateString } from "../utils/dateUtils";
import { getErrorMessage } from "../utils/api";
import { nameProblem } from "../utils/customerName";
import ModalShell, { Field, inputClass } from "./ModalShell";
import SavedLabel from "./SavedLabel";
import ExecutivePicker from "./ExecutivePicker";
import ProductPicker from "../../features/products/components/ProductPicker";
import { productLabel, quantityUnit, totalFor } from "../../features/products/utils/productOptions";

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

// `defaultExecutive`: the logged-in person's name, chosen in "Order executive"
// to save a tap (it can be changed)
const CreateOrderModal = ({ shopId, onClose, onOrderCreated, defaultExecutive = "", canSeePrices = true }) => {
  const [initial, setInitial] = useState(EMPTY_ORDER);
  const [formData, setFormData] = useState(EMPTY_ORDER);
  const [loading, setLoading] = useState(false);
  // A product picked from the shop's list (optional) and how many
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState("1");
  // The total we filled in ourselves (price x quantity). It follows the quantity
  // only until the person types their own total.
  const autoTotal = useRef("");
  // After a good save the button shows a tick for a moment, then the window closes
  const [done, setDone] = useState(false);
  const closeTimer = useRef(null);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const showDoneThenClose = () => {
    setDone(true);
    closeTimer.current = setTimeout(onClose, 700);
  };

  // Anything typed yet? Then tapping outside or Escape will not close the window
  const dirty = JSON.stringify(formData) !== JSON.stringify(initial) || Boolean(product);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const refreshTotal = (picked, qty) => {
    if (!canSeePrices || !picked || picked.price === undefined || picked.price === null) return;
    const next = totalFor(picked.price, qty);
    if (next === "") return;
    setFormData((prev) => {
      // only while the total is empty or still the one we filled in
      if (prev.total !== "" && prev.total !== autoTotal.current) return prev;
      autoTotal.current = next;
      return { ...prev, total: next };
    });
  };

  const pickProduct = (picked) => {
    setProduct(picked);
    setQuantity("1");
    setFormData((prev) => ({ ...prev, item: productLabel(picked) }));
    refreshTotal(picked, "1");
  };

  const changeQuantity = (value) => {
    setQuantity(value);
    refreshTotal(product, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || done) return;
    if (product && !(Number(quantity) > 0)) return toast.error("Please enter the quantity (more than 0).");

    // The name may be empty, but not a placeholder like "N" or "NA"
    const badName = nameProblem(formData.customerName);
    if (badName) return toast.error(badName);

    setLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/orders/create`,
        {
          ...formData,
          ...(product
            ? {
                lines: [
                  {
                    product: product._id,
                    quantity: Number(quantity),
                    ...(canSeePrices && product.price !== undefined && product.price !== null ? { unitPrice: product.price } : {}),
                  },
                ],
              }
            : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Order created successfully!");
      onOrderCreated(res.data.order);
      showDoneThenClose();
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
      <ProductPicker
        selected={product}
        onPick={pickProduct}
        onClear={() => setProduct(null)}
        showPrice={canSeePrices}
      />

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

      {product && (
        <Field
          label={`Quantity${quantityUnit(product.priceUnit) ? ` (${quantityUnit(product.priceUnit)})` : ""}`}
          hint={
            canSeePrices && product.price !== undefined && product.price !== null
              ? "(Total = price x quantity. You can change the total.)"
              : ""
          }
        >
          <input
            type="number"
            inputMode="decimal"
            name="quantity"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => changeQuantity(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      )}

      <Field label="Customer name" hint="(leave empty if not known)">
        <input
          type="text"
          name="customerName"
          placeholder="e.g. Asha Verma"
          value={formData.customerName}
          onChange={handleChange}
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

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1">Order executive</span>
        <ExecutivePicker
          shopId={shopId}
          value={formData.orderExecutive}
          preferred={defaultExecutive}
          onDefault={(name) => {
            // the automatic first choice is not "something typed"
            setInitial((prev) => ({ ...prev, orderExecutive: name }));
            setFormData((prev) => ({ ...prev, orderExecutive: name }));
          }}
          onChange={(name) => setFormData((prev) => ({ ...prev, orderExecutive: name }))}
        />
      </div>

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
          disabled={loading || done}
          className={`px-4 py-2 rounded text-white transition ${
            done
              ? "bg-green-500"
              : loading
              ? "bg-orange-300 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {loading ? "Creating..." : done ? <SavedLabel>Created</SavedLabel> : "Create"}
        </button>
      </div>
    </ModalShell>
  );
};

export default CreateOrderModal;
