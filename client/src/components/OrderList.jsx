import { useState } from "react";
import toast from "react-hot-toast";
import OrderTableHeader from "./orderlist/OrderTableHeader";
import OrderTableRow from "./orderlist/OrderTableRow";
import DeleteConfirmModal from "./DeleteConfirmModal";
import Pagination from "./orderlist/Pagination";
import { getSortedOrders } from "../utils/getSortedOrders";
import { getPaginationPages } from "../utils/getPaginationPages";

const OrderList = ({ orders, onEdit, onDelete }) => {
  const [deleteId, setDeleteId] = useState(null);
  const [ordersPerPage, setOrdersPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);

  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  if (!orders.length)
    return <p className="text-gray-500 mt-4">No orders yet.</p>;

  const handleDelete = (id) => {
    onDelete(id);
    setDeleteId(null);
    toast.success("Order deleted successfully");
  };

  const sortedOrders = getSortedOrders(orders, sortField, sortOrder);

  const paginatedOrders = sortedOrders.slice(
    currentPage * ordersPerPage,
    currentPage * ordersPerPage + ordersPerPage
  );

  // const pageNumbers = getPaginationPages(
  //   sortedOrders.length,
  //   ordersPerPage,
  //   currentPage
  // );

  return (
    <>
      <div className="overflow-auto border rounded shadow w-full">
        <table className="overflow-auto min-w-max bg-white rounded-lg shadow-md text-left">
          <OrderTableHeader
            setSortField={setSortField}
            setSortOrder={setSortOrder}
            sortField={sortField}
            sortOrder={sortOrder}
          />
          <tbody>
            {paginatedOrders.map((order) => (
              <OrderTableRow
                key={order._id}
                order={order}
                onEdit={onEdit}
                setDeleteId={setDeleteId}
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
        totalOrders={sortedOrders.length}
      />

      {deleteId && (
        <DeleteConfirmModal
          setDeleteId={setDeleteId}
          handleDelete={handleDelete}
          deleteId={deleteId}
        />
      )}
    </>
  );
};

export default OrderList;
