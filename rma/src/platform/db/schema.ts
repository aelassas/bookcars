import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
  customType,
  type ExtraConfigColumn,
} from "drizzle-orm/pg-core";
import { tenantTable } from "./tenant-table";

/** Column map handed to tenantTable's extras callback (same shape pgTable
 * passes to its third argument — indexable config columns). */
type TenantExtraColumns = Record<string, ExtraConfigColumn>;

// PostGIS geography(Point, 4326) — portable custom type
const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(Point, 4326)";
  },
});

const money = customType<{ data: number; driverData: string }>({
  dataType() {
    return "numeric(12,2)";
  },
  toDriver(value) {
    return value.toFixed(2);
  },
  fromDriver(value) {
    return Number(value);
  },
});

// ─── 1. Auth.js tables (global, no tenant_id) ──────────────────────────────

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  password: text("password"), // hashed — for CredentialsProvider demo login
  // Auth Wave 1 (P0-2/P0-3) — forces a redirect to /account/password until
  // cleared. Set true by admin-initiated resets (settings/team) or left
  // false otherwise (never true just because password IS NULL — that case
  // is handled separately by the "set a password" banner, not a redirect).
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  // Telegram PREMIUM login (0040) — used to match an incoming Telegram
  // contact-share to a user. Free-text (whatever the admin entered); the
  // bot normalizes both sides to digits-only before comparing.
  phone: text("phone"),
  // Shown on the /login name+PIN roster. Off by default so demo / admin /
  // second-number accounts never clutter the staff door — set true only for the
  // people who tap-to-sign-in (scripts/provision-staff-logins.ts).
  rosterVisible: boolean("roster_visible").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("user_phone_idx").on(table.phone)]);

