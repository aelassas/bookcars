-- 0078: fines_snapshot — the RTA-fines + Salik table, owned by the hub (owner, 2026-09-19).
-- The desk's fines view lived only in Babek's "Calendar 3" Google Sheet
-- (rewritten hourly by scripts/update-fines-tab.mjs, which runs on the office
-- Mac where the Google login lives). The /fines hub page must NOT depend on
-- that Mac or on Google creds on the box, so the hourly job now PUSHES the
-- same rows to /api/webhooks/fines after each sheet rewrite; this table is
-- the store the page reads. Single row (id=1), whole payload as jsonb — the
-- sheet is still the source of truth, this is its mirror. Idempotent.
CREATE TABLE IF NOT EXISTS fines_snapshot (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  header jsonb NOT NULL DEFAULT '[]'::jsonb,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON TABLE fines_snapshot IS 'Mirror of the Google "Fines" tab (RTA fines + Salik per rented car), pushed hourly by scripts/update-fines-tab.mjs via /api/webhooks/fines. Read by the /fines hub page.';
