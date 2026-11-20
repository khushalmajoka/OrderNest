const Activity = require("../models/Activity");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MAX_PAGE = 100;

// GET /api/activity   (admin only)
// Query: page (from 1), limit (max 100), kind ("order" | "staff"), search
// Newest first.
const listActivity = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_PAGE, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const filter = { shop: req.shop._id };
    if (req.query.kind === "order" || req.query.kind === "staff") {
      filter.kind = req.query.kind;
    }

    const search = String(req.query.search ?? "").trim().slice(0, 100);
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { summary: pattern },
        { targetLabel: pattern },
        { "actor.name": pattern },
        { "actor.username": pattern },
        { "changes.to": pattern },
        { "changes.from": pattern },
      ];
    }

    const [items, total] = await Promise.all([
      Activity.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-shop -__v")
        .lean(),
      Activity.countDocuments(filter),
    ]);

    res.status(200).json({ items, total, page, hasMore: page * limit < total });
  } catch (err) {
    next(err);
  }
};

module.exports = { listActivity };