export const account = pgTable(
  "account",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export const session = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationToken = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// ─── 1.5 Telegram OTP login (global, no tenant_id) ─────────────────────────
// Additional identity factor alongside password + magic-link (email is dead
// in this deployment). One-time linking (telegram_link_token → telegram_link)
// then every login sends a 6-digit code to the linked chat (login_code).
// See platform/src/platform/auth/index.ts (telegram-otp Credentials provider)
// and platform/src/modules/auth-otp/actions.ts. Global tables — exempt from
// the tenant RLS boot-guard, same as user/session/device_login above.

export const telegramLink = pgTable("telegram_link", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  chatId: text("chat_id").notNull(),
  username: text("username"),
  // Telegram PREMIUM login (0040) — the phone number the link was
  // established with (from the Telegram contact-share), digits as sent by
  // Telegram. Informational / audit only — matching happens once, at link
  // time, against user.phone.
  phone: text("phone"),
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginCode = pgTable(
  "login_code",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => [index("login_code_user_idx").on(table.userId)]
);

export const telegramLinkToken = pgTable("telegram_link_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

// Telegram PREMIUM login (0040) — one-tap, no-code sign-in. The login page
// creates a `login_request` (status "pending"), opens
// `https://t.me/<bot>?start=login_<token>`, and polls this row's status.
// The bot flips it to "authenticated" (with user_id set) once the Telegram
// side of the handshake succeeds; the "telegram-session" Credentials
// provider (platform/src/platform/auth/index.ts) consumes it exactly once,
// flipping it to "consumed". See otp-bot/bot.js and
// platform/src/modules/auth-otp/actions.ts (startTelegramLogin/
// pollTelegramLogin). Global table — no tenant_id, exempt from the RLS
// boot-guard.
export const loginRequest = pgTable(
  "login_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    chatId: text("chat_id"),
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    // "pending" | "authenticated" | "consumed" (expiry is derived from
    // expiresAt, not stored as a status value).
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("login_request_token_idx").on(table.token)]
);

// Admin-approved first-link fallback (0040). The phones we can pre-populate
// on user.phone are shared BUSINESS-line WhatsApp numbers, not staff's
// personal Telegram numbers — so an automatic phone match in the bot's
// contact handler is the exception, not the rule. When no user.phone
// matches an incoming Telegram contact-share, the bot upserts a row here
// (keyed by chatId, which is UNIQUE) instead of rejecting the person
// outright. An admin resolves it via /admin/telegram-links
// (approveTelegramLink in auth-otp/actions.ts), which upserts telegram_link
// for the chosen user and stamps resolvedAt/resolvedUserId here. Global
// table — no tenant_id, exempt from the RLS boot-guard.
export const telegramLinkPending = pgTable("telegram_link_pending", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: text("chat_id").notNull().unique(),
  phone: text("phone"),
  tgFirstName: text("tg_first_name"),
  tgUsername: text("tg_username"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedUserId: uuid("resolved_user_id").references(() => user.id, { onDelete: "set null" }),
});

// Telegram onboarding waiting room. Someone talks to the login bot BEFORE
// they have any platform account: there is no user row, no tenant, nothing to
// hang a tenant_id off. So this is a global table like telegram_link_pending
// above — the waiting room a person sits in between "tapped the bot" and "is a
// member of a tenant". Written by otp-bot's /start interview. (The /tma mini
// app was the original writer and was deleted 2026-08-10; the column names
// below still carry its vocabulary.)
//
// Keyed by telegramUserId (the Telegram `user.id`), not by chat_id: for
// private chats the two are the same number anyway. A partial unique index
// (see the migration) enforces at most ONE pending row per telegram user, so
// double-tapping "submit" can't queue the same person twice — decided rows
// stay for history and don't block a later re-application.
export const onboardingApplication = pgTable(
  "onboarding_application",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    telegramUserId: text("telegram_user_id").notNull(),
    telegramUsername: text("telegram_username"),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    companyName: text("company_name").notNull(),
    note: text("note"),
    // "pending" | "approved" | "rejected"
    status: text("status").notNull().default("pending"),
    telegramChatId: text("telegram_chat_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    index("onboarding_application_tg_user_idx").on(table.telegramUserId),
    index("onboarding_application_status_idx").on(table.status, table.createdAt),
    // Partial: only ONE pending row per telegram user. Enforced here rather
    // than by a read-then-insert in the route, because two taps on "submit"
    // race and a check-then-write lets both through. Decided rows are exempt
    // so a rejected applicant can re-apply.
    uniqueIndex("onboarding_application_one_pending_idx")
      .on(table.telegramUserId)
      .where(sql`status = 'pending'`),
  ]
);

// ─── 2. Tenant root ────────────────────────────────────────────────────────

export const tenant = pgTable("tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  locale: text("locale"),
  primaryCurrency: text("primary_currency"),
  // Unguessable per-tenant token used to authorize inbound integration
  // webhooks (path component, not query param). NULL only during
  // bootstrap; set by createTenantForCurrentUser + seed scripts.
  callgearWebhookToken: text("callgear_webhook_token").unique(),
  /** The brand's CallGear virtual line (digits only) — webhook payload's
   *  virtual_phone_number maps the call to this tenant. */
  callgearVirtualNumber: text("callgear_virtual_number"),
  telephonyWebhookToken: text("telephony_webhook_token").unique(),
  whatsappWebhookToken: text("whatsapp_webhook_token").unique(),
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  migrationStatus: text("migration_status").notNull().default("none"), // none | connected | preview | cutover
  // SPEC §3.2 — SaaS lifecycle / billing fields
  status: text("status").notNull().default("active"), // active | trial | suspended | churned
  tier: text("tier").notNull().default("starter"), // starter | growth | pro | enterprise
  createdBy: uuid("created_by").references(() => user.id),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspendedReason: text("suspended_reason"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  billingEmail: text("billing_email"),
  // Billing / service management (set by platform admin).
  customMonthlyPrice: integer("custom_monthly_price"), // AED — overrides tier price when set
  paidUntil: timestamp("paid_until", { withTimezone: true }), // expiry; admin suspends manually after
  serviceHoursPerMonth: integer("service_hours_per_month").notNull().default(0), // included support hours
  // White-label branding per tenant. logoUrl holds a data: URL (small logos
  // stored inline — portable, no object storage needed). brandName overrides
  // the display name in the workspace; falls back to name.
  brandName: text("brand_name"),
  logoUrl: text("logo_url"),
  // First-run guided onboarding: NULL until the tenant admin finishes the
  // setup wizard (brand → modules → migrate → team). Drives the first-login
  // redirect and is set once on completion.
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  // Enabled product modules for this tenant. Sidebar and route guards use this.
  modules: text("modules").array().notNull().default([
    "dashboard",
    "crm",
    "customers",
    "messages",
    "fleet",
    "rentals",
    "returns",
    "collections",
    "tasks",
  ]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 2.1 Platform admin (vendor team — global, no tenant) — SPEC §3.1 ───────
// NOT a tenantTable: this is a global table with no tenant_id, so the RLS
// boot guard correctly leaves it alone. Distinguishes vendor-team users
// (founder, support engineers) from regular tenant users.

export const platformAdmin = pgTable("platform_admin", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  promotedAt: timestamp("promoted_at", { withTimezone: true }).notNull().defaultNow(),
  promotedBy: uuid("promoted_by").references(() => user.id),
});

// ─── 2.1a WhatsApp line display names (global, no tenant) ───────────────────
// Inline rename target for the /lines page (drizzle/0072_wa_line_name.sql).
// Keyed by the observer line slug — a LINE_TENANT key
// (src/modules/messaging/lines.ts). No row → the owner's name is shown.
export const waLineName = pgTable("wa_line_name", {
  slug: text("slug").primaryKey(),
  displayName: text("display_name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 2.1b Rental rotation availability (global, no tenant) ──────────────────
// The rental distributor's agent toggles (drizzle/0073_agent_availability.sql),
// keyed by the lowercased roster name from the RENTAL_ROTATION_* env config.
// Busy auto-expires at READ time (busy_until) — no janitor. Written by the
// /availability hub page; read by the wa-lead relay + the distributor sweeper.
export const agentAvailability = pgTable("agent_availability", {
  agentKey: text("agent_key").primaryKey(),
  displayName: text("display_name").notNull(),
  brand: text("brand").notNull().default(""),
  status: text("status").notNull().default("available"), // available | busy | off
  busyUntil: timestamp("busy_until", { withTimezone: true }),
  dayOff: integer("day_off"), // JS weekday 0=Sun..6=Sat, NULL = no day off (auto-enforced)
  shiftStart: text("shift_start"), // display only — after-hours stays manual
  shiftEnd: text("shift_end"),
  leaveDaysRemaining: integer("leave_days_remaining"),
  phone: text("phone"), // manager-set override (0077); NULL = env roster phone
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

// ─── 2.2 Company (brand + business line within a holding tenant) ───────────
// A holding (tenant) contains several brands/companies, each in ONE business
// line. Branding (logo/name/theme) is per-company. Rows carry company_id so
// users are scoped to their company/line; the security role is cross-line.
export const company = tenantTable(
  "company",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    businessLine: text("business_line").notNull(), // rental | leasing
    brandName: text("brand_name"),
    logoUrl: text("logo_url"),
    accentColor: text("accent_color"), // hex, for adaptive theme
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [uniqueIndex("company_tenant_slug_idx").on(t.tenantId, t.slug)]
);

// ─── 2.5 Integration Connection (per-tenant external API creds) ─────────────

export const integrationConnection = tenantTable(
  "integration_connection",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // bitrix24 | kaiten | pilot | callgear | whatsapp
    config: jsonb("config").notNull().default({}),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    status: text("status").notNull().default("active"), // active | paused | error
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    uniqueIndex("integration_connection_tenant_provider_idx").on(t.tenantId, t.provider),
  ]
);

// ─── 3. Tenant membership (many-to-many) ───────────────────────────────────

export const tenantMember = pgTable(
  "tenant_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Branch/company scoping: companies this member may see. crossBranch=true
    // (e.g. security, owner) sees all companies/lines in the tenant.
    companyIds: uuid("company_ids").array(),
    crossBranch: boolean("cross_branch").notNull().default(false),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    roles: text("roles").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tenant_member_tenant_user_idx").on(table.tenantId, table.userId)]
);

// ─── 4. Audit event (who / why / intent) ───────────────────────────────────

export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    actorId: uuid("actor_id").references(() => user.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    intent: text("intent"),
    // SPEC §3.6 — populated when the action ran inside an active support
    // access grant (platform admin acting as the tenant).
    impersonatorId: uuid("impersonator_id").references(() => user.id),
    supportGrantId: uuid("support_grant_id").references(() => supportAccessGrant.id),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_event_tenant_at_idx").on(table.tenantId, table.at.desc())]
);

// ─── 5. Integration event (the spine — §11) ────────────────────────────────

export const integrationEvent = pgTable(
  "integration_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    signatureValid: boolean("signature_valid").notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    normalizedType: text("normalized_type"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processingStatus: text("processing_status").notNull().default("queued"),
    processingError: text("processing_error"),
  },
  (table) => [
    // Dedupe key. MUST include tenant_id (0058): provider ids are only unique
    // inside ONE account — Bitrix ids are per-portal sequential integers — so
    // the old UNIQUE(provider, provider_event_id) made tenant B's contact 42
    // collide with tenant A's and every writer's onConflictDoNothing silently
    // dropped it. Every ON CONFLICT target on this table must list all three
    // columns; Postgres arbiter inference does not match a subset.
    uniqueIndex("integration_event_tenant_provider_event_id_idx").on(
      table.tenantId,
      table.provider,
      table.providerEventId
    ),
    index("integration_event_tenant_provider_received_idx").on(
      table.tenantId,
      table.provider,
      table.receivedAt.desc()
    ),
    index("integration_event_status_received_idx").on(table.processingStatus, table.receivedAt),
  ]
);

// Call-recording transcripts (0068) — one row per callgear call.finished
// event the transcriber picked up. Full whisper transcript + local-model
// analysis JSON live here (Twenty only gets a note), so analytics can query
// transcripts without crawling notes. Status lifecycle and retry semantics
// are documented in drizzle/0068_call_transcript.sql.
export const callTranscript = tenantTable(
  "call_transcript",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    integrationEventId: uuid("integration_event_id")
      .notNull()
      .references(() => integrationEvent.id, { onDelete: "cascade" }),
    callId: text("call_id").notNull(),
    recordingPath: text("recording_path"),
    transcriptText: text("transcript_text"),
    summaryJson: jsonb("summary_json"),
    // processing | done | error
    status: text("status").notNull().default("processing"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    // 1:1 with the source event — the claim's ON CONFLICT DO NOTHING races on
    // this so two transcriber instances never double-process a call.
    uniqueIndex("call_transcript_event_idx").on(t.integrationEventId),
    index("call_transcript_status_updated_idx").on(t.tenantId, t.status, t.updatedAt),
  ],
);

// ─── 6. CRM: Lead ──────────────────────────────────────────────────────────

export const lead = pgTable(
  "lead",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    customerName: text("customer_name"),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
    source: text("source"),
    status: text("status").notNull().default("new"), // new | contacted | qualified | lost
    // Exact Bitrix lead-status NAME (e.g. "Established Contact", "Качественный
    // лид"), resolved live from crm.status.list per portal. `status` above is
    // the coarse bucket; this is the real funnel column the rent board renders,
    // since each rent portal has its OWN status set (mirrors deal.stage_detail).
    stageDetail: text("stage_detail"),
    // Raw Bitrix SOURCE_DESCRIPTION (0065) — on social-sourced leads it is
    // often the profile URL (instagram.com/…); the Twenty mirror mines the
    // URL out of it for the person's socialProfile link.
    sourceDescription: text("source_description"),
    assignedTo: uuid("assigned_to").references(() => user.id),
    externalId: text("external_id"),
    externalSource: text("external_source"), // bitrix24 | kaiten
    // INTELLIGENCE LAYER (0050) — customer-vouched facts rolled up from message
    // extraction (mirrors deal.vouched_*; a lead may become a deal later).
    vouchedCar: text("vouched_car"),
    vouchedValue: integer("vouched_value"), // AED the customer quoted
    vouchedTerm: integer("vouched_term"), // months
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("lead_tenant_created_idx").on(table.tenantId, table.createdAt.desc()),
    index("lead_tenant_external_idx").on(table.tenantId, table.externalSource, table.externalId),
  ]
);

// ─── 7. CRM: Deal (pipeline) ───────────────────────────────────────────────

export const deal = pgTable(
  "deal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    leadId: uuid("lead_id").references(() => lead.id),
    // The Bitrix CONTACT_ID resolved to a platform customer (0067). Most
    // easyrent/cardiwan deals link a CONTACT, not a lead — lead_id is NULL
    // for nearly all of them — so this is the only path to the customer's
    // phone for those portals. Set by the deals sync when the contact is
    // already synced; the nightly reconcile heals the rest.
    customerId: uuid("customer_id").references(() => customer.id),
    // Car-finder ("Подбор авто"): the actual fleet vehicle a salesperson picked
    // to offer against this deal. Nullable — most inbound deals have no car
    // chosen yet; it is set the moment the salesperson attaches one from the
    // finder, and it is what turns a "wants a Patrol" inquiry into "offering
    // plate 46423 EE". Drives the booking step (pre-fills the vehicle).
    vehicleId: uuid("vehicle_id").references(() => vehicle.id),
    ref: text("ref").notNull(),
    type: text("type").notNull(), // rent | lease | purchase
    status: text("status").notNull().default("open"), // open | won | lost
    stage: text("stage").notNull().default("inquiry"), // inquiry | quote | contract | tars | handover | closed
    // Exact Bitrix funnel stage NAME (e.g. "Выявление потребности", "КП
    // отправлено"), resolved per-category from crm.dealcategory.stage.list at
    // sync time. Nullable: platform-native deals have no Bitrix stage. The
    // coarse `stage` above stays authoritative for won/lost/closed logic; this
    // is the fine-grained mirror that lets the kanban reproduce Azat's 10-stage
    // Bitrix board 1:1 instead of collapsing everything to `inquiry`.
    stageDetail: text("stage_detail"),
    // Customer INTENT — what the customer actually wants, independent of the
    // coarse `type` (which the Bitrix import left uniformly 'rent'). One of
    // rent | lease_6m | lease_12m | lease_to_own | sale (see modules/crm/intent.ts).
    // Manually set from the deal card's fast picker today; the messaging
    // extraction layer writes the same column once AI tags land, so the two
    // fables share ONE field instead of a conflicting column set. Nullable —
    // when unset the Watchers board falls back to a derived provisional intent.
    intent: text("intent"),
    value: integer("value"), // AED
    balanceDue: integer("balance_due").notNull().default(0),
    ownerId: uuid("owner_id").references(() => user.id),
    notes: text("notes"),
    externalId: text("external_id"),
    externalSource: text("external_source"), // bitrix24 | kaiten
    // When this deal was last actually touched. For imported rows it comes from
    // the Bitrix payload (0046); created_at holds the import timestamp and so
    // makes every deal look new. This is what separates the live pipeline from
    // four years of archived inquiries.
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    // Bitrix's own DATE_MODIFY (0053) — the honest "a human touched this in
    // Bitrix" stamp. Our updated_at is polluted by the nightly full reconcile
    // (rewrites rows wholesale); this one only moves when Bitrix says so.
    // Freshness reads use coalesce(source_modified_at, updated_at).
    sourceModifiedAt: timestamp("source_modified_at", { withTimezone: true }),
    // ── BITRIX SEMANTIC FIELDS (0065) — what the original import dropped ────
    // The deal's real content, kept verbatim in Bitrix's own words (Russian).
    // UF ids differ per portal; the sync resolves them by meaning from
    // crm.deal.userfield.list and stores the LABELS, so these columns are
    // portal-agnostic. All nullable and only written when Bitrix carries a
    // value (absent-vs-null discipline, same as stage_detail).
    sourceComments: text("source_comments"), // deal COMMENTS — BitrixGPT needs summary
    sourceDescription: text("source_description"), // SOURCE_DESCRIPTION — often the social URL
    lossReason: text("loss_reason"), // loss-reason enumeration label
    carModels: text("car_models"), // interested model(s), "; "-joined
    languageSegment: text("language_segment"), // client language segment label
    returnCustomer: boolean("return_customer"), // IS_RETURN_CUSTOMER / IS_REPEATED_APPROACH
    // Stage-movement audit (MOVED_*): feeds Twenty stageEvent rows in the mirror.
    sourceMovedAt: timestamp("source_moved_at", { withTimezone: true }),
    sourceMovedById: text("source_moved_by_id"), // raw Bitrix user id (no name table here)
    previousStageDetail: text("previous_stage_detail"), // resolved NAME of PREVIOUS_STAGE_ID
    // ── INTELLIGENCE LAYER (0050) — customer-VOUCHED facts ──────────────────
    // Rolled up from message extraction (modules/messaging/vouch.ts): the car,
    // value and term the CUSTOMER actually named in chat, as opposed to the
    // Bitrix `value`/`type` fields the owner calls "BS". Feeds the hot-car
    // demand model and the deal card's "what they actually asked for" strip.
    vouchedCar: text("vouched_car"),
    vouchedValue: integer("vouched_value"), // AED the customer quoted
    vouchedTerm: integer("vouched_term"), // months (lease/finance)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("deal_tenant_status_idx").on(table.tenantId, table.status),
    index("deal_tenant_stage_idx").on(table.tenantId, table.stage),
    // Hot-car demand: open deals carrying a vouched/attached car.
    index("deal_tenant_vouched_idx").on(table.tenantId, table.status),
    index("deal_tenant_external_idx").on(table.tenantId, table.externalSource, table.externalId),
    index("deal_tenant_status_activity_idx").on(table.tenantId, table.status, table.lastActivityAt.desc()),
  ]
);

// ─── 8. Fleet: Vehicle ─────────────────────────────────────────────────────

export const vehicle = tenantTable(
  "vehicle",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => company.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year"),
    plate: text("plate").notNull(),
    division: text("division").notNull().default("rent"), // rent | lease
    status: text("status").notNull().default("available"), // available | on_rent | reserved | in_service | overdue | sold (sold = out of operations, no migration needed)
    location: text("location"),
    point: geographyPoint("point"),
    odometer: integer("odometer").notNull().default(0),
    dailyRate: integer("daily_rate").notNull().default(0),
    weeklyRate: integer("weekly_rate").notNull().default(0),
    monthlyRate: integer("monthly_rate").notNull().default(0),
    // Soft-delete: rentals, leases, documents and timeline events reference
    // vehicles with foreign keys, so a hard DELETE is almost never legal.
    // `deleted_at` lets managers archive a car and still browse history.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    // Planned next service (0079) — the Service panel on the vehicle profile
    // highlights the car once either threshold is reached. NULL = not planned.
    nextServiceDate: date("next_service_date"),
    nextServiceOdometer: integer("next_service_odometer"),
    oilChangeIntervalKm: integer("oil_change_interval_km").notNull().default(8000),
    serviceLimitIntervalKm: integer("service_limit_interval_km").notNull().default(10000),
    lastServiceDate: date("last_service_date"),
    lastServiceOdometer: integer("last_service_odometer"),
    lastServiceWork: text("last_service_work"),
    gpsBlocked: boolean("gps_blocked").notNull().default(false),
    imei: text("imei"),
    pilotDeviceId: text("pilot_device_id"),
    externalId: text("external_id"),
    externalSource: text("external_source"), // kaiten | pilot
    // Kaiten card carry-through (car-finder / "Подбор авто"). A Kaiten card is
    // the fleet's source of truth for the SALES story of a car — the verbatim
    // spec a salesperson reads to a customer (mileage, GCC/European, warranty,
    // insurance, calculation price) plus the showroom photos. The sync used to
    // drop all of it and keep only make/model/year/status; these three columns
    // let it land so the profile page and the finder can show the real car.
    kaitenNotes: text("kaiten_notes"), // verbatim card description (sales spec)
    // Card image files. Public files.kaiten.ru URLs (no auth needed to load),
    // so the UI links straight to them. [{ url, name }], newest board order.
    photos: jsonb("photos").$type<{ url: string; name: string }[]>(),
    // The board column the card sits in (e.g. "Stock", "BOOKED", "Stock (lux)",
    // "For sale") — provenance for the derived status and the lux/for-sale flag.
    kaitenColumn: text("kaiten_column"),
    // Raw "E/C" cell from Babek's sheet: owner is the letter before the slash,
    // the suffix says where the car was handed (/T = TAKE Auto, to sell).
    // Kept verbatim so an unrecognised suffix is preserved, not guessed away.
    sheetBrandKey: text("sheet_brand_key"),
    // TARS carry-through (0080): the RTA fleet registry is the legal record of
    // the car — chassis number and registration (mulkiya) expiry. The TARS
    // sync (integrations/tars) matches on plate first, then on this VIN.
    vin: text("vin"),
    registrationExpiry: date("registration_expiry"),
    websitePublished: boolean("website_published").notNull().default(false),
    websiteCategory: text("website_category"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("vehicle_tenant_status_idx").on(t.tenantId, t.status),
    index("vehicle_tenant_vin_idx").on(t.tenantId, t.vin),
    index("vehicle_tenant_plate_idx").on(t.tenantId, t.plate),
    index("vehicle_imei_idx").on(t.imei),
    index("vehicle_tenant_external_idx").on(t.tenantId, t.externalSource, t.externalId),
    index("vehicle_company_idx").on(t.companyId),
    // One source may claim one external key exactly once (0042). NULLs stay
    // distinct, so hand-created vehicles are unconstrained.
    uniqueIndex("vehicle_tenant_external_uniq").on(t.tenantId, t.externalSource, t.externalId),
  ],
  { companyScoped: true },
);

// ─── 9. Customer ───────────────────────────────────────────────────────────

export const customer = tenantTable(
  "customer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => company.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    division: text("division").notNull().default("rent"), // rent | lease
    source: text("source"), // whatsapp | instagram | facebook | localrent | yango | walk_in
    notes: text("notes"),
    // First http(s) URL in the contact's Bitrix WEB multi-field (0065) —
    // usually the social profile the lead came from. Mirrored to Twenty as the
    // person's socialProfile LINKS field.
    socialUrl: text("social_url"),
    externalId: text("external_id"),
    externalSource: text("external_source"), // bitrix24 | kaiten
    // Emirates ID from TARS contract drivers (0080, 784-YYYY-XXXXXXX-X) — the
    // strongest dedupe key for TARS-synced customers, ahead of phone.
    emiratesId: text("emirates_id"),
    dateOfBirth: date("date_of_birth"),
    nationality: text("nationality"),
    passportNumber: text("passport_number"),
    driverLicenseNumber: text("driver_license_number"),
    driverLicenseExpiry: date("driver_license_expiry"),
    emiratesIdExpiry: date("emirates_id_expiry"),
    documentsReviewedAt: timestamp("documents_reviewed_at", { withTimezone: true }),
    documentsReviewedBy: uuid("documents_reviewed_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("customer_tenant_phone_idx").on(t.tenantId, t.phone),
    index("customer_tenant_name_idx").on(t.tenantId, t.name),
    index("customer_tenant_external_idx").on(t.tenantId, t.externalSource, t.externalId),
    index("customer_company_idx").on(t.companyId),
  ],
  { companyScoped: true },
);

// ─── 10. Messaging: Message ────────────────────────────────────────────────

export const message = tenantTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // whatsapp | instagram | facebook | localrent | yango | email | sms
    direction: text("direction").notNull().default("inbound"), // inbound | outbound
    from: text("from"), // sender for inbound; null for outbound if unknown
    to: text("to"), // recipient for outbound
    customerId: uuid("customer_id").references(() => customer.id),
    customerName: text("customer_name"),
    body: text("body").notNull(),
    status: text("status").notNull().default("new"), // new | classified | ai_drafted | human_replied | ai_replied | sent | failed | archived
    classification: jsonb("classification"),
    aiReply: text("ai_reply"),
    aiReplyApprovedAt: timestamp("ai_reply_approved_at", { withTimezone: true }),
    aiReplySentAt: timestamp("ai_reply_sent_at", { withTimezone: true }),
    externalMessageId: text("external_message_id"),
    errorMessage: text("error_message"),
    relatedEntityType: text("related_entity_type"), // rental | customer | lead
    relatedEntityId: uuid("related_entity_id"),
    assignedTo: uuid("assigned_to").references(() => user.id),
    // Real sender phone behind a WhatsApp @lid privacy JID (0055) — from
    // Baileys key.senderPn/participantPn via the observer. `from` remains the
    // thread key; THIS is what phone-stitching matches on.
    fromPn: text("from_pn"),
    // Relative media locator ("wa/<line>/<file>") for observer-downloaded
    // attachments (0071). Resolves under WA_MEDIA_ROOT via platform/media/
    // token.ts MEDIA_ROOTS — an absolute path never enters the DB.
    mediaPath: text("media_path"),
    // Provider extras with no column of their own (0076) — written by the
    // JivoChat ingest: real channel type, visitor email, agent name, chat id.
    // NULL for every other channel.
    sourceMeta: jsonb("source_meta"),
    // ── INTELLIGENCE LAYER (0050) — deterministic signal extraction ─────────
    // "Truth lives in conversations." Per inbound line, modules/messaging/
    // extract.ts mines the deal-driving facts and lands them here; they roll up
    // to deal/lead as vouched_* and feed the hot-car demand model. All nullable
    // — a line that names nothing extractable just leaves them null.
    extractedCarText: text("extracted_car_text"),
    extractedPriceAed: integer("extracted_price_aed"),
    extractedDateFrom: date("extracted_date_from"),
    extractedDateTo: date("extracted_date_to"),
    extractedTermMonths: integer("extracted_term_months"),
    extractedIntent: text("extracted_intent"), // rent | lease | lease_to_own | sale
    extractedLanguage: text("extracted_language"), // en | ru | ar | …
    extractedManagerMention: text("extracted_manager_mention"),
    // When extraction last ran (null = not yet processed → backfill target).
    extractedAt: timestamp("extracted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("message_tenant_status_idx").on(t.tenantId, t.status),
    index("message_tenant_channel_idx").on(t.tenantId, t.channel, t.createdAt.desc()),
    index("message_customer_idx").on(t.customerId),
    index("message_related_entity_idx").on(t.tenantId, t.relatedEntityType, t.relatedEntityId),
    // Hot-car demand scan: recent inbound lines that named a car.
    index("message_extracted_car_idx").on(t.tenantId, t.direction, t.createdAt.desc()),
  ]
);

// ─── 10b. Competitor offer (broadcast digest) ───────────────────────────────
// Rental shops blast a daily "available cars" list into the same WhatsApp chats
// as the customers (TOP CAR RENT A CAR, ZORWAH, …). modules/messaging/
// competitor.ts detects those broadcasts and shreds them into rows here — a
// free, real-time read on what the market is pushing and at what price, for a
// later one-screen market view.
export const competitorOffer = tenantTable(
  "competitor_offer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    // The message the broadcast came from (dedupe / provenance). Nullable so a
    // manually-seeded competitor row is allowed.
    sourceMessageId: uuid("source_message_id").references(() => message.id, {
      onDelete: "set null",
    }),
    // The broadcasting shop, lifted from the post header ("TOP CAR RENT A CAR").
    competitor: text("competitor"),
    // The verbatim source line the row was parsed from.
    sourceLine: text("source_line").notNull(),
    // Best-effort parsed car (make + model + year).
    carText: text("car_text"),
    year: integer("year"),
    // Quoted price in AED, when the list stated one (many don't).
    priceAed: integer("price_aed"),
    // When the broadcast landed (the source message's timestamp).
    postedAt: timestamp("posted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("competitor_offer_tenant_posted_idx").on(t.tenantId, t.postedAt.desc()),
    index("competitor_offer_tenant_car_idx").on(t.tenantId, t.carText),
    index("competitor_offer_source_msg_idx").on(t.sourceMessageId),
  ]
);

// ─── 10c. B2B offer (operator supply/demand index) ──────────────────────────
// The same group streams that carry customer leads carry OPERATOR chatter:
// other rental companies offering cars (supply) and people seeking them
// (demand). platform/ai/b2b-matcher.ts classifies group threads and files the
// B2B half here — a 24h-fresh index the matcher checks when our own fleet is
// short for a deal. Expired rows are DELETED by the pass (the source message
// rows keep the history; this table is an index of what is fresh NOW).
export const b2bOffer = tenantTable(
  "b2b_offer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // supply | demand
    carText: text("car_text"),
    priceAed: integer("price_aed"),
    // Phone/handle exactly as the post wrote it.
    contactText: text("contact_text"),
    // "WhatsApp group: <jid>" / "Telegram: <title>" — where the offer ran.
    sourceLabel: text("source_label"),
    // Dedupe key: the source message's external id (unique per tenant).
    messageExtId: text("message_ext_id"),
    bodyExcerpt: text("body_excerpt"),
    spottedAt: timestamp("spotted_at", { withTimezone: true }).notNull(),
    // spotted_at + 24h — the HARD freshness rail; the matcher never suggests
    // an expired offer.
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    uniqueIndex("b2b_offer_tenant_extid_uidx").on(t.tenantId, t.messageExtId),
    index("b2b_offer_tenant_kind_expires_idx").on(t.tenantId, t.kind, t.expiresAt),
  ]
);

// ─── 10. Task (Kaiten / general) ────────────────────────────────────────────

export const task = tenantTable(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => company.id),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    board: text("board"),
    column: text("column"),
    title: text("title").notNull(),
    description: text("description"),
    assignedTo: uuid("assigned_to").references(() => user.id),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: text("status").notNull().default("open"),
    raw: jsonb("raw").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("task_tenant_external_idx").on(t.tenantId, t.externalId),
    index("task_tenant_status_idx").on(t.tenantId, t.status),
    index("task_company_idx").on(t.companyId),
  ],
  { companyScoped: true },
);

// ─── 11.5 Document / attachment (contracts, IDs, licenses, photos) ─────────

export const document = tenantTable(
  "document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // customer | rental | vehicle | deal | lead | tenant
    entityId: uuid("entity_id").notNull(),
    category: text("category").notNull().default("other"), // contract | id | license | inspection | other
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    publicUrl: text("public_url").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => user.id),
    recognitionStatus: text("recognition_status").notNull().default("not_requested"),
    recognizedData: jsonb("recognized_data"),
    recognitionError: text("recognition_error"),
    recognizedAt: timestamp("recognized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("document_entity_idx").on(t.tenantId, t.entityType, t.entityId),
    index("document_category_idx").on(t.tenantId, t.category),
  ]
);

