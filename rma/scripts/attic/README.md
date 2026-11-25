# scripts/attic

One-shot TAKE-era migration/repair scripts (Bitrix, Twenty, Dubizzle, CallGear
backfills and merges). They ran once against the old deployment, reference
tenants that do not exist in the RMA database, and are kept only for history —
nothing here is scheduled or imported. Do not run them against RMA.

Moved here 2026-11-03 during the ponytail audit cleanup. If one is ever
needed again, move it back to `scripts/` and re-verify its tenant mapping
first (several default to `take-auto`).
