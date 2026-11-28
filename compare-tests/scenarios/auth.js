const { PASSWORD, req, get, post, freshIp, login, onboard } = require("./helpers");
const { need, TEST_KEY, WEB_APP } = require("../lib/env");

const jwt = need("jsonwebtoken");
const EMAIL = "owner@example.test";
const NEW = "brand-new-pass-2";

const basics = {
  name: "basics and security",
  steps: [
    get("home", "/"),
    get("unknown address", "/api/nothing-here", { status: 404 }),
    get("no token", "/api/auth/me", { status: 401 }),
    get("not a Bearer token", "/api/auth/me", { headers: { authorization: "Basic abc" }, status: 401 }),
    get("broken token", "/api/auth/me", { as: "not.a.token", status: 401 }),
    get("token signed with another key", "/api/auth/me", { as: jwt.sign({ userId: "0123456789abcdef01234567" }, "another-key"), status: 401 }),
    get("expired token", "/api/auth/me", { as: jwt.sign({ userId: "0123456789abcdef01234567", exp: 1000 }, TEST_KEY), status: 401 }),
    get("token of an account that does not exist", "/api/auth/me", { as: jwt.sign({ userId: "0123456789abcdef01234567" }, TEST_KEY), status: 401 }),
    req("browser pre-check from the web app", "OPTIONS", "/api/auth/login", {
      headers: { "access-control-request-method": "POST", "access-control-request-headers": "content-type,authorization,x-dev-shop" },
      status: 204,
    }),
    req("browser pre-check from another site", "OPTIONS", "/api/auth/login", {
      headers: { origin: "http://evil.example.test", "access-control-request-method": "POST" },
      status: 200, // not allowed: no CORS headers, so the browser blocks it
    }),
    get("another site", "/", { headers: { origin: "http://evil.example.test" } }),
    get("web app", "/", { headers: { origin: WEB_APP } }),
    post("body that is not JSON", "/api/auth/login", undefined, { rawBody: '{"identifier":', status: 400 }),
    post("empty body", "/api/auth/login", undefined, { status: 400 }),
  ],
};

const signUp = {
  name: "sign-up and email confirmation",
  steps: [
    freshIp(),
    post("no name", "/api/auth/register", { email: EMAIL, password: PASSWORD }, { status: 400 }),
    post("bad email", "/api/auth/register", { name: "Asha", email: "nope", password: PASSWORD }, { status: 400 }),
    post("short password", "/api/auth/register", { name: "Asha", email: EMAIL, password: "short" }, { status: 400 }),
    post("long password", "/api/auth/register", { name: "Asha", email: EMAIL, password: "x".repeat(73) }, { status: 400 }),
    post("password is a number", "/api/auth/register", { name: "Asha", email: EMAIL, password: 123456789 }, { status: 400 }),
    post("register", "/api/auth/register", { name: "  Asha Owner ", email: " Owner@Example.TEST ", password: PASSWORD }, { status: 201, waitMail: true }),
    login("early", EMAIL, PASSWORD, { status: 403, name: "login before confirming" }),
    post("register again while unconfirmed (too soon for a code)", "/api/auth/register", { name: "Asha O", email: EMAIL, password: PASSWORD }, { status: 201 }),
    post("resend too soon", "/api/auth/resend-verification", { email: EMAIL }),
    post("resend, bad email", "/api/auth/resend-verification", { email: "x" }, { status: 400 }),
    post("resend, unknown email", "/api/auth/resend-verification", { email: "who@example.test" }),
    { db: (db) => db.collection("users").updateMany({}, { $set: { "emailCode.sentAt": new Date("2026-01-01") } }) },
    freshIp(),
    post("resend", "/api/auth/resend-verification", { email: EMAIL }, { waitMail: true }),
    post("verify wrong code", "/api/auth/verify-email", { email: EMAIL, code: "000000" }, { status: 400 }),
    post("verify code with letters", "/api/auth/verify-email", { email: EMAIL, code: "abc123" }, { status: 400 }),
    post("verify unknown email", "/api/auth/verify-email", { email: "who@example.test", code: "000000" }, { status: 400 }),
    { db: (db) => db.collection("users").updateMany({}, { $set: { "emailCode.attempts": 5 } }) },
    post("verify after too many tries", "/api/auth/verify-email", (c) => ({ email: EMAIL, code: c.code }), { status: 400 }),
    { db: (db) => db.collection("users").updateMany({}, { $unset: { emailCode: 1 } }) },
    freshIp(),
    post("new code", "/api/auth/resend-verification", { email: EMAIL }, { waitMail: true }),
    { db: (db) => db.collection("users").updateMany({}, { $set: { "emailCode.expiresAt": new Date("2026-01-01") } }) },
    post("verify expired code", "/api/auth/verify-email", (c) => ({ email: EMAIL, code: c.code }), { status: 400 }),
    { db: (db) => db.collection("users").updateMany({}, { $unset: { emailCode: 1 } }) },
    post("another code", "/api/auth/resend-verification", { email: EMAIL }, { waitMail: true }),
    post("verify", "/api/auth/verify-email", (c) => ({ email: " OWNER@example.test ", code: ` ${c.code} ` })),
    post("register when already registered", "/api/auth/register", { name: "Other", email: EMAIL, password: PASSWORD }, { status: 400 }),
    login("admin", EMAIL),
    login("caps", "OWNER@EXAMPLE.TEST"),
    post("login with the old field name", "/api/auth/login", { email: EMAIL, password: PASSWORD }),
    post("login without password", "/api/auth/login", { identifier: EMAIL }, { status: 400 }),
    login("bad", EMAIL, "wrong-password", { status: 401, name: "wrong password" }),
    login("bad", "who@example.test", PASSWORD, { status: 401, name: "unknown email" }),
    login("bad", "nobody", PASSWORD, { status: 401, name: "unknown username" }),
    get("who am I", "/api/auth/me", { as: "admin" }),
    // the live Node server cuts long passwords at 72 bytes when checking them
    login("long", EMAIL, "x".repeat(100), { status: 401, name: "very long wrong password" }),
  ],
};

