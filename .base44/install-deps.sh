#!/bin/sh
# Installs workspace dependencies and builds the internal TypeScript packages.
# Runs inside the `deps` compose service (node image) with the repository
# bind-mounted at /workspace. Skipped when the lockfiles are unchanged.
set -e

cd /workspace

STAMP=.base44/.deps-stamp
CURRENT=$(
  cat package.json \
    packages/bookcars-types/package.json packages/bookcars-types/package-lock.json \
    packages/bookcars-helper/package.json packages/bookcars-helper/package-lock.json \
    packages/currency-converter/package.json packages/currency-converter/package-lock.json \
    packages/disable-react-devtools/package.json packages/disable-react-devtools/package-lock.json \
    packages/reactjs-social-login/package.json packages/reactjs-social-login/package-lock.json \
    backend/package.json backend/package-lock.json \
    frontend/package.json frontend/package-lock.json \
    admin/package.json admin/package-lock.json \
    | md5sum | cut -d' ' -f1
)

if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$CURRENT" ] \
  && [ -d backend/node_modules ] && [ -d frontend/node_modules ] && [ -d admin/node_modules ] \
  && [ -f packages/bookcars-types/index.js ] && [ -f packages/bookcars-helper/index.js ] \
  && [ -f packages/currency-converter/index.js ]; then
  echo "[base44-deps] dependencies already installed"
  exit 0
fi

install_dir() {
  echo "[base44-deps] installing $1"
  (cd "$1" && npm ci --no-audit --no-fund || npm install --no-audit --no-fund)
}

for dir in \
  packages/bookcars-types \
  packages/bookcars-helper \
  packages/currency-converter \
  packages/disable-react-devtools \
  packages/reactjs-social-login \
  backend \
  frontend \
  admin; do
  install_dir "$dir"
done

for dir in packages/bookcars-types packages/currency-converter packages/bookcars-helper \
  packages/disable-react-devtools packages/reactjs-social-login; do
  echo "[base44-deps] building $dir"
  (cd "$dir" && npm run build)
done

echo "$CURRENT" > "$STAMP"
echo "[base44-deps] ready"
