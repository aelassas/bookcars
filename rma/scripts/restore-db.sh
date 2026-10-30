#!/usr/bin/env bash
set -euo pipefail

# Restore a TAKE-AUTO Postgres backup.
# Usage: DATABASE_URL=postgresql://... ./scripts/restore-db.sh <backup_file.sql>

if [ $# -lt 1 ]; then
  echo "Usage: DATABASE_URL=postgresql://... ./scripts/restore-db.sh <backup_file.sql>"
  exit 1
fi

BACKUP_FILE="$1"

echo "Restoring database from $BACKUP_FILE ..."
psql "$DATABASE_URL" < "$BACKUP_FILE"

echo "Restore complete."
