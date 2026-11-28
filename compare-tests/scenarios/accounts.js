// Sign-up, login, passwords and email codes, with accounts written straight
// into the database, including ones as older versions of the app saved them.
// (auth.js tests the same pages after real use; this one needs no other
// endpoint, and it holds the awkward cases.)
const crypto = require("crypto");
const { get, post, freshIp } = require("./helpers");
const { need, TEST_KEY, DEVELOPER } = require("../lib/env");

const jwt = need("jsonwebtoken");
const bcrypt = need("bcryptjs");
const { ObjectId } = need("mongodb");

const id = (n) => `cccccccccccccccccccccc${String(n).padStart(2, "0")}`;
const [OLD, FULL, STAFF, OFF, WAITING, HINDI, DEV, OTHER, SHOP] = [1, 2, 3, 4, 5, 6, 7, 8, 20].map(id);
const NOW = Math.floor(Date.now() / 1000);
const token = (userId) => jwt.sign({ userId, iat: NOW - 100 }, TEST_KEY, { expiresIn: "7d" });

const PASS = "pass-word-1";
const NEXT = "brand-new-pass-2";
// 3 bytes a letter: far more than the 72 bytes bcrypt uses
const LONG = "मेरा-बहुत-लंबा-पासवर्ड-जो-बहत्तर-बाइट-से-बड़ा-है";
const HASH = bcrypt.hashSync(PASS, 10);
const oid = (hex) => new ObjectId(hex);

const code = (userId, kind, value, extra = {}) => ({
  hash: crypto.createHmac("sha256", TEST_KEY).update(`${userId}:${kind}:${value}`).digest("hex"),
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  attempts: 0,
  sentAt: new Date("2026-01-01"),
  kind,
  ...extra,
});

const full = (_id, extra) => ({
  _id: oid(_id),
  password: HASH,
  role: "admin",
  permissions: { createOrders: false, manageProducts: false, editOrders: false, deleteOrders: false, shareSlip: false, viewAmounts: false },
  active: true,
  passwordChange: { status: "none" },
  resetCode: { attempts: 0 },
  emailCode: { attempts: 0 },
  emailVerified: true,
  __v: 0,
  ...extra,
});

const people = {
  db: async (db) => {
    await db.collection("users").insertMany([
      // as the first version of the app saved an account
      { _id: oid(OLD), name: "Old Owner", email: "Old.Owner@Example.TEST", password: HASH, shopId: oid(SHOP) },
      full(FULL, { name: "Asha", email: "asha@example.test", shopId: oid(SHOP) }),
      full(STAFF, { name: "Ravi", email: "ravi@staff.invalid", username: "ravi", role: "staff", shopId: oid(SHOP) }),
      full(OFF, { name: "Off", email: "off@staff.invalid", username: "off", role: "staff", active: false }),
      { _id: oid(WAITING), name: "Waiting", email: "waiting@example.test", password: HASH, emailVerified: false, emailCode: code(WAITING, "verify", "111111") },
      full(HINDI, { name: "आशा", email: "hindi@example.test", password: bcrypt.hashSync(LONG, 10) }),
      full(DEV, { name: "Dev", email: DEVELOPER }),
      full(OTHER, { name: "Other", email: "Taken@Example.test" }),
    ]);
  },
};

const set = (userId, update) => ({ db: (db) => db.collection("users").updateOne({ _id: oid(userId) }, update) });
const send = (name, path, body, status = 200, extra = {}) => post(name, `/api/auth/${path}`, body, { status, ...extra });
const login = (name, identifier, password = PASS, status = 200, extra = {}) => send(name, "login", { identifier, password }, status, extra);
const me = (name, bearer, status = 200) => get(name, "/api/auth/me", { as: bearer, status });

