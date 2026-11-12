import { Pencil, Share2, Trash2 } from "lucide-react";
import moment from "moment";
import { motion, AnimatePresence } from "framer-motion";
import OrderShareDialog from "./OrderShareDialog";
import { useOrderShare } from "../hooks/useOrderShare";
import { deliveryCountdown } from "../../../common/utils/dateUtils";
import { getStatusStyle } from "../../../common/utils/statusColors";

const OrderTableRow = ({
  order,
  shop,
  onEdit,
  setDeleteId,
  setShowEditOrderModal,
  setShowDeleteModal,
  activeOrderId,
  setActiveOrderId,
}) => {
  const { cardRef, isShareOpen, setIsShareOpen, handleShare } =
    useOrderShare(order);

  const isExpanded = activeOrderId === order._id;
  const countdown = deliveryCountdown(order.expectedDeliveryDate, order.status);
  const statusStyle = getStatusStyle(shop, order.status);

  return (
    <>
      <motion.tr
        layout
        key={order._id}
        className={`group border-t text-sm transition-all relative cursor-pointer ${
          statusStyle
            ? `${statusStyle.row} hover:brightness-95`
            : isExpanded
            ? "bg-orange-50"
            : "hover:bg-orange-50"
        }`}
        onClick={(e) => {
          if (e.target.closest("button")) return; // avoid conflicts
          setActiveOrderId(isExpanded ? null : order._id);
        }}
      >
        <td
          className={`px-4 py-2 border-l-4 ${
            statusStyle ? statusStyle.strip : "border-l-transparent"
          }`}
        >
          {order.orderId || order._id.slice(-6)}
        </td>
        <td className="px-4 py-2">{order.customerName}</td>
        <td className="px-4 py-2">{order.item}</td>
        <td className="px-4 py-2">{order.phone}</td>
        <td className="px-4 py-2">₹{order.total}</td>
        <td className="px-4 py-2">₹{order.advance}</td>
        <td className="px-4 py-2">₹{order.balance}</td>
        <td className="px-4 py-2">
          {statusStyle ? (
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusStyle.badge}`}
            >
              {order.status}
            </span>
          ) : (
            order.status
          )}
        </td>
        <td className="px-4 py-2">
          {order.expectedDeliveryDate
            ? moment(order.expectedDeliveryDate).format("DD MMM YYYY")
            : "-"}
        </td>
        <td
          className={`px-4 py-2 ${countdown.late ? "text-red-600 font-medium" : ""}`}
        >
          {countdown.text}
        </td>
        <td className="px-4 py-2">{order.orderExecutive}</td>
        <td className="absolute right-0 group-hover:bg-orange-50 px-4 py-2 shadow-left rounded-md">
          <div className="flex gap-3 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => {
                setShowEditOrderModal(true);
                onEdit(order);
              }}
              className="text-blue-500 hover:text-blue-600"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => {
                setDeleteId(order._id);
                setShowDeleteModal(true);
              }}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setIsShareOpen(true)}
              className="text-green-500 hover:text-green-600"
            >
              <Share2 size={18} />
            </button>
          </div>
        </td>
      </motion.tr>

      {/* Expanded details row */}
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            layout
            key={`expand-${order._id}`}
            className="bg-white text-sm"
          >
            <td colSpan="12" className="p-0">
              {/* Wrapper for smooth expand/collapse */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden p-4 bg-orange-50"
              >
                <p className="mb-2">
                  <strong>Created Date:</strong>{" "}
                  {moment(order.createdAt).format("DD MMM, hh:mm A")}
                </p>
                <p>
                  <strong>Updated Date:</strong>{" "}
                  {moment(order.updatedAt).format("DD MMM, hh:mm A")}
                </p>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>

      <OrderShareDialog
        isOpen={isShareOpen}
        order={order}
        shop={shop}
        cardRef={cardRef}
        onClose={() => setIsShareOpen(false)}
        onShare={handleShare}
      />
    </>
  );
};

export default OrderTableRow;
