// Starts everything the comparison needs, all on this computer:
// a throwaway MongoDB (Docker), a fake mail service, and the two servers.
// Nothing here can reach a real database: the addresses are fixed to 127.0.0.1.
const { spawn, execFileSync } = require("child_process");
const { createRequire } = require("module");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SERVER = path.join(ROOT, "server");
const need = createRequire(path.join(SERVER, "package.json"));

const MONGO_PORT = 27099;
const MAIL_PORT = 5103;
const CONTAINER = "ordernest-compare-db";
const mongoUri = (side) => `mongodb://127.0.0.1:${MONGO_PORT}/cmp_${side}`;

// Test values only. The key has the same length as the live one (16), so the
// Java token library is tried with a short key too.
const TEST_KEY = "compare-test-key";
const DEVELOPER = "dev@example.test";
const WEB_APP = "http://app.example.test";

const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const startMongo = async () => {
  try {
    docker("rm", "-f", "-v", CONTAINER);
  } catch {
    // was not there
  }
  docker("run", "-d", "--rm", "--name", CONTAINER, "-p", `127.0.0.1:${MONGO_PORT}:27017`, "mongo:8.0");
  const { MongoClient } = need("mongodb");
  const client = new MongoClient(mongoUri("a"), { serverSelectionTimeoutMS: 30000 });
  await client.connect();
  await client.db().command({ ping: 1 });
  return client;
};

const stopMongo = async (client) => {
  await client?.close();
  try {
    docker("rm", "-f", "-v", CONTAINER);
  } catch {
    // already gone
  }
};

// Both databases get the indexes the live database has (made by the Node
// models). The Java server must never create indexes itself.
const prepareIndexes = async (side) => {
  const mongoose = need("mongoose");
  await mongoose.connect(mongoUri(side));
  for (const name of ["User", "Shop", "Order", "Product", "ProductFamily", "Category", "ProductImage", "Activity", "UsageCount"]) {
    const model = require(path.join(SERVER, "models", `${name}.js`));
    await model.createCollection();
    await model.createIndexes();
  }
  await mongoose.disconnect();
};

// Takes the place of Brevo: keeps each email per server.
const startMail = () => {
  const box = { a: [], b: [] };
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const side = req.url.slice(1);
      if (box[side]) box[side].push(JSON.parse(body));
      res.writeHead(201, { "content-type": "application/json" });
      res.end('{"messageId":"test"}');
    });
  });
  return new Promise((resolve) => server.listen(MAIL_PORT, "127.0.0.1", () => resolve({ box, server })));
};

const LAUNCHERS = {
  node: () => ({ cmd: process.execPath, args: [path.join(SERVER, "index.js")] }),
  java: () => ({ cmd: "java", args: ["-jar", path.join(ROOT, "server-java", "target", "app.jar")] }),
};

const startServer = async (side, kind) => {
  const port = side === "a" ? 5101 : 5102;
  // "node:/some/folder" runs another copy of the Node server
  const { cmd, args } = kind.startsWith("node:") ? { cmd: process.execPath, args: [path.join(kind.slice(5), "index.js")] } : LAUNCHERS[kind]();
  // an empty folder as the working directory, so no .env file is ever read
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ordernest-compare-"));
  const logFile = path.join(cwd, `server-${side}.log`);
  const log = fs.openSync(logFile, "w");
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    PORT: String(port),
    MONGO_URI: mongoUri(side),
    JWT_SECRET: TEST_KEY,
    BREVO_API_KEY: "test-only",
    BREVO_API_URL: `http://127.0.0.1:${MAIL_PORT}/${side}`,
    MAIL_FROM: "OrderNest <noreply@example.test>",
    DEVELOPER_EMAILS: DEVELOPER,
    CORS_ORIGINS: WEB_APP,
  };
  const child = spawn(cmd, args, { cwd, env, stdio: ["ignore", log, log] });
  const base = `http://127.0.0.1:${port}`;
  const started = Date.now();
  while (Date.now() - started < 90000) {
    if (child.exitCode !== null) break;
    try {
      const res = await fetch(`${base}/`);
      if (res.status < 500) return { side, kind, base, child, logFile };
    } catch {
      // not listening yet
    }
    await sleep(200);
  }
  child.kill();
  throw new Error(`Server ${side} (${kind}) did not start. Log:\n${fs.readFileSync(logFile, "utf8").slice(-2000)}`);
};

module.exports = { ROOT, SERVER, need, mongoUri, startMongo, stopMongo, prepareIndexes, startMail, startServer, sleep, TEST_KEY, DEVELOPER, WEB_APP };
