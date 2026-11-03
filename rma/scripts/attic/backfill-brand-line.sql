-- Backfill `brandLine` on records already mirrored into Twenty.
--
-- Everything in the Twenty workspace today came from ONE Bitrix portal —
-- take-auto. That is not taken on faith: the script refuses to write if it
-- finds a record it cannot account for (see the provenance guard below).
-- Supporting evidence, checked 2026-08-02: twenty_mirror_state holds
-- contacts/leads/deals rows for the take-auto tenant only, and the WhatsApp
-- pipe creates notes, never people (push-message.ts skips a message whose
-- phone matches no existing person).
--
-- Runs against the TWENTY workspace database, not our platform DB:
--
--   dry run   docker exec -i twenty-db-1 psql -U postgres -d default \
--               -v ON_ERROR_STOP=1 < backfill-brand-line.sql
--   commit    docker exec -i twenty-db-1 psql -U postgres -d default \
--               -v ON_ERROR_STOP=1 -v mode=commit < backfill-brand-line.sql
--
-- Idempotent: only rows with brandLine IS NULL are touched, so a second run is
-- a no-op and an interrupted run resumes. Nothing is ever overwritten — a
-- value set by hand, or by a later mirror run, survives untouched.

\set ON_ERROR_STOP on
-- Default to a dry run: psql leaves :mode unset unless -v mode=commit is given.
\if :{?mode}
\else
  \set mode dry
\endif

\echo ''
\echo '=== brandLine backfill — mode:' :mode '==='

-- ── Guard ───────────────────────────────────────────────────────────────────
-- Aborts the whole file (ON_ERROR_STOP) before a single row is written.
DO $$
DECLARE
  bad_sources text;
BEGIN
  SELECT string_agg(format('%s=%s', COALESCE("externalSource", '(null)'), n), ', ')
    INTO bad_sources
    FROM (
      SELECT "externalSource", count(*) AS n
        FROM workspace_8fj54z04p0s0zrognxhkd2f0a.person
       WHERE "deletedAt" IS NULL
         AND "externalSource" IS NOT NULL
         -- Mirrored from Bitrix: these get the brand.
         AND "externalSource" NOT IN ('bitrix24', 'lead:bitrix24')
         -- Known, accounted-for non-Bitrix sources: they get NO brand, but
         -- they are not a reason to stop either. 'pilot-test' is the single
         -- "ZZ Return Test" record left by the Returns app pilot (2026-07-30).
         -- Anything NOT listed here is unexplained provenance and aborts.
         AND "externalSource" NOT IN ('pilot-test')
       GROUP BY 1
    ) s;

  IF bad_sources IS NOT NULL THEN
    RAISE EXCEPTION
      'people carry unexpected externalSource values (%). This backfill assumes every mirrored record came from the take-auto portal — investigate before branding anything.',
      bad_sources;
  END IF;
  RAISE NOTICE 'provenance check passed';
END $$;

-- ── Plan ────────────────────────────────────────────────────────────────────
-- `pending` is what this run will write. The two skip columns are deliberate:
--   not_from_mirror — hand-made records; no proof of origin, so no invented brand.
--   soft_deleted    — the duplicate wreckage of the first import. Branding trash
--                     is pure write amplification, and a restored record coming
--                     back brand-less is visible only to Executive: fail-closed.
\echo ''
\echo '--- plan (rows this run would write) ---'
SELECT 'person' AS table_name,
       count(*) FILTER (WHERE "brandLine" IS NULL AND "deletedAt" IS NULL
                          AND "externalSource" IN ('bitrix24','lead:bitrix24')) AS pending,
       count(*) FILTER (WHERE "brandLine" IS NOT NULL)                          AS already_branded,
       count(*) FILTER (WHERE "deletedAt" IS NULL
                          AND ("externalSource" IS NULL
                            OR "externalSource" NOT IN ('bitrix24','lead:bitrix24'))) AS not_from_mirror,
       count(*) FILTER (WHERE "deletedAt" IS NOT NULL)                          AS soft_deleted
  FROM workspace_8fj54z04p0s0zrognxhkd2f0a.person
UNION ALL
SELECT 'opportunity',
       count(*) FILTER (WHERE "brandLine" IS NULL AND "deletedAt" IS NULL
                          AND "externalSource" IN ('bitrix24','lead:bitrix24')),
       count(*) FILTER (WHERE "brandLine" IS NOT NULL),
       count(*) FILTER (WHERE "deletedAt" IS NULL
                          AND ("externalSource" IS NULL
                            OR "externalSource" NOT IN ('bitrix24','lead:bitrix24'))),
       count(*) FILTER (WHERE "deletedAt" IS NOT NULL)
  FROM workspace_8fj54z04p0s0zrognxhkd2f0a.opportunity;

-- ── Write ───────────────────────────────────────────────────────────────────
-- One transaction for both tables: a half-branded workspace would show two
-- people different slices of the same list depending on when they looked.
\if :{?mode}
\endif

SELECT :'mode' = 'commit' AS will_write \gset writing_
\if :writing_will_write

\echo ''
\echo '--- writing ---'
BEGIN;

UPDATE workspace_8fj54z04p0s0zrognxhkd2f0a.person
   SET "brandLine" = 'takeauto', "updatedAt" = now()
 WHERE "brandLine" IS NULL
   AND "deletedAt" IS NULL
   AND "externalSource" IN ('bitrix24','lead:bitrix24');

UPDATE workspace_8fj54z04p0s0zrognxhkd2f0a.opportunity
   SET "brandLine" = 'takeauto', "updatedAt" = now()
 WHERE "brandLine" IS NULL
   AND "deletedAt" IS NULL
   AND "externalSource" IN ('bitrix24','lead:bitrix24');

COMMIT;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Not "the UPDATE reported rows" but "nothing eligible is left unbranded".
DO $$
DECLARE
  left_person int;
  left_opp    int;
BEGIN
  SELECT count(*) INTO left_person
    FROM workspace_8fj54z04p0s0zrognxhkd2f0a.person
   WHERE "brandLine" IS NULL AND "deletedAt" IS NULL
     AND "externalSource" IN ('bitrix24','lead:bitrix24');
  SELECT count(*) INTO left_opp
    FROM workspace_8fj54z04p0s0zrognxhkd2f0a.opportunity
   WHERE "brandLine" IS NULL AND "deletedAt" IS NULL
     AND "externalSource" IN ('bitrix24','lead:bitrix24');

  IF left_person > 0 OR left_opp > 0 THEN
    RAISE EXCEPTION 'still unbranded after commit: person=%, opportunity=%',
      left_person, left_opp;
  END IF;
  RAISE NOTICE 'verified: no mirrored record left unbranded';
END $$;

\echo ''
\echo '--- result by brand ---'
SELECT COALESCE("brandLine", '(none)') AS brand, count(*) AS people
  FROM workspace_8fj54z04p0s0zrognxhkd2f0a.person
 WHERE "deletedAt" IS NULL GROUP BY 1 ORDER BY 2 DESC;
SELECT COALESCE("brandLine", '(none)') AS brand, count(*) AS opportunities
  FROM workspace_8fj54z04p0s0zrognxhkd2f0a.opportunity
 WHERE "deletedAt" IS NULL GROUP BY 1 ORDER BY 2 DESC;

\else
\echo ''
\echo 'dry run — nothing written. Re-run with  -v mode=commit  to apply.'
\endif
