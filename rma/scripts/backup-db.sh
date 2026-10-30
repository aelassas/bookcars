#!/usr/bin/env bash
set -euo pipefail

# Backup the TAKE-AUTO Postgres database to a timestamped file.
# Usage: DATABASE_URL=postgresql://... ./scripts/backup-db.sh [destination_dir]

DEST_DIR="${1:-./backups}"
mkdir -p "$DEST_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="$DEST_DIR/takeauto_backup_$TIMESTAMP.sql"

echo "Backing up database to $DUMP_FILE ..."
pg_dump "$DATABASE_URL" --clean --if-exists --no-owner --no-privileges > "$DUMP_FILE"

echo "Backup complete: $DUMP_FILE"