// ─── 11.5 AI provider config (per-tenant) — SPEC §3.3 ──────────────────────

export const aiProviderConfig = tenantTable(
  "ai_provider_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("claude"), // claude | deepseek | local | auto
    localEndpoint: text("local_endpoint"), // e.g. http://100.x.x.x:1234/v1
    localModel: text("local_model"), // e.g. qwen2.5:14b
    fallbackProvider: text("fallback_provider"), // claude | null
    lastHealthyAt: timestamp("last_healthy_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastErrorText: text("last_error_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [uniqueIndex("ai_provider_config_tenant_idx").on(t.tenantId)]
);

// ─── 11. Rental (core booking transaction) ─────────────────────────────────

export const rental = tenantTable(
  "rental",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => company.id),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
    customerId: uuid("customer_id").notNull().references(() => customer.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicle.id),
    leadId: uuid("lead_id").references(() => lead.id),
    dealId: uuid("deal_id").references(() => deal.id),
    // Sales agent who owns this contract (spec: every deal is bound to a sales
    // agent; drives escalation/ownership).
    salesAgentId: uuid("sales_agent_id").references(() => user.id),
    // Contract type — rental contracts are Deposit-contracts (залоговый).
    contractType: text("contract_type").notNull().default("deposit"), // deposit
    // Booking option (how the car is held at reservation):
    // booked | booked_by_payment | booked_by_documents | repeat_client.
    bookingBasis: text("booking_basis").notNull().default("booked"),
    // Money-flow (drizzle/autonomous/0006): pricing channel the quote came
    // from (matches price_tier.channel), and the signed rental-agreement PDF
    // (left NULL at create; filled by the contract/driver-bot step).
    channel: text("channel").notNull().default("b2c"), // b2c | b2b
    customerType: text("customer_type"), // tourist | resident (0084); NULL on historic rentals
    contractUrl: text("contract_url"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    returnDate: timestamp("return_date", { withTimezone: true }).notNull(),
    actualReturnDate: timestamp("actual_return_date", { withTimezone: true }),
    dailyRate: integer("daily_rate").notNull(),
    totalDays: integer("total_days").notNull(),
    deposit: integer("deposit").notNull().default(0),
    total: integer("total").notNull(),
    balanceDue: integer("balance_due").notNull().default(0),
    status: text("status").notNull().default("reserved"), // reserved | active | returned | completed | cancelled
    notes: text("notes"),
    dailyMileageLimitKm: integer("daily_mileage_limit_km"),
    startOdometer: integer("start_odometer"),
    // Return inspection fields
    finalOdometer: integer("final_odometer"),
    fuelLevel: integer("fuel_level"), // 0-100
    damageNotes: text("damage_notes"),
    customerRating: integer("customer_rating"), // 1-5, recorded at return (0083)
    // Return checklist: fines / Salik / parking / defects, each {checked, amount,
    // note}. Itemized operator charges and payments live in rental_charge (0086);
    // this checklist remains the staff sign-off on the return inspection.
    returnChecklist: jsonb("return_checklist").$type<{
      fines?: { checked: boolean; amount?: number | null; note?: string | null };
      salik?: { checked: boolean; amount?: number | null; note?: string | null };
      parking?: { checked: boolean; amount?: number | null; note?: string | null };
      defects?: { checked: boolean; note?: string | null };
      completedBy?: string | null;
      completedAt?: string | null;
      sentAt?: string | null;
      skipped?: boolean;
    }>(),
    extraChargeAmount: integer("extra_charge_amount").notNull().default(0),
    extraChargeReason: text("extra_charge_reason"),
    returnedBy: uuid("returned_by").references(() => user.id),
    // Deposit lifecycle (Deposit-contract). On rental completion the deposit is
    // resolved: returned in full, partially returned, or withheld with a reason.
    depositStatus: text("deposit_status").notNull().default("held"), // held | returned | partial | withheld
    depositRefunded: integer("deposit_refunded").notNull().default(0),
    depositWithheldReason: text("deposit_withheld_reason"),
    depositResolvedAt: timestamp("deposit_resolved_at", { withTimezone: true }),
    depositResolvedBy: uuid("deposit_resolved_by").references(() => user.id),
    // TARS contract identity (0080, e.g. "55606-3350") — the TARS sync
    // (integrations/tars) upserts on it; unique per tenant.
    tarsDocumentNumber: text("tars_document_number"),
    onboardingStage: text("onboarding_stage").notNull().default("new_lead"),
    taqeeqSubmissionId: text("taqeeq_submission_id"),
    taqeeqSignedAt: timestamp("taqeeq_signed_at", { withTimezone: true }),
    extensionStatus: text("extension_status").notNull().default("not_sent"),
    returnReminderSentAt: timestamp("return_reminder_sent_at", { withTimezone: true }),
    customerResponseAt: timestamp("customer_response_at", { withTimezone: true }),
    customerResponse: text("customer_response"),
    statementCount: integer("statement_count").notNull().default(0),
    lastStatementSentAt: timestamp("last_statement_sent_at", { withTimezone: true }),
    finalStatementSentAt: timestamp("final_statement_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("rental_tenant_status_idx").on(t.tenantId, t.status),
    index("rental_tenant_dates_idx").on(t.tenantId, t.startDate, t.returnDate),
    index("rental_customer_idx").on(t.customerId),
    index("rental_vehicle_idx").on(t.vehicleId),
    index("rental_company_idx").on(t.companyId),
    uniqueIndex("rental_tenant_tars_doc_uniq").on(t.tenantId, t.tarsDocumentNumber),
    index("rental_tenant_onboarding_stage_idx").on(t.tenantId, t.onboardingStage),
  ],
  { companyScoped: true },
);

export const rentalCharge = tenantTable(
  "rental_charge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    rentalId: uuid("rental_id").notNull().references(() => rental.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicle.id),
    customerId: uuid("customer_id").notNull().references(() => customer.id),
    kind: text("kind").notNull(),
    externalId: text("external_id").notNull(),
    source: text("source").notNull().default("manual"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    description: text("description"),
    location: text("location"),
    amount: money("amount").notNull(),
    status: text("status").notNull().default("unpaid"),
    notificationStatus: text("notification_status").notNull().default("not_sent"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    paymentDueAt: timestamp("payment_due_at", { withTimezone: true }),
    notificationError: text("notification_error"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("rental_charge_rental_idx").on(t.tenantId, t.rentalId),
    index("rental_charge_vehicle_time_idx").on(t.tenantId, t.vehicleId, t.occurredAt),
    index("rental_charge_outstanding_idx").on(t.tenantId, t.status, t.paymentDueAt),
    uniqueIndex("rental_charge_external_uniq").on(t.tenantId, t.kind, t.externalId),
  ],
);

// ─── 11.5 Payment (rental payments, deposits, refunds) ─────────────────────

export const payment = tenantTable(
  "payment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    rentalId: uuid("rental_id").notNull().references(() => rental.id, { onDelete: "cascade" }),
    rentalChargeId: uuid("rental_charge_id").references(() => rentalCharge.id),
    amount: money("amount").notNull(),
    method: text("method").notNull().default("cash"), // cash | card | bank_transfer | other
    notes: text("notes"),
    // Two-step confirmation: sales records (pending) → sales confirms (posted).
    status: text("status").notNull().default("pending"), // pending | confirmed | rejected
    recordedBy: uuid("recorded_by").references(() => user.id),
    confirmedBy: uuid("confirmed_by").references(() => user.id),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("payment_rental_idx").on(t.tenantId, t.rentalId),
    index("payment_created_idx").on(t.tenantId, t.createdAt.desc()),
  ]
);

// ─── 11.7 Telephony: Call (provider-agnostic; first adapter Twilio) ─────────

// One row per phone call, inbound or outbound, so a contact's history is
// messages + calls in one place. The QA pass (recording → transcript → LLM)
// fills `qa` later; statuses mirror the provider's lifecycle.
export const call = tenantTable(
  "call",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
    leadId: uuid("lead_id").references(() => lead.id),
    customerId: uuid("customer_id").references(() => customer.id),
    managerId: uuid("manager_id").notNull().references(() => user.id),
    direction: text("direction").notNull(), // outbound | inbound
    phone: text("phone").notNull(), // counterparty digits
    provider: text("provider").notNull().default("twilio"),
    providerCallId: text("provider_call_id"), // Twilio SID
    status: text("status").notNull().default("initiated"), // initiated | ringing | in-progress | completed | no-answer | busy | failed | missed
    durationSec: integer("duration_sec"),
    recordingUrl: text("recording_url"),
    transcript: text("transcript"),
    qa: jsonb("qa").$type<{ score?: number; flags?: string[]; summary?: string }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("call_tenant_lead_idx").on(t.tenantId, t.leadId),
    index("call_tenant_manager_idx").on(t.tenantId, t.managerId),
    index("call_tenant_created_idx").on(t.tenantId, t.createdAt.desc()),
  ]
);

// ─── 11.7 Lease-to-own contract ────────────────────────────────────────────

export const lease = tenantTable(
  "lease",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => company.id),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
    customerId: uuid("customer_id").notNull().references(() => customer.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicle.id),
    dealId: uuid("deal_id").references(() => deal.id),
    // Sales agent who owns this contract (spec: every deal bound to a sales agent).
    salesAgentId: uuid("sales_agent_id").references(() => user.id),
    // Leasing contracts are also Deposit-contracts (залоговый).
    contractType: text("contract_type").notNull().default("deposit"), // deposit
    contractRef: text("contract_ref").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    termMonths: integer("term_months").notNull(),
    downPayment: integer("down_payment").notNull().default(0),
    monthlyPayment: integer("monthly_payment").notNull(),
    residualValue: integer("residual_value").notNull().default(0),
    totalAmount: integer("total_amount").notNull(),
    balanceDue: integer("balance_due").notNull().default(0),
    status: text("status").notNull().default("draft"), // draft | active | completed | defaulted | cancelled
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    uniqueIndex("lease_tenant_ref_idx").on(t.tenantId, t.contractRef),
    index("lease_tenant_status_idx").on(t.tenantId, t.status),
    index("lease_tenant_dates_idx").on(t.tenantId, t.startDate, t.endDate),
    index("lease_customer_idx").on(t.customerId),
    index("lease_vehicle_idx").on(t.vehicleId),
    index("lease_company_idx").on(t.companyId),
  ],
  { companyScoped: true },
);

