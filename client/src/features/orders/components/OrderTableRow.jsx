import { useState } from "react";
import { Check, Lock, Pencil, Share2, Trash2, Truck, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DeliverySlipDialog, OrderShareDialog, WithOpening } from "../lazyDialogs";
import RowActionsMenu from "./RowActionsMenu";
import FieldEditor from "./FieldEditor";
import { useOrderShare } from "../hooks/useOrderShare";
import { useFlashOnChange } from "../hooks/useFlashOnChange";
import { COLUMN_EDITORS } from "../utils/orderColumns";
import { getStatusStyle } from "../../../common/utils/statusColors";

// Things inside a row that have their own click or typing: they must not
// open/close the row or start editing
const INTERACTIVE = "button, a, input, select, textarea, label";

const OrderTableRow = ({
  order,
  shop,
  setDeleteId,
  setShowDeleteModal,
  activeOrderId,
  setActiveOrderId,
  access,
  rowColumns,
  detailColumns,
  maskAmounts,
  edit, // null, or the edit state of THIS order: { form, set, dirty, saving, save, cancel }
  onStartEdit,
}) => {
  const { cardRef, isShareOpen, setIsShareOpen, handleShare } =
    useOrderShare(order);

  const [showSlip, setShowSlip] = useState(false);
  // the row lights up for a moment after it was edited
  const flash = useFlashOnChange(order.updatedAt);
  const editing = Boolean(edit);
  const isExpanded = activeOrderId === order._id;
  const hasDetails = detailColumns.length > 0;
  const showDetails = (isExpanded || editing) && hasDetails;

  // Editing is a double click on the row (or "Edit order" here); the rest of
  // the actions are in the menu too (Delete last, in red)
  const menuItems = [
    access.edit && { key: "edit", label: "Edit order", icon: Pencil, onClick: () => onStartEdit(order) },
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
  const hasActions = menuItems.length > 0;
  const statusStyle = getStatusStyle(shop, order.status);
  // One colour for the row and its opened details
  // (the same while editing: the row keeps its status colour; only an outline shows it is being edited)
  const rowTint = statusStyle ? statusStyle.row : "bg-orange-50";

  // What a column shows: a box when editing and it can be edited, otherwise
  // the value (greyed out while editing, so it is clear it cannot be changed)
  const renderCell = (column) => {
    if (!editing) return column.cell(order, { statusStyle, mask: maskAmounts });
    if (COLUMN_EDITORS[column.key]) {
      return <FieldEditor column={column} form={edit.form} set={edit.set} shopId={shop._id} onEnter={edit.save} />;
    }
    if (column.key === "balance") {
      // worked out live from Total and Advance
      const left = Math.max(0, (Number(edit.form.total) || 0) - (Number(edit.form.advance) || 0));
      return <span className="text-gray-400" title="Worked out from Total and Advance">₹{left}</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 text-gray-400" title="This cannot be edited">
        {column.key === "orderId" && <Lock size={12} aria-hidden="true" />}
        {column.cell(order, { statusStyle: null, mask: false })}
      </span>
    );
  };

  return (
    <>
      <motion.tr
        layout
        key={order._id}
        tabIndex={access.edit && !editing ? 0 : undefined}
        aria-label={access.edit && !editing ? `Order ${order.orderId}. Double-click or press Enter to edit.` : undefined}
        className={`border-t text-sm transition-all animate-fade-in motion-reduce:animate-none ${
          flash ? "[&>td]:animate-flash-cell" : ""
        } ${
          hasDetails || access.edit ? "cursor-pointer" : ""
        } ${
          statusStyle
            ? `${statusStyle.row} ${editing ? "" : "hover:brightness-95"}`
            : isExpanded || editing
            ? "bg-orange-50"
            : "hover:bg-orange-50"
        } ${editing ? "ring-2 ring-inset ring-orange-300" : ""}`}
        onClick={(e) => {
          if (editing || !hasDetails || e.target.closest(INTERACTIVE)) return; // avoid conflicts
          setActiveOrderId(isExpanded ? null : order._id);
        }}
        onDoubleClick={(e) => {
          if (!access.edit || editing || e.target.closest(INTERACTIVE)) return;
          onStartEdit(order);
        }}
        onKeyDown={(e) => {
          if (editing && e.key === "Escape") {
            e.stopPropagation();
            edit.cancel();
          } else if (!editing && access.edit && e.key === "Enter" && e.target === e.currentTarget) {
            onStartEdit(order);
          }
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
            {renderCell(column)}
          </td>
        ))}
        {(hasActions || editing) && (
          <td className="px-2 py-2 align-top whitespace-nowrap">
            <div className="flex items-center justify-end gap-1">
              {editing ? (
                <>
                  {/* The tick shows only once something was changed */}
                  {edit.dirty && (
                    <button
                      type="button"
                      onClick={edit.save}
                      disabled={edit.saving}
                      aria-label="Save changes"
                      title="Save changes (Enter)"
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-green-500 text-white hover:bg-green-600 disabled:bg-green-300"
                    >
                      <Check size={18} strokeWidth={3} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={edit.cancel}
                    disabled={edit.saving}
                    aria-label="Cancel editing"
                    title="Cancel (Esc)"
                    className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-400 text-gray-600 hover:bg-black/10"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <RowActionsMenu items={menuItems} />
              )}
            </div>
          </td>
        )}
      </motion.tr>

      {/* Opened row: the columns that are not in the row, in the same colour */}
      <AnimatePresence>
        {showDetails && (
          <motion.tr
            layout
            key={`expand-${order._id}`}
            className={`text-sm ${rowTint} ${editing ? "ring-2 ring-inset ring-orange-300" : ""}`}
            onKeyDown={(e) => {
              if (editing && e.key === "Escape") {
                e.stopPropagation();
                edit.cancel();
              }
            }}
          >
            <td colSpan={rowColumns.length + (hasActions || editing ? 1 : 0)} className="p-0">
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
                      <dd className="break-words text-gray-800">{renderCell(column)}</dd>
                    </div>
                  ))}
                </dl>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>

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
    </>
  );
};

export default OrderTableRow;
