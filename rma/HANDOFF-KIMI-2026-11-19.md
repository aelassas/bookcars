# Handoff → next agent (2026-11-19)

Scope: RMA CRM, branch `feat/rma-meeting-20261117`.

## 1. Production hosting — read this first

- **RMA deploys only to `rma-vps` (`31.97.105.52`, `srv2077538.hstgr.cloud`), its own Hostinger VDS.**
- **Never use `takevps` / `187.127.219.106` for RMA.** The earlier agent deployed there by mistake. That copy is not used by RMA production and has no runtime role; it was not touched further.
- Public URL: `https://crm.rma.network`; DNS points directly to `31.97.105.52`.
- App: `/opt/rma-crm/platform`; systemd `rma-crm`; Next.js port `3003`; Caddy on the same VDS.
- PostgreSQL: local Docker `rma-platform-db`, loopback port `5434`, database `platform`.
- OTP mail: local Docker `rma-mail` on the same VDS. No Neon or external production DB is used.
- Canonical deploy and TARS runbook: `rma/docs/DEPLOY-HOSTINGER.md`. The same hosting warning is the first block in both root `AGENTS.md` and `rma/AGENTS.md`.

## 2. Delivered and verified

### Correct production deploy

- `cee299a6` corrected the production topology and deployed migrations `0083`, `0084`, `0086–0089` to the real RMA VDS.
- `45337fe1` adds the final fleet UI/actions covered below.
- `scripts/with-rma-service-env.py` runs migrations/scripts with the live systemd environment without printing secrets. A bare `npm run migrate` on the VDS is invalid because the server does not keep those variables in `.env.local`.
- Final migration status: zero pending.

### TARS full-history import — complete

Commits: `4c774afd`, `8fba69fb`, `fdb7f711`.

- Email OTP works end to end. TARS selects `input[name="sfaChoice"][value="mail"]`; the entry form is `#passcode` + `#btn_mfa_login`.
- RTA currently sends a **4-digit** code in `Authentication Code (OTP)`. `scripts/tars-otp-poller.py` extracts 4–8 digits only from that phrase after quoted-printable/HTML decoding. Do not extract a bare six-digit number from HTML/CSS.
- 53 unique rental documents imported, with start dates from **2026-01-16 through 2026-11-19**. `size: 500` is page size, not a history limit; the client follows `meta.hits` and deduplicates by TARS identity.
- 21 VINs: 17 existing vehicles updated, 4 inserted; **23 vehicles total**.
- 41 customers planned: 40 inserted, 1 existing updated; **49 customers total**.
- Rentals: 52 inserted and one existing active rental updated with its TARS document number; **53 unique TARS rentals total**.
- Vehicle matching is VIN-first, then normalized plate, with one CRM row claimed at most once. Two different VINs sharing `G 5902` remain separate with separate histories.
- Legacy rental adoption requires matching VIN, UTC calendar dates, **and current status**. The active TARS contract was linked to the existing active row; the cancelled duplicate was not reactivated.
- Repeat dry-run after import: **21/41/53 updates, zero inserts and zero skips**.
- Last pre-import backup: `/root/rma-backups/pre-tars-import-final-20261119-143008.sql.gz` (gzip integrity checked).
- Temporary OTP and exported JSON files containing personal data were removed after verification. The gitignored local TARS session remains available for its normal short TTL.

### Fleet Sold and permanent deletion

Commit: `45337fe1`.

- **Mark as Sold** keeps the vehicle in the **Sold** filter and out of operations. `reserved` and `on_rent` still block this shortcut; overdue cars can be sold.
- **Delete** now means permanent deletion after typing `DELETE` in an explicit irreversible-history warning.
- `deleteVehiclePermanently()` removes the vehicle and linked operational history in one transaction: rentals, leases, payments, charges, engine blocks, documents, timeline and ledger. Customers and CRM deals are preserved; deal vehicle links are cleared, and an audit event remains.
- `src/modules/fleet/permanent-delete.test.ts` verifies the full dependency chain and cleans up its isolated tenant. It passed locally and on the actual RMA production schema; the real 23 vehicles and 53 TARS rentals were unchanged.
- Production browser E2E also passed with a disposable RMA member and vehicle: **Mark as Sold** appeared in the Sold filter, then **Delete → DELETE** removed the vehicle from the UI and database. Temporary user, membership, vehicle, and test audit rows were cleaned afterward.

## 3. Validation record

- Production build passed locally and on `rma-vps`.
- Targeted TARS sync tests, auth action-guard tests, OTP plain/HTML self-checks, changed-file ESLint, and the permanent-delete DB test passed.
- `migrate:status` on production: zero pending.
- Production HTTP checks passed against `crm.rma.network` on `31.97.105.52`; root redirects to login and `/api/public/site-cars` returns 200.
- An older full-suite run had 1348 passes and one unrelated availability/store failure. The change set does not touch that module; it was not silently fixed.
- The repository-wide lint command still has its existing unrelated errors, and Next.js emits the already-known Edge/NFT warnings. Changed files lint clean.

## 4. What remains out of scope

- No recurring automatic TARS schedule was enabled. The verified path is fetch → JSON → reviewed dry-run → commit; no automatic RTA business writes were added.
- Onboarding kanban follow-up and Parkin/Parkonic operator feeds remain separate work.
- `backend/babel.config.js` is an unrelated pre-existing Bookcars modification and was never staged or committed by this work.
