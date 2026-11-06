import { format, parse } from "date-fns";

// The delivery date is a calendar day. The date picker works in the user's
// local time, so convert with local-time helpers. `toISOString()` converts to
// UTC first, which in India (UTC+5:30) turns the 20th into the 19th.

// Date picked in the picker -> "YYYY-MM-DD" (the same day the user clicked)
export const toDateString = (date) => format(date, "yyyy-MM-dd");

// Stored value ("2026-11-20" or "2026-11-20T00:00:00.000Z") -> local Date for
// the picker, or null when there is no date.
export const fromDateString = (value) =>
  value ? parse(String(value).slice(0, 10), "yyyy-MM-dd", new Date()) : null;
