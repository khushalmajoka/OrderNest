# OrderNest

Order management and tracking for small shops. The shop owner (admin) and staff
manage orders; customers track an order with the Order ID and their phone number.

- **client/**: React app (Create React App, Tailwind). Deployed on Vercel.
- **server/**: Express + MongoDB API. Deployed on Render.

Both deploy automatically from the `master` branch on GitHub.

## What it does

- Orders: create, edit, delete, Excel upload and export, search, filters, sorting, paging
- Status colours and table columns chosen by the admin (Settings)
- Delivery slip (PDF / print) with settings for what is printed
- Roles: admin and staff (staff log in with a username; the admin decides what they may do)
- Admin tools: Staff page, Activity history, change password, change email, forgot password by emailed code
- Public order tracking page for customers

## Run it on your computer

1. Install: `npm run install:all`
2. Copy `server/.env.example` to `server/.env` and fill it in (database address,
   a long random `JWT_SECRET`). Use a **test** database, not the live one.
3. Create `client/.env` with `REACT_APP_BASE_URL=http://localhost:5000`
4. Start both: `npm start`

For local work without email set up, add `REQUIRE_EMAIL_VERIFICATION=false` to
`server/.env`, so new accounts do not need an emailed code.

## Settings on the server (Render)

See `server/.env.example`. The important ones:

| Name | What it is |
|---|---|
| `MONGO_URI` | database address |
| `JWT_SECRET` | secret used for logins |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | the email account that sends codes (for Gmail, `SMTP_PASS` is an App password) |
| `CORS_ORIGINS` | optional: your website's address (e.g. `https://your-app.vercel.app`, several allowed, comma separated). Only those websites may call the API from a browser. Leave it out to allow every website |

Without the `SMTP_*` settings no emails are sent: sign-up, forgot password and
change email show that email is not set up.

## Good to know

- Order IDs look like `ORD-20261112-5-3` (date, shop running number, day number)
  and are unique per shop.
- Every request is checked on the server for the person's role and powers, so
  hiding a button on screen is never the only protection.
- Activity lines are kept for 6 months and then removed automatically.
