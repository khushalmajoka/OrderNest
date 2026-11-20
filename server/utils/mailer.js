// Sends emails (sign-up, forgot-password and change-email codes).
//
// TWO ways, the first one that is set up is used:
//
// 1) A web service over HTTPS (Brevo). Use this on Render's free plan: it blocks
//    the normal mail ports (25, 465, 587), but web traffic works.
//      BREVO_API_KEY   the API key from Brevo (SMTP & API > API keys)
//      MAIL_FROM       e.g. OrderNest <orderNest.support@gmail.com>; this address
//                      must be confirmed as a "sender" in Brevo
//
// 2) Normal mail (SMTP), for a computer or a paid host that allows it.
//
// Real SMTP sending needs these settings on the server:
//   SMTP_HOST   e.g. smtp.gmail.com
//   SMTP_PORT   e.g. 587  (465 uses a secure connection from the start)
//   SMTP_USER   the sender's login (for Gmail: the Gmail address)
//   SMTP_PASS   the password (for Gmail: an "app password", not the real one)
//   MAIL_FROM   optional, e.g. OrderNest <you@gmail.com>
// Without them nothing is sent and isMailConfigured() is false.
//
// For tests only: MAIL_DRIVER=json keeps the email in memory (lastMessage).
const nodemailer = require("nodemailer");

let transport;
let lastMessage = null;

const BREVO_URL = () => process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email";

const isMailConfigured = () =>
  Boolean(
    process.env.BREVO_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
      process.env.MAIL_DRIVER === "json"
  );

// "OrderNest <me@gmail.com>" or "me@gmail.com" -> { name, email }
const parseSender = (text) => {
  const value = String(text || "").trim();
  const match = value.match(/^(.*?)\s*<([^<>\s]+)>$/);
  if (match) return { name: match[1].replace(/^"|"$/g, "").trim() || undefined, email: match[2] };
  return { email: value };
};

// Sends through Brevo's web API (plain HTTPS). A refusal is turned into an
// error whose message says what Brevo answered (it shows in the server log).
const sendWithBrevo = async ({ to, subject, text }) => {
  const sender = parseSender(process.env.MAIL_FROM || process.env.SMTP_USER);
  if (!sender.email) {
    throw new Error("MAIL_FROM is needed with BREVO_API_KEY (the confirmed sender address)");
  }
  if (typeof fetch !== "function") throw new Error("This Node version cannot make web requests");

  const res = await fetch(BREVO_URL(), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: sender.email, ...(sender.name ? { name: sender.name } : {}) },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      // no details
    }
    throw new Error(`Brevo refused the email (${res.status}) ${detail}`.trim());
  }
  return res.json().catch(() => ({}));
};

const getTransport = () => {
  if (transport) return transport;

  if (process.env.MAIL_DRIVER === "json") {
    transport = nodemailer.createTransport({ jsonTransport: true });
  } else {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
};

const sendMail = async ({ to, subject, text }) => {
  if (!isMailConfigured()) {
    const err = new Error("Email is not set up");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  if (process.env.MAIL_DRIVER !== "json" && process.env.BREVO_API_KEY) {
    return sendWithBrevo({ to, subject, text });
  }

  const info = await getTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || "OrderNest <no-reply@ordernest.local>",
    to,
    subject,
    text,
  });
  if (process.env.MAIL_DRIVER === "json") lastMessage = JSON.parse(info.message);
  return info;
};

module.exports = {
  sendMail,
  isMailConfigured,
  getLastMessage: () => lastMessage, // tests only
};
