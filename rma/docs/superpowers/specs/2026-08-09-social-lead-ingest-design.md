# Dubizzle + Facebook + Instagram lead ingest — findings and draft design

Status: **DRAFT — brainstorm paused mid-flight on 2026-08-09 at owner's request.**
Approach was chosen; the detailed design sections were never presented or approved.
Do not implement from this document. Resume the brainstorm tomorrow, finish the
design sections, then write a plan.

---

## 1. The headline finding

**Dubizzle leads already arrive. We throw them away.**

Customers who tap the WhatsApp button on our Dubizzle listings land in our own
WhatsApp stream with a prefilled message. Nobody parses it, so it never becomes a
lead with `source = 'dubizzle'`, and in most cases never becomes a customer record
at all.

Measured on the live DB (`takes`, database `mycrm`) on 2026-08-09:

| fact | value |
|---|---|
| Real inbound Dubizzle enquiries in `message` | **23** |
| Date range | 2026-07-11 → 2026-08-09 (still arriving today) |
| …that never got a `customer_id` | **20 of 23 (87%)** |
| Facebook/Instagram click-to-WhatsApp enquiries | **0** |

Split by brand (the advertiser name is inside the message body):

| advertiser in message | our tenant | leads | first | last |
|---|---|---|---|---|
| `E T M CAR RENTAL CO` | `easyrent` (its `tenant.name` is literally "ETM") | 15 | 2026-07-17 | 2026-08-08 |
| `CARDIWAN FOR CAR RENTAL CO. L.L.C` | `cardiwan` | 8 | 2026-07-11 | 2026-08-09 |

This matches what the owner said: the Dubizzle listings belong to the two rental
brands. Roughly one enquiry every 1.3 days, and ~87% of them evaporate.

### The message shape

```
Hello! I'm interested in this vehicle advertised by CARDIWAN FOR CAR RENTAL CO. L.L.C
on dubizzle. Link: https://dubizzle.com/s/NwCXZ Reference key: 5076/9139 A
```

Three usable fields, no API required:

- **advertiser name** → routes the lead to the right tenant (`cardiwan` / `easyrent`)
- **short link** `dubizzle.com/s/XXXXX` → the listing
- **reference key** → the dealer's own stock reference, i.e. a candidate join to `vehicle`

The sender's phone and WhatsApp display name come free with the message, so a
Dubizzle lead can be created with name + phone + car + source in one pass.

### The trap: our own bot pollutes the same search

166 messages containing "dubizzle" are **our own output** — the arbitrage enricher
(`scripts/run-dubizzle-enrich.ts`, `scripts/dz_search.py`) posting "🛒 …found on
Dubizzle:" plus the oversight/morning-digest bots. Any detector must key on the
inbound prefilled pattern (`advertised by … on dubizzle` + `Reference key:`), not on
the word "dubizzle", or it will manufacture hundreds of phantom leads from our own
notifications.

## 2. Facebook / Instagram: today's reality

FB/IG leads reach us **only through the Bitrix connector**, mirrored into `lead.source`
as Bitrix SOURCE_ID composites:

| tenant | source | leads | first | last |
|---|---|---|---|---|
| `take-auto` | `46\|fbinstagramdirect` | 2 753 | 2026-01-13 | **2026-08-08 — live** |
| `easyrent` | `14/68/48\|fbinstagramdirect`, `72/74\|facebook` | 995 | 2023-01-27 | **2025-02-14 — dead ~18 months** |
| `cardiwan` | — | **0** | — | — |

We have **no Meta channel of our own**: no app, no webhook, no page tokens. And there
is no click-to-WhatsApp path either — zero prefilled Meta messages in 62 458 WhatsApp
messages. So for Meta, unlike Dubizzle, there is nothing to salvage; it has to be built.

## 3. Decisions taken so far

