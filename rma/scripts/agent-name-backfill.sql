-- English agent display names on existing call cards (owner 2026-08-13:
-- English only, no Bitrix baggage). Mirrors the KNOWN_AGENTS map in
-- src/platform/integrations/callgear/agent-name.ts — keep the two in sync.
-- Usage: psql -v schema=<workspace_schema> -f agent-name-backfill.sql
UPDATE :schema.opportunity SET "callAgentName" = 'Babek Sadygov'
 WHERE "callAgentName" = '(bitrix24) Садыгов Бабек' AND "deletedAt" IS NULL;
UPDATE :schema.opportunity SET "callAgentName" = 'Ali Sohiel'
 WHERE "callAgentName" = '(bitrix24) sohiel Ali' AND "deletedAt" IS NULL;
UPDATE :schema.opportunity SET "callAgentName" = 'Askhab Zazalaev'
 WHERE "callAgentName" = '(bitrix24) Зазалаев Асхаб' AND "deletedAt" IS NULL;
UPDATE :schema.opportunity SET "callAgentName" = 'Cardiwan LLC, Ali Sohiel, Babek Sadygov'
 WHERE "callAgentName" = '(bitrix24) L.L.C CARDIWAN, (bitrix24) sohiel Ali, (bitrix24) Садыгов Бабек' AND "deletedAt" IS NULL;
UPDATE :schema.opportunity SET "callAgentName" = 'Cardiwan LLC, Ali Sohiel, Askhab Zazalaev (former), Babek Sadygov'
 WHERE "callAgentName" IN ('(bitrix24) L.L.C CARDIWAN, (bitrix24) sohiel Ali, (bitrix24) Зазалаев Асхаб, (bitrix24) Садыгов Бабек',
                           'Cardiwan LLC, Ali Sohiel, Askhab Zazalaev, Babek Sadygov') AND "deletedAt" IS NULL;
-- Generic: any remaining "(bitrix24) " prefix, stripped (unknown names pass
-- through unchanged, same contract as displayAgentName).
UPDATE :schema.opportunity SET "callAgentName" = regexp_replace("callAgentName", '\(bitrix24\)\s*', '', 'g')
 WHERE "callAgentName" ~ '\(bitrix24\)' AND "deletedAt" IS NULL;
