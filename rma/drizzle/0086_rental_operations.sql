ALTER TABLE customer ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS passport_number text;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS driver_license_number text;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS driver_license_expiry date;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS emirates_id_expiry date;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS documents_reviewed_at timestamptz;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS documents_reviewed_by uuid REFERENCES "user"(id);

ALTER TABLE document ADD COLUMN IF NOT EXISTS recognition_status text NOT NULL DEFAULT 'not_requested';
ALTER TABLE document ADD COLUMN IF NOT EXISTS recognized_data jsonb;
ALTER TABLE document ADD COLUMN IF NOT EXISTS recognition_error text;
ALTER TABLE document ADD COLUMN IF NOT EXISTS recognized_at timestamptz;

ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS service_limit_interval_km integer NOT NULL DEFAULT 10000;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS last_service_date date;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS last_service_odometer integer;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS last_service_work text;

ALTER TABLE rental ADD COLUMN IF NOT EXISTS extension_status text NOT NULL DEFAULT 'not_sent';
ALTER TABLE rental ADD COLUMN IF NOT EXISTS return_reminder_sent_at timestamptz;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS customer_response_at timestamptz;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS customer_response text;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS statement_count integer NOT NULL DEFAULT 0;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS last_statement_sent_at timestamptz;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS final_statement_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS rental_charge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE cascade,
  rental_id uuid NOT NULL REFERENCES rental(id),
  vehicle_id uuid NOT NULL REFERENCES vehicle(id),
  customer_id uuid NOT NULL REFERENCES customer(id),
  kind text NOT NULL,
  external_id text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  occurred_at timestamptz NOT NULL,
  description text,
  location text,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'unpaid',
  notification_status text NOT NULL DEFAULT 'not_sent',
  notified_at timestamptz,
  payment_due_at timestamptz,
  notification_error text,
  paid_at timestamptz,
  created_by uuid REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_charge_kind_check CHECK (kind IN ('fine', 'salik', 'parkin', 'parkonic')),
  CONSTRAINT rental_charge_status_check CHECK (status IN ('unpaid', 'notification_queued', 'paid', 'void')),
  CONSTRAINT rental_charge_amount_check CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS rental_charge_tenant_id_idx ON rental_charge(tenant_id);
CREATE INDEX IF NOT EXISTS rental_charge_rental_idx ON rental_charge(tenant_id, rental_id);
CREATE INDEX IF NOT EXISTS rental_charge_vehicle_time_idx ON rental_charge(tenant_id, vehicle_id, occurred_at);
CREATE INDEX IF NOT EXISTS rental_charge_outstanding_idx ON rental_charge(tenant_id, status, payment_due_at);
CREATE UNIQUE INDEX IF NOT EXISTS rental_charge_external_uniq ON rental_charge(tenant_id, kind, external_id);
ALTER TABLE rental_charge ENABLE ROW LEVEL SECURITY;
CREATE POLICY rental_charge_tenant_isolation ON rental_charge AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE payment ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE payment ADD COLUMN IF NOT EXISTS rental_charge_id uuid REFERENCES rental_charge(id);
CREATE INDEX IF NOT EXISTS payment_rental_charge_idx ON payment(tenant_id, rental_charge_id);

CREATE TABLE IF NOT EXISTS engine_block (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE cascade,
  rental_charge_id uuid NOT NULL REFERENCES rental_charge(id),
  vehicle_id uuid NOT NULL REFERENCES vehicle(id),
  requested_by uuid REFERENCES "user"(id),
  command_id integer,
  unblock_command_id integer,
  status text NOT NULL DEFAULT 'requested',
  live_state_checked_at timestamptz NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  CONSTRAINT engine_block_status_check CHECK (status IN ('requested', 'accepted', 'released', 'failed'))
);
CREATE INDEX IF NOT EXISTS engine_block_tenant_id_idx ON engine_block(tenant_id);
CREATE INDEX IF NOT EXISTS engine_block_vehicle_idx ON engine_block(tenant_id, vehicle_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS engine_block_charge_uniq ON engine_block(tenant_id, rental_charge_id);
ALTER TABLE engine_block ENABLE ROW LEVEL SECURITY;
CREATE POLICY engine_block_tenant_isolation ON engine_block AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

COMMENT ON COLUMN rental.daily_mileage_limit_km IS 'Allowance per PAID day, multiplied by rental.total_days. Default RMA rule is 150 km/day; no separate daily cap.';
COMMENT ON COLUMN vehicle.oil_change_interval_km IS 'Distance after service when the 8000 km approaching-service warning starts.';
COMMENT ON COLUMN vehicle.service_limit_interval_km IS 'Maximum distance after service before the 10000 km service limit.';
COMMENT ON TABLE rental_charge IS 'Deduplicated traffic fines, Salik and paid parking assigned to the rental covering the event timestamp.';
COMMENT ON COLUMN rental_charge.notified_at IS 'Actual WhatsApp outbox sent_at. The fine payment_due_at starts 24 hours after this delivery timestamp, never at queue time.';
COMMENT ON TABLE engine_block IS 'Only charge-linked blocks are automatically released after that charge is paid.';
