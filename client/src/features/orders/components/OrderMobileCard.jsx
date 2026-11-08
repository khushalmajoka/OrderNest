import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Share2, Trash2 } from "lucide-react";
import moment from "moment";
import OrderShareDialog from "./OrderShareDialog";
import { useOrderShare } from "../hooks/useOrderShare";
import { deliveryCountdown } from "../../../common/utils/dateUtils";

// One order as a card, for phone screens (the table is too wide there).
const OrderMobileCard = ({
  order,
  shop,
  onEdit,
  setShowEditOrderModal,
  setDeleteId,
  setShowDeleteModal,
}) => {
  const { cardRef, isShareOpen, setIsShareOpen, handleShare } =
    useOrderShare(order);
  const [showMore, setShowMore] = useState(false);

  const countdown = deliveryCountdown(order.expectedDeliveryDate, order.status);

  return (
    <div className="bg-white rounded-lg shadow border border-orange-100 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Order ID</p>
          <p className="font-semibold text-gray-800 break-all">
            {order.orderId || order._id.slice(-6)}
          </p>
        </div>
        <span className="shrink-0 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium text-center">
          {order.status}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        <p className="font-medium text-gray-800 break-words">
          {order.customerName || "-"}
        </p>
        <p className="text-gray-600 break-words">{order.item || "-"}</p>
        {order.phone && (
          <a
            href={`tel:${order.phone}`}
            className="block w-fit pt-1 text-blue-600 underline"
          >
            {order.phone}
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="bg-orange-50 rounded p-2">
          <p className="text-xs text-gray-500">Total</p>
          <p className="font-semibold">₹{order.total}</p>
        </div>
        <div className="bg-orange-50 rounded p-2">
          <p className="text-xs text-gray-500">Advance</p>
          <p className="font-semibold">₹{order.advance}</p>
        </div>
        <div className="bg-orange-50 rounded p-2">
          <p className="text-xs text-gray-500">Balance</p>
          <p className="font-semibold text-red-500">₹{order.balance}</p>
        </div>
      </div>

      <div className="mt-3 text-gray-600 space-y-1">
        <p>
          <strong>Delivery:</strong>{" "}
          {order.expectedDeliveryDate ? (
            <>
              {moment(order.expectedDeliveryDate).format("DD MMM YYYY")}
              {countdown.text !== "-" && (
                <span className={countdown.late ? "text-red-600 font-medium" : ""}>
                  {" "}
                  ({countdown.text})
                </span>
              )}
            </>
          ) : (
            "-"
          )}
        </p>
        <p>
          <strong>Executive:</strong> {order.orderExecutive || "-"}
        </p>
      </div>

      {showMore && (
        <div className="mt-3 p-3 bg-orange-50 rounded text-gray-600 space-y-1">
          <p>
            <strong>Created:</strong>{" "}
            {moment(order.createdAt).format("DD MMM, hh:mm A")}
          </p>
          <p>
            <strong>Updated:</strong>{" "}
            {moment(order.updatedAt).format("DD MMM, hh:mm A")}
          </p>
        </div>
      )}

      <button
        onClick={() => setShowMore((open) => !open)}
        className="mt-3 flex items-center gap-1 text-xs text-orange-600"
      >
        {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showMore ? "Less details" : "More details"}
      </button>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
        <button
          onClick={() => {
            setShowEditOrderModal(true);
            onEdit(order);
          }}
          className="flex items-center justify-center gap-1 py-2 rounded border text-blue-600"
        >
          <Pencil size={16} /> Edit
        </button>
        <button
          onClick={() => setIsShareOpen(true)}
          className="flex items-center justify-center gap-1 py-2 rounded border text-green-600"
        >
          <Share2 size={16} /> Share
        </button>
        <button
          onClick={() => {
            setDeleteId(order._id);
            setShowDeleteModal(true);
          }}
          className="flex items-center justify-center gap-1 py-2 rounded border text-red-600"
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>

      <OrderShareDialog
        isOpen={isShareOpen}
        order={order}
        shop={shop}
        cardRef={cardRef}
        onClose={() => setIsShareOpen(false)}
        onShare={handleShare}
      />
    </div>
  );
};

export default OrderMobileCard;
