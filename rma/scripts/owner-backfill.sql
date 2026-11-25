-- Backfill "the responsible" on existing rental cards (owner 2026-08-14).
-- Only blank owners, only exact English display names the backfill wrote.
-- updatedAt deliberately untouched: this is a silent correction, not a feed event.
UPDATE workspace_7tkxm1eeqb4iopvi5ica5vos4."opportunity"
SET "ownerId" = 'e062e52d-02ca-4432-a59c-c2310855cefb'
WHERE "callAgentName" = 'Babek Sadygov' AND "ownerId" IS NULL;
UPDATE workspace_7tkxm1eeqb4iopvi5ica5vos4."opportunity"
SET "ownerId" = '5f949db4-6b5c-424b-9744-61cdc0bfa411'
WHERE "callAgentName" = 'Ali Sohiel' AND "ownerId" IS NULL;
UPDATE workspace_7tkxm1eeqb4iopvi5ica5vos4."opportunity"
SET "ownerId" = 'dfafac22-03c6-488b-85f2-d976f62191e1'
WHERE "callAgentName" = 'Abdullah' AND "ownerId" IS NULL;
SELECT "callAgentName", count(*) FROM workspace_7tkxm1eeqb4iopvi5ica5vos4."opportunity"
WHERE "ownerId" IS NOT NULL GROUP BY 1 ORDER BY 2 DESC;
