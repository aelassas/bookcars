-- ============================================================================
-- 0001_engine_tables.sql — Autonomous platform engine tables (SCAFFOLDING)
-- ============================================================================
--
-- STAGE: ANALYZE-ONLY. These tables let the platform become the SOURCE OF TRUTH
-- while Bitrix (and FreePBX/CallGear) are demoted to peripheral engines that
-- either feed data IN (call_activity, deal_stage_history) or receive commands
-- OUT (outbox). Nothing here mutates Bitrix; that happens in a later stage.
--
-- MULTI-TENANCY: every table carries `tenant_id uuid NOT NULL` FK to tenant(id),
-- has Row-Level-Security ENABLEd + FORCEd, and a PERMISSIVE tenant-isolation
-- policy that matches the platform-wide convention:
--
--     USING/WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid)
--
-- The app connects as the non-bypass `app_runtime` role (see DB_APP_ROLE) which
-- sets `SET LOCAL app.tenant_id = <uuid>` per request via withDrizzleTenant().
-- The boot guard (verifyRlsAtBoot) will fail deploy if any of these tables is
-- missing the ENABLE + FORCE + policy triad, so all three are emitted here.
--
-- NOTE ON ENUMS: this migration uses native Postgres enum types (rather than the
-- text+DEFAULT pattern seen elsewhere) because the domains below are closed,
-- finite, and reviewer-facing. Adding a value later is a one-line
-- `ALTER TYPE ... ADD VALUE`. Renames/removals require a type swap — acceptable
-- for these stable command/event vocabularies. Enums are schema-global (not
-- tenant-scoped); the *rows* referencing them remain tenant-isolated by RLS.
--
-- CONVENTIONS: uuid v4 PKs (gen_random_uuid), timestamptz timestamps defaulting
-- to now(), tenant-leading composite indexes (RLS filters tenant_id on every
-- read, so it belongs first in the btree), and COMMENTs on every table + column.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

-- Direction of a telephony call as reported by FreePBX/Bitrix/CallGear.
CREATE TYPE "call_direction" AS ENUM ('inbound', 'outbound', 'internal');--> statement-breakpoint

-- Money-moving (or money-tracking) events in a vehicle's lifetime ledger.
-- The full P&L of a vehicle is SUM(amount) partitioned by sign convention
-- described on vehicle_ledger_event.amount below.
CREATE TYPE "vehicle_ledger_event_type" AS ENUM (
  'purchase',        -- acquisition cost of the vehicle (outflow)
  'title_fee',       -- registration / title transfer government fees (outflow)
  'insurance',       -- insurance premium (outflow)
  'interest',        -- financing interest on the vehicle (outflow)
  'maintenance',     -- service, repairs, tyres, parts (outflow)
  'fine',            -- traffic/Salik/parking fine attributed to the vehicle (outflow)
  'rental_income',   -- revenue earned while the vehicle is on rent (inflow)
  'buyout_payment',  -- lease-to-own instalment received from customer (inflow)
  'sale',            -- proceeds from selling the vehicle (inflow)
  'bonus',           -- manufacturer/dealer bonus or rebate (inflow)
  'overhead'         -- allocated operating overhead charged to the vehicle (outflow)
);--> statement-breakpoint

-- Lifecycle of a single outbound command in the platform -> Bitrix queue.
CREATE TYPE "outbox_status" AS ENUM (
  'pending',    -- created, not yet picked up by the dispatcher
  'in_flight',  -- claimed by a worker and being sent to Bitrix
  'sent',       -- Bitrix acknowledged; external_id captured
  'failed',     -- exhausted retries or hit a non-retryable error
  'skipped'     -- superseded/deduped; intentionally not sent
);--> statement-breakpoint

-- Which system is authoritative for a given (entity, field) pair. Drives the
-- write-arbitration logic that decides whether an inbound Bitrix change is
-- accepted or overwritten by the platform.
CREATE TYPE "field_owner" AS ENUM ('platform', 'bitrix');--> statement-breakpoint