// ─── 11.8 Lease installment schedule (amortization) ─────────────────────────

export const leaseInstallment = tenantTable(
  "lease_installment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
    leaseId: uuid("lease_id").notNull().references(() => lease.id, { onDelete: "cascade" }),
    installmentNumber: integer("installment_number").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    amount: integer("amount").notNull(),
    status: text("status").notNull().default("pending"), // pending | paid | overdue | waived
    paidAt: timestamp("paid_at", { withTimezone: true }),
    leasePaymentId: uuid("lease_payment_id").references(() => leasePayment.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("lease_installment_lease_idx").on(t.tenantId, t.leaseId, t.dueDate),
    index("lease_installment_status_idx").on(t.tenantId, t.status),
  ]
);

// ─── 11.9 Lease payment (actual installments received) ───────────────────────

export const leasePayment = tenantTable(
  "lease_payment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
    leaseId: uuid("lease_id").notNull().references(() => lease.id, { onDelete: "cascade" }),
    installmentId: uuid("installment_id").references(() => leaseInstallment.id),
    amount: integer("amount").notNull(),
    method: text("method").notNull().default("cash"), // cash | card | bank_transfer | other
    notes: text("notes"),
    // Two-step: sales records (pending) → sales confirms (posts).
    status: text("status").notNull().default("pending"), // pending | confirmed | rejected
    recordedBy: uuid("recorded_by").references(() => user.id),
    confirmedBy: uuid("confirmed_by").references(() => user.id),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("lease_payment_lease_idx").on(t.tenantId, t.leaseId),
    index("lease_payment_created_idx").on(t.tenantId, t.createdAt.desc()),
  ]
);

