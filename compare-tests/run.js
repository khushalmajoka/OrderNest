// One command: node compare-tests/run.js [--b java] [--sabotage]
//
// Runs every scenario against two servers, each with its own empty database
// on this computer, and lists every difference.
//   --a node|java   first server  (default node)
//   --b node|java   second server (default node)
//   --sabotage      changes the second database on purpose: the run MUST then
//                   report differences (proves the tool can see them)
const fs = require("fs");
const path = require("path");
const env = require("./lib/env");
const { runStep, value } = require("./lib/runner");
const { makeRegistry } = require("./lib/normalize");
const { readWhenQuiet } = require("./lib/snapshot");
const scenarios = require("./scenarios");

const option = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

// every route of the Node server, to show what no scenario reached
const allRoutes = () => {
  const index = fs.readFileSync(path.join(env.SERVER, "index.js"), "utf8");
  const mounts = [
    ["authRoutes", "/api/auth"],
    ["shopRoutes", "/api/shop"],
    ["orderRoutes", "/api/orders"],
    ["staffRoutes", "/api/staff"],
    ["activityRoutes", "/api/activity"],
    ["usageRoutes", "/api/usage"],
    ["productRoutes", "/api/products"],
    ["developerRoutes", "/api/developer"],
  ];
  if (!index.includes("/api/catalog-settings")) throw new Error("index.js changed: update the route list");
  const routes = [];
  const scan = (file, router, base) => {
    const code = fs.readFileSync(path.join(env.SERVER, "routes", `${file}.js`), "utf8");
    const re = new RegExp(`\\b${router}\\.(get|post|put|delete)\\(\\s*["']([^"']+)["']`, "g");
    for (const m of code.matchAll(re)) routes.push({ method: m[1].toUpperCase(), path: (base + m[2]).replace(/\/$/, "") });
  };
  mounts.forEach(([file, base]) => scan(file, "router", base));
  scan("catalogRoutes", "publicRouter", "/api/catalog");
  scan("catalogRoutes", "settingsRouter", "/api/catalog-settings");
  return routes;
};

const matches = (route, hit) => {
  if (route.method !== hit.method) return false;
  const clean = hit.path.split("?")[0].replace(/\/$/, "");
  return new RegExp(`^${route.path.replace(/:\w+/g, "[^/]+")}$`).test(clean);
};

const main = async () => {
  const kinds = { a: option("a", "node"), b: option("b", "node") };
  const sabotage = process.argv.includes("--sabotage");
  let mongo, mail;
  const servers = [];
  const report = { steps: 0, diffs: [], wrong: [], hits: [] };

  try {
    console.log("Starting a throwaway database, mail catcher and two servers...");
    mongo = await env.startMongo();
    mail = await env.startMail();
    const sides = [];
    for (const side of ["a", "b"]) {
      await env.prepareIndexes(side);
      const server = await env.startServer(side, kinds[side]);
      servers.push(server);
      const db = mongo.db(`cmp_${side}`);
      sides.push({ name: side, server, db, mail: mail.box[side], state: await readWhenQuiet(db), ip: "10.0.0.1" });
    }
    console.log(`A = ${kinds.a}, B = ${kinds.b}`);

    for (const scenario of scenarios) {
      const before = { d: report.diffs.length, w: report.wrong.length, s: report.steps };
      // each scenario starts from empty databases
      for (const s of sides) {
        for (const c of await s.db.collections()) await c.deleteMany({});
        s.state = await readWhenQuiet(s.db);
        s.label = makeRegistry();
        s.ctx = { tokens: {} };
        s.mail.length = 0;
        s.lastPath = (step) => value(step.path, s.ctx);
      }
      let n = 0;
      for (const step of scenario.steps) {
        n += 1;
        if (sabotage && n === 12) {
          await sides[1].db.collection("users").updateMany({}, { $set: { sabotage: true } });
        }
        try {
          await runStep(step, sides, report);
        } catch (err) {
          report.wrong.push(`${scenario.name} / ${step.name || `step ${n}`}: could not run: ${err.message}`);
          break;
        }
      }
      console.log(
        `  ${scenario.name}: ${report.steps - before.s} requests, ${report.diffs.length - before.d} different, ${report.wrong.length - before.w} unexpected`
      );
    }
  } finally {
    servers.forEach((s) => s.child.kill());
    mail?.server.close();
    await env.stopMongo(mongo);
  }

  const routes = allRoutes();
  const reached = routes.filter((r) => report.hits.some((h) => h.status < 400 && matches(r, h)));
  const missed = routes.filter((r) => !reached.includes(r));

  console.log(`\nRequests compared: ${report.steps}`);
  console.log(`Endpoints with a successful request: ${reached.length} of ${routes.length}`);
  missed.forEach((r) => console.log(`  not reached: ${r.method} ${r.path}`));
  if (report.wrong.length) {
    console.log(`\nScenario problems (${report.wrong.length}):`);
    report.wrong.slice(0, 25).forEach((w) => console.log(`  ${w}`));
  }
  console.log(`\nDIFFERENCES: ${report.diffs.length}`);
  report.diffs.slice(0, 15).forEach((d) => {
    console.log(`  ${d.step}`);
    d.diff.forEach((line) => console.log(`      ${line}`));
  });
  process.exitCode = report.diffs.length || report.wrong.length || missed.length ? 1 : 0;
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
