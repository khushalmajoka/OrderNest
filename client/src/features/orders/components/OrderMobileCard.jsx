import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Share2, Trash2, Truck } from "lucide-react";
import { formatDay, formatDateTime } from "../../../common/utils/formatDate";
import { DeliverySlipDialog, OrderShareDialog, WithOpening } from "../lazyDialogs";
import { useOrderShare } from "../hooks/useOrderShare";
import { deliveryCountdown } from "../../../common/utils/dateUtils";
import { getStatusStyle } from "../../../common/utils/statusColors";

// One order as a card, for phone screens (the table is too wide there).
const OrderMobileCard = ({
  order,
  shop,
  onEdit,
  setShowEditOrderModal,
  setDeleteId,
  setShowDeleteModal,
  access,
}) => {
  const { cardRef, isShareOpen, setIsShareOpen, handleShare } =
    useOrderShare(order);
  const [showMore, setShowMore] = useState(false);
  const [showSlip, setShowSlip] = useState(false);

  const countdown = deliveryCountdown(order.expectedDeliveryDate, order.status);
  const statusStyle = getStatusStyle(shop, order.status);
  // Blocks inside the card are a slightly darker shade of the card's own colour
  const tile = statusStyle ? "bg-black/5" : "bg-orange-50";

  return (
    <div
      className={`rounded-lg shadow border border-orange-100 border-l-4 p-4 text-sm ${
        statusStyle
          ? `${statusStyle.row} ${statusStyle.strip}`
          : "bg-white border-l-orange-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Order ID</p>
          <p className="font-semibold text-gray-800 break-all">
            {order.orderId || order._id.slice(-6)}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium text-center ${
            statusStyle ? statusStyle.badge : "bg-orange-100 text-orange-700"
          }`}
        >
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
            className="inline-flex items-center w-fit min-h-[44px] text-blue-600 underline"
          >
            {order.phone}
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className={`${tile} rounded p-2`}>
          <p className="text-xs text-gray-500">Total</p>
          <p className="font-semibold">₹{order.total}</p>
        </div>
        <div className={`${tile} rounded p-2`}>
          <p className="text-xs text-gray-500">Advance</p>
          <p className="font-semibold">₹{order.advance}</p>
        </div>
        <div className={`${tile} rounded p-2`}>
          <p className="text-xs text-gray-500">Balance</p>
          <p className="font-semibold text-red-500">₹{order.balance}</p>
        </div>
      </div>

      <div className="mt-3 text-gray-600 space-y-1">
        <p>
          <strong>Delivery:</strong>{" "}
          {order.expectedDeliveryDate ? (
            <>
              {formatDay(order.expectedDeliveryDate)}
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
        <div className={`mt-3 p-3 ${tile} rounded text-gray-600 space-y-1`}>
          <p className="break-words">
            <strong>Address:</strong> {order.address || "-"}
          </p>
          <p>
            <strong>Created:</strong>{" "}
            {formatDateTime(order.createdAt)}
          </p>
          <p>
            <strong>Updated:</strong>{" "}
            {formatDateTime(order.updatedAt)}
          </p>
        </div>
      )}

      <button
        onClick={() => setShowMore((open) => !open)}
        className="mt-1 flex items-center gap-1 min-h-[44px] px-1 text-sm text-orange-600"
      >
        {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showMore ? "Less details" : "More details"}
      </button>

      {access.share && (
        <button
          onClick={() => setShowSlip(true)}
          className="w-full mt-3 flex items-center justify-center gap-1 py-2.5 min-h-[44px] rounded border text-gray-700"
        >
          <Truck size={16} /> Delivery slip
        </button>
      )}

      {(access.edit || access.share || access.delete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t">
          {access.edit && (
            <button
              onClick={() => {
                setShowEditOrderModal(true);
                onEdit(order);
              }}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 min-h-[44px] rounded border text-blue-600"
            >
              <Pencil size={16} /> Edit
            </button>
          )}
          {access.share && (
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 min-h-[44px] rounded border text-green-600"
            >
              <Share2 size={16} /> Share
            </button>
          )}
          {access.delete && (
            <button
              onClick={() => {
                setDeleteId(order._id);
                setShowDeleteModal(true);
              }}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 min-h-[44px] rounded border text-red-600"
            >
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      )}

      {showSlip && (
        <WithOpening>
          <DeliverySlipDialog
            order={order}
            shop={shop}
            onClose={() => setShowSlip(false)}
          />
        </WithOpening>
      )}

      {isShareOpen && (
        <WithOpening>
          <OrderShareDialog
            isOpen={isShareOpen}
            order={order}
            shop={shop}
            cardRef={cardRef}
            onClose={() => setIsShareOpen(false)}
            onShare={handleShare}
          />
        </WithOpening>
      )}
    </div>
  );
};

export default OrderMobileCard;
