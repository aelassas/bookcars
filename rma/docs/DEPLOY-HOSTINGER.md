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

The email radio is `input[name="sfaChoice"][value="mail"]`; mobile is preselected by TARS. The session code checks the email input directly and aborts if it cannot. Do not click labels or change to SMS. A valid `.tars-session.json` may reuse an existing session without another OTP; keep that file local and gitignored.

Expected local outputs:

- `/tmp/tars-agency.json`
- `/tmp/tars-vehicles.json`
- `/tmp/tars-rentals.json`

Review the fetch summary counts. If OTP times out, discard the code file and start both sides again; never guess or reuse an old code.

### C. Copy only the JSON exports to the RMA VDS

```bash
ssh rma-vps 'install -d -m 700 /root/rma-tars-import'
rsync -a --chmod=600 \
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
