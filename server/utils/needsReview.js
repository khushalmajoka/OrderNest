// "Needs review": open orders whose delivery date passed a while ago, so they
// are probably already delivered but nobody marked them. One place, so the
// Dashboard banner, the review list and the Settings card always agree.
const dateStamp = require("./dateStamp");
const { FINISHED } = require("./statusGroups");

const DEFAULT_DAYS = 5;
const MIN_DAYS = 1;
const MAX_DAYS = 60;
// "Not yet" hides an order from the review for this many days
const SNOOZE_DAYS = 3;
// Open orders in these statuses were most likely handed over already
const PROBABLY_DELIVERED = ["Ready to Dispatch/Pick-Up", "Dispatched"];

// { enabled, days } for a shop (not set = on, 5 days)
const reviewSettingsOf = (shop) => {
  const saved = shop?.needsReview || {};
  const days = Number.isInteger(saved.days) ? saved.days : DEFAULT_DAYS;
  return { enabled: saved.enabled !== false, days: Math.min(MAX_DAYS, Math.max(MIN_DAYS, days)) };
};

// The latest delivery date that needs review: today (shop's time zone) minus `days`
const reviewCutoff = (days, now = new Date()) => {
  const stamp = dateStamp(now);
  const today = new Date(`${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T00:00:00.000Z`);
  return new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
};

// MongoDB filter for the orders of one shop that need review right now
const reviewFilter = (shop, now = new Date()) => {
  const { days } = reviewSettingsOf(shop);
  return {
    shop: shop._id,
    status: { $nin: FINISHED },
    expectedDeliveryDate: { $lte: reviewCutoff(days, now) },
    $or: [{ reviewSnoozedUntil: { $exists: false } }, { reviewSnoozedUntil: null }, { reviewSnoozedUntil: { $lte: now } }],
  };
};

module.exports = {
  DEFAULT_DAYS,
  MIN_DAYS,
  MAX_DAYS,
  SNOOZE_DAYS,
  PROBABLY_DELIVERED,
  reviewSettingsOf,
  reviewCutoff,
  reviewFilter,
};
