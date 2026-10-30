# Product/UX layer — MyCRM (TAKE Auto) — worker report

**Branch:** main (no commits — coordinator owns commit/deploy)
**Scope:** intent watchers, deterministic routing, "Пульс машины" panel, research.
**Verification:** `tsc --noEmit` = 0 errors project-wide; `vitest` = 13/13 pass
(9 routing + 4 pre-existing board-auth). Prod facts pulled read-only over SSH
`takes` against the live Postgres (tenant `take-auto`).

---

## 0. Key prod finding that shaped the design

All **225** live-open deals are `type = 'rent'` — the Bitrix import never
differentiated `type`. So `deal.type` says nothing about what the customer
wants; the only real signal lives in the Russian Bitrix stage + the deal
ref/notes. **That is exactly why intent needs its own explicit field**, not a
reuse of `type`. Confirmed: `0` deals are attached to a `vehicle_id` yet (the
car-finder is new), so the Pulse panel leans on brand/model text demand.

---

## 1. Watchers by intent

**Data model.** Added `deal.intent text` (nullable) — migration
`drizzle/0051_deal_intent.sql` (`ADD COLUMN IF NOT EXISTS` + partial index,
idempotent, safe if the extraction fable's migration adds it first) + schema +
snapshot/journal. **One shared column, two writers**: the deal-card picker
today, the messaging AI tags later — no conflicting column set.

**Taxonomy** (`modules/crm/intent.ts`, pure/isomorphic):
`rent | lease_6m | lease_12m | lease_to_own | sale`, RU labels, and a
conservative `deriveIntent()` fallback (keyword → type → default `rent`) so the
board is never empty before anyone tags.

**Board** (`/watchers`, `getWatchersBoard` + `WatchersBoard.tsx`): columns by
intent, cards show headline (customer→ref fallback), **owner initials**,
**days-since-touch** (amber ≥7d, red ≥14d), and a `?` marker when the intent is
derived, not confirmed.

### Watchers board on real prod data (derived intent, 225 live deals)

| Column | Count |
|---|---:|
| Аренда (rent) | **219** |
| Лизинг 6 мес | 1 |
| Лизинг 1 год | 3 |
| Выкуп (lease-to-own) | 2 |
| Продажа | 0 |

The heuristic correctly lifts the **6 lease/выкуп deals out of the 219-deal rent
mass** that `type` hides completely — e.g. `Mercedes G63 2022 Stock - 12 months`
(AY, 24d) → Лизинг 1 год; `Cash or lease-to-own - budget 100-150K` (AY, 38d) →
Выкуп. A manager confirming/overriding via the card picker is the last word.

**Deal card picker** (`DealEditor.tsx`): fast one-click intent chips → server
action `setDealIntent` (audit-logged, does **not** restamp `last_activity_at` so
"days since touch" stays honest). The in-effect derived intent is shown as
`(авто)` until confirmed.

## 2. Routing rules engine (deterministic)

`modules/messaging/routing.ts` — pure `routeMessage(ctx)` with strict
precedence, `routing-apply.ts` — DB glue + `audit_event` on auto-assign.

- **(a) name_match** — a manager's first name in the body. Exactly one match →
  **apply (auto-write)**; two+ → **propose**.
- **(b) open_thread** — customer already has an owner (open deal/lead by phone) →
  **apply** (re-thread returns to owner).
- **(c) brand_default** — car brand → business line (exotic→lux, everyday→rent,
  Merc/BMW→lease). Line, not a person → **propose only**, never auto-writes.
- else → **propose** coordinator queue "На распределение".

### Decisions for the 3 real messages (unit-tested, `routing.test.ts`)

| Message | Rule | Action | Owner / shortlist | Reason |
|---|---|---|---|---|
| "Hi Azat, is the Patrol available?" | name_match | **APPLY** | → Azat Yagdyyev | single exact team-name match — customer asked for him |
| "need a lamborghini aventador…" | brand_default | **PROPOSE** | lux desk shortlist | brand=Lamborghini → люкс-линия; no hard owner, human confirms |
| "Question about the FJ cruiser…" | brand_default | **PROPOSE** | rent desk shortlist | brand=Toyota → рент-линия (lease desk excluded) |

Precedence guards are tested too: an explicit name **outranks** an existing
owner; a name inside a larger word ("firuzabad") does **not** match (Cyrillic-safe
boundary). Sales pool verified on prod (Azat, Firuz, Babek-Rent, Muhammed-Lease…).

## 3. "Пульс машины" side panel

`getVehiclePulse` (`modules/fleet/pulse-queries.ts`) + collapsible
`VehiclePulsePanel.tsx`, mounted on the vehicle profile
(`fleet/[vehicleId]`). Per car: **demand count** (direct `vehicle_id` links +
brand/model text match), **last toucher + date**, **last customer line**, and a
3-deal drill-down. Compact one-line collapsed, RU labels. Prefers the extraction
fable's `demand-queries.ts` if/when it lands; computes it itself until then.

### Real Pulse output from prod (brand-text demand, since 0 vehicle_id links)

| Vehicle | Live demand |
|---|---:|
| Nissan Patrol | **5** |
| Cadillac Escalade | 4 |
| Jetour T2 | 4 |

Nissan Patrol drill-down → last toucher **Mohammad Imad, 4 days ago**, last line
`Nissan Patrol Nismo 2026 - calculations…` (+ Azat 12d, Mohammad 23d). This is
the DOM the panel renders: a real, non-zero pulse from live data.

## 4. Research — 3 UI patterns stolen from respected OSS

**Plane** (makeplane/plane) — *group-by-any-property kanban*. Plane lets you
regroup the same issues by any property (state, assignee, priority) into stacked
columns, each with a live WIP count chip, and cards carry a compact "updated Nd
ago" stamp. Stolen for the Watchers board: intent is just another group-by axis,
per-column count badges, and the days-since-touch chip. Why: managers think in
"who's stalling", and a count + age chip makes a rotting column obvious without
opening a card.

**Twenty** (twentyhq/twenty) — *stay-in-context record panel*. Twenty surfaces
record detail in a right-hand slide-over with a tight key/value `dl` instead of a
full page nav, keeping the list in view. Stolen for "Пульс машины": a compact,
collapsible key-value strip (demand / last toucher / last line) that lives on
the vehicle row and never steals the whole screen. Why: fleet users scan many
cars; a full-page hop per car kills the scan.

**Chatwoot** (chatwoot/chatwoot) — *deterministic auto-assignment + agent
avatars + audit*. Chatwoot routes conversations by rule/round-robin, shows the
assignee as an avatar chip, and logs who got assigned and why. Stolen for the
routing engine: precedence rules, an `audit_event` on every auto-assign/propose,
and owner **initials** avatars on every Watchers card. Why: auto-routing is only
trusted if it's inspectable — the audit trail + visible owner make it so.

*(Also reviewed: Frappe CRM — per-column WIP badges + coloured stages; Krayin —
drag-drop pipeline + activity timeline; Fleetbase — dense fleet rows with an
expandable per-vehicle drawer. These reinforced the density/expandable-drawer
choices above.)*

---

## Files modified / added

**Added:** `drizzle/0051_deal_intent.sql`, `drizzle/meta/0051_snapshot.json`,
`src/modules/crm/intent.ts`, `src/modules/messaging/routing.ts`,
`src/modules/messaging/routing.test.ts`,
`src/modules/messaging/routing-apply.ts`,
`src/modules/fleet/pulse-queries.ts`,
`src/components/crm/WatchersBoard.tsx`,
`src/components/fleet/VehiclePulsePanel.tsx`,
`src/app/(tenant)/[tenantSlug]/watchers/page.tsx`.

**Edited:** `src/platform/db/schema.ts` (deal.intent),
`drizzle/meta/_journal.json`, `src/modules/crm/actions.ts` (setDealIntent),
`src/modules/crm/queries.ts` (getWatchersBoard),
`src/app/(tenant)/[tenantSlug]/deals/[id]/DealEditor.tsx` (intent picker),
`src/app/(tenant)/[tenantSlug]/deals/[id]/page.tsx` (pass intent/stageDetail),
`src/app/(tenant)/[tenantSlug]/fleet/[vehicleId]/page.tsx` (mount Pulse),
`src/components/layout/Sidebar.tsx` (Наблюдатели nav).

## Coordination notes for the coordinator
- **Migration 0051 not yet applied to prod** — needs `npm run migrate` on deploy.
- **Shared `deal.intent` — CONFIRMED interop with the extraction fable.** Their
  `extract.ts` emits `ExtractIntent = rent|lease|lease_to_own|sale` + a separate
  `termMonths`; they persist **no** intent column yet (no `vouched_*` migration
  landed), so `deal.intent` (0051, `IF NOT EXISTS`) is the single home. I added
  `fromExtractIntent(intent, termMonths)` in `intent.ts` that maps their 4-value
  pair onto my 5-value column (`lease` + term≤6 → `lease_6m`, else `lease_12m`).
  **Action for the extraction fable / coordinator:** when their vouch rollup
  writes intent, call `fromExtractIntent(...)` and write `deal.intent` — do not
  add a second column.
- Routing `applyRoutingToDeal` writes owner on `apply`; it's not yet wired into
  the live inbound pipeline (message↔deal linkage is the other fable's area) —
  `routeInbound` is ready to call once a deal id is resolvable from a message.
