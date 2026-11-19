# Handoff → Kimi (2026-11-19)

Scope: RMA CRM. Branch `feat/rma-meeting-20261117`. This session stabilized production and got TARS one step from completing.

## What changed this session (committed)

1. **Production was DOWN.** The RMA Postgres container (`rma-platform-db`, docker, `127.0.0.1:5434`, db `platform`, user `take` / pw `take_dev`) had exited ~4 weeks ago (Oct 17). The app 500'd on `ECONNREFUSED 127.0.0.1:5434`. Fixed with `docker start rma-platform-db` + `systemctl restart rma-crm`. It is back up and serving (login 307 → expected).
2. **Deployed the whole recent branch to prod** (`takevps` = root@187.127.219.106, app at `/opt/rma-crm/platform`, Next.js on :3003, Caddy on :8087). Prod was a stale Oct 14 snapshot with NO git. Deploy = rsync `rma/` → `/opt/rma-crm/platform` (exclude node_modules/.next/.env*, no `--delete` concerns beyond tracked source), then `DATABASE_URL=postgresql://take:take_dev@127.0.0.1:5434/platform npx tsx scripts/migrate-sql.ts` (applied 0079–0089), `npm run build`, `systemctl restart rma-crm`. Verified: 10 migrations applied, build green, app serving.
3. **Lexus fix.** `Lexus NX · DXB L 11911` was `status="overdue"` (rented Oct 4, never returned). The "Mark as Sold" fallback threw `Cannot mark a overdue vehicle as sold` because the guard only allowed `available/in_service/sold`. Fixed `src/modules/fleet/actions.ts` `markVehicleAsSold` to block only live `reserved`/`on_rent` handoffs — `overdue` (and `available/in_service/sold`) are now sellable. Deployed.
4. **Weekly/monthly rate** were already in the branch (migration 0087); they now show on fleet card + vehicle profile after deploy.

## TARS import — the remaining blocker (one step from done)

Goal: pull real fleet + rental contracts from `tars.rta.ae` into the RMA DB.

**Root cause found and fixed (unverified end-to-end):** the OTP screen's email radio is `value="mail"` (NOT "email"), and clicking the label text does NOT toggle it — the `mobile` radio stays checked, so the OTP goes out as SMS (unreadable) instead of email. Fixed in `src/platform/integrations/tars/session.ts`: now `input[name="sfaChoice"][value="mail"].check()`. Probe that proved it: `scripts/tars-probe-otp-dom.ts` (reaches OTP screen, dumps radio DOM, screenshots `/tmp/tars-otp-screen.png`).

**Credentials** (in `rma/.env.local`, gitignored): `TARS_USERNAME=rmacarrental`, `TARS_PASSWORD=…`, `TARS_ORG_DID=did:rta:51646245`, `TARS_BASE_URL=https://tars.rta.ae`. The OTP **email** now goes to `ru…@rma.network` (= `ruslan@rma.network`, the operator's OWN mail server — this is what "otp comes to our own server" meant).

**To finish TARS:**
```bash
cd rma
# terminal A: start fetch (launches Chrome, clicks Send OTP → email, waits for /tmp/tars-otp.txt)
npx tsx scripts/tars-fetch-to-json.ts     # writes /tmp/tars-agency.json /tmp/tars-vehicles.json /tmp/tars-rentals.json
# terminal B: poll the mailbox, write the 6-digit code
python3 /tmp/rma_otp_poller.py            # watches ruslan@rma.network, writes /tmp/tars-otp.txt
# then import into prod (from the box, or rsync the JSON + run there):
npx tsx scripts/tars-sync.ts --commit --vehicles-file=/tmp/tars-vehicles.json --rentals-file=/tmp/tars-rentals.json
```
Note: the mailbox poller (`/tmp/rma_otp_poller.py`) only checks INBOX and matches From/Subject containing rta/tars/otp. The OTP email sender is `Notifications@rta.ae`, subject `One time password for your Online Transaction`.

## Still open (not this session's blockers)

- Onboarding kanban (`/{tenant}/onboarding`) — migration 0089 + `onboarding/setup/` + Taqeeq integration are in the branch but the kanban page itself is not finished.
- Parkin/Parkonic operator feeds still manual (separate from Salik).
- `backend/babel.config.js` is an UNRELATED bookcars diff — do not commit it.
- Do not amend existing commits; new commits only; no force-push.

## Production access

- `ssh takevps` (root@187.127.219.106). App: `/opt/rma-crm/platform` (NO git), systemd `rma-crm`, log `/var/log/rma-crm.log`, Caddy `deploy/Caddyfile.rma`.
- DB: `docker exec rma-platform-db psql -U take -d platform`. Backups in `/root/rma-backups/`.
