-- ============================================================================
-- 0010_qa_fixes.sql — QA bug fixes (staged migration, apply manually)
--
--   psql -U takeauto -d mycrm -f drizzle/autonomous/0010_qa_fixes.sql
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- BUG #7: Extend wa_outbox status CHECK to include skipped_no_observer.
-- Drop and recreate the inline CHECK (PostgreSQL has no ALTER CONSTRAINT ADD VALUE).
ALTER TABLE wa_outbox DROP CONSTRAINT IF EXISTS wa_outbox_status_check;
ALTER TABLE wa_outbox ADD CONSTRAINT wa_outbox_status_check
  CHECK (status IN ('pending','sent','failed','skipped','skipped_no_observer'));

COMMENT ON COLUMN wa_outbox.status IS 'pending|sent|failed|skipped|skipped_no_observer. skipped_no_observer: the wa-observer process for this brand_line is not running; the row is preserved for audit but the drain loop will never process it.';

-- BUG #8/#9: Partial unique index prevents duplicate driver_assignment rows
-- for the same (tenant, driver, vehicle, rental) while the assignment is open.
CREATE UNIQUE INDEX IF NOT EXISTS driver_assignment_active_uidx
  ON driver_assignment (tenant_id, driver_id, vehicle_id, rental_id)
  WHERE to_ts IS NULL;

-- BUG #10: Missing indexes on deal table (92k rows — these cover the two
-- most common access patterns: latest deals per tenant, deals by owner).
CREATE INDEX IF NOT EXISTS deal_tenant_created_idx ON deal (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deal_tenant_owner_idx   ON deal (tenant_id, owner_id);

-- BUG #7 (dedupe): the 0007 unique index only covers status='pending' rows, so
-- re-approving a card from a stopped line would insert duplicate skipped_no_observer
-- rows (onConflictDoNothing has no arbiter). Mirror the pending index for these rows.
CREATE UNIQUE INDEX IF NOT EXISTS wa_outbox_item_hash_skipped_noobs_uidx
  ON wa_outbox (board_item_id, content_hash)
  WHERE status = 'skipped_no_observer';

-- Grants: refresh wa_outbox permissions for app_runtime if the role exists.
-- Uses single-quoted DO body — never double-dollar.
DO 'BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''app_runtime'') THEN
    EXECUTE ''GRANT SELECT, INSERT, UPDATE ON wa_outbox TO app_runtime'';
  END IF;
END';
