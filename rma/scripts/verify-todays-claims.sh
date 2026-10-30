#!/bin/bash
# verify-todays-claims.sh — independently re-check every claim made on 2026-08-05.
# Read-only. Run on the box:  bash scripts/verify-todays-claims.sh
#
# Each block prints the CLAIM, then the raw evidence. Judge for yourself.
set -u
PLATFORM="/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform"
OBS="/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/wa-observer"
RENTAL_SCHEMA=workspace_7tkxm1eeqb4iopvi5ica5vos4
say(){ printf '\n\033[1m== %s\033[0m\n' "$1"; }
psqlc(){ psql -d mycrm -c "$1" 2>&1; }
tw(){ docker exec twenty-rental-db-1 psql -U postgres -d default -c "$1" 2>&1; }

say "CLAIM 1: all 6 roster staff can log in with name + PIN"
cd /tmp || exit 1
for N in Azat Firuz Moe Ali Abdullah Babek; do
  rm -f "v_$N.txt"
  C=$(curl -s -c "v_$N.txt" http://127.0.0.1:3000/api/auth/csrf | python3 -c 'import json,sys;print(json.load(sys.stdin)["csrfToken"])')
  curl -s -b "v_$N.txt" -c "v_$N.txt" -X POST http://127.0.0.1:3000/api/auth/callback/name-pin \
    -d "csrfToken=$C&name=$N&pin=8888&redirect=false&json=true" -o /dev/null
  S=$(curl -s -b "v_$N.txt" http://127.0.0.1:3000/api/auth/session | head -c 40)
  L=$(curl -s -b "v_$N.txt" -o /dev/null -w '%{redirect_url}' http://127.0.0.1:3000/)
  echo "  $N -> ${S:-NO SESSION}  lands=$L"
  rm -f "v_$N.txt"
done

say "CLAIM 2: 7 WhatsApp lines are live (file mtimes, NOT pm2 status)"
# Two windows on purpose. A 90-minute window is unfair at night — a quiet line
# is not a dead line — so the 24h window is the real liveness test and the
# short one just shows who is busy right now.
echo "  --- wrote in the last 24 hours (this is the liveness claim) ---"
find "$OBS" -maxdepth 1 -name 'observed-*.jsonl' -newermt '-24 hours' -exec basename {} \; | sort | sed 's/^/    /'
echo "  count 24h: $(find "$OBS" -maxdepth 1 -name 'observed-*.jsonl' -newermt '-24 hours' | wc -l | tr -d ' ')  (claimed: 7)"
echo "  --- wrote in the last 90 minutes (just who is busy now) ---"
echo "  count 90m: $(find "$OBS" -maxdepth 1 -name 'observed-*.jsonl' -newermt '-90 minutes' | wc -l | tr -d ' ')"

say "CLAIM 3: every line sits in exactly ONE tenant, zero duplicates"
psqlc "select coalesce(m.\"to\",'?') line, t.slug, count(*) n from message m join tenant t on t.id=m.tenant_id where m.\"to\" is not null group by 1,2 order by 1;"
psqlc "select count(*) as external_ids_in_more_than_one_tenant from (select external_message_id from message where external_message_id like 'waobs:%' group by 1 having count(distinct tenant_id)>1) d;"

say "CLAIM 4: board cards are assigned to the right person"
psqlc "select source_line, assigned_to, count(*) from board_item where status='open' and source_line is not null group by 1,2 order by 1;"

say "CLAIM 5: every observer has sending enabled with a 12h staleness window"
pm2 jlist > /tmp/_pm2.json 2>/dev/null
python3 - /tmp/_pm2.json <<'PYEOF'
import json, sys
for a in json.load(open(sys.argv[1])):
    n = a["name"]
    if n.startswith("wa-") and n != "wa-watchdog":
        e = a["pm2_env"]
        print("  %-26s %-9s SEND=%r MAXAGE=%r" % (n, e["status"], e.get("WA_SEND_ENABLED"), e.get("OUTBOX_MAX_AGE_HOURS")))
PYEOF
rm -f /tmp/_pm2.json
echo "  --- nothing historical was blasted: outbox by status ---"
psqlc "select status, count(*), max(created_at) newest from wa_outbox group by 1;"

say "CLAIM 6: Twenty routes each tenant to its own instance, all live"
cd "$PLATFORM" && npx tsx scripts/check-twenty-routing.ts 2>&1 | grep -v 'injected env'

say "CLAIM 7: the rental key works on :3002 and is REJECTED on :3001"
K=$(grep '^TWENTY_RENTAL_API_KEY=' "$PLATFORM/.env.local" | cut -d= -f2-)
curl -s -o /dev/null -w '  rental key -> :3002 people = %{http_code} (expect 200)\n' -H "Authorization: Bearer $K" 'http://localhost:3002/rest/people?limit=1'
curl -s -o /dev/null -w '  rental key -> :3001 people = %{http_code} (expect 401)\n' -H "Authorization: Bearer $K" 'http://localhost:3001/rest/people?limit=1'

say "CLAIM 8: WhatsApp notes are landing in the RENTAL Twenty and linked to people"
tw "select (select count(*) from \"$RENTAL_SCHEMA\".note) notes, (select count(*) from \"$RENTAL_SCHEMA\".\"noteTarget\") linked, (select max(\"createdAt\") from \"$RENTAL_SCHEMA\".note) newest;"

say "CLAIM 9: the brand views now have columns (they had ZERO)"
tw "select v.name, om.\"nameSingular\" obj, count(vf.id) columns
    from core.view v join core.\"objectMetadata\" om on om.id=v.\"objectMetadataId\"
    left join core.\"viewField\" vf on vf.\"viewId\"=v.id and vf.\"deletedAt\" is null
    where v.name in ('Cardiwan','EasyRent (ETM)') group by 1,2 order by 2,1;"

say "CLAIM 10: the numbers printed in the PDFs"
tw "select coalesce(\"brandLine\",'(none)') brand, count(*) deals from \"$RENTAL_SCHEMA\".opportunity group by 1 order by 2 desc;"
tw "select coalesce(\"brandLine\",'(none)') brand, count(*) people from \"$RENTAL_SCHEMA\".person group by 1 order by 2 desc;"
tw "select count(*) total_deals, count(\"amountAmountMicros\") deals_with_amount from \"$RENTAL_SCHEMA\".opportunity;"
tw "select count(*) total_people, count(*) filter (where \"nameFirstName\" ~ '^(Новый лид|Пропущенный|Сделка|Гость)') call_titled from \"$RENTAL_SCHEMA\".person;"
tw "select \"createdBySource\", count(*) from \"$RENTAL_SCHEMA\".company group by 1;"

say "CLAIM 11: /analytics no longer 500s (the GROUP BY bug)"
rm -f /tmp/v_moe.txt
C=$(curl -s -c /tmp/v_moe.txt http://127.0.0.1:3000/api/auth/csrf | python3 -c 'import json,sys;print(json.load(sys.stdin)["csrfToken"])')
curl -s -b /tmp/v_moe.txt -c /tmp/v_moe.txt -X POST http://127.0.0.1:3000/api/auth/callback/name-pin \
  -d "csrfToken=$C&name=Moe&pin=8888&redirect=false&json=true" -o /dev/null
echo "  /take-auto/analytics as Moe -> $(curl -s -b /tmp/v_moe.txt -o /dev/null -w '%{http_code}' --max-time 90 http://127.0.0.1:3000/take-auto/analytics) (expect 200)"
rm -f /tmp/v_moe.txt

say "CLAIM 12: the Twenty mirror job is in the repo, not in /tmp"
grep -n 'twentyMirrorBeat\|TWENTY_MARKER' "$PLATFORM/scripts/sync-heartbeat.js" | head -5
pm2 jlist > /tmp/_pm2b.json 2>/dev/null
python3 - /tmp/_pm2b.json <<'PYEOF'
import json, sys
names = [a["name"] for a in json.load(open(sys.argv[1]))]
print("  twenty-mirror-daily still registered:", "twenty-mirror-daily" in names, "(expect False)")
PYEOF
rm -f /tmp/_pm2b.json

say "CLAIM 13: live ingest is still flowing into all three tenants"
psqlc "select t.slug, count(*) filter (where m.created_at > now()-interval '1 hour') last_hour, max(m.created_at) newest from tenant t join message m on m.tenant_id=t.id where t.slug in ('take-auto','cardiwan','easyrent') group by 1 order by 1;"

say "DONE — every number above came from the live system just now."
