# RMA production comes first

- **RMA has its own Hostinger VDS. Always deploy to `rma-vps` (`31.97.105.52`, `srv2077538.hstgr.cloud`).**
- **Never deploy RMA to `takevps` / `187.127.219.106`. That is the TAKE Auto server, not an RMA host, database, backup target, or runtime dependency.**
- Public URL: `https://crm.rma.network` → this VDS. App: `/opt/rma-crm/platform`, systemd `rma-crm`, Next.js port `3003`, Caddy reverse proxy. PostgreSQL and OTP mail are local Docker containers `rma-platform-db` (loopback port `5434`) and `rma-mail`.
- Before any production action, verify `ssh rma-vps 'hostname'` returns `srv2077538`. Keep `.env*` and server credentials out of git and deploy logs.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# RMA CRM — Agent Handoff

## Current client identity (owner clarification, 2026-10-21)

**MyCRM** is the underlying CRM. **TAKE Auto** was the previous client it was built for. This workspace is adapting that same MyCRM as **RMA CRM** for a new client named **RMA**. The historical TAKE Auto notes below describe the inherited implementation; they do not identify the current client or rename the underlying product.

**Last updated:** 2026-05-30  
**Branch:** `claude/rental-lease-automation-platform-xsaiy`

## What This Is

TAKE Auto is a vertical SaaS for car rental operations in MENA. It replaces Bitrix24 + Kaiten for rental companies. TAKE Auto is the next-generation **Rental Booster** (a product by Pilot Telematics). The platform consolidates CRM, fleet tracking, AI messaging, collections, and workshop ops into one system.

- **Customer Zero:** TAKE Auto (Dubai)
- **Target market:** 960 UAE rental companies already on Pilot telematics billing
- **Revenue target:** AED 30-60k MRR by month 12

## Current State (Week 2 Mid)

### Built ✅

| Module | Status | Files |
|---|---|---|
| Multi-tenancy | **Live** — shared schema + Postgres RLS (`tenant_id` + `SET LOCAL app.tenant_id`) | `platform/tenancy/rls.ts` |
| Boot guard | **Live** — `verifyRlsAtBoot()` fails deploy if any tenant table lacks RLS triad | `platform/db/startup-check.ts`, `instrumentation.ts` |
| Schema helper | **Live** — `tenantTable()` wraps `pgTable()` with auto RLS + policy + index | `platform/db/tenant-table.ts` |
| Auth | **Stub** — Auth.js v5 with credentials provider (JWT strategy). No magic links yet. | `platform/auth/index.ts` |
| CRM | **Read views** — leads, deals, pipeline board | `modules/crm/`, `components/crm/` |
| Fleet | **DB + Live Pilot merge** — DB vehicles merged with live GPS from Pilot API | `modules/fleet/queries.ts`, `components/fleet/` |
| Customers | **Live** — directory with source tracking | `modules/crm/customer-queries.ts`, `customers/page.tsx` |
| Messaging | **Live** — inbox with heuristic AI classification + draft replies | `modules/messaging/`, `messages/page.tsx` |
| pg-boss jobs | **Live** — queue + tenant-scoped workers | `platform/jobs/` |
| Pilot GPS | **Live** — fleet fetch, engine block/unblock | `platform/integrations/pilot/` |
| Navigation | **Live** — desktop sidebar, mobile bottom navigation and full-menu drawer | `app/(tenant)/[tenantSlug]/layout.tsx`, `components/layout/Sidebar.tsx` |

### Database Schema (13 tables)

| Table | Type | Notes |
|---|---|---|
| `tenant` | Root | Slug unique |
| `user` | Auth.js global | Email unique |
| `tenant_member` | Junction | `roles text[]` |
| `account`, `session`, `verification_token` | Auth.js | Standard v5 tables |
| `audit_event` | Spine | Who/why/intent log |
| `integration_event` | Spine | Raw external events before projection |
| `lead` | CRM | Source, status, assignedTo |
| `deal` | CRM | Pipeline: ref, type, status, stage, value, balanceDue |
| `vehicle` | Fleet | **New** — make, model, plate, status, odometer, dailyRate, imei, gpsBlocked |
| `customer` | CRM | **New** — name, phone, email, division, source, notes |
| `message` | Messaging | **New** — channel, body, status, classification JSON, aiReply, aiReplyApprovedAt |