const passwords = {
  name: "change, forgot and reset password, change email",
  steps: [
    ...onboard(),
    freshIp(),
    { sleep: 1100 },
    post("change: wrong current", "/api/auth/change-password", { currentPassword: "nope-nope", newPassword: NEW }, { as: "admin", status: 400 }),
    post("change: too short", "/api/auth/change-password", { currentPassword: PASSWORD, newPassword: "x" }, { as: "admin", status: 400 }),
    post("change: same", "/api/auth/change-password", { currentPassword: PASSWORD, newPassword: PASSWORD }, { as: "admin", status: 400 }),
    post("change password", "/api/auth/change-password", { currentPassword: PASSWORD, newPassword: NEW }, {
      as: "admin",
      save: (body, ctx) => {
        ctx.tokens.old = ctx.tokens.admin;
        ctx.tokens.admin = body.token;
      },
    }),
    get("old login stops working", "/api/auth/me", { as: "old", status: 401 }),
    get("new login works", "/api/auth/me", { as: "admin" }),

    post("forgot: bad email", "/api/auth/forgot-password", { email: "x" }, { status: 400 }),
    post("forgot: unknown email", "/api/auth/forgot-password", { email: "who@example.test" }),
    post("forgot", "/api/auth/forgot-password", { email: EMAIL }, { waitMail: true }),
    post("forgot again too soon", "/api/auth/forgot-password", { email: EMAIL }),
    post("reset: bad code shape", "/api/auth/reset-password", { email: EMAIL, code: "12", newPassword: NEW }, { status: 400 }),
    post("reset: short password", "/api/auth/reset-password", (c) => ({ email: EMAIL, code: c.code, newPassword: "x" }), { status: 400 }),
    post("reset: wrong code", "/api/auth/reset-password", { email: EMAIL, code: "000000", newPassword: "another-pass-3" }, { status: 400 }),
    post("reset: unknown email", "/api/auth/reset-password", { email: "who@example.test", code: "000000", newPassword: "another-pass-3" }, { status: 400 }),
    { sleep: 1100 },
    post("reset password", "/api/auth/reset-password", (c) => ({ email: EMAIL, code: c.code, newPassword: "another-pass-3" })),
    get("login from before the reset stops", "/api/auth/me", { as: "admin", status: 401 }),
    login("admin", EMAIL, "another-pass-3"),

    freshIp(),
    post("email change: bad", "/api/auth/change-email/request", { newEmail: "x", password: "another-pass-3" }, { as: "admin", status: 400 }),
    post("email change: wrong password", "/api/auth/change-email/request", { newEmail: "new@example.test", password: "nope" }, { as: "admin", status: 400 }),
    post("email change: same email", "/api/auth/change-email/request", { newEmail: EMAIL, password: "another-pass-3" }, { as: "admin", status: 400 }),
    post("email change: confirm with nothing asked", "/api/auth/change-email/confirm", { code: "000000" }, { as: "admin", status: 400 }),
    post("email change: ask", "/api/auth/change-email/request", { newEmail: "New@Example.test", password: "another-pass-3" }, { as: "admin", waitMail: true }),
    post("email change: ask again too soon", "/api/auth/change-email/request", { newEmail: "new@example.test", password: "another-pass-3" }, { as: "admin", status: 400 }),
    freshIp(),
    post("email change: wrong code", "/api/auth/change-email/confirm", { code: "000000" }, { as: "admin", status: 400 }),
    post("email change: confirm", "/api/auth/change-email/confirm", (c) => ({ code: c.code }), { as: "admin" }),
    login("admin", "new@example.test", "another-pass-3"),
  ],
};

const limits = {
  name: "rate limits",
  steps: [
    { ip: "10.200.0.1" },
    ...Array.from({ length: 10 }, (_, i) => login("bad", "limit@example.test", PASSWORD, { status: 401, name: `wrong login ${i + 1}` })),
    login("bad", "limit@example.test", PASSWORD, { status: 429, name: "login limit reached" }),
    { ip: "10.200.0.2" },
    ...Array.from({ length: 5 }, (_, i) => post(`forgot ${i + 1}`, "/api/auth/forgot-password", { email: "limit@example.test" })),
    post("forgot limit reached", "/api/auth/forgot-password", { email: "limit@example.test" }, { status: 429 }),
    { ip: "10.200.0.3" },
    ...Array.from({ length: 30 }, (_, i) => post(`track ${i + 1}`, "/api/orders/track", { orderId: "ORD-1", phone: "9876543210" })),
    post("tracking limit reached", "/api/orders/track", { orderId: "ORD-1", phone: "9876543210" }, { status: 429 }),
  ],
};

module.exports = [basics, signUp, passwords, limits];
