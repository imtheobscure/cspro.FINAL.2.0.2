# MySQL + phpMyAdmin Setup Guide (cPanel)

This guide wires your Tutomy app to a real **MySQL database on your cPanel host**
so users, their logins, and their tiers live in the database instead of JSON
files. You can then manage everything visually from **phpMyAdmin**.

> The React app needs **zero code changes** — it already calls `/auth.php`
> (`register`, `login`, `check_status`, `update_tier`, ...) on every session
> refresh, and this guide only changes where that PHP file stores accounts.

---

## How it works

| Piece | Role |
|---|---|
| `public/auth.php` | The PHP auth API your React app already talks to. Now with a MySQL storage layer (PDO + prepared statements). |
| `schema.sql` | Creates the `users` table. Import once via phpMyAdmin. |
| `cs-db_config.example.php` | Credentials template. You rename it to `cs-db_config.php`, put it **one level above** the document root and fill in cPanel's values. |
| Encrypted file store | Still kept in sync on every write — it's the automatic offline fallback if MySQL is ever unreachable. |

When MySQL is configured **and** reachable and **and** the `users` table has
rows, MySQL is the authoritative store. If the table is empty (fresh setup),
`auth.php` falls back to the file store — so your existing accounts and the
master admin migrate into MySQL automatically on the next save.

---

## Step 1 — Create the database (cPanel)

1. Log in to **cPanel** → **MySQL® Databases**.
2. Under **Create New Database**, enter e.g. `tutomy_auth` → **Create Database**.
   The full name will be prefixed, e.g. `cpaneluser_tutomy_auth`.
3. Under **Add New User**, create a user (e.g. `tutomy_auth`) with a strong
   password → **Create User**. Note the prefixed name, e.g. `cpaneluser_tutomy_auth`.
4. Under **Add User To Database**, select your user and your database →
   **Add**, then grant **ALL PRIVILEGES** → **Make Changes**.

## Step 2 — Import the table (phpMyAdmin)

1. cPanel → **phpMyAdmin**.
2. Click your new database in the left sidebar (e.g. `cpaneluser_tutomy_auth`).
3. Go to the **Import** tab → **Choose File** → select `schema.sql` from this
   project → **Go**.
4. You should see a `users` table. It can stay **empty** for now.

## Step 3 — Configure the credentials (exact paths for this host)

Your subdomain document root is **`/home/miydtgmr/cspro.tutomy.com`** —
that is where `dist/`'s contents are uploaded (`index.html`, `assets/`, `auth.php`).

Every build automatically copies the **template** into
`dist/cs-db_config.example.php`, so after `npm run build` + upload it is already
on your host as documentation. The real file is **not** built and **not**
uploaded — create it on the host. Then:

1. Create the file **one level above the document root**, so it sits outside the
   web root and cannot be fetched over HTTP at all:
   ```
   /home/miydtgmr/cs-db_config.php
   ```
   (The site lives in `/home/miydtgmr/cspro.tutomy.com/`. `auth.php` looks one
   level up from wherever it is running, so nothing has to be pointed at it.)
2. Paste the template's `return [ … ];` block in and fill it in — copy the names
   rather than retyping them, because cPanel prefixes both with your account:
   ```php
   return [
       'host' => 'localhost',              // cPanel MySQL is always localhost
       'name' => 'miydtgmr_cspro356',      // the database
       'user' => 'miydtgmr_cspro356',      // the user
       'pass' => 'YOUR_DB_PASSWORD'
   ];
   ```
3. Uploading a new build later says nothing about this file: the build copies no
   credentials file into `dist/` at all, and it deletes `dist/db_config.php` if an
   older build left one there. Your live credentials therefore can never be
   overwritten by a deploy, and can never accidentally become public.

**Why the name changed.** `auth.php` used to look for exactly one file name,
`db_config.php`, so a file saved as `db-config.php` (a hyphen — the first thing
everyone types) reported "Config file: NOT FOUND" while sitting in the right
folder. It now accepts `cs-db_config.php`, `cs_db_config.php`, `db-config.php`,
`db_config.php`, and a cPanel-prefixed `miydtgmr_cs-db_config.php`, searching the
folder above the document root first and the document root last. The Super Admin
Console prints the path that answered, and the full list of paths it checked when
none did.

### Reading the console's MySQL errors

The console never prints the raw MySQL message, because it contains the database
**user** name and sometimes the database name too. It maps the error number to a
cause instead:

| # | What it actually means | The fix |
|---|---|---|
| 1045 | Wrong user name or password | Re-copy both from cPanel → MySQL Databases. A password with `=` `&` `[` in it is fine in single quotes — just do not retype it by hand. |
| 1044 | Valid credentials, no permission on that database | cPanel → MySQL Databases → **Add User To Database** → ALL PRIVILEGES. |
| 1049 | That database name does not exist | Copy the exact, cPanel-prefixed name. |
| 2002 / 2003 | The DB server is not reachable | On cPanel the host is always `localhost`; if it was changed, set it back. |
| 1040 | Too many connections | Wait a moment and retry. |