const logins = {
  name: "seeded accounts: login",
  steps: [
    people,
    freshIp(),
    login("old account, any capitals", "OLD.OWNER@example.test"),
    login("spaces around the email", "  asha@example.test  "),
    send("the old field name", "login", { email: "asha@example.test", password: PASS }),
    send("identifier null, email used", "login", { identifier: null, email: "asha@example.test", password: PASS }),
    send("identifier empty is not replaced", "login", { identifier: "", email: "asha@example.test", password: PASS }, 400),
    send("identifier is a number", "login", { identifier: 5, password: PASS }, 400),
    send("password is a number", "login", { identifier: "asha@example.test", password: 12345678 }, 400),
    send("password empty", "login", { identifier: "asha@example.test", password: "" }, 400),
    send("a list instead of an object", "login", ["asha@example.test"], 400),
    send("nothing sent", "login", undefined, 400),
    freshIp(),
    login("staff by username, any capitals", " RAVI "),
    login("staff by their made-up email", "ravi@staff.invalid"),
    login("turned off, wrong password", "off", "wrong-password", 401),
    login("turned off", "off", PASS, 403),
    login("not confirmed, wrong password", "waiting@example.test", "wrong-password", 401),
    login("not confirmed", "waiting@example.test", PASS, 403),
    login("the developer", DEVELOPER.toUpperCase()),
    login("no such email", "who@example.test", PASS, 401),
    login("no such username", "who", PASS, 401),
    freshIp(),
    login("long Hindi password", "hindi@example.test", LONG),
    login("only the first 72 bytes count", "hindi@example.test", `${LONG}-and-more`),
    login("different at the start", "hindi@example.test", `x${LONG}`, 401),
    login("a long password that is wrong", "asha@example.test", "x".repeat(200), 401),

    // 10 wrong tries from one address, then refused, even with the right password
    freshIp(),
    ...Array.from({ length: 10 }, (_, i) => login(`wrong ${i + 1}`, "asha@example.test", "wrong-password", 401)),
    login("address blocked", "asha@example.test", PASS, 429),
    freshIp(),
    login("another address still works", "asha@example.test"),
    // 30 wrong tries for one account from many addresses (one was made above)
    ...Array.from({ length: 29 }, (_, i) => [
      ...(i % 5 === 0 ? [freshIp()] : []),
      login(`guess ${i + 1}`, "hindi@example.test", "wrong-password", 401),
    ]).flat(),
    freshIp(),
    login("account blocked", " Hindi@Example.test ", LONG, 429),
    login("another account still works", "asha@example.test"),
  ],
};

const signUps = {
  name: "seeded accounts: sign-up and confirmation",
  steps: [
    people,
    freshIp(),
    send("old account counts as registered", "register", { name: "X", email: "old.owner@example.test", password: PASS }, 400),
    send("registered, other capitals", "register", { name: "X", email: "ASHA@example.test", password: PASS }, 400),
    send("name only spaces", "register", { name: "    ", email: "n@example.test", password: PASS }, 400),
    send("name is a number", "register", { name: 7, email: "n@example.test", password: PASS }, 400),
    send("email with a space inside", "register", { name: "N", email: "a b@example.test", password: PASS }, 400),
    send("email without a dot", "register", { name: "N", email: "a@example", password: PASS }, 400),
    send("7 characters", "register", { name: "N", email: "n@example.test", password: "1234567" }, 400),
    send("new, Hindi name and long password", "register", { name: "  नया दुकानदार ", email: " New@Example.TEST ", password: LONG }, 201, { waitMail: true }),
    send("verify the new one", "verify-email", (c) => ({ email: "new@example.test", code: c.code })),
    login("the new one logs in", "new@example.test", LONG),

    send("start again before confirming (new code)", "register", { name: "Second try", email: "WAITING@example.test", password: NEXT }, 201, { waitMail: true }),
    send("and again at once (no second code)", "register", { name: "Third try", email: "waiting@example.test", password: NEXT }, 201),
    send("the earlier code is dead", "verify-email", { email: "waiting@example.test", code: "111111" }, 400),
    send("the new code", "verify-email", (c) => ({ email: "waiting@example.test", code: ` ${c.code} ` })),
    login("logs in with the later password", "waiting@example.test", NEXT),

    set(OLD, { $set: { emailVerified: false, emailCode: code(OLD, "verify", "222222") } }),
    freshIp(),
    send("verify: not a text", "verify-email", { email: "old.owner@example.test", code: 222222 }, 400),
    send("verify: 5 digits", "verify-email", { email: "old.owner@example.test", code: "22222" }, 400),
    send("verify: no email", "verify-email", { code: "222222" }, 400),
    ...Array.from({ length: 5 }, (_, i) => send(`verify: wrong try ${i + 1}`, "verify-email", { email: "old.owner@example.test", code: "000000" }, 400)),
    send("verify: right code, one try too many", "verify-email", { email: "old.owner@example.test", code: "222222" }, 400),
    freshIp(),
    send("verify: the code is gone", "verify-email", { email: "old.owner@example.test", code: "222222" }, 400),
    set(OLD, { $set: { emailCode: code(OLD, "verify", "222222", { expiresAt: new Date("2026-01-01") }) } }),
    send("verify: expired", "verify-email", { email: "old.owner@example.test", code: "222222" }, 400),
    set(OLD, { $set: { emailCode: code(OLD, "change", "222222", { newEmail: "z@example.test" }) } }),
    send("verify: a code made for something else", "verify-email", { email: "old.owner@example.test", code: "222222" }, 400),
    set(OLD, { $set: { emailCode: code(OLD, "verify", "222222") } }),
    send("verify: old account", "verify-email", { email: "OLD.OWNER@example.test", code: "222222" }),

    freshIp(),
    set(WAITING, { $set: { emailVerified: false }, $unset: { emailCode: 1 } }),
    send("resend", "resend-verification", { email: "Waiting@example.test" }, 200, { waitMail: true }),
    send("resend at once (nothing sent)", "resend-verification", { email: "waiting@example.test" }),
    send("resend: already confirmed", "resend-verification", { email: "asha@example.test" }),
    send("resend: unknown", "resend-verification", { email: "who@example.test" }),
    send("resend: not an email", "resend-verification", { email: 5 }, 400),
    send("resend: sixth request", "resend-verification", { email: "who@example.test" }, 429),
    send("the forgot-password limit is the same one", "forgot-password", { email: "who@example.test" }, 429),

    freshIp(),
    ...Array.from({ length: 20 }, (_, i) => send(`sign-up ${i + 1}`, "register", {}, 400)),
    send("too many sign-ups", "register", { name: "N", email: "n@example.test", password: PASS }, 429),
  ],
};

