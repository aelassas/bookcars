# RMA CRM production: Hostinger deploy + TARS import

## 1. Target — check this first

- **Only production host:** `rma-vps` = `31.97.105.52` = `srv2077538.hstgr.cloud` (RMA's own Hostinger VDS).
- **Never use `takevps` / `187.127.219.106` for RMA.** It belongs to TAKE Auto and is not an RMA deployment target, database, backup location, or dependency.
- Public app: `https://crm.rma.network` (DNS points directly to `31.97.105.52`).
- Do not provision Neon or move the database elsewhere. RMA production uses its own local PostgreSQL container.

Guard every production session:

```bash
ssh rma-vps 'hostname'       # must print srv2077538
dig +short A crm.rma.network # must print 31.97.105.52
```

## 2. Live topology

- App source: `/opt/rma-crm/platform` (plain deployed copy, not a git checkout).
- Process: systemd `rma-crm`; Next.js listens on port `3003`.
- Reverse proxy and TLS: Caddy on the same VDS; `crm.rma.network` proxies to `127.0.0.1:3003`.
- Database: Docker `rma-platform-db`, PostgreSQL database `platform`, loopback port `5434`.
- OTP mailbox: Docker `rma-mail` on the same VDS.
- WhatsApp: `wa@rma.service` and the existing `wa-*` timers. A normal app deploy does not restart or reconfigure them.
- Backups: `/root/rma-backups/`.

Runtime secrets live in the live systemd unit and server-only files. Do not print them, copy them into git, or overwrite the live unit with a repository template. `deploy/rma-crm.service` and `deploy/Caddyfile.rma` describe the target topology, not a command to replace live configuration wholesale.

## 3. Deploy a committed branch

Run from the repository root on the operator Mac. Deploy `HEAD`, not untracked files or the whole working directory. Commit and push before deploying; never amend or force-push.

```bash
cd /Users/ceo/orca/R-CRM
ssh rma-vps 'hostname'  # srv2077538; stop if different

tmp="$(mktemp -d)"
git archive --format=tar HEAD:rma | tar -xf - -C "$tmp"

# Review changed/deleted paths first. Excluded server files are preserved.
rsync -ain --delete \
  --exclude='.env' --exclude='.env.*' \
  --exclude='node_modules' --exclude='.next' \
  --exclude='.tars-session.json' --exclude='__pycache__' \
  --exclude='public/site-cars/' --exclude='next-env.d.ts' \
  --exclude='tsconfig.tsbuildinfo' --exclude='verification/' \
  --exclude='.playwright-cli/' \
  "$tmp"/ rma-vps:/opt/rma-crm/platform/

# Repeat without -n only after reviewing the dry-run.
rsync -a --delete \
  --exclude='.env' --exclude='.env.*' \
  --exclude='node_modules' --exclude='.next' \
  --exclude='.tars-session.json' --exclude='__pycache__' \
  --exclude='public/site-cars/' --exclude='next-env.d.ts' \
  --exclude='tsconfig.tsbuildinfo' --exclude='verification/' \
  --exclude='.playwright-cli/' \
  "$tmp"/ rma-vps:/opt/rma-crm/platform/
rm -rf "$tmp"
```

Back up immediately before migrations:

```bash
ssh rma-vps 'bash -o pipefail -c '\''set -e; file=/root/rma-backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz; docker exec rma-platform-db pg_dump -U take -d platform | gzip > "$file"; gzip -t "$file"; stat -c "%n %s bytes" "$file"'\'''
```

Install the locked dependencies, migrate with the live service environment, build, and restart:

```bash
ssh rma-vps 'cd /opt/rma-crm/platform && npm ci'
ssh rma-vps 'cd /opt/rma-crm/platform && python3 scripts/with-rma-service-env.py npm run migrate:status'
ssh rma-vps 'cd /opt/rma-crm/platform && python3 scripts/with-rma-service-env.py npm run migrate'
ssh rma-vps 'cd /opt/rma-crm/platform && python3 scripts/with-rma-service-env.py npm run build'
ssh rma-vps 'systemctl restart rma-crm && systemctl is-active rma-crm'
```

`with-rma-service-env.py` reads the live `rma-crm` environment without printing secrets. This is required because runtime variables are in systemd, not in the server's `.env.local`; a bare `npm run migrate` is not a valid substitute on this VDS.

Smoke-test:

```bash
curl -sS -o /dev/null -w '%{http_code} %{remote_ip} %{redirect_url}\n' https://crm.rma.network/
# Expected: 307 31.97.105.52 https://crm.rma.network/login
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://crm.rma.network/rma/fleet
# Expected: 307 to /login/rma when signed out
ssh rma-vps 'systemctl is-active rma-crm; docker ps --format "{{.Names}} {{.Status}}"'
```

## 4. TARS: one read-only fetch, then one reviewed import

TARS access is read-only apart from the SSO login itself. Do not add POST/PUT/DELETE calls to TARS business APIs. The only CRM writes are made by `tars-sync.ts --commit` after reviewing a dry-run.

### A. Start a fresh email-OTP poller on the operator Mac

Use the mailbox credential store. `TARS_OTP_IMAP_PASSWORD` must be supplied in the environment; never commit it or paste it into logs. Host and user default to `mail.rma.network` and `ruslan@rma.network`.

```bash
cd /Users/ceo/orca/R-CRM/rma
export TARS_OTP_IMAP_PASSWORD='<from the RMA mailbox credential store>'
python3 scripts/tars-otp-poller.py
```

The poller deletes any stale `/tmp/tars-otp.txt`, accepts only new RTA/TARS mail, writes the new code with mode `0600`, and never prints the code. Keep it running in terminal A.

### B. Fetch TARS once in terminal B

```bash
cd /Users/ceo/orca/R-CRM/rma
TARS_OTP_CHANNEL=email npx tsx scripts/tars-fetch-to-json.ts
chmod 600 /tmp/tars-agency.json /tmp/tars-vehicles.json /tmp/tars-rentals.json
```

The email radio is `input[name="sfaChoice"][value="mail"]`; mobile is preselected by TARS. The session code checks the email input directly and aborts if it cannot. Do not click labels or change to SMS. The OTP entry form uses `#passcode` and `#btn_mfa_login`. RTA's real email currently contains a **4-digit** code in the phrase `Authentication Code (OTP)`; the poller accepts 4–8 digits only in that phrase, after quoted-printable and HTML decoding. Never extract a bare six-digit number from the email's CSS. A valid `.tars-session.json` may reuse an existing session without another OTP; keep that file local and gitignored.

Fleet and rental exports follow `meta.hits` across pages and deduplicate by TARS identity; `size: 500` is page size, not a 500-contract history limit. After the fetch, check unique contract counts and the earliest/latest rental dates before importing.

Expected local outputs:

- `/tmp/tars-agency.json`
- `/tmp/tars-vehicles.json`
- `/tmp/tars-rentals.json`

Review the fetch summary counts. If OTP times out, discard the code file and start both sides again; never guess or reuse an old code.

### C. Copy only the JSON exports to the RMA VDS

```bash
ssh rma-vps 'install -d -m 700 /root/rma-tars-import'
rsync -a \
  /tmp/tars-agency.json /tmp/tars-vehicles.json /tmp/tars-rentals.json \
  rma-vps:/root/rma-tars-import/
```

### D. Dry-run against the real RMA database

`--from-samples` is mandatory here: without it the script performs another live TARS login instead of reading the exported files.

```bash
ssh rma-vps 'cd /opt/rma-crm/platform && python3 scripts/with-rma-service-env.py npx tsx scripts/tars-sync.ts --from-samples --vehicles-file=/root/rma-tars-import/tars-vehicles.json --rentals-file=/root/rma-tars-import/tars-rentals.json'
```

Review vehicle/customer/rental actions and every skipped row. Resolve unexpected replacements or duplicates before committing. A dry-run writes nothing.

### E. Commit the reviewed plan and verify

```bash
ssh rma-vps 'cd /opt/rma-crm/platform && python3 scripts/with-rma-service-env.py npx tsx scripts/tars-sync.ts --from-samples --commit --vehicles-file=/root/rma-tars-import/tars-vehicles.json --rentals-file=/root/rma-tars-import/tars-rentals.json'
```

Record inserted/updated/skipped counts, then verify the RMA UI (`/rma/fleet` and rental profiles) using real application calls. Re-running the same dry-run should show updates/no-ops rather than duplicate inserts.

After verification, remove the OTP file and temporary JSON exports; keep the database backup:

```bash
rm -f /tmp/tars-otp.txt /tmp/tars-agency.json /tmp/tars-vehicles.json /tmp/tars-rentals.json
ssh rma-vps 'rm -f /root/rma-tars-import/tars-agency.json /root/rma-tars-import/tars-vehicles.json /root/rma-tars-import/tars-rentals.json'
```

## 5. Handoff rule

Report the deployed commit, migration range, smoke-test results, TARS counts, and backup path. Clearly separate verified facts from anything not run. Do not claim success from a build alone, and do not silently deploy or import to any host other than `rma-vps`.

## 6. Verified TARS import and vehicle deletion (2026-11-19)

Production commits were pushed to both RMA remotes: `cee299a6` (correct Hostinger deploy), `4c774afd`, `8fba69fb`, `fdb7f711` (TARS login/import), and `45337fe1` (Sold + permanent deletion).

Verified TARS result on `rma-vps`:

- 53 unique rental documents imported; start dates span 2026-01-16 through 2026-11-19.
- 21 VINs: 17 existing vehicles updated and 4 inserted (23 vehicles total).
- 41 customers in the plan: 40 inserted and 1 existing row updated (49 customers total).
- One existing active rental was adopted by matching VIN, UTC calendar dates, and current status; its cancelled duplicate was not reactivated.
- Two vehicles legitimately sharing plate `G 5902` remain separate by VIN and keep separate rental history.
- Re-running the same dry-run after import reports 21/41/53 updates and zero inserts or skips.
- Last pre-import backup: `/root/rma-backups/pre-tars-import-final-20261119-143008.sql.gz` (gzip integrity checked).

Fleet deletion behavior:

- **Mark as Sold** keeps the vehicle in the **Sold** filter and out of operations. Live `reserved` and `on_rent` handoffs must be settled first; overdue vehicles can be marked sold.
- **Delete** requires typing `DELETE` in a prompt that explicitly warns about permanent history deletion. `deleteVehiclePermanently()` deletes the vehicle, rentals, leases, payments, charges, engine blocks, documents, timeline events, and vehicle ledger rows in one transaction. Customers and CRM deals are preserved; deal vehicle links are cleared, and an audit event remains.
- `src/modules/fleet/permanent-delete.test.ts` verifies the complete dependency chain and cleans up its isolated tenant. It passed locally and on the RMA production schema without changing the real 23 vehicles or 53 TARS rentals. A production browser run with a disposable member/vehicle also verified Sold listing and permanent Delete through the actual buttons; all test fixtures were removed afterward.

## 7. Long-term rentals in the calendar (2026-11-21)

Commits `75ea6487` and `64c0dc0c` add open-ended rentals using the existing `rental.extension_status = 'long_term'` value and migration `0090_rental_long_term.sql`.

- Active long-term rentals remain visible in both the DayPilot scheduler and month calendar after the original TARS return date. The original dates remain unchanged; no extension date is invented.
- `markRentalAsLongTerm()` is manager-only and audited. Confirming a fixed return through the existing extension flow changes the status back to `extension_confirmed`.
- Long-term rentals are occupied in vehicle finder, booking creation/rescheduling, and the database exclusion constraint. Old return reminders and overdue flags are suppressed.
- Production rows marked after review: `cb6f6cb3-8f7a-456b-877e-e1c42620c34d` (C 82118), `e383a5fe-82a0-4892-b80a-3a076e084e9a` (E 35092), and `da875d96-fa26-4659-9a06-8273a84cabff` (Y 70946). Each has an audit event.
- Migration backup: `/root/rma-backups/pre-long-term-0090-20261121-145059.sql.gz` (gzip integrity checked).
- A transactional overlap test was rejected by `rental_no_overlap_active`. Production browser verification showed all three rentals as `Long-term`; the E 35092 detail reads `Dates 2026-05-16 → open-ended` and `Status long-term`. The temporary browser user was removed afterward.

## 8. Monthly pricing normalized to 30 days

Commit `dc797498` normalizes pricing for actual rental durations of 28–31 days to **30 paid days**.

- `rental.total_days` remains the actual duration for calendar display and mileage. The 150 km/day allowance and the 4,500 km monthly allowance are unchanged.
- `rentalPricingDays()` is shared by creation, live quotes, rescheduling, rental financials and the contract PDF subtotal.
- Extensions inside the normalized window add no extra charge. For example, extending 28 to 31 days adds zero; extending 28 to 32 adds two paid days.
- Late fees use the same normalized delta. Existing financial rows were not backfilled; the rule applies to new and subsequently changed operations.
- Validation: 32 targeted tests passed, including 28/30/31-day pricing, extension deltas and late fees. Local and production Next.js builds passed.