-- Autonomy ladder for a platform capability. Rungs are ordered least->most
-- autonomous; the app compares position to gate behaviour.
CREATE TYPE "autonomy_level" AS ENUM (
  'observe',     -- platform only records/reports; takes no action
  'suggest',     -- platform proposes an action to a human, who initiates it
  'assist',      -- platform pre-fills/executes with mandatory human approval
  'autonomous'   -- platform acts without per-action human approval
);--> statement-breakpoint

-- Approval lifecycle for the single customer-message chokepoint.
CREATE TYPE "outbound_message_status" AS ENUM (
  'needs_approval', -- drafted (often by AI); blocked until a human approves
  'approved',       -- a human approved; queued to send
  'sent'            -- handed to the channel provider
);--> statement-breakpoint

-- ===========================================================================
-- call_activity — mirror of Bitrix/FreePBX call records
-- ===========================================================================
-- One row per completed call event ingested from telephony. This is a PROJECTION
-- (peripheral engine -> platform); raw payloads still land in integration_event
-- first. Used for manager KPIs, missed-call follow-up, and deal enrichment.
CREATE TABLE "call_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "direction" "call_direction" NOT NULL,
  "from_number" text NOT NULL,
  "to_number" text NOT NULL,
  "duration_seconds" integer DEFAULT 0 NOT NULL,
  "disposition" text,
  "recording_url" text,
  "deal_ref" text,
  "manager" text,
  "abandoned" boolean DEFAULT false NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "external_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "call_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
COMMENT ON TABLE "call_activity" IS 'Mirror of Bitrix/FreePBX/CallGear call records; projected from integration_event. Platform-owned analytical copy of telephony activity.';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."direction" IS 'inbound | outbound | internal, as reported by the PBX.';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."from_number" IS 'Caller number in E.164 where available (raw PBX string otherwise).';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."to_number" IS 'Called number in E.164 where available (raw PBX string otherwise).';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."duration_seconds" IS 'Billable/talk duration in seconds; 0 for abandoned/unanswered calls.';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."disposition" IS 'PBX disposition (ANSWERED, NO ANSWER, BUSY, FAILED, ...); free text to tolerate provider variance.';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."recording_url" IS 'URL to the call recording, if the provider exposes one.';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."deal_ref" IS 'Bitrix deal reference this call is linked to (soft ref; not FK — deals sync asynchronously).';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."manager" IS 'Sales manager / agent handle attributed to the call (soft ref to Bitrix user).';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."abandoned" IS 'TRUE when the caller hung up before the call was answered (missed/abandoned).';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."occurred_at" IS 'Wall-clock time the call actually happened (from the PBX), distinct from created_at ingest time.';--> statement-breakpoint
COMMENT ON COLUMN "call_activity"."external_id" IS 'Provider-side call id; used to dedupe re-delivered webhooks (unique per tenant).';--> statement-breakpoint

-- ===========================================================================
-- deal_stage_history — pipeline stage transitions
-- ===========================================================================
-- Fed by diffing consecutive ONCRMDEALUPDATE events: one row per stage change.
-- Powers funnel/velocity analytics and time-in-stage KPIs.
CREATE TABLE "deal_stage_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "deal_ref" text NOT NULL,
  "from_stage" text,
  "to_stage" text NOT NULL,
  "manager" text,
  "changed_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "deal_stage_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
COMMENT ON TABLE "deal_stage_history" IS 'Append-only pipeline stage transitions, derived by diffing Bitrix ONCRMDEALUPDATE events. One row per stage change.';--> statement-breakpoint
COMMENT ON COLUMN "deal_stage_history"."deal_ref" IS 'Bitrix deal reference (soft ref; deals project asynchronously).';--> statement-breakpoint
COMMENT ON COLUMN "deal_stage_history"."from_stage" IS 'Previous Bitrix stage id; NULL for the first observed stage of a deal.';--> statement-breakpoint
COMMENT ON COLUMN "deal_stage_history"."to_stage" IS 'New Bitrix stage id the deal moved into.';--> statement-breakpoint
COMMENT ON COLUMN "deal_stage_history"."manager" IS 'Manager responsible at the time of the transition (soft ref to Bitrix user).';--> statement-breakpoint
COMMENT ON COLUMN "deal_stage_history"."changed_at" IS 'When the stage change actually occurred (from Bitrix), distinct from ingest time.';--> statement-breakpoint

