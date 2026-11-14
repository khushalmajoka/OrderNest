import { formatDay, formatDateTime } from "../../../common/utils/formatDate";
import { deliveryCountdown } from "../../../common/utils/dateUtils";

// The one list of table columns. The table row, the header and the opened
// (expanded) row all use it, so a column can sit in the row or in the details.
//   sort:  the field the server sorts by (null = cannot sort)
//   cell:  what to show for an order
export const ORDER_COLUMNS = [
  { key: "orderId", label: "Order ID", sort: "orderId", fixed: true, cell: (o) => o.orderId || o._id.slice(-6) },
  { key: "customerName", label: "Customer", sort: "customerName", cell: (o) => o.customerName || "-" },
  { key: "item", label: "Product", sort: "item", cell: (o) => o.item || "-" },
  { key: "phone", label: "Phone", sort: "phone", cell: (o) => o.phone || "-" },
  { key: "total", label: "Total", sort: "total", cell: (o) => `₹${o.total}` },
  { key: "advance", label: "Advance", sort: "advance", cell: (o) => `₹${o.advance}` },
  { key: "balance", label: "Balance", sort: "balance", cell: (o) => `₹${o.balance}` },
  {
    key: "status",
    label: "Status",
    sort: "status",
    cell: (o, { statusStyle }) =>
      statusStyle ? (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.badge}`}
        >
          {o.status}
        </span>
      ) : (
        o.status
      ),
  },
  {
    key: "delivery",
    label: "Delivery",
    sort: "expectedDeliveryDate",
    cell: (o) => {
      if (!o.expectedDeliveryDate) return "-";
      const countdown = deliveryCountdown(o.expectedDeliveryDate, o.status);
      return (
        <>
          <span className="whitespace-nowrap">
            {formatDay(o.expectedDeliveryDate)}
          </span>
          {countdown.text !== "-" && (
            <span
              className={`block text-xs ${
                countdown.late ? "text-red-600 font-medium" : "text-gray-500"
              }`}
            >
              {countdown.text}
            </span>
          )}
        </>
      );
    },
  },
  { key: "orderExecutive", label: "Executive", sort: "orderExecutive", cell: (o) => o.orderExecutive || "-" },
  { key: "address", label: "Address", sort: null, cell: (o) => o.address || "-" },
  { key: "createdAt", label: "Created", sort: "createdAt", cell: (o) => formatDateTime(o.createdAt) },
  { key: "updatedAt", label: "Updated", sort: "updatedAt", cell: (o) => formatDateTime(o.updatedAt) },
];

// In the row until the admin changes it in Settings
export const DEFAULT_ROW_COLUMNS = [
  "orderId",
  "customerName",
  "item",
  "phone",
  "total",
  "balance",
  "status",
  "delivery",
];

// { rowColumns, detailColumns } for a shop, always in the fixed order
export const resolveColumns = (shop) => {
  const chosen =
    Array.isArray(shop?.tableColumns) && shop.tableColumns.length
      ? shop.tableColumns
      : DEFAULT_ROW_COLUMNS;
  const inRow = (column) => column.fixed || chosen.includes(column.key);
  return {
    rowColumns: ORDER_COLUMNS.filter(inRow),
    detailColumns: ORDER_COLUMNS.filter((column) => !inRow(column)),
  };
};