If the panel instead says the host did not answer at all, the request was
rejected before MySQL was ever consulted — the usual cause is a sign-in token
that no longer matches the account store. Sign out and back in as the master
admin, then run **Sign-in health → 🔧 Repair sign-in**.

**Alternative — .htaccess env vars:** if you prefer, add to the `.htaccess`
next to `auth.php`:
```
SetEnv DB_HOST localhost
SetEnv DB_NAME miydtgmr_tutomy_auth
SetEnv DB_USER miydtgmr_tutomy_auth
SetEnv DB_PASS YOUR_DB_PASSWORD
```

## Step 4 — Upload the updated auth.php

Upload the updated `public/auth.php` (and the root `auth.php` proxy) to your
host, keeping the same location it was deployed to before (`auth.php` next to
`index.html` at the document root). Then open **Super Admin Console →
🧪 Test MySQL Connection** to verify everything end to end.

## Step 5 — Verify

1. Open your site → register a test account or log in — it should behave
   exactly as before.
2. Open **phpMyAdmin** → your database → browse `users`. The account row
   should appear.
3. **Change a tier from phpMyAdmin:** edit a user's `tier` to `vip` (and set
   `tier_expires_at` if you want a deadline). Have that user refresh the app —
   the client calls `auth.php?action=check_status` on session check and picks
   the new tier up immediately.

---

## Managing users & tiers after setup

- **Give a user Premium/VIP:** phpMyAdmin → `users` → Edit row →
  `tier` = `pro` or `vip`, `status` = `active`. (The app's own admin console
  also works and writes to MySQL.)
- **Suspend a user:** set `status` = `suspended` — their next login is refused.
- **See who's registered:** browse the `users` table, or the app's
  Admin Console → Tutors.

## Notes & caveats

- **Never put real DB credentials inside `public_html`** — use the file above
  it or `SetEnv` (both supported by `auth.php`).
- All queries use **prepared statements**; passwords stay **bcrypt** hashes
  (`password_hash`/`password_verify`) exactly as before.
- Once MySQL is populated, it is the **source of truth**. Edits you make to
  `data/tutors_db.json` on the host are only picked up if MySQL is unreachable
  or the table is empty.
