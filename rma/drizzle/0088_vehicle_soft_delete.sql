ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS vehicle_tenant_deleted_idx ON vehicle (tenant_id, deleted_at);
