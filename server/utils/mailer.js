// Sends emails (for the forgot-password code).
//
// Real sending needs these settings on the server (Render):
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

const isMailConfigured = () =>
  Boolean(
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
      process.env.MAIL_DRIVER === "json"
  );

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
