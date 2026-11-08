import { differenceInCalendarDays, format, parse } from "date-fns";

// The delivery date is a calendar day. The date picker works in the user's
// local time, so convert with local-time helpers. `toISOString()` converts to
// UTC first, which in India (UTC+5:30) turns the 20th into the 19th.

// Date picked in the picker -> "YYYY-MM-DD" (the same day the user clicked)
export const toDateString = (date) => format(date, "yyyy-MM-dd");

// Stored value ("2026-11-20" or "2026-11-20T00:00:00.000Z") -> local Date for
// the picker, or null when there is no date.
export const fromDateString = (value) =>
  value ? parse(String(value).slice(0, 10), "yyyy-MM-dd", new Date()) : null;

// "In 3 days" / "Today" / "2 days late" for the delivery column and phone card.
// Counted in whole calendar days, so an order due today never shows as late.
// Finished orders (Delivered / Cancelled) have nothing left to count.
export const deliveryCountdown = (value, status) => {
  const due = fromDateString(value);
  if (!due || status === "Delivered" || status === "Cancelled") {
    return { text: "-", late: false };
  }

  const days = differenceInCalendarDays(due, new Date());
  if (days < 0) {
    return { text: `${-days} ${days === -1 ? "day" : "days"} late`, late: true };
  }
  if (days === 0) return { text: "Today", late: false };
  return { text: `${days} ${days === 1 ? "day" : "days"}`, late: false };
};
