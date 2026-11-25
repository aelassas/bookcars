-- 0051_deal_intent.sql
--
-- CUSTOMER INTENT — one nullable text column on the existing `deal` table.
--
-- The owner's guiding-star vision groups demand by what the customer actually
-- wants — short lease (6 месяцев), annual lease (12 месяцев), lease-to-own
-- (выкуп / рассрочка), plain rent, or an outright sale — NOT by the coarse
-- `type` column, which the Bitrix import left uniformly 'rent' for every live
-- deal (verified: 225/225 open live deals are type='rent'). This column is the
-- explicit intent tag the Watchers board groups by.
--
-- ONE shared field, two writers: a manager sets it from the deal card's fast
-- picker today; the messaging extraction layer writes the SAME column once its
-- AI tags land — deliberately avoiding a second, conflicting intent column set.
-- Allowed values (validated in app code, not a CHECK — kept soft so the AI
-- layer can widen the vocabulary without a migration):
--   rent | lease_6m | lease_12m | lease_to_own | sale
--
-- `deal` already carries tenant_id and its RLS triad (0002 / FORCE-RLS pass),
-- so a nullable column needs no new policy and does not affect the boot guard.
--
-- Written by hand and idempotent (this box applies migrations manually and the
-- snapshot chain is only refreshed for generate-time diffing). Safe to run more
-- than once, and safe if the extraction fable's migration adds it first.

ALTER TABLE deal ADD COLUMN IF NOT EXISTS intent text;

-- Optional partial index: the Watchers board only ever reads OPEN deals that
-- carry an explicit intent, so keep the index small.
CREATE INDEX IF NOT EXISTS deal_tenant_intent_idx ON deal (tenant_id, intent) WHERE intent IS NOT NULL;
