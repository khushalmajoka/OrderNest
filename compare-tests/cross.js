// Node and Java on ONE database, as they are while the backend moves: what one
// server makes (accounts, logins, password fingerprints, emailed codes) must
// work on the other. Everything is on this computer with a throwaway database.
//
//   node compare-tests/cross.js     (build Java first: cd server-java && ./mvnw package)
const env = require("./lib/env");

const jwt = env.need("jsonwebtoken");
// 3 bytes a letter: far more than the 72 bytes bcrypt uses
const LONG = "मेरा-बहुत-लंबा-पासवर्ड-जो-बहत्तर-बाइट-से-बड़ा-है";

let pass = 0;
let fail = 0;
const ok = (cond, name, extra) => {
  if (cond) return void pass++;
  fail++;
  console.log("FAIL:", name, extra ?? "");
};

const main = async () => {
  let mongo;
  let mail;
  const servers = [];
  try {
    mongo = await env.startMongo();
    await env.prepareIndexes("a");
    mail = await env.startMail();
    // both use database "a"
    const node = await env.startServer("a", "node");
    const java = await env.startServer("a", "java", 5102);
    servers.push(node, java);
    const db = mongo.db("cmp_a");

    let address = 0;
    const call = async (server, method, path, body, token) => {
      const res = await fetch(server.base + path, {
        method,
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": `10.9.0.${++address}`,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: await res.json().catch(() => null) };
    };
    const lastCode = async (before) => {
      for (let i = 0; i < 100 && mail.box.a.length === before; i++) await env.sleep(50);
      return mail.box.a.at(-1)?.textContent.match(/\b\d{6}\b/)?.[0];
    };
    const login = (server, identifier, password) => call(server, "POST", "/api/auth/login", { identifier, password });

    for (const [from, to, label] of [[node, java, "Node to Java"], [java, node, "Java to Node"]]) {
      const email = `${label.replace(/\W/g, "").toLowerCase()}@example.test`;

      // sign up on one, confirm on the other with the emailed code
      let before = mail.box.a.length;
      const made = await call(from, "POST", "/api/auth/register", { name: "Asha", email, password: LONG });
      ok(made.status === 201, `${label}: sign up`, made.status);
      let code = await lastCode(before);
      ok((await call(to, "POST", "/api/auth/verify-email", { email, code })).status === 200, `${label}: confirm code on the other server`);

      // the password and the login token work on both
      const there = await login(to, email, LONG);
      ok(there.status === 200, `${label}: long Hindi password works on the other server`, there.status);
      const here = await login(from, email, LONG);
      for (const [server, token] of [[from, there.data.token], [to, here.data.token]]) {
        ok((await call(server, "GET", "/api/auth/me", null, token)).data?.email === email, `${label}: a login from one server works on the other`);
      }
      const [a, b] = [jwt.decode(here.data.token), jwt.decode(there.data.token)];
      ok(a.exp - a.iat === b.exp - b.iat && Object.keys(a).sort().join() === Object.keys(b).sort().join(), `${label}: the same kind of token`);

      // forgot password: code from one, used on the other
      before = mail.box.a.length;
      ok((await call(from, "POST", "/api/auth/forgot-password", { email })).status === 200, `${label}: ask for a code`);
      code = await lastCode(before);
      await env.sleep(1100); // tokens are dated in whole seconds
      ok((await call(to, "POST", "/api/auth/reset-password", { email, code, newPassword: "next-password-2" })).status === 200, `${label}: reset on the other server`);
      ok((await login(from, email, "next-password-2")).status === 200, `${label}: the new password works back on the first`);
      for (const server of [from, to]) {
        ok((await call(server, "GET", "/api/auth/me", null, here.data.token)).status === 401, `${label}: the old login ended on both`);
      }

      // change password on one, then the fresh token on the other
      const now = (await login(from, email, "next-password-2")).data.token;
      await env.sleep(1100);
      const changed = await call(from, "POST", "/api/auth/change-password", { currentPassword: "next-password-2", newPassword: "third-password-3" }, now);
      ok(changed.status === 200, `${label}: change password`, changed.status);
      ok((await call(to, "GET", "/api/auth/me", null, changed.data.token)).status === 200, `${label}: the fresh login works on the other server`);
      ok((await call(to, "GET", "/api/auth/me", null, now)).status === 401, `${label}: the replaced login ended there too`);

      // new email: asked on one, confirmed on the other
      before = mail.box.a.length;
      const moved = `moved.${email}`;
      ok((await call(from, "POST", "/api/auth/change-email/request", { newEmail: moved, password: "third-password-3" }, changed.data.token)).status === 200, `${label}: ask to change email`);
      code = await lastCode(before);
      ok((await call(to, "POST", "/api/auth/change-email/confirm", { code }, changed.data.token)).status === 200, `${label}: confirm email on the other server`);
      ok((await login(from, moved, "third-password-3")).status === 200, `${label}: log in with the new email`);
    }

    // both made accounts of the same shape
    const shapes = (await db.collection("users").find().toArray()).map((u) => Object.keys(u).sort().join());
    ok(shapes.length === 2 && shapes[0] === shapes[1], "accounts made by Node and by Java have the same fields", JSON.stringify(shapes));
  } finally {
    servers.forEach((s) => s.child.kill());
    mail?.server.close();
    await env.stopMongo(mongo);
  }
  console.log(`Across the two servers: ${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
