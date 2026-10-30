#!/bin/sh
# Bring a freshly signed-up brand instance to the same state as the sales one.
#
# Runs AFTER a human has created the first workspace through the sign-up form
# and minted an API key — that step needs a password and a terms acceptance,
# which is not something to automate on someone's behalf.
#
#   TWENTY_API_KEY=<key> sh scripts/finish-brand-instance.sh cardiwan 3002
#
# Each step is idempotent, so re-running after a failure resumes rather than
# duplicating.
set -eu

BRAND="${1:?usage: finish-brand-instance.sh <brand> <port>}"
PORT="${2:?usage: finish-brand-instance.sh <brand> <port>}"
: "${TWENTY_API_KEY:?set TWENTY_API_KEY to the key minted in this instance}"

HOST_IP="${HOST_IP:-100.115.88.32}"
export TWENTY_BASE_URL="http://$HOST_IP:$PORT"
export TWENTY_API_KEY

# The tenant slug in OUR platform DB differs from the brand label for take-auto
# only; the rental brands match one to one.
TENANT="$BRAND"

echo "=== $BRAND on $TWENTY_BASE_URL"

echo "--- 1/4 custom objects (vehicle, rental, lease, booking, …)"
npx tsx scripts/run-twenty-bootstrap.ts

echo "--- 2/4 Lost stage on the opportunity funnel"
# Without it the mirror cannot express a failed deal and Twenty's default drops
# every dead deal into New — 58,259 of them on the sales instance.
node scripts/add-lost-stage.mjs --commit --options-only

echo "--- 3/4 mirror $TENANT (dry run first, then commit)"
npx tsx scripts/run-twenty-mirror.ts --tenant "$TENANT" --max 300
printf 'dry run above. commit? [y/N] '
read -r ANSWER
case "$ANSWER" in
  y | Y) npx tsx scripts/run-twenty-mirror.ts --tenant "$TENANT" --commit ;;
  *) echo "stopped before writing — re-run when ready"; exit 0 ;;
esac

echo "--- 4/4 counts"
npx tsx scripts/run-twenty-mirror.ts --tenant "$TENANT" --reconcile

echo
echo "done. Remaining by hand: create the staff logins for $BRAND and install"
echo "the Returns / Pipelines apps in this instance."