// ─── 12. Support access grant (consent-based impersonation) — SPEC §3.5 ──────
// Declared via tenantTable() (not the spec's bare pgTable) because it has a
// tenant_id column: the RLS boot guard (ADR-002) requires the full triad on
// any such table, and user rule #1 mandates tenantTable(). Platform admins
// read/write grants via withDrizzleTenant(tenantId), same as the rest of the
// admin console. Append-only in practice (revoke = set revokedAt).

export const supportAccessGrant = tenantTable(
  "support_access_grant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by").notNull().references(() => user.id), // a tenant_admin
    grantedTo: uuid("granted_to").notNull().references(() => user.id), // a platform_admin
    reason: text("reason").notNull(),
    scope: text("scope").notNull().default("read"), // read | write
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // max 24h from now
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("support_access_grant_tenant_idx").on(t.tenantId, t.createdAt.desc()),
    index("support_access_grant_granted_to_idx").on(t.grantedTo),
  ]
);

// ─── 13. Support tickets — SPEC §3.4 ─────────────────────────────────────────

export const supportTicket = tenantTable(
  "support_ticket",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    openedBy: uuid("opened_by").notNull().references(() => user.id),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("open"), // open | in_progress | resolved | closed
    priority: text("priority").notNull().default("normal"), // low | normal | high | urgent
    assignedTo: uuid("assigned_to").references(() => user.id), // platform_admin
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t: TenantExtraColumns) => [
    index("support_ticket_tenant_status_idx").on(t.tenantId, t.status),
    index("support_ticket_tenant_created_idx").on(t.tenantId, t.createdAt.desc()),
  ]
);

