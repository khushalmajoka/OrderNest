import { format, isSameDay, startOfDay, subDays } from "date-fns";

// Date text used all over the app (small helpers, so the whole app writes
// dates the same way).

// A calendar day stored as "2026-11-20" or "2026-11-20T00:00:00.000Z" ->
// "20 Nov 2026". Only the day part is used, so no time zone can shift it.
export const formatDay = (value) => {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  return format(new Date(year, month - 1, day), "dd MMM yyyy");
};

// A moment in time -> "20 Nov, 03:05 PM" (on the viewer's clock)
export const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : format(date, "dd MMM, hh:mm a");
};

// A moment in time -> "20 Nov 2026" (on the viewer's clock)
export const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : format(date, "dd MMM yyyy");
};

// "Today", "Yesterday" or "20 Nov 2026" (for the Activity list headings)
export const formatDayHeading = (value) => {
  const date = startOfDay(new Date(value));
  const today = startOfDay(new Date());
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, subDays(today, 1))) return "Yesterday";
  return format(date, "dd MMM yyyy");
};
