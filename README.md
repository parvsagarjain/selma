# SELMA — The Blaze Cap

The final, shippable version of the SELMA site: a marketing landing page, an
"About the Founder" page, a live 3D helmet **configurator**, and a **waitlist**
capture flow backed by a small Node server + SQLite.

## Run it

```bash
npm install          # installs better-sqlite3
npm start            # → http://localhost:8080   (waitlist → Google Sheet mirror ON, reads .env)
```

To run without the Google-Sheet mirror (SQLite only):

```bash
npm run start:nomirror
```

Override the port with `PORT=3000 npm start`.

## Pages

| URL                | Page                                            |
|--------------------|-------------------------------------------------|
| `/`                | Landing (`index.html`)                          |
| `/about.html`      | About the Founder — Daksh Rai                   |
| `/configure.html`  | 3D configurator (core / shell / LED / mods)     |
| `/waitlist.html`   | Waitlist confirmation                           |

## Waitlist API

- `POST /api/waitlist` — `{ email, total, config }` → stored in `data/waitlist.db`
  (upsert by email) and best-effort mirrored to a Google Sheet.
- `GET  /api/waitlist` — admin peek at sign-ups (⚠️ unprotected — lock down before
  a public deploy).

Google-Sheet mirroring is configured via `.env`
(`SHEET_WEBHOOK_URL`, `SHEET_WEBHOOK_TOKEN`). Setup steps + the Apps Script code
are in **WAITLIST-SHEET-SETUP.md**.

## Structure

```
server.mjs            Node http server: serves site/ + waitlist API (SQLite)
.env                  Google-Sheet webhook creds (keep private)
site/                 the static frontend (HTML/CSS/JS)
  assets/             images + assets/models/*.glb (the 4 colorway helmets)
data/                 waitlist.db (SQLite, WAL) — created on first run if absent
```

> Build tooling (GLB bake/merge scripts) and the earlier Next.js prototype were
> left out of this final build — they live in the parent project folder.
