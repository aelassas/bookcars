#!/bin/bash
# 30-minute Kaiten → Twenty fleet import (pm2 cron; launchd can't read
# ~/Downloads — TCC — pm2 children inherit the God's grant).
cd "$(dirname "$0")/.." || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
exec /opt/homebrew/Cellar/node@20/20.20.2/bin/node \
  --require "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform/node_modules/tsx/dist/preflight.cjs" \
  --import "file:///Users/takeauto/Downloads/TAKE%20AUTO%20AI/TAKE-AUTO/platform/node_modules/tsx/dist/loader.mjs" \
  scripts/import-kaiten-cars-to-twenty.ts --commit \
  >> /Users/takeauto/ops/kaiten-cars-sync.log 2>> /Users/takeauto/ops/kaiten-cars-sync.err