### Migrations Applied

- `0000` — core tenant tables (hand-written RLS)
- `0001` — Auth.js tables
- `0002` — CRM deal table + lead enhancements
- `0003` — vehicle, customer, message (using `tenantTable()` — auto RLS)

All tables verified by boot guard.

## Architecture Rules (READ BEFORE CODING)

1. **Every tenant-scoped query MUST use `withDrizzleTenant(tenantId, fn)`** — never query without setting `SET LOCAL app.tenant_id`.
2. **New tenant tables MUST use `tenantTable()` from `platform/db/tenant-table.ts`** — not raw `pgTable()`. This auto-emits RLS policy + index.
3. **Post-migration: always run `npm run migrate`** — since 2026-07-25 this is the repo's own runner (`scripts/migrate-sql.ts`), not drizzle-kit, and it still applies `tighten-rls.sql` (FORCE RLS). It keeps its own journal, so a database that already has the schema needs `npm run migrate:baseline` **once** before the first run; it refuses rather than replaying 0000 onward. `npm run migrate:status` shows applied vs pending.
4. **Boot guard is live** — if you add a table with `tenant_id` but skip `tenantTable()`, the app will crash on startup with a clear error.
5. **Server Actions for mutations, API routes for webhooks** — no tRPC, no GraphQL.
6. **Module layout:** `modules/<name>/queries.ts` (reads), `actions.ts` (mutations), `policies.ts` (authz).
7. **Event-sourced integrations** — every external webhook writes raw payload to `integration_event` FIRST, then a worker projects it to business tables.
8. **Any `"use server"` export taking `tenantId` MUST authorize THAT tenant, as its first statement.** A server action is invoked by POSTing any app URL with a `Next-Action` header, so a caller-supplied `tenantId` handed to `withDrizzleTenant` lets any logged-in user reach any tenant's data — RLS scopes to whatever id was passed. Use `canManage*ForTenant(tenantId)`, **never** the unbound `canManage*()`, which checks the caller's own first membership and not the id passed in. Enforced by `src/platform/auth/action-guards.test.ts`, which fails the build on any unguarded export. Helpers that are not UI actions must not carry `"use server"` at all.
9. **There is exactly ONE instrumentation file: `src/instrumentation.ts`.** Under Turbopack a project-root `instrumentation.ts` shadows it and the `src/` one is never compiled — that is how pg-boss and every job worker silently never ran in production until 2026-07-25. Do not add one back.
10. **New pg-boss queues must be declared in `src/platform/jobs/queues.ts`.** v10+ requires an explicit `createQueue`; both `send()` and the worker loop throw for a queue that was never created, so an undeclared queue fails silently at runtime rather than loudly at boot.
11. **Bound every outbound `fetch` with `AbortSignal.timeout()`.** Node's undici has no total-response timeout, and inside a worker a hang means pg-boss expires the job and starts a duplicate against the same remote.

## What's Next (Priority Order)

### 1. Auth — Magic Links + Real Tenant Binding
- **Problem:** Auth.js is on JWT strategy with a credentials stub. No real password validation. Tenant IDs are hardcoded in some API routes.
- **Decision to make:** Better Auth spike (2 days, native org/tenant support) OR stay with Auth.js + Resend EmailProvider.
- **Files to touch:** `platform/auth/index.ts`, `platform/middleware.ts`, API routes in `app/api/pilot/`, `app/api/pilot/block/`.
- **Success criteria:** User signs up with magic link → auto-creates tenant → every route resolves tenant dynamically from session.