-- ===========================================================================
-- kpi_plan — per-manager monthly targets
-- ===========================================================================
-- Human-authored targets (calls made, deals won, revenue, ...) evaluated against
-- call_activity / deal_stage_history / vehicle_ledger_event actuals.
CREATE TABLE "kpi_plan" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "manager" text NOT NULL,
  "month" date NOT NULL,
  "metric" text NOT NULL,
  "target" numeric(18, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "kpi_plan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
COMMENT ON TABLE "kpi_plan" IS 'Per-manager, per-month KPI targets set by humans; compared against computed actuals.';--> statement-breakpoint
COMMENT ON COLUMN "kpi_plan"."manager" IS 'Manager handle the target applies to (soft ref to Bitrix user).';--> statement-breakpoint
COMMENT ON COLUMN "kpi_plan"."month" IS 'Plan month; normalized to the first day of the month (YYYY-MM-01).';--> statement-breakpoint
COMMENT ON COLUMN "kpi_plan"."metric" IS 'Metric key, e.g. calls_made, deals_won, revenue_aed, avg_talk_time. Free text; a metric registry is out of scope for this stage.';--> statement-breakpoint
COMMENT ON COLUMN "kpi_plan"."target" IS 'Target value for the metric (numeric to hold both counts and money).';--> statement-breakpoint

-- ===========================================================================
-- vehicle_ledger_event — per-vehicle financial ledger
-- ===========================================================================
-- Append-only stream of money events per vehicle. Vehicle-level P&L is computed
-- as SUM(amount) with the sign convention on `amount` below.
CREATE TABLE "vehicle_ledger_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "vehicle_id" uuid NOT NULL,
  "event_type" "vehicle_ledger_event_type" NOT NULL,
  "amount" numeric(18, 2) NOT NULL,
  "occurred_on" date NOT NULL,
  "source_ref" text,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "vehicle_ledger_event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
COMMENT ON TABLE "vehicle_ledger_event" IS 'Append-only per-vehicle financial ledger. Vehicle P&L = SUM(amount) over these events (income positive, costs negative — see amount).';--> statement-breakpoint
COMMENT ON COLUMN "vehicle_ledger_event"."vehicle_id" IS 'Vehicle this event belongs to. FK RESTRICT: ledger must not be silently orphaned when a vehicle is removed.';--> statement-breakpoint
COMMENT ON COLUMN "vehicle_ledger_event"."event_type" IS 'Ledger category (purchase, insurance, rental_income, sale, ...). See vehicle_ledger_event_type enum.';--> statement-breakpoint
COMMENT ON COLUMN "vehicle_ledger_event"."amount" IS 'Signed amount in tenant base currency. Convention: inflows (rental_income, buyout_payment, sale, bonus) positive; costs (purchase, title_fee, insurance, interest, maintenance, fine, overhead) negative.';--> statement-breakpoint
COMMENT ON COLUMN "vehicle_ledger_event"."occurred_on" IS 'Business date the event is booked to (drives monthly P&L), distinct from created_at.';--> statement-breakpoint
COMMENT ON COLUMN "vehicle_ledger_event"."source_ref" IS 'Origin reference (payment id, invoice no, fine no, Bitrix deal ref) for traceability; soft ref.';--> statement-breakpoint
COMMENT ON COLUMN "vehicle_ledger_event"."meta" IS 'Free-form structured detail (odometer, vendor, fine authority, ...). Defaults to {}.';--> statement-breakpoint

-- ===========================================================================
-- outbox — platform -> Bitrix command queue (transactional outbox)
-- ===========================================================================
-- Commands are written in the SAME transaction as the business change, then a
-- dispatcher relays them to Bitrix. This is what lets the platform act as source
-- of truth while keeping Bitrix eventually consistent.
CREATE TABLE "outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "aggregate" text NOT NULL,
  "op" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "outbox_status" DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "external_id" text,
  "last_error" text,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
COMMENT ON TABLE "outbox" IS 'Transactional outbox for platform -> Bitrix commands. Written in-tx with the business change; relayed by a dispatcher for eventual consistency.';--> statement-breakpoint
COMMENT ON COLUMN "outbox"."aggregate" IS 'Target aggregate/entity in Bitrix (e.g. deal, contact, call). Groups related commands.';--> statement-breakpoint
COMMENT ON COLUMN "outbox"."op" IS 'Operation to perform (e.g. create, update, add_comment, set_stage).';--> statement-breakpoint
COMMENT ON COLUMN "outbox"."payload" IS 'Command arguments as JSON (the fields to push to Bitrix). Defaults to {}.';--> statement-breakpoint
COMMENT ON COLUMN "outbox"."status" IS 'pending | in_flight | sent | failed | skipped. See outbox_status enum.';--> statement-breakpoint
COMMENT ON COLUMN "outbox"."attempts" IS 'Number of delivery attempts made; drives backoff and the failed threshold.';--> statement-breakpoint
COMMENT ON COLUMN "outbox"."external_id" IS 'Bitrix-side id returned on success (e.g. created deal id); enables idempotent follow-ups.';--> statement-breakpoint
COMMENT ON COLUMN "outbox"."last_error" IS 'Last error text from a failed attempt, for operator visibility.';--> statement-breakpoint
COMMENT ON COLUMN "outbox"."next_attempt_at" IS 'Earliest time the dispatcher may (re)try this command; supports exponential backoff.';--> statement-breakpoint

-- ===========================================================================
-- sync_field_ownership — per-field write arbitration
-- ===========================================================================
-- Declares, per (entity, field), whether the platform or Bitrix is authoritative.
-- Inbound Bitrix changes to platform-owned fields are rejected/re-pushed;
-- platform changes to bitrix-owned fields are not sent outbound.
CREATE TABLE "sync_field_ownership" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "entity" text NOT NULL,
  "field" text NOT NULL,
  "owner" "field_owner" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "sync_field_ownership" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
COMMENT ON TABLE "sync_field_ownership" IS 'Per (entity, field) write-arbitration map: which side (platform | bitrix) is authoritative. Unique per tenant+entity+field.';--> statement-breakpoint
COMMENT ON COLUMN "sync_field_ownership"."entity" IS 'Logical entity the rule applies to (e.g. deal, contact, vehicle).';--> statement-breakpoint
COMMENT ON COLUMN "sync_field_ownership"."field" IS 'Field/attribute within the entity (e.g. stage, phone, daily_rate).';--> statement-breakpoint
COMMENT ON COLUMN "sync_field_ownership"."owner" IS 'platform | bitrix — the system of record for this field. See field_owner enum.';--> statement-breakpoint

-- ===========================================================================
-- bitrix_pipeline_map — Bitrix category -> business unit
-- ===========================================================================
-- Maps a Bitrix deal category (pipeline) to a platform business unit so inbound
-- deals/stage-history land in the right operational bucket.
CREATE TABLE "bitrix_pipeline_map" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "bitrix_category_id" integer NOT NULL,
  "business_unit" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "bitrix_pipeline_map" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
COMMENT ON TABLE "bitrix_pipeline_map" IS 'Maps a Bitrix deal category (pipeline) to a platform business unit. Unique per tenant+bitrix_category_id.';--> statement-breakpoint
COMMENT ON COLUMN "bitrix_pipeline_map"."bitrix_category_id" IS 'Bitrix CRM deal CATEGORY_ID (pipeline id) as reported by Bitrix.';--> statement-breakpoint
COMMENT ON COLUMN "bitrix_pipeline_map"."business_unit" IS 'Platform-side business unit / division this pipeline routes to.';--> statement-breakpoint

-- ===========================================================================
-- autonomy_policy — per-capability autonomy level
-- ===========================================================================
-- The safety governor: for each capability, how much the platform may act on its
-- own. Read by the runtime before any autonomous action to gate/escalate.
CREATE TABLE "autonomy_policy" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "capability" text NOT NULL,
  "level" "autonomy_level" DEFAULT 'observe' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "autonomy_policy" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
COMMENT ON TABLE "autonomy_policy" IS 'Per-capability autonomy governor. Runtime checks this before acting. Unique per tenant+capability. Defaults conservatively to observe.';--> statement-breakpoint
COMMENT ON COLUMN "autonomy_policy"."capability" IS 'Capability key being governed (e.g. reply_to_customer, block_vehicle, push_deal_to_bitrix).';--> statement-breakpoint
COMMENT ON COLUMN "autonomy_policy"."level" IS 'observe | suggest | assist | autonomous — ascending autonomy. See autonomy_level enum. Defaults to observe (safe).';--> statement-breakpoint

-- ===========================================================================
-- outbound_message — the single customer-message chokepoint
-- ===========================================================================
-- EVERY outbound customer message funnels through this table so approval,
-- audit, and rate-limiting have exactly one place to enforce. Nothing reaches a
-- customer without a row here reaching status = sent.
CREATE TABLE "outbound_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "channel" text NOT NULL,
  "to_address" text NOT NULL,
  "body" text NOT NULL,
  "status" "outbound_message_status" DEFAULT 'needs_approval' NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "outbound_message" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
COMMENT ON TABLE "outbound_message" IS 'Single chokepoint for all outbound customer messages. Approval + audit + rate-limiting enforced here; nothing reaches a customer without a row hitting status=sent.';--> statement-breakpoint
COMMENT ON COLUMN "outbound_message"."channel" IS 'Delivery channel (whatsapp, sms, email, ...).';--> statement-breakpoint
COMMENT ON COLUMN "outbound_message"."to_address" IS 'Recipient address for the channel (phone in E.164, email, ...).';--> statement-breakpoint
COMMENT ON COLUMN "outbound_message"."body" IS 'Rendered message body to be sent (often AI-drafted).';--> statement-breakpoint
COMMENT ON COLUMN "outbound_message"."status" IS 'needs_approval | approved | sent. See outbound_message_status enum. Starts at needs_approval.';--> statement-breakpoint
COMMENT ON COLUMN "outbound_message"."approved_by" IS 'User who approved the message; NULL until approved. FK to user (SET NULL on delete to preserve the send record).';--> statement-breakpoint
COMMENT ON COLUMN "outbound_message"."approved_at" IS 'When approval was granted; NULL until approved.';--> statement-breakpoint
COMMENT ON COLUMN "outbound_message"."sent_at" IS 'When the message was handed to the channel provider; NULL until sent.';--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
-- tenant_id -> tenant(id) ON DELETE CASCADE on every table (tenant teardown
-- removes its engine data). vehicle_id -> vehicle(id) RESTRICT to protect the
-- financial ledger. approved_by -> user(id) SET NULL to keep the send record.

ALTER TABLE "call_activity" ADD CONSTRAINT "call_activity_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_plan" ADD CONSTRAINT "kpi_plan_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_ledger_event" ADD CONSTRAINT "vehicle_ledger_event_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_ledger_event" ADD CONSTRAINT "vehicle_ledger_event_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_field_ownership" ADD CONSTRAINT "sync_field_ownership_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitrix_pipeline_map" ADD CONSTRAINT "bitrix_pipeline_map_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_policy" ADD CONSTRAINT "autonomy_policy_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_message" ADD CONSTRAINT "outbound_message_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_message" ADD CONSTRAINT "outbound_message_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- RLS filters tenant_id on every read, so tenant_id leads every composite index.
-- A plain tenant_id index is also emitted per table to match the platform
-- convention (used by broad tenant scans and expected by boot tooling).

-- call_activity
CREATE INDEX "call_activity_tenant_id_idx" ON "call_activity" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "call_activity_tenant_occurred_idx" ON "call_activity" USING btree ("tenant_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "call_activity_tenant_deal_idx" ON "call_activity" USING btree ("tenant_id","deal_ref");--> statement-breakpoint
CREATE INDEX "call_activity_tenant_manager_idx" ON "call_activity" USING btree ("tenant_id","manager");--> statement-breakpoint
-- Dedupe re-delivered telephony webhooks by provider call id (only when present).
CREATE UNIQUE INDEX "call_activity_tenant_external_id_uq" ON "call_activity" USING btree ("tenant_id","external_id") WHERE "external_id" IS NOT NULL;--> statement-breakpoint

-- deal_stage_history
CREATE INDEX "deal_stage_history_tenant_id_idx" ON "deal_stage_history" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deal_stage_history_tenant_deal_idx" ON "deal_stage_history" USING btree ("tenant_id","deal_ref","changed_at");--> statement-breakpoint
CREATE INDEX "deal_stage_history_tenant_changed_idx" ON "deal_stage_history" USING btree ("tenant_id","changed_at" DESC NULLS LAST);--> statement-breakpoint

-- kpi_plan — one target per manager/month/metric.
CREATE INDEX "kpi_plan_tenant_id_idx" ON "kpi_plan" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_plan_tenant_manager_month_metric_uq" ON "kpi_plan" USING btree ("tenant_id","manager","month","metric");--> statement-breakpoint

-- vehicle_ledger_event
CREATE INDEX "vehicle_ledger_event_tenant_id_idx" ON "vehicle_ledger_event" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vehicle_ledger_event_tenant_vehicle_idx" ON "vehicle_ledger_event" USING btree ("tenant_id","vehicle_id","occurred_on");--> statement-breakpoint
CREATE INDEX "vehicle_ledger_event_tenant_type_idx" ON "vehicle_ledger_event" USING btree ("tenant_id","event_type");--> statement-breakpoint
CREATE INDEX "vehicle_ledger_event_tenant_occurred_idx" ON "vehicle_ledger_event" USING btree ("tenant_id","occurred_on" DESC NULLS LAST);--> statement-breakpoint

-- outbox — dispatcher polls due, pending/in_flight work oldest-first.
CREATE INDEX "outbox_tenant_id_idx" ON "outbox" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "outbox_tenant_status_due_idx" ON "outbox" USING btree ("tenant_id","status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "outbox_tenant_aggregate_idx" ON "outbox" USING btree ("tenant_id","aggregate");--> statement-breakpoint

-- sync_field_ownership — one ownership rule per entity/field.
CREATE INDEX "sync_field_ownership_tenant_id_idx" ON "sync_field_ownership" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_field_ownership_tenant_entity_field_uq" ON "sync_field_ownership" USING btree ("tenant_id","entity","field");--> statement-breakpoint

-- bitrix_pipeline_map — one mapping per Bitrix category.
CREATE INDEX "bitrix_pipeline_map_tenant_id_idx" ON "bitrix_pipeline_map" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bitrix_pipeline_map_tenant_category_uq" ON "bitrix_pipeline_map" USING btree ("tenant_id","bitrix_category_id");--> statement-breakpoint

-- autonomy_policy — one policy per capability.
CREATE INDEX "autonomy_policy_tenant_id_idx" ON "autonomy_policy" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "autonomy_policy_tenant_capability_uq" ON "autonomy_policy" USING btree ("tenant_id","capability");--> statement-breakpoint

-- outbound_message — approval queue and channel dispatch scans.
CREATE INDEX "outbound_message_tenant_id_idx" ON "outbound_message" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "outbound_message_tenant_status_idx" ON "outbound_message" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "outbound_message_tenant_channel_idx" ON "outbound_message" USING btree ("tenant_id","channel");--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Row-Level-Security policies
-- ---------------------------------------------------------------------------
-- FORCE RLS so even the table owner is subject to the policy (the migrate step's
-- tighten-rls.sql also FORCEs, but we set it here so the table is safe the moment
-- it exists). Policy mirrors the platform standard used by every tenant table.

ALTER TABLE "call_activity" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deal_stage_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "kpi_plan" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vehicle_ledger_event" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outbox" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sync_field_ownership" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bitrix_pipeline_map" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "autonomy_policy" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outbound_message" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "call_activity_tenant_isolation" ON "call_activity" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "deal_stage_history_tenant_isolation" ON "deal_stage_history" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "kpi_plan_tenant_isolation" ON "kpi_plan" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "vehicle_ledger_event_tenant_isolation" ON "vehicle_ledger_event" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "outbox_tenant_isolation" ON "outbox" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "sync_field_ownership_tenant_isolation" ON "sync_field_ownership" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "bitrix_pipeline_map_tenant_isolation" ON "bitrix_pipeline_map" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "autonomy_policy_tenant_isolation" ON "autonomy_policy" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "outbound_message_tenant_isolation" ON "outbound_message" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