export const supportTicketReply = tenantTable(
  "support_ticket_reply",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").notNull().references(() => supportTicket.id),
    authorId: uuid("author_id").notNull().references(() => user.id),
    authorKind: text("author_kind").notNull(), // platform_admin | tenant_member
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [index("support_ticket_reply_ticket_idx").on(t.tenantId, t.ticketId, t.createdAt)]
);

// ─── 14. Service-hours ledger — included support hours usage ─────────────────
// Each entry logs time spent serving a tenant. "Remaining this month" =
// tenant.serviceHoursPerMonth − sum(entries in the current calendar month).

export const serviceHoursEntry = tenantTable(
  "service_hours_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    minutes: integer("minutes").notNull(), // store minutes; display as hours
    note: text("note"),
    loggedBy: uuid("logged_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [index("service_hours_entry_tenant_created_idx").on(t.tenantId, t.createdAt.desc())]
);

// ─── Device log — soft identity binding for LAN self-onboarding ─────────────
// Records which physical device (by MAC, resolved from the office LAN ARP
// table) each account signs in from. Platform-level (no tenant_id) so it is
// exempt from the tenant RLS startup-check; it is a vendor/admin audit surface.
export const deviceLogin = pgTable(
  "device_login",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => user.id),
    email: text("email"),
    ip: text("ip"),
    mac: text("mac"),
    userAgent: text("user_agent"),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    confirmed: boolean("confirmed").notNull().default(false),
    confirmedBy: uuid("confirmed_by"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => [uniqueIndex("device_login_user_mac_idx").on(table.userId, table.mac)],
);

// ─── Vehicle timeline (per-car live archive) ───────────────────────────────
// Every car owns a calendar. Anything that happens to it — rentals, handover,
// return, service, damage, fines, documents — lands here as one event, so
// opening a vehicle shows its whole life in one place (and later feeds RAG).

// ─── Notification ledger (push-first delivery) ─────────────────────────────
// Every staff Telegram ping the platform ever sends is recorded here BEFORE it
// is sent (insert-or-skip on dedupe_key), so no person is ever pinged twice
// about the same thing. Written exclusively by modules/notify/send.ts — rules
// never call the Bot API themselves. Doubles as the rate-cap counter (sent
// rows per target per Dubai day) and the backfill guard (first live run marks
// pre-existing signals as 'backfill' instead of blasting the team).

export const notification = tenantTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    // wait | hot_deal | hot_lead | digest | ceo_digest (open set — new rules add kinds)
    kind: text("kind").notNull(),
    // Who was pinged: a platform user when known, else the owner key from
    // modules/board/owners.ts ('azat', 'babek', …). At least one is set.
    targetUserId: uuid("target_user_id").references(() => user.id, { onDelete: "set null" }),
    targetKey: text("target_key"),
    // The resolved Telegram chat id actually used (audit — resolution cascade
    // can change over time as people link Telegram).
    chatId: text("chat_id"),
    // What the ping was about (board_item | deal | lead | …).
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    dedupeKey: text("dedupe_key").notNull(),
    // pending (claimed, send in flight) | sent | failed | backfill.
    // Failed rows are reclaimable — a later run may retry the same dedupe_key.
    status: text("status").notNull().default("pending"),
    error: text("error"),
    // First line of what was sent (debugging "what did Azat actually get?").
    preview: text("preview"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t: TenantExtraColumns) => [
    uniqueIndex("notification_dedupe_idx").on(t.tenantId, t.dedupeKey),
    // Rate-cap scan: today's sent pings for one person.
    index("notification_target_created_idx").on(t.tenantId, t.targetUserId, t.createdAt.desc()),
    index("notification_key_created_idx").on(t.tenantId, t.targetKey, t.createdAt.desc()),
  ],
);

