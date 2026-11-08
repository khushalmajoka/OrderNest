// Turns one Excel row into an order, using the column -> field choices the
// user made in the mapping window.

const NUMBER_FIELDS = ["total", "advance"];
const DATE_FIELDS = ["expectedDeliveryDate"];

const pad = (n) => String(n).padStart(2, "0");

// "1,500", "₹ 1500" or 1500 -> 1500. Anything else is passed on unchanged so
// the server can point at the exact row that has a problem.
export const toAmount = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const cleaned = value.replace(/[,\s₹]/g, "");
  if (cleaned === "") return undefined;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : value;
};

// Excel dates come as a day number (46346), as "20/11/2026" (day first, as
// used in India), as "2026-11-20", or as text such as "20 Nov 2026".
// Returns "YYYY-MM-DD", the same format the date picker sends.
export const toDateString = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  // Excel day number: whole days since 30 Dec 1899
  if (typeof value === "number") {
    const date = new Date(Math.round((Math.floor(value) - 25569) * 86400000));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
      date.getUTCDate()
    )}`;
  }

  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
      value.getDate()
    )}`;
  }

  const text = String(value).trim();

  const isoStart = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoStart) {
    return `${isoStart[1]}-${pad(isoStart[2])}-${pad(isoStart[3])}`;
  }

  const dayFirst = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dayFirst) {
    return `${dayFirst[3]}-${pad(dayFirst[2])}-${pad(dayFirst[1])}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
      parsed.getDate()
    )}`;
  }

  return text; // the server will report this row as an invalid date
};

export const mapExcelRow = (row, fieldMap) => {
  const mapped = {};
  for (const [excelKey, field] of Object.entries(fieldMap)) {
    if (!field) continue; // column left as "-- Map to --"
    let value = row[excelKey];
    if (NUMBER_FIELDS.includes(field)) value = toAmount(value);
    else if (DATE_FIELDS.includes(field)) value = toDateString(value);
    else if (typeof value === "string") value = value.trim();
    mapped[field] = value;
  }
  return mapped;
};
