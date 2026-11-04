// YYYYMMDD for the calendar day in the shop's time zone (India by default),
// not UTC. Used for the date part of order IDs and the daily counter.
// Override with the APP_TIMEZONE env var (an IANA name, e.g. "Asia/Kolkata").
const dateStamp = (now = new Date()) => {
  const timeZone = process.env.APP_TIMEZONE || "Asia/Kolkata";

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );

  return `${parts.year}${parts.month}${parts.day}`;
};

module.exports = dateStamp;
