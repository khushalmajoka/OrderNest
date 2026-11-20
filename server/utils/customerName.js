// Is this a real customer name? A name may be left empty (the customer's name
// is not known), but when something is typed it must look like a name:
// letters only (any language), at least 2 letters, and not a placeholder such
// as "N", "NA", "n/a", "xx", "none", "test", "pata nahi".
//
// (The same rules are in client/src/common/utils/customerName.js: keep them
// the same. The server decides; the screen only warns earlier.)

// Placeholders, written without spaces or punctuation, lower case
const PLACEHOLDERS = new Set([
  "n", "na", "nan", "nn", "nil", "nill", "none", "null", "no", "nm",
  "xx", "xxx", "xxxx", "abc", "abcd", "test", "testing", "demo", "dummy",
  "unknown", "customer", "cust", "name", "noname", "notknown", "notavailable",
  "dontknow", "donotknow", "walkin", "guest",
  "patanahi", "patanhi", "nahipata", "nahi", "nhi", "koinahi", "pta", "ptanahi",
  "ग्राहक", "पतानहीं", "नहींपता", "नामनहीं", "कोईनहीं", "अज्ञात",
]);

const ALLOWED = /^[\p{L}\p{M}\s.'’\-&(),/]+$/u;

const clean = (raw) => String(raw ?? "").trim().replace(/\s+/g, " ");

// Returns null when the name is fine (or empty), otherwise a short message.
const nameProblem = (raw) => {
  const name = clean(raw);
  if (name === "") return null;

  if (!ALLOWED.test(name)) {
    return "Customer name can only have letters. Type the real name, or leave it empty.";
  }
  const letters = [...name].filter((ch) => /\p{L}/u.test(ch));
  const key = name.toLowerCase().replace(/[^\p{L}\p{M}]/gu, "");
  const sameLetterOnly = letters.length > 1 && new Set(letters.map((l) => l.toLowerCase())).size === 1;

  if (letters.length < 2 || PLACEHOLDERS.has(key) || sameLetterOnly) {
    return "That does not look like a real name. Type the real name, or leave it empty.";
  }
  return null;
};

module.exports = { nameProblem, cleanName: clean };
