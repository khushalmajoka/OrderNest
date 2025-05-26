import React, { useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";

const OrderList = ({ orders, onEdit, onDelete }) => {
  const [deleteId, setDeleteId] = useState(null);

  if (!orders.length)
    return <p className="text-gray-500 mt-4">No orders yet.</p>;

  const handleDelete = (id) => {
    onDelete(id);
    setDeleteId(null);
    toast.success("Order deleted successfully");
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md overflow-hidden">
          <thead>
            <tr className="bg-orange-100 text-left text-sm text-gray-700">
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Advance</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order._id}
                className="group border-t text-sm hover:bg-orange-50 transition-all"
              >
                <td className="px-4 py-2">{order.orderId || order._id.slice(-6)}</td>
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
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Delete Order?</h2>
            <p className="text-sm text-gray-600 mb-5">Are you sure you want to delete this order?</p>
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
