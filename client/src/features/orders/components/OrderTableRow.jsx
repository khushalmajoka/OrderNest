import { useState } from "react";
import { Pencil, Share2, Trash2, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import OrderShareDialog from "./OrderShareDialog";
import DeliverySlipDialog from "./DeliverySlipDialog";
import { useOrderShare } from "../hooks/useOrderShare";
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
  access,
  rowColumns,
  detailColumns,
}) => {
  const { cardRef, isShareOpen, setIsShareOpen, handleShare } =
    useOrderShare(order);

  const [showSlip, setShowSlip] = useState(false);
  const isExpanded = activeOrderId === order._id;
  const hasDetails = detailColumns.length > 0;
  const statusStyle = getStatusStyle(shop, order.status);
  // One colour for the row and its opened details
  const rowTint = statusStyle ? statusStyle.row : "bg-orange-50";

  return (
    <>
      <motion.tr
        layout
        key={order._id}
        className={`group border-t text-sm transition-all relative ${
          hasDetails ? "cursor-pointer" : ""
        } ${
          statusStyle
            ? `${statusStyle.row} hover:brightness-95`
            : isExpanded
            ? "bg-orange-50"
            : "hover:bg-orange-50"
        }`}
        onClick={(e) => {
          if (!hasDetails || e.target.closest("button")) return; // avoid conflicts
          setActiveOrderId(isExpanded ? null : order._id);
        }}
      >
        {rowColumns.map((column, index) => (
          <td
            key={column.key}
            className={`px-3 py-2 align-top ${
              index === 0
                ? `border-l-4 ${
                    statusStyle ? statusStyle.strip : "border-l-transparent"
                  }`
                : ""
            }`}
          >
            {column.cell(order, { statusStyle })}
          </td>
        ))}
        {(access.edit || access.delete || access.share) && (
          <td className="absolute right-0 group-hover:bg-orange-50 px-4 py-2 shadow-left rounded-md">
            <div className="flex gap-3 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
              {access.edit && (
                <button
                  onClick={() => {
                    setShowEditOrderModal(true);
                    onEdit(order);
                  }}
                  className="text-blue-500 hover:text-blue-600"
                  title="Edit order"
                  aria-label="Edit order"
                >
                  <Pencil size={18} />
                </button>
              )}
              {access.delete && (
                <button
                  onClick={() => {
                    setDeleteId(order._id);
                    setShowDeleteModal(true);
                  }}
                  className="text-red-500 hover:text-red-600"
                  title="Delete order"
                  aria-label="Delete order"
                >
                  <Trash2 size={18} />
                </button>
              )}
              {access.share && (
                <>
                  <button
                    onClick={() => setIsShareOpen(true)}
                    className="text-green-500 hover:text-green-600"
                    title="Share order"
                    aria-label="Share order"
                  >
                    <Share2 size={18} />
                  </button>
                  <button
                    onClick={() => setShowSlip(true)}
                    className="text-gray-600 hover:text-gray-900"
                    title="Delivery slip"
                    aria-label="Delivery slip"
                  >
                    <Truck size={18} />
                  </button>
                </>
              )}
            </div>
          </td>
        )}
      </motion.tr>

      {/* Opened row: the columns that are not in the row, in the same colour */}
      <AnimatePresence>
        {isExpanded && hasDetails && (
          <motion.tr
            layout
            key={`expand-${order._id}`}
            className={`text-sm ${rowTint}`}
          >
            <td colSpan={rowColumns.length} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className={`overflow-hidden ${rowTint}`}
              >
                <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 px-6 py-4 border-t border-black/5">
                  {detailColumns.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-xs text-gray-500">{column.label}</dt>
                      <dd className="break-words text-gray-800">
                        {column.cell(order, { statusStyle })}
                      </dd>
                    </div>
                  ))}
                </dl>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>

      {showSlip && (
        <DeliverySlipDialog
          order={order}
          shop={shop}
          onClose={() => setShowSlip(false)}
        />
      )}

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
