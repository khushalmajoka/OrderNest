import { useState } from "react";
import toast from "react-hot-toast";
import OrderTableHeader from "./OrderTableHeader";
import OrderTableRow from "./OrderTableRow";
import DeleteConfirmModal from "../../../common/components/DeleteConfirmModal";
import Pagination from "./Pagination";
import axios from "axios";

// Shows one page of orders. Paging, search and sorting are done by the server;
// the page state lives in the dashboard and arrives here as props.
const OrderList = ({
  orders,
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

  if (!orders.length)
    return (
      <p className="text-gray-500 mt-4">
        {searching ? "No orders match your search." : "No orders yet."}
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
