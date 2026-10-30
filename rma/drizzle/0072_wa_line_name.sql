-- 0072: wa_line_name — display-name overrides for WhatsApp observer lines,
-- edited inline on the /lines page. Keyed by the line slug (LINE_TENANT key in
-- src/modules/messaging/lines.ts); no row → the owner name is shown.
-- GLOBAL table (no tenant_id) — line slugs are observer-level, not tenant rows,
-- so the RLS boot guard correctly leaves it alone (same class as platform_admin).
-- Idempotent.
CREATE TABLE IF NOT EXISTS wa_line_name (
  slug text PRIMARY KEY,
  display_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
