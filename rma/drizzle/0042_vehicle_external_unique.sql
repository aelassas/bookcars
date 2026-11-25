-- 0042_vehicle_external_unique.sql
--
-- Make duplicate vehicles impossible at the database level.
--
-- Two importers both wrote external_source='babek-sheet' with different delete
-- predicates, so the second one could not see the first one's rows and inserted
-- a second copy of all 98 cars. The importer is being fixed to upsert, but a
-- constraint is what actually guarantees it cannot happen again — the same
-- reasoning as vehicle_rental_no_overlap in 0041: a rule the application can
-- forget is not a rule.
--
-- NULLs are distinct in a Postgres unique index, so vehicles created by hand
-- (no external_source / external_id) are unconstrained and can freely share a
-- plate — which is legitimate: a UAE plate can be reassigned to another car, and
-- two such records are two different vehicles. What this forbids is one SOURCE
-- claiming the same key twice.

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_tenant_external_uniq
  ON vehicle (tenant_id, external_source, external_id);
