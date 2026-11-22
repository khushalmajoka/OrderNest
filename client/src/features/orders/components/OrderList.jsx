import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import OrderTableHeader from "./OrderTableHeader";
import OrderTableRow from "./OrderTableRow";
import DeleteConfirmModal from "../../../common/components/DeleteConfirmModal";
import OrderMobileCard from "./OrderMobileCard";
import Pagination from "./Pagination";
import { useIsPhone } from "../../../common/hooks/useMediaQuery";
import axios from "axios";
import { can, isAdmin } from "../../../common/utils/permissions";
import { getErrorMessage } from "../../../common/utils/api";
import { resolveColumns } from "../utils/orderColumns";
import { useInlineEdit } from "../hooks/useInlineEdit";
import { useStatusMoves } from "../hooks/useStatusMoves";
import BulkBar from "./BulkBar";
import { nextStatusOf, offeredStatuses } from "../utils/statusInfo";

// Columns the phone view can sort by (same ones the table headers offer)
const SORT_OPTIONS = [
  { value: "", label: "Latest activity" },
  { value: "orderId", label: "Order ID" },
  { value: "customerName", label: "Customer" },
  { value: "item", label: "Product" },
  { value: "phone", label: "Phone" },
  { value: "total", label: "Total" },
  { value: "advance", label: "Advance" },
  { value: "balance", label: "Balance" },
  { value: "status", label: "Status" },
  { value: "expectedDeliveryDate", label: "Delivery date" },
  { value: "orderExecutive", label: "Executive" },
];

