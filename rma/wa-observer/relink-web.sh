#!/bin/sh
# relink-web.sh <slug> <qr|code> [phone]
#
# Called by POST /lines/api/[slug]/relink via execFile("/bin/sh", ...) — the
# route validates every argument first; this script re-validates anyway.
# BRAND_LABEL arrives in the env (audit trail only).
#
# What a relink is: archive the session so pairing starts fresh, clear the
# 2-strike lockout and any stale pairing artifacts, write a pair-request the
# worker consumes on next boot, restart wa@<slug>, stamp the 5-min cooldown.
set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SLUG=${1:-}
MODE=${2:-}
PHONE=${3:-}

case "$SLUG" in
  *[!a-z0-9-]* | "" | -*)
    echo "relink: bad slug '$SLUG'" >&2
    exit 2
    ;;
esac
if [ "$MODE" != "qr" ] && [ "$MODE" != "code" ]; then
  echo "relink: mode must be qr|code" >&2
  exit 2
fi
if [ "$MODE" = "code" ]; then
  case "$PHONE" in
    *[!0-9]* | "" | ????????????????*)
      echo "relink: code mode needs a 10-15 digit phone" >&2
      exit 2
      ;;
  esac
  if [ ${#PHONE} -lt 10 ]; then
    echo "relink: code mode needs a 10-15 digit phone" >&2
    exit 2
  fi
fi

STAMP="$DIR/relink-$SLUG.stamp"
NOW=$(date +%s)
if [ -f "$STAMP" ]; then
  AGE=$((NOW - $(date -r "$STAMP" +%s)))
  if [ "$AGE" -lt 300 ]; then
    echo "relink: cooldown — $((300 - AGE))s left" >&2
    exit 1
  fi
fi

SESSION="$DIR/session-$SLUG"
if [ -d "$SESSION" ]; then
  mkdir -p "$DIR/archives"
  DEST="$DIR/archives/session-$SLUG-$(date +%Y%m%d%H%M%S)"
  mv "$SESSION" "$DEST"
  echo "relink: archived session to $DEST"
fi

rm -f \
  "$DIR/connect-fails-$SLUG.json" \
  "$DIR/qr-$SLUG.txt" \
  "$DIR/pair-code-$SLUG.txt" \
  "$DIR/status-$SLUG.json"

if [ "$MODE" = "code" ]; then
  printf '{"mode":"code","phone":"%s"}\n' "$PHONE" >"$DIR/pair-request-$SLUG.json"
else
  printf '{"mode":"qr"}\n' >"$DIR/pair-request-$SLUG.json"
fi

if ! systemctl restart "wa@$SLUG"; then
  echo "relink: systemctl restart wa@$SLUG failed" >&2
  exit 1
fi
touch "$STAMP"
echo "relink: wa-$SLUG restarted by ${BRAND_LABEL:-unknown} (mode=$MODE) — QR live within seconds"
