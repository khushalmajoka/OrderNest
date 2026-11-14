import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

// An order's saved values as the boxes show them (numbers as text, so an
// emptied box stays empty instead of turning into 0)
export const toEditForm = (order) => ({
  customerName: order?.customerName || "",
  item: order?.item || "",
  phone: order?.phone || "",
  address: order?.address || "",
  total: String(order?.total ?? ""),
  advance: String(order?.advance ?? ""),
  orderExecutive: order?.orderExecutive || "",
  status: order?.status || "Order Received",
  expectedDeliveryDate: order?.expectedDeliveryDate ? String(order.expectedDeliveryDate).slice(0, 10) : "",
});

// Editing an order right in its row (or card). Only one order is edited at a
// time. Nothing is saved until the tick is pressed; tapping elsewhere never
// throws the changes away.
//   orders: the orders on screen
//   canSeeAmounts: false = the order keeps the amounts it has
//   onSaved(order): called with the saved order
export const useInlineEdit = ({ orders, canSeeAmounts, onSaved }) => {
  const [editing, setEditing] = useState(null); // { id, form }
  const [saving, setSaving] = useState(false);

  const original = editing ? orders.find((order) => order._id === editing.id) : null;
  const dirty = Boolean(
    editing && original && JSON.stringify(editing.form) !== JSON.stringify(toEditForm(original))
  );

  // The order left the screen (another page, deleted): nothing to edit any more
  useEffect(() => {
    if (editing && !original) setEditing(null);
  }, [editing, original]);

  const start = (order) => {
    if (editing && editing.id === order._id) return;
    if (editing && dirty) {
      toast("Save or cancel the order you are editing first.");
      return;
    }
    // A double click also selects a word; do not leave that highlighted
    window.getSelection?.()?.removeAllRanges?.();
    setEditing({ id: order._id, form: toEditForm(order) });
  };

  const cancel = () => setEditing(null);

  const set = (key, value) =>
    setEditing((current) => (current ? { ...current, form: { ...current.form, [key]: value } } : current));

  const save = async () => {
    if (!editing || !original || saving || !dirty) return;
    const f = editing.form;

    // The same checks the old Edit window made, before asking the server
    if (!f.item.trim()) return toast.error("Please enter the product.");
    if (!f.customerName.trim()) return toast.error("Please enter the customer name.");
    if (!f.orderExecutive) return toast.error("Please choose the order executive.");
    if (canSeeAmounts && f.total === "") return toast.error("Please enter the total amount.");
    const phone = f.phone.trim();
    // An old phone that is left alone is not checked, so old orders can still be saved
    if (phone && phone !== (original.phone || "") && !/^[6-9]\d{9}$/.test(phone)) {
      return toast.error("Please enter a valid 10-digit mobile number.");
    }

    const { total, advance, ...withoutMoney } = f;
    setSaving(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/orders/${original._id}`,
        canSeeAmounts ? f : withoutMoney,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setEditing(null);
      toast.success("Order updated successfully!");
      onSaved(res.data.order);
    } catch (error) {
      console.error("Order updation failed:", error);
      toast.error(getErrorMessage(error, "Failed to update order. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return { editing, dirty, saving, start, cancel, set, save };
};