// «Мой день» card dismissals (0057). Closing a «Ждут ответа»/«Горячее» card
// records WHY here; the /my waiting+hot reads LEFT JOIN this and drop any
// (line, contact) dismissed within the last 14 days. Keyed by the SAME
// conversation key the cockpit groups on: line = message.to (line slug),
// contact = coalesce(from_pn, from).
export const cardDismissal = tenantTable(
  "card_dismissal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // waiting | hot
    contact: text("contact").notNull(), // coalesce(from_pn, from) — the person
    line: text("line").notNull(), // the WA line slug (message.to)
    dismissedBy: uuid("dismissed_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason"), // nullable free/quick reason — "learn what we close"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    // The /my waiting+hot exclusion scan: recent dismissals for one (line, contact).
    index("card_dismissal_lookup_idx").on(t.tenantId, t.line, t.contact, t.createdAt.desc()),
  ]
);

// Bitrix24 dry-run crawl state (0058). One row per run, keyed by the runId the
// settings/migration UI polls. Replaces a per-process in-memory Map that leaked
// forever and vanished on redeploy; being a real tenant-scoped table also means
// the progress read runs under RLS instead of on the global connection.
// All four jsonb maps are keyed by the PLURAL entity name ("contacts",
// "activities", …) so the UI can compare counts[k] to totals[k] key-for-key.
export const bitrixDiscoveryRun = tenantTable(
  "bitrix_discovery_run",
  {
    // = the runId minted by the server action, not generated here.
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    // Set once every entity reached a terminal status.
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    // entity -> expected record count (from the count probe)
    totals: jsonb("totals").$type<Record<string, number>>().notNull().default({}),
    // entity -> records crawled so far (advanced on every chunk commit)
    counts: jsonb("counts").$type<Record<string, number>>().notNull().default({}),
    // entity -> the error that killed the probe or the crawl
    errors: jsonb("errors").$type<Record<string, string>>().notNull().default({}),
    // entity -> queued | running | done | error
    statuses: jsonb("statuses").$type<Record<string, string>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("bitrix_discovery_run_tenant_started_idx").on(t.tenantId, t.startedAt.desc()),
  ]
);

