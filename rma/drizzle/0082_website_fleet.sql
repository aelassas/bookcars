ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS website_published boolean NOT NULL DEFAULT false;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS website_category text;

CREATE INDEX IF NOT EXISTS vehicle_tenant_website_idx ON vehicle (tenant_id, website_published);

COMMENT ON COLUMN vehicle.website_published IS 'Publish this CRM vehicle on the public website fleet. Photos use the existing vehicle.photos array.';
COMMENT ON COLUMN vehicle.website_category IS 'Public website category label, for example Premium SUV or Electric.';
