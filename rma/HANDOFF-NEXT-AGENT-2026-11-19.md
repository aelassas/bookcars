# Handoff — next agent (2026-11-19)

> **Superseded operational notes.** RMA deploys only to its own Hostinger VDS, `rma-vps` (`31.97.105.52`); never use TAKE infrastructure or provision Neon for RMA production. Use `HANDOFF-KIMI-2026-11-19.md` and `docs/DEPLOY-HOSTINGER.md` for the current path. The historical TARS notes below explain the OTP investigation, not the current hosting target.

Branch: `feat/rma-meeting-20261117`
PR: https://github.com/PrimeTurkmen/R-CRM/pull/5

## Why you're reading this

The previous session pushed three rounds of work (weekly/monthly rates, dashboard tiles for the 9 meeting items, Mark as Sold, vehicle soft-delete + archive). Then we tried to pull real TARS data into the CRM and got blocked on the OTP delivery — details below.

## What's committed and pushed

1. **Weekly + monthly rate** on vehicles — editable in Edit, Create, Website fleet; shown on fleet card, profile, `/api/public/site-cars`. Migration `0087`.
2. **Dashboard `Rental operations` section** — 6 tiles aggregating the 9 meeting items (docs awaiting review, returns awaiting reply, extensions to confirm, service due, outstanding charges, active engine blocks).
3. **Mark as Sold** one-click fallback when `deleteVehicle` is blocked by linked history. New `markVehicleAsSold` action. Button on fleet grid + Edit modal.
4. **Vehicle soft-delete + Archive** — `deleteVehicle` now stamps `deleted_at` instead of hard-delete. New `restoreVehicle` action + Deleted filter chip on `/fleet` with Restore button. Migration `0088`.

Migrations `0083/0084/0086/0087/0088` all need `npm run migrate` on deploy.

## What's blocked — TARS sync

Goal: pull real fleet + rental contract history from `tars.rta.ae` into the RMA DB so the CRM shows factual data instead of mock.

- Existing TARS client is **READ-ONLY** (GETs only). Verified by inspection of `rma/src/platform/integrations/tars/client.ts` — no POST/PUT/DELETE methods.
- New script added: `rma/scripts/tars-fetch-to-json.ts` — logs in via Playwright SSO, pulls agency + vehicles + rentals, writes to `/tmp/tars-agency.json`, `/tmp/tars-vehicles.json`, `/tmp/tars-rentals.json`. No DB touched.
- Existing `rma/scripts/tars-sync.ts` upserts into the CRM DB with dry-run default and `--commit` for real writes.

**Blocker:** OTP delivery. Playwright reaches the "waiting for OTP" step successfully, but no OTP email arrives at the intended RMA mailbox. The last OTP emails to that mailbox were Nov 13 and Nov 17 — the current attempt produces nothing.

Possible causes to investigate:

- OTP may be registered to a different email on the TARS / RTA account.
- OTP may be configured to mobile; try `TARS_OTP_CHANNEL=mobile`.
- `Send OTP` button click may not actually fire in headless Chrome — try `headless: false` by editing `loginWithPlaywright` or reading its args.

Credential names required in `rma/.env.local` (gitignored):

```
TARS_USERNAME
TARS_PASSWORD
TARS_ORG_DID
TARS_BASE_URL
```

Read the values from the RMA credential store. Do not commit them or print them in logs. Mailbox IMAP credentials must also come from the credential store; do not store them in this handoff.

Scripts used:

- `/tmp/rma_otp_poller.py` — polls the mailbox, writes the OTP to `/tmp/tars-otp.txt`.
- `rma/scripts/tars-fetch-to-json.ts` — the fetch orchestrator.

## Next steps for you

1. **Unblock TARS OTP**: ask the user for the actual email/mobile the TARS OTP is registered to, OR run Playwright in headful mode (`headless: false`) and watch the flow.
2. **Pull the data**:
   ```bash
   cd rma
   npx tsx scripts/tars-fetch-to-json.ts   # writes /tmp/tars-*.json
   ```
3. **Provision an RMA Neon DB** (historical note only — none existed at that time; current production uses the RMA VDS PostgreSQL container). Use the owner's Neon org only if explicitly requested for a non-production environment. Add `DATABASE_URL` + `DATABASE_URL_DIRECT` to `rma/.env.local`.
4. **Run migrations**: `npm run migrate:baseline` (first time only, if DB already has some rows) or just `npm run migrate` on an empty DB.
5. **Seed demo tenant if needed**, then `npx tsx scripts/tars-sync.ts` (dry-run) → review plan → `--commit`.
6. **Open onboarding kanban** (user asked, still pending at the time of this handoff):
   - Migration: add `onboarding_stage`, `taqeeq_submission_id`, `taqeeq_signed_at` to `rental`.
   - New `/onboarding` page grouped by stage: New lead → Awaiting docs → OCR review → Contract sent → Signed → TARS.
   - Per-stage action buttons: request docs (WA), review OCR, generate+send contract via Taqeeq, confirm signed, push to TARS.
   - User chose Taqeeq (existing DocuSeal fork) as the signing path.

## Red flags / don't

- Do NOT POST or PUT to tars.rta.ae through the read-only API client. Reviewed browser workflows are documented separately in `rma/AGENTS.md`.
- Do NOT amend earlier commits. New commits only.
- Do NOT force-push.
- Do NOT touch `backend/babel.config.js` — it's an unrelated bookcars diff.
- Do not restore credentials removed from this handoff. Rotate any credentials that were present in earlier versions and purge them from git history with the owner's approval.
