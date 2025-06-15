import { Pencil, Trash2 } from "lucide-react";
import moment from "moment";

const OrderTableRow = ({ order, onEdit, setDeleteId }) => {
  return (
    <tr
      key={order._id}
      className="group border-t text-sm hover:bg-orange-50 transition-all relative"
    >
      <td className="px-4 py-2">{order.orderId || order._id.slice(-6)}</td>
      <td className="px-4 py-2">{order.customerName}</td>
      <td className="px-4 py-2">{order.item}</td>
      <td className="px-4 py-2">{order.phone}</td>
      <td className="px-4 py-2">₹{order.total}</td>
      <td className="px-4 py-2">₹{order.advance}</td>
      <td className="px-4 py-2">₹{order.balance}</td>
      <td className="px-4 py-2">{order.status}</td>
      {/* Expected Delivery */}
      <td className="px-4 py-2">
        {order.expectedDeliveryDate
          ? moment(order.expectedDeliveryDate).format("DD MMM YYYY")
          : "-"}
      </td>

      {/* Days Remaining */}
      <td className="px-4 py-2">
        {order.expectedDeliveryDate
          ? Math.max(
              moment(order.expectedDeliveryDate).diff(moment(), "days"),
              0
            ) + " days"
          : "-"}
      </td>

      <td className="px-4 py-2">
        {moment(order.createdAt).format("DD MMM, hh:mm A")}
      </td>
      <td className="px-4 py-2">
        {moment(order.updatedAt).format("DD MMM, hh:mm A")}
      </td>
      <td className="sticky right-0 group-hover:bg-orange-50 px-4 py-2 shadow-left border rounded-md">
        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onEdit(order)}
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
  );
};

export default OrderTableRow;
