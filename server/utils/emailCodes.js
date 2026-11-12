// Emailed 6-digit codes: used to reset a password, to confirm an email at
// sign-up, and to confirm a new email address.
//
// A code lives on the user as { hash, expiresAt, attempts, sentAt, kind, newEmail }.
// Only a fingerprint of the code is stored, tied to the account and to what it
// is for, so a code for one thing cannot be used for another.
const crypto = require("crypto");

const CODE_MINUTES = 10;
const RESEND_SECONDS = 60;
const MAX_TRIES = 5;

const fingerprint = (code, userId, kind) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId}:${kind}:${code}`)
    .digest("hex");

const sameText = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Makes a new code and puts its fingerprint on `user[field]` (the caller saves
// the user and emails the code). Returns null when a code was sent less than
// a minute ago: then nothing is changed and nothing should be sent.
const issueCode = (user, field, kind, extra = {}) => {
  const sentAt = user[field]?.sentAt;
  if (sentAt && Date.now() - sentAt.getTime() < RESEND_SECONDS * 1000) return null;

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  user[field] = {
    hash: fingerprint(code, user._id, kind),
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
    attempts: 0,
    sentAt: new Date(),
    kind,
    ...extra,
  };
  return code;
};

// Is `typed` the right code? Every try is counted; after MAX_TRIES wrong
// tries the code is thrown away. The caller must save the user afterwards.
// Returns true only for the right, unexpired code (it is NOT cleared here).
const checkCode = (user, field, kind, typed) => {
  const saved = user[field];
  if (!saved?.hash || !saved.expiresAt || saved.expiresAt < new Date()) return false;
  if ((saved.kind || kind) !== kind) return false;
  if (typeof typed !== "string" || !/^\d{6}$/.test(typed.trim())) return false;

  user[field].attempts = (saved.attempts || 0) + 1;
  if (user[field].attempts > MAX_TRIES) {
    user[field] = undefined;
    return false;
  }
  return sameText(saved.hash, fingerprint(typed.trim(), user._id, kind));
};

module.exports = { issueCode, checkCode, CODE_MINUTES, RESEND_SECONDS };