// ─── Twenty CRM mirror: per-entity resume state ─────────────────────────────
//
// One row per (tenant, entity): how far the Bitrix→Twenty mirror got. `cursor`
// is the last mirrored external id (the mirror pages source rows ordered by
// external_id), `counts` accumulates read/admitted/created/updated/dropped so a
// crashed run resumes with its statistics intact. status "running" = resume
// from cursor; "done" = the next run starts a fresh full pass (the upsert-by-
// externalId logic makes full re-runs idempotent, so this is how scheduled
// re-mirrors pick up changes).
export const twentyMirrorState = tenantTable(
  "twenty_mirror_state",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    entity: text("entity").notNull(), // contacts | leads | deals
    cursor: text("cursor"), // last mirrored external id (resume token)
    status: text("status").notNull().default("running"), // running | done
    counts: jsonb("counts").$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    uniqueIndex("twenty_mirror_state_tenant_entity_uniq").on(t.tenantId, t.entity),
  ]
);

export const vehicleTimelineEvent = tenantTable(
  "vehicle_timeline_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicle.id),
    // rental | maintenance | service | fine | handover | return | damage | document
    type: text("type").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    // NULL = open-ended (still running). The overlap constraint reads it as +infinity.
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: text("status").notNull().default("planned"), // planned | active | done | cancelled
    title: text("title"),
    rentalId: uuid("rental_id").references(() => rental.id),
    documentId: uuid("document_id").references(() => document.id),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("vehicle_timeline_tenant_vehicle_starts_idx").on(t.tenantId, t.vehicleId, t.startsAt),
    index("vehicle_timeline_rental_idx").on(t.rentalId),
  ],
);

export const engineBlock = tenantTable(
  "engine_block",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    rentalChargeId: uuid("rental_charge_id").notNull().references(() => rentalCharge.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicle.id),
    requestedBy: uuid("requested_by").references(() => user.id),
    commandId: integer("command_id"),
    unblockCommandId: integer("unblock_command_id"),
    status: text("status").notNull().default("requested"),
    liveStateCheckedAt: timestamp("live_state_checked_at", { withTimezone: true }).notNull(),
    error: text("error"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t: TenantExtraColumns) => [
    index("engine_block_vehicle_idx").on(t.tenantId, t.vehicleId, t.status),
    uniqueIndex("engine_block_charge_uniq").on(t.tenantId, t.rentalChargeId),
  ],
);