// Shows one page of orders. Paging, search and sorting are done by the server;
// the page state lives in the dashboard and arrives here as props.
const OrderList = ({
  orders,
  shop,
  account,
  totalOrders,
  searching,
  ordersPerPage,
  setOrdersPerPage,
  currentPage,
  setCurrentPage,
  sortField,
  sortOrder,
  setSortField,
  setSortOrder,
  onUpdated,
  onBulkUpdated,
  onDelete,
  onEditingChange,
  maskAmounts,
}) => {
  const [deleteId, setDeleteId] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isPhone = useIsPhone();
  const canSeeAmounts = can(account, "viewAmounts");
  const { rowColumns, detailColumns } = resolveColumns(shop, { amounts: canSeeAmounts });
  // What this person may do with an order (the admin decides for staff)
  const access = {
    edit: can(account, "editOrders"),
    delete: can(account, "deleteOrders"),
    share: can(account, "shareSlip"),
    amounts: canSeeAmounts,
    admin: isAdmin(account), // only the admin may use the status Closed (old)
  };
  // Moving orders to another status in one tap (+ Undo + the WhatsApp question)
  const moves = useStatusMoves({ shop, account, onChanged: onBulkUpdated });
  // Editing an order right where it is shown (double-click / double-tap)
  const inline = useInlineEdit({
    orders,
    canSeeAmounts,
    onSaved: (saved) => {
      const before = orders.find((o) => o._id === saved._id);
      onUpdated(saved);
      if (before) moves.askAfterEdit(saved, before.status);
    },
  });
  // Ticked orders (only on this page; cleared when the page changes)
  const [selected, setSelected] = useState(() => new Set());
  useEffect(() => {
    setSelected((current) => {
      const present = new Set(orders.map((o) => o._id));
      const kept = [...current].filter((id) => present.has(id));
      return kept.length === current.size ? current : new Set(kept);
    });
  }, [orders]);
  useEffect(() => {
    setSelected(new Set());
  }, [currentPage, ordersPerPage]);
  const toggleSelect = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectable = access.edit;
  const allSelected = orders.length > 0 && orders.every((o) => selected.has(o._id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(orders.map((o) => o._id)));
  const selectedOrders = orders.filter((o) => selected.has(o._id));
  const goNext = (order) => moves.moveMany([order], (o) => nextStatusOf(shop, o.status));
  const bulkNext = async () => {
    await moves.moveMany(selectedOrders, (o) => nextStatusOf(shop, o.status), {
      skippedNote: "None of these orders has a next step.",
    });
    setSelected(new Set());
  };
  const bulkSet = async (status) => {
    await moves.moveMany(selectedOrders, () => status);
    setSelected(new Set());
  };
  // The dashboard does not refresh the list in the background while an order is being edited
  const isEditing = Boolean(inline.editing);
  useEffect(() => {
    if (onEditingChange) onEditingChange(isEditing);
  }, [isEditing, onEditingChange]);
  const editFor = (order) =>
    inline.editing && inline.editing.id === order._id
      ? {
          form: inline.editing.form,
          set: inline.set,
          dirty: inline.dirty,
          saving: inline.saving,
          save: inline.save,
          cancel: inline.cancel,
        }
      : null;

  if (!orders.length)
    return (
      <p className="text-gray-500 mt-4">
        {searching ? "No orders match your search or filters." : "No orders yet."}
      </p>
    );

  const handleDelete = async (id) => {
    if (!showDeleteModal) return;
    setIsDeleting(true);
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      onDelete(id);
      toast.success("Order deleted successfully!");
    } catch (error) {
      console.error("Order deletion failed:", error);
      toast.error(getErrorMessage(error, "Failed to delete order. Please try again."));
    } finally {
      setShowDeleteModal(false);
      setIsDeleting(false);
    }
  };

  return (
    <>
      {access.edit && (
        <p className="text-xs text-gray-500 mb-2">
          {isPhone
            ? "Tip: double-tap a card, or tap Edit, to change an order right here."
            : "Tip: double-click an order to edit it right here."}
        </p>
      )}
      {isPhone ? (
        <>
          {/* Phones have no column headers to tap, so sorting is a dropdown */}
          <div className="flex gap-2 mb-3">
            <select
              aria-label="Sort orders by"
              value={sortField || ""}
              onChange={(e) => {
                setSortField(e.target.value || null);
                setSortOrder(e.target.value ? "asc" : "desc");
              }}
              className="flex-1 min-w-0 border rounded-md px-3 py-2 min-h-[44px] bg-white text-sm"
            >
              {SORT_OPTIONS.filter((option) => canSeeAmounts || !["total", "advance", "balance"].includes(option.value)).map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
            {sortField && (
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 py-2 min-h-[44px] border rounded-md bg-white text-sm"
              >
                {sortOrder === "asc" ? "A → Z ↑" : "Z → A ↓"}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {orders.map((order) => (
              <OrderMobileCard
                key={order._id}
                order={order}
                shop={shop}
                access={access}
                maskAmounts={maskAmounts}
                edit={editFor(order)}
                onStartEdit={inline.start}
                setShowDeleteModal={setShowDeleteModal}
                setDeleteId={setDeleteId}
                selectable={selectable}
                selected={selected.has(order._id)}
                onToggleSelect={toggleSelect}
                nextStatus={nextStatusOf(shop, order.status)}
                onNext={goNext}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="overflow-auto border rounded shadow">
          <table className="bg-white rounded-lg shadow-md text-left w-full">
            <OrderTableHeader
              columns={rowColumns}
              showActions={access.edit || access.delete || access.share}
              selectable={selectable}
              allSelected={allSelected}
              someSelected={selected.size > 0}
              onToggleAll={toggleAll}
              setSortField={setSortField}
              setSortOrder={setSortOrder}
              sortField={sortField}
              sortOrder={sortOrder}
            />
            <tbody>
              {orders.map((order) => (
                <OrderTableRow
                  key={order._id}
                  order={order}
                  shop={shop}
                  access={access}
                  rowColumns={rowColumns}
                  detailColumns={detailColumns}
                  maskAmounts={maskAmounts}
                  edit={editFor(order)}
                  onStartEdit={inline.start}
                  setShowDeleteModal={setShowDeleteModal}
                  setDeleteId={setDeleteId}
                  activeOrderId={activeOrderId}
                  setActiveOrderId={setActiveOrderId}
                  selectable={selectable}
                  selected={selected.has(order._id)}
                  onToggleSelect={toggleSelect}
                  nextStatus={nextStatusOf(shop, order.status)}
                  onNext={goNext}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        ordersPerPage={ordersPerPage}
        setOrdersPerPage={setOrdersPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalOrders={totalOrders}
      />

      {selectable && selected.size > 0 && (
        <BulkBar
          count={selected.size}
          options={offeredStatuses(shop, { canCloseOld: access.admin })}
          onNext={bulkNext}
          onPick={bulkSet}
          onClear={() => setSelected(new Set())}
        />
      )}
      {moves.followUpUI}

      {showDeleteModal && (
        <DeleteConfirmModal
          onCancel={() => {
            setDeleteId(null);
            setShowDeleteModal(false);
          }}
          handleDelete={handleDelete}
          deleteId={deleteId}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
};

export default OrderList;
