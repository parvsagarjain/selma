# Waitlist → Google Sheet

Every waitlist sign-up is stored in the local SQLite DB (`data/waitlist.db`) **and** pushed to a Google
Sheet so you can just open the sheet to see everyone. Mirroring is off until you configure it — the
form and SQLite work regardless.

## One-time setup (~5 minutes)

1. **Create a Google Sheet.** Name it anything (e.g. "SELMA Waitlist").

2. **Add the Apps Script.** In the sheet: **Extensions → Apps Script**. Delete the sample code, paste
   this, and set your own secret in `SECRET`:

   ```javascript
   const SECRET = 'change-me-to-a-long-random-string';

   function doPost(e) {
     const out = (ok, msg) =>
       ContentService.createTextOutput(JSON.stringify({ ok, msg }))
         .setMimeType(ContentService.MimeType.JSON);
     try {
       const d = JSON.parse(e.postData.contents);
       if (SECRET && d.token !== SECRET) return out(false, 'bad token');
       const ss = SpreadsheetApp.getActiveSpreadsheet();
       const sh = ss.getSheetByName('Waitlist') || ss.insertSheet('Waitlist');
       if (sh.getLastRow() === 0) sh.appendRow(['Timestamp', 'Email', 'Total (₹)', 'Build']);
       sh.appendRow([d.created_at || new Date(), d.email, d.total, d.build]);
       return out(true, 'added');
     } catch (err) {
       return out(false, String(err));
     }
   }
   ```

3. **Deploy it.** **Deploy → New deployment → type: Web app.**
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - Click **Deploy**, authorize when prompted, and **copy the Web app URL**
     (looks like `https://script.google.com/macros/s/AKfy…/exec`).

4. **Point the server at it.** Run the server with these two env vars (use the same secret as above):

   ```bash
   SHEET_WEBHOOK_URL="https://script.google.com/macros/s/AKfy…/exec" \
   SHEET_WEBHOOK_TOKEN="change-me-to-a-long-random-string" \
   node server.mjs
   ```

   (Or put them in a shell profile / your host's environment-variables settings when deployed.)

That's it. New sign-ups now appear as rows in the **Waitlist** tab of your sheet in real time. The
local `http://localhost:8080/api/waitlist` endpoint and `data/waitlist.db` still work as a backup.

> **Airtable instead?** Same idea — set `SHEET_WEBHOOK_URL` to an Airtable automation webhook (or swap
> `mirrorToSheet` in `server.mjs` to call the Airtable REST API with a personal access token). Ask and
> I'll wire it up.
