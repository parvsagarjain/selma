// SELMA static site + waitlist API. Serves site/ and stores waitlist sign-ups in a SQLite database.
// Run with:  node server.mjs   (listens on :8080, or PORT env)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(__dirname, "site");
const DATA = path.join(__dirname, "data");
fs.mkdirSync(DATA, { recursive: true });

/* ---------------- database ---------------- */
const db = new Database(path.join(DATA, "waitlist.db"));
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS waitlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  total      INTEGER,
  config     TEXT,             -- JSON of the selected build items
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);`);
// re-submitting the same email just refreshes their saved build
const upsert = db.prepare(`
  INSERT INTO waitlist (email, total, config, created_at, updated_at)
  VALUES (@email, @total, @config, @now, @now)
  ON CONFLICT(email) DO UPDATE SET total = @total, config = @config, updated_at = @now
`);

/* ---------------- Google Sheet mirror ---------------- */
// Every sign-up is ALSO pushed to a Google Sheet via an Apps Script Web App, so you can just open
// the sheet to see the list. Best-effort: SQLite is always the source of truth; a failed push is
// logged, never blocks the sign-up. Configure with env vars (see WAITLIST-SHEET-SETUP.md):
//   SHEET_WEBHOOK_URL   — the Apps Script deployment URL
//   SHEET_WEBHOOK_TOKEN — a shared secret the script checks (optional but recommended)
const SHEET_WEBHOOK_URL = process.env.SHEET_WEBHOOK_URL || "";
const SHEET_WEBHOOK_TOKEN = process.env.SHEET_WEBHOOK_TOKEN || "";
async function mirrorToSheet({ email, total, build, created_at }) {
  if (!SHEET_WEBHOOK_URL) return; // not configured — sheet mirroring off, SQLite still records it
  try {
    const r = await fetch(SHEET_WEBHOOK_URL, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: SHEET_WEBHOOK_TOKEN, email, total, build, created_at }),
    });
    if (!r.ok) console.error(`[sheet] mirror HTTP ${r.status}`);
  } catch (e) { console.error("[sheet] mirror failed:", e.message); }
}

/* ---------------- helpers ---------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".glb": "model/gltf-binary",
  ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain",
};
const json = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };

/* ---------------- server ---------------- */
const server = http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];

  // POST /api/waitlist — store a sign-up
  if (req.method === "POST" && url === "/api/waitlist") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on("end", () => {
      let data; try { data = JSON.parse(body || "{}"); } catch { return json(res, 400, { ok: false, error: "bad json" }); }
      const email = String(data.email || "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return json(res, 400, { ok: false, error: "invalid email" });
      const now = new Date().toISOString();
      const total = Number(data.total) || 0;
      upsert.run({ email, total, config: JSON.stringify(data.config ?? null), now });
      console.log(`[waitlist] ${email} — ₹${total}`);
      // human-readable build summary for the sheet, e.g. "M-02 WIRELESS · CHROME SILVER · …"
      const build = Array.isArray(data.config) ? data.config.map((l) => l.name).filter(Boolean).join(" · ") : "";
      mirrorToSheet({ email, total, build, created_at: now }); // fire-and-forget
      json(res, 200, { ok: true });
    });
    return;
  }

  // GET /api/waitlist — quick admin peek at stored sign-ups
  if (req.method === "GET" && url === "/api/waitlist") {
    const rows = db.prepare("SELECT id, email, total, created_at, updated_at FROM waitlist ORDER BY id DESC").all();
    return json(res, 200, rows);
  }

  // static files from site/
  let rel = decodeURIComponent(url);
  if (rel.endsWith("/")) rel += "index.html";
  const filePath = path.normalize(path.join(SITE, rel));
  if (!filePath.startsWith(SITE)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("404 — not found"); }
    res.writeHead(200, { "content-type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`SELMA site + waitlist API → http://localhost:${PORT}  (db: data/waitlist.db)`));
