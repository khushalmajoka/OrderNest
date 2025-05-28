import React, { useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import { Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";

const OrderList = ({ orders, onEdit, onDelete }) => {
  const [deleteId, setDeleteId] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  if (!orders.length)
    return <p className="text-gray-500 mt-4">No orders yet.</p>;

  const handleDelete = (id) => {
    onDelete(id);
    setDeleteId(null);
    toast.success("Order deleted successfully");
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (!sortField) return 0;

    const valA = a[sortField]?.toString().toLowerCase();
    const valB = b[sortField]?.toString().toLowerCase();

    if (sortOrder === "asc") return valA > valB ? 1 : -1;
    return valA < valB ? 1 : -1;
  });

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md overflow-hidden">
          <thead>
            <tr className="bg-orange-100 text-left text-gray-700">
              {/* Order ID */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("orderId")}
              >
                <div className="flex items-center gap-2">
                  <span>Order ID</span>
                  <div className="flex flex-col">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "orderId" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "orderId" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Customer */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("customerName")}
              >
                <div className="flex items-center gap-2">
                  <span>Customer</span>
                  <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "customerName" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "customerName" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Product */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("item")}
              >
                <div className="flex items-center gap-2">
                  <span>Product</span>
                  <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "item" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "item" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Phone */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("phone")}
              >
                <div className="flex items-center gap-2">
                  <span>Phone</span>
                  <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "phone" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "phone" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Total */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("total")}
              >
                <div className="flex items-center gap-2">
                  <span>Total</span>
                  <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "total" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "total" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Advance */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("advance")}
              >
                <div className="flex items-center gap-2">
                  <span>Advance</span>
                  <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "advance" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "advance" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Balance */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("balance")}
              >
                <div className="flex items-center gap-2">
                  <span>Balance</span>
                  <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "balance" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "balance" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Status */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-2">
                  <span>Status</span>
                  <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "status" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "status" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Created */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center gap-2">
                  <span>Created</span>
                  <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "createdAt" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "createdAt" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Updated */}
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => handleSort("updatedAt")}
              >
                <div className="flex items-center gap-2">
                  <span>Updated</span>
                  <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "updatedAt" && sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "updatedAt" && sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              </th>

              {/* Actions */}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => (
              <tr
                key={order._id}
                className="group border-t text-sm hover:bg-orange-50 transition-all"
              >
                <td className="px-4 py-2">
                  {order.orderId || order._id.slice(-6)}
                </td>
                <td className="px-4 py-2">{order.customerName}</td>
                <td className="px-4 py-2">{order.item}</td>
                <td className="px-4 py-2">{order.phone}</td>
                <td className="px-4 py-2">₹{order.total}</td>
                <td className="px-4 py-2">₹{order.advance}</td>
                <td className="px-4 py-2">₹{order.balance}</td>
                <td className="px-4 py-2">{order.status}</td>
                <td className="px-4 py-2">
                  {moment(order.createdAt).format("DD MMM, hh:mm A")}
                </td>
                <td className="px-4 py-2">
                  {moment(order.updatedAt).format("DD MMM, hh:mm A")}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        onEdit(order);
                      }}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteId(order._id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Delete Order?
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete this order?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderList;
