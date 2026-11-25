-- Backfill the WhatsApp Web deep link on cards + people (owner 2026-08-13:
-- click the number on a Twenty card → WhatsApp Web opens the chat).
-- Usage: psql -v schema=<workspace_schema> -f wa-link-backfill.sql
\set QUIET on
\echo '--- 1. rewrite wa.me -> web.whatsapp.com (opportunity)'
UPDATE :schema.opportunity
SET "whatsappPrimaryLinkUrl" = 'https://web.whatsapp.com/send?phone=' || substring("whatsappPrimaryLinkUrl" from 'wa\.me/(\d+)')
WHERE "whatsappPrimaryLinkUrl" ~ '^https://wa\.me/\d+' AND "deletedAt" IS NULL;
\echo '--- 2. rewrite wa.me -> web.whatsapp.com (person)'
UPDATE :schema.person
SET "whatsappPrimaryLinkUrl" = 'https://web.whatsapp.com/send?phone=' || substring("whatsappPrimaryLinkUrl" from 'wa\.me/(\d+)')
WHERE "whatsappPrimaryLinkUrl" ~ '^https://wa\.me/\d+' AND "deletedAt" IS NULL;
\echo '--- 3. fill missing opportunity links from the linked person'
UPDATE :schema.opportunity o
SET "whatsappPrimaryLinkUrl" = 'https://web.whatsapp.com/send?phone=' || regexp_replace(p."phonesPrimaryPhoneNumber", '\D', '', 'g'),
    "whatsappPrimaryLinkLabel" = '+' || regexp_replace(p."phonesPrimaryPhoneNumber", '\D', '', 'g')
FROM :schema.person p
WHERE o."pointOfContactId" = p.id AND o."deletedAt" IS NULL
  AND (o."whatsappPrimaryLinkUrl" IS NULL OR o."whatsappPrimaryLinkUrl" = '')
  AND length(regexp_replace(coalesce(p."phonesPrimaryPhoneNumber",''), '\D', '', 'g')) >= 9;
\echo '--- 4. fill missing person links from their own number'
UPDATE :schema.person
SET "whatsappPrimaryLinkUrl" = 'https://web.whatsapp.com/send?phone=' || regexp_replace("phonesPrimaryPhoneNumber", '\D', '', 'g'),
    "whatsappPrimaryLinkLabel" = '+' || regexp_replace("phonesPrimaryPhoneNumber", '\D', '', 'g')
WHERE "deletedAt" IS NULL
  AND ("whatsappPrimaryLinkUrl" IS NULL OR "whatsappPrimaryLinkUrl" = '')
  AND length(regexp_replace(coalesce("phonesPrimaryPhoneNumber",''), '\D', '', 'g')) >= 9;