- Deleting an account from the admin console removes the row from MySQL too.
- Local development is unaffected: with no DB credentials present, `auth.php`
  (and the local Express server's `/auth.php` route) keep using file storage.
---

## Auto-migration (Super Admin Console → MySQL panel)

1. Open the **Super Admin Console** (Dashboard → Admin button) → scroll to
   **🗄️ MySQL Database**.
2. Click **🧪 Test MySQL Connection** — confirm the report is green.
3. Click **🔄 Migrate File Accounts → MySQL**. Every account from the
   encrypted-file store is imported with **per-account results** (✅/❌ rows).
   - Idempotent: accounts already in MySQL are *updated*, never duplicated.
   - The master admin (`info.tutomy@gmail.com`) is included automatically.
   - The encrypted-file store is kept as the offline fallback, untouched.
4. The panel re-runs the connection test automatically so you can see the new
   `Accounts in DB` count and confirm the storage switched to `mysql`.

You can also run the migration by hand with a direct POST:

```bash
curl -X POST "https://cspro.tutomy.com/auth.php?action=db_migrate" \
  -H "Content-Type: application/json" \
  -d '{"email":"info.tutomy@gmail.com","token":"YOUR_SESSION_TOKEN"}'
```

## VIP cloud backup (learners, sessions, schedules, bookings, settings)

VIP tutors can now save their workspace to this same MySQL database instead of
only to a local folder. It is **manual** (a button, plus the corner save card
when the tutor chose Cloud as their target) and **VIP-only** — the endpoint
checks the account's session token *and* its `tier` on every request.

The database part is created automatically the first time a cloud action runs,
so nothing has to be re-imported. The definitions live at the bottom of
`schema.sql` if you prefer to create them yourself:

| Table | Rows | Purpose |
|---|---|---|
| `cloud_backups` | **one per tutor** | The whole workspace as gzip-compressed JSON in a `LONGBLOB`, plus revision, size and checksum. |
| `cloud_backup_index` | a handful per tutor | Tiny per-section counts/sizes (learners, sessions, calendar, todos, …) so the dashboard can show status without ever reading the payload. |

**What is stored:** learners and their session/feedback records, group classes,
calendar events, todos, automations, bookings/packages/payments, coursebooks,
the young-learners kingdom and the tutor's settings. **Generated lesson HTML is
never uploaded** — those files belong on the tutor's hard disk, and excluding
them is what keeps each backup small.

### Endpoints (on `auth.php`)

| Action | Method | Notes |
|---|---|---|
| `?action=cloud_info` | POST | Status + section counts. Never reads the payload. |
| `?action=cloud_save` | POST | One upsert. Body: `{ email, token, payload: base64(gzip(json)), encoding: 'gzip', device, index: [...] }`. |
| `?action=cloud_load` | POST | One row read; returns the payload as base64 for the browser to decompress. |
| `?action=cloud_delete` | POST | Deletes both rows for the account. |
| `?action=cloud_stats` | POST | **Admin only.** Live storage report: row counts, per-tutor sizes, per-section totals, real table footprint, over-quota and orphaned rows. Never reads a payload. |

### Proving it works on your host

Two ways, both cheap:

**1. The script.** Against a throwaway VIP account:

```
CLOUD_TEST_EMAIL='vip@example.com' CLOUD_TEST_PASSWORD='…' npm run check:cloud
```

It walks the real path — strip inlined images → gzip → base64 → `cloud_save` — then reads it back
with `cloud_load` and compares sizes, checksum and the payload byte for byte, and confirms
`cloud_info` advanced the revision. `--endpoint=https://…/auth.php` points it at another host.
Because `cloud_save` is an upsert it **refuses to run if that account already has a backup**;
`--force` overwrites, `--delete-after` removes the test row (also needs `--force`).

**2. The console.** Super Admin Console → *MySQL & Host Diagnostics* → **VIP Cloud Storage**
(report loads automatically after *Test MySQL*). It shows how many tutors are backed up, stored
vs raw bytes, the InnoDB on-disk footprint of all three tables, per-section totals, and a
per-tutor ledger with each backup's share of the 50 MB cap — plus named lists of who is over
quota, who is above 80%, and which rows belong to accounts that no longer exist.

### Host requirements

The compressed payload is capped at **50 MB** server-side, and the request is
base64 (~33% larger), so make sure PHP accepts a body of that size:

```
; cPanel → MultiPHP INI Editor (or .htaccess php_value)
post_max_size     = 70M
upload_max_filesize = 70M
memory_limit      = 256M
```

If the app answers *“The server did not return a valid answer”*, that limit is
the usual cause. The cloud copy is capped at **50 MB compressed** (base64 adds
~33%, so PHP must accept a little over 70 MB per request). `max_allowed_packet`
on MariaDB defaults to 16M — raise it to at least 64M (and MySQL ≥ 8 / MariaDB
stores the payload in a `LONGBLOB`) or a large save will be rejected by the
database layer after PHP has already accepted it.

### Where the tutor chooses it

**General Settings → Back-up Suite → “Where should we save your backups?”**
(Hard Disk / Cloud). VIP tutors are also asked once, the first time the
bottom-right save card appears. The choice is stored on the tutor profile, so the
Kids Dashboard card and every widget follow the same answer. Cloud saving is
never silent: nothing is uploaded unless the tutor presses Save / Save to Cloud.

---

## What else can move into MySQL (roadmap)

The `users` table covers **accounts, logins, tiers**. The app also keeps a lot
of operational data in the browser (localStorage / per-device), which is
currently NOT shared between devices. From highest value to lowest, these are
the best candidates for future MySQL tables:

| Priority | Data | Where it lives today | Why it matters |
|---|---|---|---|
| 1 | **Learner profiles + lesson content** | `useLearnerStore` (browser, `learner-profile-storage`) | The core business data. Today it's tied to one browser — moving it to MySQL means learners are safe if the browser cache clears, and visible from any device. |
| 2 | **Sessions, packages, payments** | `useBookingStore` (browser) | Invoicing/attendance is money data — the worst thing to lose in a cache wipe. Natural tables: `sessions`, `packages`, `payment_records`, `waitlist`. |
| 3 | **Calendar events** | `useCalendarStore` (browser, `calendar-storage`) | Classes & reminders. Table: `calendar_events` (learner_id, title, date, time_utc, color, source). Syncs naturally with the Master Calendar. |
| 4 | **Homework & scheduled emails** | `useAutomationStore` (browser, `automation-storage`) | Automations (session reminders, homework, weekly progress) are time-sensitive — if the browser is closed they can't fire. Server-side tables let a cron job run them. |
| 5 | **Bookings & waitlist** | `useBookingStore` (browser) | Same reasoning as sessions; candidates `bookings`, `waitlist_entries`, `blocked_times`. |
| 6 | **Todos, app settings, coursebook** | `useTodoStore`, `useAppStore`, `useCoursebookStore` (browser) | Small but useful: settings sync across devices. |

**Architecture note:** the clean path is the same as `users` — add tables with
prepared-statement helpers in `auth.php` (e.g. `calendar_events`) or a new
`api.php`, keep the JSON contract the React stores already speak, and have the
stores load from the API on boot and save through it when the host is
reachable — falling back to localStorage when offline, exactly like auth does
today.