const forgotten = {
  name: "seeded accounts: forgot and reset password",
  steps: [
    people,
    freshIp(),
    send("forgot: old account", "forgot-password", { email: "OLD.owner@example.test" }, 200, { waitMail: true }),
    send("forgot: again at once", "forgot-password", { email: "old.owner@example.test" }),
    send("forgot: staff have no email", "forgot-password", { email: "ravi@staff.invalid" }),
    send("forgot: not confirmed", "forgot-password", { email: "waiting@example.test" }),
    send("forgot: unknown", "forgot-password", { email: "who@example.test" }),
    freshIp(),
    send("forgot: not an email", "forgot-password", {}, 400),

    send("reset: no code", "reset-password", { email: "old.owner@example.test", newPassword: NEXT }, 400),
    send("reset: code as a number", "reset-password", { email: "old.owner@example.test", code: 123456, newPassword: NEXT }, 400),
    send("reset: short password, right code", "reset-password", (c) => ({ email: "old.owner@example.test", code: c.code, newPassword: "x" }), 400),
    send("reset: staff", "reset-password", { email: "ravi@staff.invalid", code: "123456", newPassword: NEXT }, 400),
    send("reset: nothing asked", "reset-password", { email: "asha@example.test", code: "123456", newPassword: NEXT }, 400),
    send("reset: wrong code", "reset-password", { email: "old.owner@example.test", code: "000000", newPassword: NEXT }, 400),
    { sleep: 1100 },
    send("reset: old account", "reset-password", (c) => ({ email: "old.owner@example.test", code: ` ${c.code} `, newPassword: LONG })),
    me("the earlier login stops", token(OLD), 401),
    login("new password", "old.owner@example.test", LONG),
    send("the code works only once", "reset-password", (c) => ({ email: "old.owner@example.test", code: c.code, newPassword: NEXT }), 400),

    freshIp(),
    set(FULL, { $set: { resetCode: code(FULL, "reset", "333333", { attempts: 5 }) } }),
    send("reset: too many tries", "reset-password", { email: "asha@example.test", code: "333333", newPassword: NEXT }, 400),
    set(FULL, { $set: { resetCode: code(FULL, "reset", "333333", { expiresAt: new Date("2026-01-01") }) } }),
    send("reset: expired", "reset-password", { email: "asha@example.test", code: "333333", newPassword: NEXT }, 400),
    set(FULL, { $set: { resetCode: code(FULL, "reset", "333333", { attempts: 4 }) } }),
    send("reset: last try", "reset-password", { email: "asha@example.test", code: "333333", newPassword: NEXT }),
    ...Array.from({ length: 7 }, (_, i) => send(`reset: more ${i + 1}`, "reset-password", {}, 400)),
    send("reset: too many requests", "reset-password", {}, 429),
  ],
};

