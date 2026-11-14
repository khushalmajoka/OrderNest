import { formatDay, formatDateTime } from "../../../common/utils/formatDate";
import { deliveryCountdown } from "../../../common/utils/dateUtils";

// "₹1500", or dots when amounts are hidden (the eye button on the dashboard)
export const MASK = "₹ ••••";
const money = (value, mask) => (mask ? MASK : `₹${value}`);

// The columns that show money: not offered to people who may not see amounts
export const AMOUNT_COLUMN_KEYS = ["total", "advance", "balance"];

// The one list of table columns. The table row, the header and the opened
// (expanded) row all use it, so a column can sit in the row or in the details.
//   sort:  the field the server sorts by (null = cannot sort)
//   cell:  what to show for an order
export const ORDER_COLUMNS = [
  { key: "orderId", label: "Order ID", sort: "orderId", fixed: true, cell: (o) => o.orderId || o._id.slice(-6) },
  { key: "customerName", label: "Customer", sort: "customerName", cell: (o) => o.customerName || "-" },
  { key: "item", label: "Product", sort: "item", cell: (o) => o.item || "-" },
  { key: "phone", label: "Phone", sort: "phone", cell: (o) => o.phone || "-" },
  { key: "total", label: "Total", sort: "total", cell: (o, { mask } = {}) => money(o.total, mask) },
  { key: "advance", label: "Advance", sort: "advance", cell: (o, { mask } = {}) => money(o.advance, mask) },
  { key: "balance", label: "Balance", sort: "balance", cell: (o, { mask } = {}) => money(o.balance, mask) },
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
export const resolveColumns = (shop, { amounts = true } = {}) => {
  const chosen =
    Array.isArray(shop?.tableColumns) && shop.tableColumns.length
      ? shop.tableColumns
      : DEFAULT_ROW_COLUMNS;
  const inRow = (column) => column.fixed || chosen.includes(column.key);
  const allowed = (column) => amounts || !AMOUNT_COLUMN_KEYS.includes(column.key);
  return {
    rowColumns: ORDER_COLUMNS.filter((column) => allowed(column) && inRow(column)),
    detailColumns: ORDER_COLUMNS.filter((column) => allowed(column) && !inRow(column)),
  };
};

// Which columns can be edited in place, and with what kind of box. The ones
// not listed here (Order ID, Balance, Created, Updated) are worked out by the
// app and cannot be edited.
export const COLUMN_EDITORS = {
  customerName: { field: "customerName", type: "text", max: 100 },
  item: { field: "item", type: "text", max: 200 },
  phone: { field: "phone", type: "phone" },
  total: { field: "total", type: "money" },
  advance: { field: "advance", type: "money" },
  status: { field: "status", type: "status" },
  delivery: { field: "expectedDeliveryDate", type: "date" },
  orderExecutive: { field: "orderExecutive", type: "executive" },
  address: { field: "address", type: "textarea", max: 500 },
};
