#!/bin/sh
# retire-line.sh <slug> — stop a retired line and preserve its session/history.
set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SLUG=${1:-}

case "$SLUG" in
  *[!a-z0-9-]* | "" | -*)
    echo "retire: bad slug '$SLUG'" >&2
    exit 2
    ;;
esac

UNIT="wa@$SLUG.service"
systemctl stop "$UNIT"
if systemctl is-enabled --quiet "$UNIT"; then
  systemctl disable "$UNIT"
fi

SESSION="$DIR/session-$SLUG"
if [ -d "$SESSION" ]; then
  mkdir -p "$DIR/archives"
  DEST="$DIR/archives/retired-session-$SLUG-$(date +%Y%m%d%H%M%S)"
  mv "$SESSION" "$DEST"
  echo "retire: archived session to $DEST"
fi

rm -f \
  "$DIR/connect-fails-$SLUG.json" \
  "$DIR/qr-$SLUG.txt" \
  "$DIR/pair-code-$SLUG.txt" \
  "$DIR/pair-request-$SLUG.json" \
  "$DIR/status-$SLUG.json"

echo "retire: $UNIT stopped and disabled; message history preserved"