const changePassword = (name, bearer, body, status = 200, extra = {}) => send(name, "change-password", body, status, { as: bearer, ...extra });
const ask = (name, bearer, body, status = 200, extra = {}) => send(name, "change-email/request", body, status, { as: bearer, ...extra });
const confirm = (name, bearer, body, status = 200) => send(name, "change-email/confirm", body, status, { as: bearer });

const changes = {
  name: "seeded accounts: change password and email",
  steps: [
    people,
    freshIp(),
    changePassword("no login", null, {}, 401),
    changePassword("staff refused", token(STAFF), {}, 403),
    changePassword("no current password", token(OLD), { newPassword: NEXT }, 400),
    changePassword("wrong current", token(OLD), { currentPassword: "nope-nope", newPassword: NEXT }, 400),
    changePassword("new one too long", token(OLD), { currentPassword: PASS, newPassword: "x".repeat(73) }, 400),
    changePassword("same again", token(OLD), { currentPassword: PASS, newPassword: PASS }, 400),
    { sleep: 1100 },
    changePassword("old account changes it", token(OLD), { currentPassword: PASS, newPassword: LONG }, 200, {
      save: (body, ctx) => {
        ctx.tokens.fresh = body.token;
      },
    }),
    me("the earlier login stops", token(OLD), 401),
    me("the new login works", "fresh"),
    ...Array.from({ length: 6 }, (_, i) => changePassword(`wrong ${i + 1}`, "fresh", { currentPassword: "nope-nope", newPassword: NEXT }, 400)),
    changePassword("blocked after 10 wrong tries", "fresh", { currentPassword: LONG, newPassword: NEXT }, 429),

    freshIp(),
    confirm("nothing asked, old-style account", "fresh", { code: "000000" }, 400),
    ask("staff refused", token(STAFF), {}, 403),
    ask("not an email", token(FULL), { newEmail: "x", password: PASS }, 400),
    ask("no password", token(FULL), { newEmail: "moved@example.test" }, 400),
    ask("same email, other capitals", token(FULL), { newEmail: "ASHA@example.test", password: PASS }, 400),
    freshIp(),
    ask("used by another, other capitals", token(FULL), { newEmail: "taken@example.test", password: PASS }, 400),
    ask("ask", token(FULL), { newEmail: " Moved@Example.test ", password: PASS }, 200, { waitMail: true }),
    ask("ask again at once", token(FULL), { newEmail: "moved@example.test", password: PASS }, 400),
    confirm("wrong code", token(FULL), { code: "000000" }, 400),
    confirm("code not a text", token(FULL), { code: 5 }, 400),
    set(OTHER, { $set: { email: "moved@example.test" } }),
    send("taken in the meantime", "change-email/confirm", (c) => ({ code: c.code }), 400, { as: token(FULL) }),
    set(OTHER, { $set: { email: "taken@example.test" } }),
    send("confirm", "change-email/confirm", (c) => ({ code: c.code }), 200, { as: token(FULL) }),
    login("with the new email", "moved@example.test"),
    login("the old email is gone", "asha@example.test", PASS, 401),

    freshIp(),
    set(FULL, { $set: { emailCode: code(FULL, "verify", "444444", { newEmail: "y@example.test" }) } }),
    confirm("a code made for something else", token(FULL), { code: "444444" }, 400),
    set(FULL, { $set: { emailCode: code(FULL, "change", "444444", { newEmail: "y@example.test", attempts: 5 }) } }),
    confirm("too many tries", token(FULL), { code: "444444" }, 400),
  ],
};

module.exports = [logins, signUps, forgotten, changes];
