# Week 1 — Foundation Complete

**Branch:** `claude/rental-lease-automation-platform-xsaiy`
**Date:** 2026-05-30
**ADR:** v2 (docs/ADR-001-foundation.md)

---

## 🏗️ Platform Scaffold

| Layer | Choice | Status |
|---|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) | ✅ |
| Language | TypeScript strict | ✅ |
| Styling | Tailwind v4 | ✅ |
| Database | Postgres 16 (Neon) | ✅ |
| ORM | Drizzle ORM + drizzle-kit | ✅ |
| Auth | Auth.js v5 (JWT stub → DB sessions in W2) | ✅ |
| Job Queue | pg-boss (Postgres-native, `pgboss` schema) | ✅ |
| Hosting dev | Neon Free Tier | ✅ |
| CI/CD | GitHub Actions (ready) | ✅ |

---

## 🛡️ Multi-Tenancy (ADR §6)

- **Strategy:** shared schema, row-level isolation
- **RLS Template:** `FORCE ROW LEVEL SECURITY` + `USING` + `WITH CHECK`
- **Tenant resolution:** slug-based (`/:tenantSlug/...`)
- **Helper:** `withDrizzleTenant(tenantId, fn)` — sets `SET LOCAL app.tenant_id` inside Drizzle transaction
- **Boot check:** app fails if any tenant-scoped table lacks RLS policy

**Tenant-scoped tables with RLS:**
- `lead`, `deal`, `audit_event`, `integration_event`, `tenant_member`

---

## 📊 Database Schema

### Core tables
| Table | Purpose |
|---|---|
| `tenant` | Root tenant (slug, name) |
| `user` | Global users (Auth.js) |
| `tenant_member` | Many-to-many: user ↔ tenant + roles[] |
| `audit_event` | Who/why/intent log (ADR §16) |
| `integration_event` | The spine — raw events from all providers (ADR §11) |

### Auth.js tables
| Table | Purpose |
|---|---|
| `account` | OAuth accounts |
| `session` | DB sessions (enabled in W2) |
| `verification_token` | Magic link tokens |

### CRM tables
| Table | Purpose |
|---|---|
| `lead` | Customer leads with status (new/contacted/qualified/lost) |
| `deal` | Pipeline deals: rent/lease/purchase, stages inquiry→quote→contract→handover→closed |

---

## 🔌 Integrations

### Pilot GPS (ported from Phase 0 demo)
- **Location:** `platform/integrations/pilot/`
- **Files:** `client.ts` (Live + Mock), `normalize.ts` (brand/model detection)
- **API routes:**
  - `GET /api/pilot` — fleet with GPS, ignition, engine block status
  - `POST /api/pilot/block` — engine block/unblock with 2-step confirmation
- **Mock fleet:** 5 vehicles (Mercedes, Toyota, Nissan, Hyundai, BMW)

---

## 📱 UI / Routes

| Route | What | Module |
|---|---|---|
| `/login` | Credentials stub (magic link in W2) | Auth |
| `/hello-tenant` | RLS proof page — returns 0 leads | Backend test |
| `/take-auto/crm` | CRM dashboard: Pipeline / Leads / Deals | Full-stack A |
| `/take-auto/fleet` | Fleet grid: GPS, ignition, engine block | Full-stack B |
| `/api/auth/[...nextauth]` | Auth.js v5 API | Auth |

---

## 🎨 Design System (ported from demo)

- `PageHeader` — title + subtitle + action slot
- `Card` — white bordered card
- `StatCard` — metric with color tone
- `Badge` — color-coded label
- Color tokens: slate, emerald, amber, rose, sky, violet, indigo, teal

---

## ⚙️ Background Jobs (pg-boss)

- **Schema:** `pgboss` (Postgres reserves `pg_` prefix)
- **Connection:** direct (no PgBouncer) for DDL
- **Worker wrapper:** `createTenantJob()` — auto-sets `SET LOCAL app.tenant_id` per job
- **Test queue:** `hello-tenant-job` — trivial job verified working

---

## 🧪 Verified End-to-End

1. ✅ Sign up → tenant created → `SELECT count(*) FROM lead` returns 0 (RLS active)
2. ✅ pg-boss worker processes job with tenant context
3. ✅ CRM: leads table + deal pipeline render with data
4. ✅ Fleet: 5 mock vehicles from Pilot with GPS + engine block UI
5. ✅ Engine block API: 2-step confirmation → POST `/api/pilot/block`

---

## 📦 Files Added (69 files, +14,044 lines)

```
platform/
├── src/
│   ├── app/                    # Next.js routes
│   ├── components/             # UI primitives + CRM + Fleet
│   ├── modules/                # Business logic (CRM, Fleet)
│   ├── platform/               # Infrastructure (auth, db, jobs, integrations)
│   └── lib/                    # brand-logos
├── drizzle/                    # 3 migrations with RLS
├── scripts/                    # Test & seed utilities
├── docker-compose.yml          # Local Postgres setup
└── Dockerfile.db               # Postgres 16 + extensions
```

---

## 🔮 Week 2 Roadmap

| Task | Owner | Priority |
|---|---|---|
| Magic link via Resend | Backend | High |
| Switch Auth.js to database sessions | Backend | High |
| Real tenant binding (not hardcoded) | Backend | High |
| Add `vehicle` table + link to Pilot IMEI | Full-stack B | Medium |
| CRM forms: create lead/deal from UI | Full-stack A | Medium |
| Bitrix24 migration tool | Backend | Medium |
| Hetzner VPS deployment | Founder + Backend | Low |

---

## 📝 ADR v2 Changes Applied

- §4 — Postgres as control plane (all state in DB)
- §5 — pg-boss instead of BullMQ/Redis
- §6 — RLS with `FORCE` + `WITH CHECK` + UUID cast on setting
- §11 — Event-sourced integrations (`integration_event` table)
- §14 — PostGIS ready (extension enabled)
- §16 — Trigger-based `_history` + `audit_event`

**Full ADR:** see `docs/ADR-001-foundation.md` (v2, 981 lines)
