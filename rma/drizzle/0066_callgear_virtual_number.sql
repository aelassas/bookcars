-- 0066: tenant.callgear_virtual_number — the brand's CallGear line.
-- The UIS/CoMagic notification panel cannot fan out per brand (no generic
-- condition automation on our side), so ONE notification POSTs every call to
-- ONE URL and the webhook re-routes by the payload's virtual_phone_number.
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS callgear_virtual_number text;