### 2. AI Reply Engine — "Kimberly"
- **Problem:** Message inbox has heuristic classification only. The "AI Reply" panel generates static canned responses.
- **Goal:** Connect Claude (or demo's existing `@ai-sdk/anthropic`) to draft contextual replies based on message content + vehicle availability + pricing.
- **Files to touch:** `modules/messaging/classify.ts`, `modules/messaging/actions.ts`, `components/messaging/MessageInbox.tsx`.
- **Success criteria:** Click "Classify & route" → AI drafts a personalized reply considering the customer's request and available vehicles.

### 3. CallGear Webhook + Twenty Relay
- **Status:** webhook live (`platform/integrations/callgear/webhook.ts` + `app/api/integrations/callgear/[token]/route.ts`): verify signature → write to `integration_event` → return 200.
- **Projector live:** `platform/integrations/callgear/twenty-relay.ts` projects queued `call.finished` events into Twenty (person deduped by phoneTail9 + opportunity keyed `callgear:<callId>`); runs on the box as pm2 `callgear-relay` (`scripts/run-callgear-twenty-relay.ts`, 30s poll). Tenant routing: default→sales :3001, rental brands→rental :3002; the dialed number must be mapped in `tenant.callgear_virtual_number` (comma-separated) or the event fails+retries in the `rls-tenant-a` bucket forever.
- **WhatsApp→Twenty (2026-08-22):** `run-wa-twenty-sync.ts` (1-min detached beat) projects messages as ONE aggregated note per customer per day (`WhatsApp · +<phone> · <date>`, append+dedupe via `day-note.ts`), with client media uploaded as attachments (`media-attachment.ts`). History replay: `scripts/backfill-wa-media-to-twenty.ts` (`--create-notes --commit`, resumable). Outbound observer rows store the resolved customer phone in `to` (`fix-outbound-wa-to.ts` healed history). See `docs/HANDOFF-2026-08-22-twenty-daynotes-media-mlx.md`.
- **WhatsApp→Twenty (2026-08-24):** most outbound rows now carry a WhatsApp `@lid` in `from`; the projector resolves unknown tails via a batch `wa_identity` lookup before dropping as `noPerson` (without it agent replies vanished from cards — the "chats cut off" incident). `attachWaMediaToTwenty` dedupes by (basename + targetPersonId) so re-walks/replays never file a file twice; checkpoint rewinds are therefore safe but must pause the beat first (`pm2 stop sync-heartbeat`) to avoid read-modify-write races on note bodies. Known cost: the sales people-index rebuild (~73k people, ~1 page/sec) makes each sales pass ~25 min. See `docs/HANDOFF-2026-08-24-wa-lid-reply-drop.md`.
- **Calls (2026-08-26):** the observer now logs incoming WhatsApp CALL events into the JSONL (one `📞 incoming WhatsApp voice/video call` line per call, deduped by call id) — they flow through importer → day note like any message. The protocol gives a linked device NO call audio, so WA calls can never be recorded; the event line is all we get. CallGear recordings, however, ARE files now: the transcriber (`callgear/transcriber.ts`) uploads the cached recording as a Twenty attachment on the opportunity + person + transcript note (dedupe by name + opportunity, best-effort — an attach failure never fails the call's pipeline), because the CallGear recording URL expires.
- **Agent availability: phone override + one row per agent (2026-09-19):** `agent_availability.phone` (migration 0077) is the manager-set WhatsApp override from the /availability Edit card; rule everywhere (display AND the assignment pings) is DB override ?? env roster phone, via the pure `applyPhoneOverrides` / `mergeRosterAgents` in `modules/rental/rotation.ts` — applied per pass in `run-rental-distributor.ts` and at roster build in `run-wa-lead-relay.ts`. /availability renders ONE row per agent_key (Ali/Abdullah sit in both rotations and doubled); the Edit phone field edits the override only (empty = back to env), and setSchedule/setAvailability keep the never-wipe discipline both directions. The bare hub pages share `components/hub-nav.tsx` ("My availability" for agents, "Lines" for managers).

- **Meta DMs (2026-09-15):** Instagram DM + Messenger ingest via `app/api/webhooks/meta/route.ts` (GET handshake vs META_WEBHOOK_VERIFY_TOKEN, POST HMAC vs META_APP_SECRET — unset secret = 500, never silent accept) → `integrations/meta/webhook.ts` → `message` rows (`channel` instagram/messenger, `from` = `ig:<scopedId>`/`fb:<scopedId>` — the prefix is load-bearing, scoped ids are pure digits and must never parse as phones; extid `igmsg|fbmsg:<accountSlug>:<mid>`, ON CONFLICT DO NOTHING). Media downloads AFTER the 200 into MEDIA_ROOTS `ig`. The wa-lead relay reads the two new channels: phone-less threads key on the prefixed id, cards are `ig-lead:`/`fb-lead:` externalIds found via metaCardMatch (no phoneTail9), no whatsapp link, girls' round-robin + closer pings apply on sales exactly like whatsapp. Account slugs ig-takeauto/fb-takeauto were mapped in lines.ts + owners.ts BEFORE the webhook went live.
- **WhatsApp Cloud API (2026-09-23):** the same `/api/webhooks/meta` route now also ingests the `whatsapp_business_account` object — `integrations/meta/whatsapp-cloud.ts`: channel `whatsapp`, from=wa_id, extid=wamid, 👍 reactions into `wa_reaction`, media into WA_MEDIA_ROOT after the 200. Routing is `META_WA_LINES="phoneNumberId:tenantSlug[:lineSlug],…"`; unknown phone_number_id → 500, a lineSlug unknown to lines.ts throws at parse. First line: **971505375594** = `takeauto-meta-main` (WABA 495592020296971, phone_number_id 475692462294687, portfolio 1007076759922548, app "TAKE CRM" id 1421974836569868, system-user token in META_WA_TOKEN, App Secret in META_APP_SECRET — with the secret unset EVERY Meta POST 500s). The real main line 971567235539 is stuck on WABA 3003654496655900 (a spare portfolio this account can't access) and stays on the Baileys observer until reclaimed. Verified live 2026-09-23 via a signed self-test POST (row written, then deleted).
- **JivoChat (2026-09-19):** IG/FB + website widget via Jivo, ONE account per board, ingest via `app/api/webhooks/jivo/route.ts` (+ `[token]/` for the Bot API's token-in-path) → `integrations/jivo/webhook.ts` → `message` rows. Both dialects parsed: Webhooks API (`event_name`: offline_message + chat_finished's visitor log lines) and Bot API (`event`: CLIENT_MESSAGE — the only surface with per-message text in real time). Auth is a shared `JIVO_WEBHOOK_TOKEN` in query or path (Jivo signs nothing; unset = 500). Routing is `JIVO_LINES="siteId:tenantSlug,…"`; an unknown site_id THROWS (500), never defaults. Identity: `from` = `jivo:<site_id>:<client>` (phone-less → thread keys on the prefixed id, card `jivo-lead:<tenant>:<site>:<client>` via metaCardMatch); a visitor with a phone carries it in `from_pn` and stitches onto the tail9 thread like any WhatsApp contact. Channel metadata (real channel, email, agent, chat id) lives in `message.source_meta` (0076). Auto-ack sender `integrations/jivo/sender.ts` (BOT_MESSAGE to bot.jivosite.com) is gated by JIVO_AUTOREPLY, default OFF.

- **Notes are CONTINUOUS now (2026-08-27, owner: "one continuous note not hundreds").**
  Two separate producers were each multiplying notes on a card:
  - `day-note.ts` keyed on `(person, DAY)` → ~180 notes for a six-month customer.
    The key is now the person alone (`WhatsApp · +<digits>`), with the date moved
    into the body as a `dayHeader()` separator so the chronology survives.
  - `wa-lead-relay.ts` was far worse — its title carried `N msg` and a
    last-activity timestamp, so **every pass minted a brand-new note**. The title
    is now stable (`WhatsApp direct · …<key>`) and lines append.
  Both go through `ensureContinuousNote()`, which appends only lines not already
  present and rolls into `· #2` past `NOTE_MAX_CHARS` (60k) so a chatty customer
  cannot produce a card the editor refuses to open.
- **ONE note per customer, really (2026-08-27, owner: Ayham's #539 photo — the
  card showed `WhatsApp · +…` AND `WhatsApp direct · …`, same messages twice).**
  `wa-lead-relay.buildThreadNote` now folds DIRECT WhatsApp threads into the
  day-note identity itself — same title (`WhatsApp · +<digits>`) and same
  `HH:MM ← text` line format, so the line-level dedupe merges both producers
  into one note whichever lands first. Groups, Telegram and marketplace-origin
  threads keep the relay title (`WhatsApp group: …` / `Telegram · …`) because
  the day-note pipe does not cover those streams. The legacy duplicates were
  merged by `scripts/merge-wa-direct-notes.ts` (dry-run default; `--instance
  both --commit`): appends any line the day note lacks, carries noteTargets
  over, soft-deletes the relay note; retitles instead when no day note exists
  yet. Ran 2026-08-27: 925 soft-deleted, 386 retitled, 1213 orphan lines
  rescued, 39 skipped (no day note + no wa.me digits — left untouched).
- **ONE note per card, final (2026-08-29, Ayham: card #593 carried the same
  chat THREE times — day note + "💬 Chat transcript (auto)" + a relay
  "Dubizzle · …" note).** The day note (push-message.ts, both directions +
  media attachments) is the single owner of the conversation:
  - `buildThreadNote` folds ALL direct WhatsApp threads into the day-note
    identity, marketplace-origin included (only groups/Telegram keep the
    relay title — the day-note pipe can't see those streams);
  - the QC transcript beat is RETIRED in sync-heartbeat.js (runner kept for
    manual passes);
  - `scripts/merge-wa-conversation-notes.ts` (dry-run default, `--commit`,
    rental by default) merged every retired stream — incl. the pre-08-26
    per-day titles (`WhatsApp · +<digits> · <date>`) and per-pass relay
    titles — into the canonical note: parses all three historic body formats,
    re-sorts chronologically, dedupes across renderings (media-prefix/link
    aware), carries noteTargets + attachment targetNoteIds over, soft-deletes
    the rest; retitles when no day note exists; rolls into `· #2` past 60k.
    Ran 2026-08-29: 4074 notes merged away, 434 retitled, 344 cards, 0
    skipped, re-run is a no-op.
- **Notes READ like WhatsApp now (2026-08-29 PM, owner reviewed merged
  cards).** `scripts/merge-wa-conversation-notes.ts` gained a phase-2
  normalization pass over every conversation note:
  - every line re-rendered as a chat bubble — `HH:MM ← ClientName: text` /
    `HH:MM → OfficerName: text` (officer = the line in use at that moment via
    `modules/board/owners.ts`; outbound rows carry no line slug, so the
    officer is inferred from the conversation's line timeline — nearest in
    time);
  - MISSING OUTBOUND lines backfilled from the platform `message` table
    (the source of truth; same tail9 identity rule as the relay's
    loadRecentTwoWay, groups and `[no message]` excluded);
  - media compacted to one line per item by `twenty/chat-line.ts`
    (`🎙 Voice — transcript · 🔗 Listen`, `📷 Photo — desc≤80 · 🔗 View`) —
    links only when the file is on disk (re-minted via media/token.ts), and
    disk files with no Twenty attachment get uploaded+attached; fileless,
    transcriptless media becomes `🎙 Voice note (unrecoverable — line was
    offline)` for the 08-26→08-29 dead window, `(unrecoverable)` otherwise;
  - pure rendering/parsing lives in `src/platform/integrations/twenty/
    chat-line.ts` (vitest-covered); the merge script is the runner.
  Note: a stale pm2 God resurrected the retired QC writer for a few hours
  (17 "💬 Chat transcript (auto)" notes, 13:15–15:06 UTC) — folded back by
  this pass. One God, ever.
- **Media already works** — images, documents and audio (`.ogg`/`.opus`/`mp3`/
  `m4a`/`wav`) upload as attachments; video is deliberately skipped. When "the
  audio stopped working", suspect the projector, not `media-attachment.ts`: a
  drizzle `sql` template with an interpolated ARRAY binds as ONE text param, so
  `ANY(${lids})` reached Postgres as `ANY(($1))` and killed the whole wa→twenty
  push for every tenant from 2026-08-24 until 08-25, silently.

### 4. Overview Dashboard
- **Goal:** Manager KPIs page showing real counts: new leads, open deals, unread messages, fleet status, today's returns.
- **Files to create:** `app/(tenant)/[tenantSlug]/page.tsx`, `components/dashboard/OverviewDashboard.tsx`.
- **Data source:** Count queries from existing tables (no new schema needed).

### 5. Booking / Rental Table
- **Goal:** Core rental operations. A customer books a vehicle → rental record created → vehicle status changes to `on_rent`.
- **Files to create:** `modules/rental/schema.ts` (or add to main schema), `modules/rental/queries.ts`, `modules/rental/actions.ts`.
- **Schema:** `rental` table with tenant_id, vehicle_id, customer_id, start_date, return_date, status (active/due_today/overdue/completed), balance_due.

## Common Pitfalls

- **`returning()` in Drizzle 0.45 with node-postgres** returns `any[] | QueryResult<never>`. Always do:
  ```ts
  const rows = await tx.insert(table).values({ ... }).returning();
  const row = Array.isArray(rows) ? rows[0] : rows;
  ```
- **`__dirname` doesn't work** in ESM (`"module": "esnext"`). Use `import.meta.filename` or `import.meta.dirname`.
- **Pg-boss v12 API:** `boss.work(name, async (jobs) => { const job = jobs[0]; ... })` — receives an array, not a single job.
- **Port conflicts:** If `npm run dev` fails on port 3000, another Next.js app is running. Use `npm run dev -- --port 3001`.
- **Neon SSL warning:** Harmless — `sslmode=require` is treated as `verify-full` in pg v8.

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL=postgresql://... (Neon pooled connection)
DATABASE_URL_DIRECT=postgresql://... (Neon direct connection for pg-boss)
AUTH_SECRET=...
AUTH_URL=http://localhost:3000
PILOT_USERNAME=... (optional — falls back to mock)
PILOT_PASSWORD=...
```

Optional (feature enablement):
```
ANTHROPIC_API_KEY=...        (Claude AI; without it the heuristic provider is used)
RESEND_API_KEY=...           (email delivery; without it emails log to console)
AUTH_EMAIL_FROM="TAKE Auto <noreply@yourdomain.ae>"  (verified Resend sender)
PLATFORM_ADMIN_EMAILS=a@x.com,b@x.com   (promoted to platform_admin on boot)
DB_APP_ROLE=app_runtime      (enforce RLS via non-bypass role; run npm run db:app-role first)
```

## How to Start Working

```bash
cd platform
npm install          # if new deps needed
npm run migrate      # apply any pending migrations + FORCE RLS
npx tsx scripts/seed-rental-booster.ts   # reset demo data if needed
npm run dev          # starts on localhost:3000
```

**Demo URLs:**
- `http://localhost:3000/take-auto/crm`
- `http://localhost:3000/take-auto/messages`
- `http://localhost:3000/take-auto/customers`
- `http://localhost:3000/take-auto/fleet`

## Decision Log

| Decision | Status | File |
|---|---|---|
| Supabase for production DB | **REJECTED** — vendor lock-in contradicts Goal 5 | ADR-001 v2 §23.3 |
| Neon for CI, Hetzner for prod | **Locked** | ADR-001 v2 §23 |
| pg-boss over BullMQ | **Locked** | ADR-001 v2 §12 |
| Auth.js v5 + Better Auth spike | **In progress** — spike due Week 2 | ADR-001 v2 §24 |
| SSE over WebSockets | **Locked** for v1 | ADR-001 v2 §5 |
- **Fines & Salik hub page (2026-09-19):** `/fines` (hub route group) renders the RTA-fines + Salik table WITHOUT Google creds on the box: `scripts/update-fines-tab.mjs` (hourly launchd on the office Mac, where the Google login lives) rewrites the Google "Fines" tab, then PUSHES the same `{header, rows}` to `POST /api/webhooks/fines?token=` (FINES_PUSH_TOKEN, unset = 500) → `fines_snapshot` single-row mirror (0078). The page's `/fines/api` reads the DB only. Push failure never fails the sheet run (config `scripts/.fines-push.json`, gitignored). "Notes" edits still happen in the Google sheet — it stays the source of truth.

## RMA rental operations (2026-11-18)

- `0086_rental_operations.sql` adds reviewed customer-document OCR data, whole-paid-term mileage operations, return/extension state, a deduplicated `rental_charge` ledger (fine/Salik/Parkin/Parkonic), charge-linked payments and audited charge-linked engine blocks. Do not apply it before `0083`, `0084`, and fleet migration `0085`.
- `/operations` is the per-car manager screen. `/charges` is the operational fines/tolls/parking screen; the older `/fines` RTA lookup remains available.
- Mileage allowance is `rental.total_days × daily_mileage_limit_km` (RMA default 150), not elapsed return days and not a separate daily cap.
- The fine debt clock starts from `wa_outbox.sent_at`, never queue time. `scripts/run-rental-operations.ts` is dry-run unless `--commit`; RTA sync needs `--sync-fines`, Salik needs `--sync-salik`; blocking additionally needs `--block-overdue-fines` and fresh stopped/ignition-off Pilot telemetry belonging to the current rental.
- The restored Salik connector is `src/platform/integrations/salik/client.ts`; its account JSON is gitignored. `src/modules/rental-charges/salik.ts` imports exact decimal tolls by Dubai event time. Hourly RTA/Salik/Parkin/Parkonic timer units are in `deploy/rma-rental-operations.*`, and `/charges` has selected-car sync buttons. Standalone operations scripts must run with `npx tsx --conditions=react-server` so the `server-only` package resolves to its server build. Automatic customer notifications require both `RMA_OPERATIONS_NOTIFICATIONS_ENABLED=true` and a valid `RMA_OPERATIONS_NOTIFICATIONS_AFTER`; the timer defaults them OFF so imports never send backlog notices.
- `PARKING-FEEDS.md` documents the authenticated Parkin/Parkonic JSON connector, scheduled CSV fallback and exact operator access still required. Feed and CSV imports are idempotent and never bulk-notify customers; no official operator credentials/schema were available, so live operator pulls remain unverified.
- `0090_tars_automatic_submission.sql` adds reviewed automatic TARS submission state. `TARS_AUTO_SUBMIT_ENABLED=true` enables the manager review → separate confirm flow; `TARS_AUTO_SUBMIT_DRY_RUN` defaults to true. The runner reconciles an existing agreement before every attempt, retries transient failures, audits every attempt and never presses final Submit in dry-run. Production automatic submission stays disabled until an authenticated TARS browser session and a dry-run on test data are approved; manual handoff remains available.
- Full implementation/release notes: `RENTAL-OPERATIONS-2026-11-18.md`.
- `0089_rental_onboarding.sql` adds the six-stage rental onboarding pipeline and Taqeeq signing state. The manager kanban is `/{tenant}/onboarding`; the original first-run workspace wizard is now `/{tenant}/onboarding/setup`. Taqeeq uses an RMA-specific `DOCUSEAL_API_TOKEN`, `DOCUSEAL_TEMPLATE_ID`, optional `DOCUSEAL_SUBMITTER_ROLE` (default `Client`) and `DOCUSEAL_URL` (default `https://app.taqeeq.ae`). `FLEET_HOME_SLUG=rma` is required for the standalone RMA database. Signature confirmation re-fetches Taqeeq before marking a rental signed. TARS automatic submission is separately feature-flagged and defaults to dry-run; production keeps it disabled until its authenticated browser session is validated.
- Fleet **Delete** now means confirmed permanent deletion: `deleteVehiclePermanently()` requires `DELETE`, removes the vehicle and linked operational history in one transaction, preserves customers/deals, and leaves an audit event. **Mark as Sold** keeps the vehicle in the Sold filter and blocks live `reserved`/`on_rent` handoffs. The older `deleteVehicle()` soft-delete and Deleted/Restore view remain for archived rows.
- `0090_rental_long_term.sql` makes active `extension_status='long_term'` rentals open-ended in calendar/availability queries and unbounded in `rental_no_overlap_active`. `markRentalAsLongTerm()` is manager-only; confirming a fixed return date switches the rental back to `extension_confirmed`. Long-term rentals do not get old-date return reminders or overdue flags, and vehicle finder/creation/extension guards treat them as occupied.
