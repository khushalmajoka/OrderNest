import { useState } from "react";
import { Pencil, Share2, Trash2, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import OrderShareDialog from "./OrderShareDialog";
import DeliverySlipDialog from "./DeliverySlipDialog";
import RowActionsMenu from "./RowActionsMenu";
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
  // Edit is one tap; the rest go in the menu (Delete last, in red)
  const menuItems = [
    access.share && { key: "slip", label: "Delivery slip", icon: Truck, onClick: () => setShowSlip(true) },
    access.share && { key: "share", label: "Share", icon: Share2, onClick: () => setIsShareOpen(true) },
    access.delete && {
      key: "delete",
      label: "Delete order",
      icon: Trash2,
      danger: true,
      onClick: () => {
        setDeleteId(order._id);
        setShowDeleteModal(true);
      },
    },
  ].filter(Boolean);
  const hasActions = access.edit || menuItems.length > 0;
  const statusStyle = getStatusStyle(shop, order.status);
  // One colour for the row and its opened details
  const rowTint = statusStyle ? statusStyle.row : "bg-orange-50";

  return (
    <>
      <motion.tr
        layout
        key={order._id}
        className={`border-t text-sm transition-all ${
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
            className={`px-2 py-2 align-top ${
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
        {hasActions && (
          <td className="px-2 py-2 align-top whitespace-nowrap">
            <div className="flex items-center justify-end gap-0.5">
              {access.edit && (
                <button
                  onClick={() => {
                    setShowEditOrderModal(true);
                    onEdit(order);
                  }}
                  className="p-1.5 rounded-md text-blue-600 hover:bg-black/10"
                  title="Edit order"
                  aria-label="Edit order"
                >
                  <Pencil size={18} />
                </button>
              )}
              {menuItems.length > 0 && <RowActionsMenu items={menuItems} />}
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
            <td colSpan={rowColumns.length + (hasActions ? 1 : 0)} className="p-0">
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
