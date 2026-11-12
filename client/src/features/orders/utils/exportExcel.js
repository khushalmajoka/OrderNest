import * as XLSX from "xlsx";

// One row per order. Money is a number, dates are real Excel dates (so Excel
// can sort and filter them), phone and order ID stay text.
const HEADERS = [
  "Order ID",
  "Customer Name",
  "Phone",
  "Address",
  "Product",
  "Total",
  "Advance",
  "Balance",
  "Status",
  "Expected Delivery",
  "Order Executive",
  "Created",
  "Updated",
];

// Excel counts days from 30 Dec 1899
const EXCEL_EPOCH_OFFSET = 25569;
const DAY_FORMAT = "dd mmm yyyy";
const TIME_FORMAT = "dd mmm yyyy hh:mm";

// "2026-11-20..." (a calendar day) -> Excel date, no time-zone shift
const dayCell = (value) => {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return { t: "n", v: Date.UTC(year, month - 1, day) / 86400000 + EXCEL_EPOCH_OFFSET, z: DAY_FORMAT };
};

// A moment in time -> Excel date and time as shown on this computer's clock
const timeCell = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const serial =
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) /
      86400000 +
    EXCEL_EPOCH_OFFSET;
  return { t: "n", v: serial, z: TIME_FORMAT };
};

const textCell = (value) => ({ t: "s", v: value == null ? "" : String(value) });
const moneyCell = (value) => ({ t: "n", v: Number(value) || 0 });

export const buildOrdersSheet = (orders) => {
  const rows = orders.map((o) => [
    textCell(o.orderId),
    textCell(o.customerName),
    textCell(o.phone),
    textCell(o.address),
    textCell(o.item),
    moneyCell(o.total),
    moneyCell(o.advance),
    moneyCell(o.balance),
    textCell(o.status),
    dayCell(o.expectedDeliveryDate),
    textCell(o.orderExecutive),
    timeCell(o.createdAt),
    timeCell(o.updatedAt),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  sheet["!cols"] = [
    { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 34 }, { wch: 24 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 20 },
  ];
  return sheet;
};

export const downloadOrdersExcel = (orders) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildOrdersSheet(orders), "Orders");
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  XLSX.writeFile(workbook, `orders-${stamp}.xlsx`);
};
