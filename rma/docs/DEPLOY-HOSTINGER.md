# Deploy RMA CRM to Hostinger KVM2

Target: Ruslan's Hostinger KVM2 server, reachable at `crm.rma.network`.
Scope of this doc: everything up to and including Ruslan logging in and
opening `/lines` to pair his WhatsApp handset. The Baileys observer is
flagged where it slots in; it is **not built yet** and is required before
`/lines` can actually accept a QR scan.

## 0. Prerequisites

- Hostinger KVM2 with Ubuntu 24.04 LTS (or similar) and sudo access
- A DNS record `crm.rma.network` pointing to the box's public IP
- Ports 80 + 443 open; 3000 bound to loopback only (reverse-proxied)

Install on the box:

```bash
# Node 20 LTS, Postgres 16, nginx, certbot, build toolchain
sudo apt update
sudo apt install -y curl build-essential nginx certbot python3-certbot-nginx postgresql-16

# Node 20 via nodesource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pm2 process manager (global)
sudo npm install -g pm2
pm2 startup systemd        # run the command it prints to make pm2 survive reboots
```

Confirm versions:

```bash
node -v     # expect v20.x
npm -v
psql --version
```

## 1. Database bring-up

```bash
# As the postgres superuser
sudo -u postgres psql <<'SQL'
CREATE USER rma_owner WITH PASSWORD 'REPLACE_ME_STRONG_PW';
CREATE DATABASE rma_crm OWNER rma_owner;
GRANT ALL PRIVILEGES ON DATABASE rma_crm TO rma_owner;
SQL
```

The project enforces Postgres RLS. Two things to know:

- **The owner role is BYPASSRLS by default.** That is fine for the migration
  runner (DDL only) but the application must connect through a non-bypass
  role so `FORCE ROW LEVEL SECURITY` can do its job. `scripts/create-app-role.ts`
  creates that role; it is called from `npm run db:app-role`.
- The repo's migration runner is not drizzle-kit. It is
  `scripts/migrate-sql.ts`, invoked as `npm run migrate`, which also applies
  `drizzle/tighten-rls.sql` (`FORCE RLS`) after every forward step.

## 2. Clone and build the app

```bash
# As the deploy user (not root). Pick a home dir for the app.
cd ~
git clone https://github.com/PrimeTurkmen/R-CRM.git
cd R-CRM
git checkout fix/backend-test-esm-import
cd rma
npm ci
```

Now populate `rma/.env.local`. The file is gitignored on purpose — nothing
below should ever be checked in. Minimum set:

```ini
# — Base
AUTH_URL=https://crm.rma.network
AUTH_SECRET=                       # openssl rand -base64 32
PORT=3000

# — Postgres
DATABASE_URL=postgresql://rma_owner:REPLACE_ME_STRONG_PW@127.0.0.1:5432/rma_crm?sslmode=disable
DATABASE_URL_DIRECT=postgresql://rma_owner:REPLACE_ME_STRONG_PW@127.0.0.1:5432/rma_crm?sslmode=disable
DB_APP_ROLE=app_runtime            # created in step 3

# — Platform admin (grants /lines + /admin without the LINES_ADMIN_NAMES fallback)
PLATFORM_ADMIN_EMAILS=ruslan@rma.network,marat@rma.network

# — WhatsApp observer
WA_OBSERVER_DIR=/home/<deploy-user>/wa-observer

# — Optional AI (Kimberly / drafting)
# ANTHROPIC_API_KEY=sk-ant-…

# — TARS / Salik (RTA business portal; different from the demo creds)
TARS_USERNAME=rmacarrental
TARS_PASSWORD=                     # provided separately by Ruslan
TARS_ORG_DID=did:rta:51646245
TARS_BASE_URL=https://tars.rta.ae
SALIK_USERNAME=rmacarrental
SALIK_PASSWORD=
```

Build:

```bash
npm run build
```

## 3. First-time schema + role + seed

```bash
# 1. If the DB already has the schema from an earlier manual load, baseline
#    the journal FIRST so the runner does not try to replay 0000. Fresh DBs
#    skip this step.
npm run migrate:baseline        # only if applicable

# 2. Apply all pending migrations + FORCE RLS
npm run migrate

# 3. Status check (expect all applied, none pending)
npm run migrate:status

# 4. Create the non-bypass app role (DB_APP_ROLE above)
npm run db:app-role

# 5. Promote ruslan@rma.network / marat@rma.network to platform_admin
npm run bootstrap:admin

# 6. Seed the RMA tenant + staff users + 20-car fleet + narrative anchors
npx tsx scripts/setup-rma-tenant.ts
```