| question | answer |
|---|---|
| What counts as a Meta lead | All four surfaces: Lead Ads forms, IG Direct + Messenger, post comments, click-to-WhatsApp |
| Meta Business access | Full admin — the official API path is open |
| Bitrix connector | **Runs in parallel**, untouched. Deduplicate rather than cut over |
| Dubizzle channels | Email, WhatsApp button, dealer dashboard, phone — all four eventually |
| Brands | All three (`take-auto`, `cardiwan`, `easyrent`) have FB/IG pages |
| Approach | **A — our own Meta ingest + separate Dubizzle ingest**, with B (Zapier bridge) only if App Review blocks us |

### Approach A in outline

Meta sends every page's events to **one** callback URL per app — the per-tenant-token
pattern used by `/api/integrations/whatsapp/[token]` does not transfer. So:

- One endpoint, e.g. `/api/integrations/meta`, routing by `entry[].id` (page_id).
- A `meta_page` table: `page_id`, `ig_business_id`, `tenant_id`, encrypted page token.
  This mapping is mandatory, not optional.
- Signature check reuses the existing `X-Hub-Signature-256` verifier from
  `src/platform/integrations/whatsapp/verifier.ts`.
- Raw payload → `integration_event` (`provider = 'meta'`, `provider_event_id` =
  `leadgen_id` / `mid` / `comment_id`). Deduplication comes free from the existing
  unique constraint.
- Four projectors: `leadgen` → lead; `messages` → conversation (same shape as
  WhatsApp); `feed` → comment; CTWA referral → tag on the WhatsApp line.
- Dubizzle is a **separate, independent ingest** — no Meta involvement.
- Webhooks never 5xx (ADR-001 §11), same as every other integration here.

The public HTTPS endpoint Meta requires already exists: the Tailscale Funnel serves
`takes-mac-studio.tail4de2d7.ts.net` with valid TLS. No extra tunnel needed.

### Suggested build order (cheap and certain first)

1. **Dubizzle-via-WhatsApp detector** — pure parsing of data we already hold. No
   external dependency, no credentials, no review. Recovers a live leaking channel
   and can be backfilled over the existing 23 messages.
2. **Meta Lead Ads webhook** — the highest-volume Meta surface.
3. **IG Direct + Messenger** into Conversations.
4. **Comments**, then **Dubizzle email (IMAP)**.
5. **Dubizzle dashboard scraping** and **calls** — last, and only if still needed.
   Calls are entangled with the deferred FreePBX/GoIP decision.

## 4. Open questions for tomorrow

1. **App Review or System User token?** The pages belong to the same Business as the
   app, which may allow a System User token without public App Review. Unverified —
   do not assume either way. This determines whether the Zapier bridge is needed at all.
2. **Why did easyrent's Meta flow stop on 2025-02-14?** Deliberate, or a broken
   connector nobody noticed for 18 months?
3. **Duplicate tenants:** both `easyrent` and `etm` exist with `name = 'ETM'`. Which is
   canonical? Dubizzle leads currently land on `easyrent`.
4. **Dubizzle mailbox:** which address receives the "new lead" emails, and can we read
   it over IMAP?
5. **Reference key → vehicle:** does `5076/9139 A` actually join to anything in
   `vehicle`, or is it Dubizzle-internal?
6. Should a recovered Dubizzle lead fire the existing push-first WhatsApp notification
   to staff, or land silently?

## 5. Evidence

All figures above come from read-only queries against `mycrm` on `takes`, 2026-08-09.
The two that matter most:

```sql
-- Real Dubizzle enquiries, excluding our own bot's output
select count(*), min(created_at)::date, max(created_at)::date
from message
where direction = 'inbound'
  and body ilike '%advertised by%'
  and body ilike '%dubizzle%';

-- How many were dropped on the floor
select customer_id is not null as has_customer, count(*)
from message
where direction = 'inbound'
  and body ilike '%advertised by%'
  and body ilike '%dubizzle%'
group by 1;
```
