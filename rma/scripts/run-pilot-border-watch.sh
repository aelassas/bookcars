#!/bin/bash
# 5-minute Pilot GPS Oman-border watch (pm2 cron; launchd can't read
# ~/Downloads — TCC — pm2 children inherit the God's grant).
cd "$(dirname "$0")/.." || exit 1
exec /opt/homebrew/Cellar/node@20/20.20.2/bin/node \
  --require "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform/node_modules/tsx/dist/preflight.cjs" \
  --import "file:///Users/takeauto/Downloads/TAKE%20AUTO%20AI/TAKE-AUTO/platform/node_modules/tsx/dist/loader.mjs" \
  scripts/pilot-border-watch.ts --commit \
  >> /Users/takeauto/ops/pilot-border.log 2>> /Users/takeauto/ops/pilot-border.err
