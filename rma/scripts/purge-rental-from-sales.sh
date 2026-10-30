#!/bin/sh
# Remove the rental brands from the SALES instance, once they are safely in
# the rental one.
#
# Cardiwan and EasyRent were mirrored into the sales workspace overnight, back
# when one workspace with row-level roles was still the plan. Under the split
# they have their own instance, and every rental record still sitting in sales
# is a client the sales team can read.
#
# DRY-RUN BY DEFAULT. Pass --commit to delete.
#   sh scripts/purge-rental-from-sales.sh
#   sh scripts/purge-rental-from-sales.sh --commit
#
# The guard is the point: nothing is deleted unless the rental instance holds
# AT LEAST as many records of that brand as sales does. Deleting a record that
# exists in exactly one place, because a migration was still running, is the
# one mistake here that cannot be undone.
set -eu

COMMIT="${1:-}"
SALES_DB="twenty-db-1"
RENTAL_DB="twenty-rental-db-1"
SALES_SCHEMA="workspace_8fj54z04p0s0zrognxhkd2f0a"
RENTAL_SCHEMA="workspace_7tkxm1eeqb4iopvi5ica5vos4"

count() { # $1 container, $2 schema, $3 table, $4 brand
  docker exec "$1" psql -U postgres -d default -tAc \
    "select count(*) from $2.\"$3\" where \"deletedAt\" is null and \"brandLine\" = '$4'"
}

BLOCKED=0
for BRAND in cardiwan easyrent; do
  for TABLE in person opportunity; do
    S=$(count "$SALES_DB" "$SALES_SCHEMA" "$TABLE" "$BRAND")
    R=$(count "$RENTAL_DB" "$RENTAL_SCHEMA" "$TABLE" "$BRAND")
    if [ "$R" -ge "$S" ]; then
      printf '  ok      %-12s %-12s sales=%-7s rental=%s\n' "$BRAND" "$TABLE" "$S" "$R"
    else
      printf '  BLOCKED %-12s %-12s sales=%-7s rental=%s  <-- rental has FEWER\n' "$BRAND" "$TABLE" "$S" "$R"
      BLOCKED=1
    fi
  done
done

if [ "$BLOCKED" -eq 1 ]; then
  echo
  echo "refusing to delete: the rental instance is missing records that only"
  echo "exist in sales. Let the mirror finish, then run this again."
  exit 1
fi

if [ "$COMMIT" != "--commit" ]; then
  echo
  echo "dry run — nothing deleted. Re-run with --commit to apply."
  exit 0
fi

echo
echo "--- deleting rental brands from sales"
# Hard delete, not soft: a soft-deleted record stays readable through the API
# and in the deleted-records view, so it would still be a rental client the
# sales team can pull up — which is the whole thing being fixed. Foreign keys
# cascade (attachments, note targets, task targets, timeline) or null out
# (opportunity point-of-contact, rentals, bookings), so one statement per table
# is enough.
docker exec "$SALES_DB" psql -U postgres -d default -v ON_ERROR_STOP=1 -c "
begin;
delete from $SALES_SCHEMA.opportunity where \"brandLine\" in ('cardiwan','easyrent');
delete from $SALES_SCHEMA.person      where \"brandLine\" in ('cardiwan','easyrent');
commit;
select coalesce(\"brandLine\",'(none)') as brand, count(*) as people
  from $SALES_SCHEMA.person where \"deletedAt\" is null group by 1 order by 2 desc;
select coalesce(\"brandLine\",'(none)') as brand, count(*) as opportunities
  from $SALES_SCHEMA.opportunity where \"deletedAt\" is null group by 1 order by 2 desc;
"