Login credentials from `setup-rma-tenant.ts`:

| User | Email | Password |
|---|---|---|
| Ruslan (owner) | `ruslan@rma.network` | `Welcome1!` |
| Marat (son / manager) | `marat@rma.network` | `Welcome1!` |
| Lilia (wife / finance) | `lilia@rma.network` | `Welcome1!` |

`Welcome1!` is the dev-seed default. Migration `0038_must_change_password`
exists to force a rotation on first login. Flip the flag before handing the
box to Ruslan:

```sql
UPDATE "user"
SET must_change_password = true
WHERE email IN ('ruslan@rma.network','marat@rma.network','lilia@rma.network');
```

## 4. Reverse proxy + SSL

The project ships `rma/server.cjs` as a custom entry that trusts the
inbound `Host` header blindly and reflects it as `x-forwarded-host`.
Combined with Auth.js `trustHost: true`, that is a **host-header
injection / auth-link-poisoning primitive**: an attacker who can send a
raw request with `Host: evil.com` can bake `evil.com` into magic-link
emails sent out to real users.

Mitigation on this box:

1. **Set `AUTH_URL=https://crm.rma.network` in `.env.local`** (done above —
   this takes precedence over anything derived from the Host header).
2. **Reject requests whose Host is not the real hostname at nginx**, so a
   crafted Host never reaches Node:

```nginx
# /etc/nginx/sites-available/crm.rma.network
server {
    listen 80;
    server_name _;
    return 444;                        # anything that isn't our hostname: drop
}

server {
    listen 80;
    server_name crm.rma.network;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.rma.network;

    ssl_certificate     /etc/letsencrypt/live/crm.rma.network/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.rma.network/privkey.pem;

    client_max_body_size 25m;          # WhatsApp media uploads

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Host  $host;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/crm.rma.network /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d crm.rma.network     # issues + wires the cert
```

## 5. Start the app under pm2

```bash
cd ~/R-CRM/rma
pm2 start "node server.cjs" --name rma-crm --cwd $(pwd)
pm2 save                                # persist across reboot (startup set in step 0)
pm2 logs rma-crm --lines 50             # verify it comes up clean
```

The RLS boot-guard runs on startup: if any tenant table is missing its
RLS triad the process exits with a loud error — treat that as a real
bug and fix the migration, do not patch around it.

## 6. WhatsApp observer (NOT YET BUILT)

The `/lines` page already knows how to display Ruslan's `rma-main` slug,
poll `qr-rma-main.txt` / `pair-code-rma-main.txt` / `status-rma-main.json`
from `$WA_OBSERVER_DIR`, and run `relink-web.sh` to re-start a worker.
The **observer process that writes those files is not yet in this repo**.
It needs to be built from Baileys/Neonize/Savos references and will live
alongside the Next app on this same box.

When the observer lands:

```bash
mkdir -p $WA_OBSERVER_DIR
cd $WA_OBSERVER_DIR
# install observer package + its deps (TBD once scaffolded)
pm2 start wa-line-rma-main.js --name wa-rma-main --restart-delay 300000
pm2 save
```

Ruslan then opens https://crm.rma.network/login, signs in as
`ruslan@rma.network`, navigates to `/lines`, clicks Pair → QR, scans with
WhatsApp on his handset (`+971 55 359 0533`), and the status flips to
`online` once the session is written.

## 7. Smoke tests

- `https://crm.rma.network/` → redirects to `/login`
- Login as `ruslan@rma.network` → lands on the RMA workspace
- `https://crm.rma.network/lines` → shows `rma-main` with badge
  `no_session` (expected until the observer is running)
- `https://crm.rma.network/rma/fleet` → shows the 20 seeded vehicles
- `https://crm.rma.network/rma/messages` → shows the seeded inbox
- `pm2 status` → `rma-crm` online, uptime climbing
- `psql $DATABASE_URL -c "SELECT count(*) FROM tenant;"` → 1 row (`rma`)

## 8. Known gaps parked for later

- **TARS portal needs its own user** per owner note 2026-10-30. The
  current `.env.local` TARS creds are the demo set; swap when Ruslan
  provisions a dedicated TARS user for the automation.
- **WhatsApp observer** — see §6; blocks actual pairing.
- **A dedicated RMA business WhatsApp number** will replace
  `971553590533` once procured. The `rma-main` slug stays; only the
  `LINE_PHONES` entry in `src/modules/board/owners.ts` is updated.
