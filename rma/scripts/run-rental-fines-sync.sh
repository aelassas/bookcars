#!/bin/bash
# Daily 06:45 Calendar-3 → Twenty RENTAL rentals + RTA/Salik sync (pm2 cron;
# launchd can't read ~/Downloads — TCC — pm2 children inherit the God's grant).
cd "$(dirname "$0")/.." || exit 1
exec /opt/homebrew/Cellar/node@20/20.20.2/bin/node \
  --require "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform/node_modules/tsx/dist/preflight.cjs" \
  --import "file:///Users/takeauto/Downloads/TAKE%20AUTO%20AI/TAKE-AUTO/platform/node_modules/tsx/dist/loader.mjs" \
  scripts/rental-fines-sync.ts --commit \
  >> /Users/takeauto/ops/rental-fines-sync.log 2>> /Users/takeauto/ops/rental-fines-sync.err
