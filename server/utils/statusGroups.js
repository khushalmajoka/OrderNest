// Which statuses mean what. One place, so the Dashboard numbers, the filters
// and the "Close old orders" tool always agree.
const CLOSED_OLD = "Closed (old)";

module.exports = {
  CLOSED_OLD,
  // Not "open" any more
  FINISHED: ["Delivered", "Cancelled", CLOSED_OLD],
  // Their balance is not money still to collect
  NO_BALANCE: ["Cancelled", CLOSED_OLD],
};
