ALTER TABLE rental ADD COLUMN IF NOT EXISTS tars_submission_status text NOT NULL DEFAULT 'not_started';
ALTER TABLE rental ADD COLUMN IF NOT EXISTS tars_submission_hash text;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS tars_submission_payload jsonb;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS tars_submission_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS tars_submission_error text;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS tars_submission_reviewed_by uuid REFERENCES "user"(id);
ALTER TABLE rental ADD COLUMN IF NOT EXISTS tars_submission_reviewed_at timestamptz;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS tars_submission_completed_at timestamptz;
ALTER TABLE rental ADD CONSTRAINT rental_tars_submission_status_check CHECK (tars_submission_status IN ('not_started', 'awaiting_confirmation', 'running', 'dry_run', 'succeeded', 'failed'));
