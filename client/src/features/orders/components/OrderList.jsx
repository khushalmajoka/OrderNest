import { useState } from "react";
import toast from "react-hot-toast";
import OrderTableHeader from "./OrderTableHeader";
import OrderTableRow from "./OrderTableRow";
import DeleteConfirmModal from "../../../common/components/DeleteConfirmModal";
import OrderMobileCard from "./OrderMobileCard";
import Pagination from "./Pagination";
import { useIsPhone } from "../../../common/hooks/useMediaQuery";
import axios from "axios";
import { can } from "../../../common/utils/permissions";

// Columns the phone view can sort by (same ones the table headers offer)
const SORT_OPTIONS = [
  { value: "", label: "Newest first" },
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
  onEdit,
  onDelete,
  setShowEditOrderModal,
}) => {
  const [deleteId, setDeleteId] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isPhone = useIsPhone();
  // What this person may do with an order (the admin decides for staff)
  const access = {
    edit: can(account, "editOrders"),
    delete: can(account, "deleteOrders"),
    share: can(account, "shareSlip"),
  };

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
      toast.error("Failed to delete order. Please try again.");
    } finally {
      setShowDeleteModal(false);
      setIsDeleting(false);
    }
  };

  return (
    <>
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
              className="flex-1 min-w-0 border rounded-md px-3 py-2 bg-white text-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
            {sortField && (
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 py-2 border rounded-md bg-white text-sm"
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
                onEdit={onEdit}
                setShowEditOrderModal={setShowEditOrderModal}
                setShowDeleteModal={setShowDeleteModal}
                setDeleteId={setDeleteId}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="overflow-auto border rounded shadow">
          <table className="overflow-auto min-w-max bg-white rounded-lg shadow-md text-left w-full">
            <OrderTableHeader
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
                  onEdit={onEdit}
                  setShowEditOrderModal={setShowEditOrderModal}
                  setShowDeleteModal={setShowDeleteModal}
                  setDeleteId={setDeleteId}
                  activeOrderId={activeOrderId}
                  setActiveOrderId={setActiveOrderId}
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

      {showDeleteModal && (
        <DeleteConfirmModal
          setDeleteId={setDeleteId}
          handleDelete={handleDelete}
          deleteId={deleteId}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
};

export default OrderList;
