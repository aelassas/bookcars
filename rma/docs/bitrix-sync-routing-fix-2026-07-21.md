# Bitrix24 → Platform sync mapping — stage + owner — 2026-07-21

**Scope (owner directive, 2026-07-21):** Bitrix is now **archive-only backfill**;
the platform is the replacement CRM, not a mirror. **Value/OPPORTUNITY mapping is
dropped** — those numbers are declared fiction; the platform counts its own
vouched numbers. Only **two** Bitrix→platform mappings survive:

1. **Responsible person** — `ASSIGNED_BY_ID → deal.owner_id` (by email), needed
   until lead coordinators take over assignment in-platform.
2. **Stage** — Bitrix funnel stages → platform stages, deterministic + documented.

All findings below are from **real prod evidence** (read-only): the live webhook
(`user.get`, `crm.deal.list`, `crm.dealcategory.stage.list`) and the prod
platform DB on the box.

---

## 1. Stage mapping (the main fix)

**Root cause:** Bitrix `STAGE_ID` for every non-default funnel is **prefixed**
(`C6:UC_FLL5Y2`, `C6:WON`, `C6:LOSE`). The old map matched bare codes only, so
**every** category 2/4/6/8/10 deal collapsed to `inquiry/open` — including WON
and LOSE deals, which stayed "open inquiry".

**Measured impact (read-only, stored raw Bitrix payloads):**

- **6,529** deals whose Bitrix stage is `*:LOSE` were stored as **`open`** (6,315 are `C6:LOSE` alone).
- **153** `*:WON` deals were stored as **`open`**.
- **6,725** category-6 deals were **all collapsed into `inquiry`** regardless of real stage.
- **6,942** total prefixed-stage deals corrected by the new mapping.

**Fix:** strip the `C<n>:` prefix for the status test (`WON`→won,
`LOSE`/`APOLOGY`→lost, else open), and map `stage` off a deterministic table
keyed on the **full** `STATUS_ID` (because `EXECUTING`/`FINAL_INVOICE` mean
different things per funnel). Unknown funnels fall back to a monotonic suffix map.

### Stage table (`STATUS_ID` → platform stage) — from live funnels 2026-07-21

**cat 6 — Отдел Продаж (Azat's sales funnel):**

| Bitrix stage | Name | → platform |
|---|---|---|
| `C6:NEW` | Новая заявка | inquiry |
| `C6:UC_FLL5Y2` | Выявление потребности | inquiry |
| `C6:PREPAYMENT_INVOICE` | КП отправлено | quote |
| `C6:EXECUTING` | Прогрев КП | quote |
| `C6:UC_0MI2QI` | Встреча назначена | contract |
| `C6:FINAL_INVOICE` | Встреча проведена | contract |
| `C6:UC_S86GRC` | Отправил на СБ | handover |
| `C6:UC_LWVEC3` | Одобрено СБ | handover |
| `C6:WON` | Сделка успешна | closed (status=won) |
| `C6:LOSE` | Сделка провалена | closed (status=lost) |

Full tables for cat 0/2/4/8/10 are enumerated in `mappings.ts` (`DEAL_STAGE_MAP`).

### Before / after — 3 real deals

| Bitrix ID | Bitrix `STAGE_ID` | BEFORE (platform) | AFTER (new mapping) |
|---|---|---|---|
| **187988** | `C6:LOSE` | `stage=inquiry status=open` | `stage=closed **status=lost**` |
| **187732** | `C6:EXECUTING` | `stage=inquiry status=open` | `stage=**quote** status=open` |
| **187916** | `WON` (cat 0) | already `closed/won` (bare code matched) | unchanged `closed/won` |

Unit-checked against 8 real payloads; result: LOSE→lost, EXECUTING→quote,
FINAL_INVOICE→handover, WON→won — all correct.

---

## 2. Owner mapping (`ASSIGNED_BY_ID → owner_id`)

**State:** already works for **active** staff — Azat's deals (Bitrix user 73362,
`azatyagdyyev@gmail.com`) correctly carry `owner_id`. The gap is **historical**:
`user.get` returns **active users only** by default, so deals assigned to former
employees never resolved → NULL owner ("2,567 open deals without owner").

**Fix:** `syncBitrixUsers` now runs a best-effort **inactive-user pass**
(`user.get filter ACTIVE=N`) after the active pass, deduped by Bitrix ID.
Verified on the box: the inactive pass returns **45 users (43 with email)** —
former salespeople who will resolve to `owner_id` on the next full reconcile.
The email-match mechanism itself is unchanged.

**Surfacing (uses owner mapping):** the kanban gained an optional `ownerId`
filter (`getKanbanSummary` / `getKanbanStageDeals`) and a **My deals / All**
toggle, defaulting to "My deals" for the plain `sales` role — so a salesperson
opening CRM sees **his** line. `KANBAN_LIVE_WINDOW_DAYS` and the archive drawer
are untouched.

---

## Value mapping — REMOVED per directive

`mapBitrixDealToDeal` no longer imports `OPPORTUNITY`/`BALANCE`. `value` and
`balanceDue` are left to the platform's own defaults and are **never overwritten
from Bitrix**. (Diagnostic note retained for the record: value mapping was never
actually broken — Azat's 250k/600k/1M deals stored correctly; the `0` cards were
genuine category-0 "(Копия)" duplicates with `OPPORTUNITY=0`. Moot now.)

---

## Files changed (local, uncommitted — coordinator commits/deploys)

- `src/platform/integrations/bitrix24/mappings.ts` — prefix-aware stage/status tables; value/balanceDue import removed.
- `src/platform/integrations/bitrix24/sync.ts` — inactive-user pass for owner coverage.
- `src/modules/crm/queries.ts` — optional `ownerId` ("me") on `getKanbanSummary` / `getKanbanStageDeals` / `getDealsPaginated`.
- `src/components/crm/PipelineBoard.tsx` — My deals / All toggle, threads `ownerId`.
- `src/components/crm/CrmDashboard.tsx`, `src/app/(tenant)/[tenantSlug]/crm/page.tsx` — pass `currentUserId` + `defaultMine` (sales default).

## Verification

- **My files: `tsc --noEmit` clean.** The one remaining tsc error is in
  `queries.ts` line ~455 from a **concurrent worker's edit** (card-minimalism:
  `customerName`/`ownerName`/`vehicleLabel`/`aiNote` added to `KanbanDeal` but not
  yet wired into `getKanbanStageDeals`). Not mine, not touched — flagged for the
  coordinator to sequence.
- Stage impact quantified read-only (numbers above). **No prod writes performed.**

## To take effect

Stage + owner mappings re-map **existing** rows on the next **full reconcile**
(`run-bitrix-sync.ts`, no `modifiedSince` → re-processes every deal via the update
path). Recommend: deploy, run one full Bitrix reconcile for `take-auto`, re-check
the 6,942 corrected rows and owner coverage.
