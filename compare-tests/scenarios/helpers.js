// Small builders for scenario steps. A step is one request sent to both
// servers. `path`, `body` and `headers` may be functions of the saved values
// (ids, tokens, emailed codes), which differ between the two servers.
let ipCount = 0;

const PASSWORD = "pass-word-1";

const req = (name, method, path, extra = {}) => ({ name: `${name} [${method} ${typeof path === "string" ? path : "…"}]`, method, path, ...extra });
const get = (name, path, extra) => req(name, "GET", path, extra);
const post = (name, path, body, extra = {}) => req(name, "POST", path, { body, ...extra });
const put = (name, path, body, extra = {}) => req(name, "PUT", path, { body, ...extra });
const del = (name, path, extra) => req(name, "DELETE", path, extra);

// a different internet address, so the rate limits of one test do not hit the next
const freshIp = () => {
  ipCount += 1;
  return { ip: `10.${Math.floor(ipCount / 250) + 1}.${ipCount % 250}.1` };
};

// the calendar day in India, `offset` days from today
const day = (offset = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + offset * 86400000));

const login = (who, identifier, password = PASSWORD, extra = {}) =>
  post(`login ${who}`, "/api/auth/login", { identifier, password }, {
    save: (body, ctx) => {
      ctx.tokens[who] = body.token;
      ctx[`${who}Id`] = body.user._id;
    },
    ...extra,
  });

// a shop owner from nothing: sign up, confirm the email, log in, make the shop
const onboard = (who = "admin", email = "owner@example.test", shop = "Asha Prints") => [
  freshIp(),
  post(`register ${who}`, "/api/auth/register", { name: `Asha ${who}`, email, password: PASSWORD }, { status: 201, waitMail: true }),
  post(`verify ${who}`, "/api/auth/verify-email", (ctx) => ({ email, code: ctx.code })),
  login(who, email),
  post(`setup shop ${who}`, "/api/shop/setup", { name: shop, phone: "9876543210", category: "Printing", address: "12 Main Road" }, {
    as: who,
    status: 201,
    save: (body, ctx) => {
      ctx[`${who}Shop`] = body.shop._id;
    },
  }),
];

const addStaff = (who, username, permissions, admin = "admin") => [
  post(`add staff ${username}`, "/api/staff", { name: `Ravi ${username.replace(/\W|\d/g, "")}`, username, password: PASSWORD, permissions }, {
    as: admin,
    status: 201,
    save: (body, ctx) => {
      ctx[`${who}Staff`] = body.staff._id;
    },
  }),
  login(who, username),
];

module.exports = { PASSWORD, req, get, post, put, del, freshIp, day, login, onboard, addStaff };
