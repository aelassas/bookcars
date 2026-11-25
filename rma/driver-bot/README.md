# TAKE Auto — Driver Telegram Bot (Contract Module 5)

**Internal** Telegram bot used by drivers/staff to record a vehicle
**handover** or **return**. It generates two PDFs — an **Acceptance Act** and a
**Rental Contract** — saves them to disk, links them to the rental via a
`document` row, and closes the driver's related `task`.

> This bot is **internal only**. It **never messages a customer**. It talks
> exclusively to drivers whose Telegram ID maps to a `driver` row.

It is a **separate process** from the Next.js web app: its own `package.json`,
its own dependencies, its own pm2 process. It does **not** touch the web build.

---

## What's in here

| File          | Purpose                                                            |
| ------------- | ------------------------------------------------------------------ |
| `schema.sql`  | `driver` + `driver_assignment` tables with tenant RLS. **Not auto-applied.** |
| `docgen.ts`   | Pure-Node (pdfkit) PDF generation: Acceptance Act + Rental Contract. |
| `db.ts`       | Postgres pool, per-tenant RLS transactions, driver identity lookup. |
| `bot.ts`      | Telegraf WizardScene flow and orchestration.                        |
| `package.json`, `tsconfig.json`, `.env.example` | Self-contained setup.         |

---

## 1. Install

```bash
cd "platform/driver-bot"
npm install
```

## 2. Type-check

```bash
npx tsc --noEmit
```

## 3. Get a bot token from @BotFather

1. In Telegram, open a chat with **@BotFather**.
2. Send `/newbot`.
3. Choose a display name (e.g. `TAKE Auto Driver`).
4. Choose a username ending in `bot` (e.g. `take_auto_driver_bot`).
5. BotFather replies with an **HTTP API token** like
   `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.
6. Put it in `.env` as `TELEGRAM_BOT_TOKEN`.

Recommended (optional) via BotFather:
- `/setprivacy` → **Enable** (bot only sees commands / replies).
- `/setcommands`:
  ```
  start - Record a handover or return
  cancel - Abort the current entry
  help - How the bot works
  ```

## 4. Configure environment

```bash
cp .env.example .env
# then edit .env:
#   TELEGRAM_BOT_TOKEN=...       (from BotFather)
#   DATABASE_URL=...             (same value as platform/.env.local)
```

The bot connects to the **same** `mycrm` Postgres as the platform. It must
connect as the **owner** of the `driver` / `driver_assignment` tables (the role
that ran `schema.sql`, i.e. `takeauto`) so it can resolve a driver's tenant by
`telegram_user_id` before any tenant context is set. Every **business** write
still runs inside a per-tenant `set_config('app.tenant_id', ..., true)`
transaction (RLS enforced).

## 5. Apply the schema (manual, one-time)

`schema.sql` is **not** applied automatically. Review it, then run:

```bash
psql "$DATABASE_URL" -f schema.sql
```

Then register at least one driver, e.g.:

```sql
-- Replace the tenant UUID and Telegram numeric ID with real values.
INSERT INTO driver (tenant_id, telegram_user_id, name, phone)
VALUES ('<tenant-uuid>', 123456789, 'Ahmed', '+971500000000');
```

> A driver's numeric Telegram ID is shown by the bot itself: if an unregistered
> user messages it, the reply includes `Ask the office to add your Telegram ID: <id>`.

## 6. Run it

Dev (ts-node, no build):

```bash
npm run dev
```

Production (compile then run):

```bash
npm run build
npm start
```

### pm2

Run it as its **own** pm2 process, distinct from the web app (`mycrm`):

```bash
npm run build
pm2 start dist/bot.js --name take-driver-bot --time
pm2 save
```

To view logs / restart just this bot:

```bash
pm2 logs take-driver-bot
pm2 restart take-driver-bot
```

> Do **not** restart the web app's pm2 process for this. This bot is fully
> independent — separate deps, separate process, separate lifecycle.

---

## Flow

```
/start
  → [Handover | Return]
  → plate
  → customer name
  → customer phone      (/skip)
  → odometer (km)       (/skip)
  → fuel level          (/skip)
  → condition notes     (/skip)
  → photos              (optional; /done or /skip)
  → generate Acceptance Act + Rental Contract PDFs
  → save to disk + insert `document` rows (linked to the rental)
  → close the driver's open `task` for that vehicle
  → send both PDFs back + confirmation
```

`/cancel` aborts at any step.

## Notes

- Vehicle is matched by plate (whitespace/case-insensitive). The Rental
  Contract is pre-filled from the vehicle's most recent rental when one exists.
- `document.uploaded_by` is left `NULL` — drivers are not `user` rows.
- If no rental exists for the vehicle, documents are linked to the `vehicle`
  entity instead so nothing is lost.
- Photos are collected as Telegram `file_id`s during the flow; wire persistent
  photo storage in `finalize()` if/when required.
