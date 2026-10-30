#!/bin/bash
# Nightly Pilot GPS → Twenty fleet sync (launchd can't read ~/Downloads — TCC;
# pm2 children inherit the God's grant, so this runs under pm2 cron_restart).
cd "$(dirname "$0")/.." || exit 1
exec /opt/homebrew/Cellar/node@20/20.20.2/bin/node \
  --require "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform/node_modules/tsx/dist/preflight.cjs" \
  --import "file:///Users/takeauto/Downloads/TAKE%20AUTO%20AI/TAKE-AUTO/platform/node_modules/tsx/dist/loader.mjs" \
  scripts/pilot-fleet-sync.ts --commit \
  >> /Users/takeauto/ops/pilot-sync.log 2>> /Users/takeauto/ops/pilot-sync.err
