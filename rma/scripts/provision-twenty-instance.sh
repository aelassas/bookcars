#!/bin/sh
# Provision an additional Twenty instance, one per brand.
#
# Why instances and not workspaces: row-level permissions are a paid Twenty
# Enterprise feature, and multi-workspace mode resolves workspaces by
# SUBDOMAIN — impossible against a bare tailnet IP with no DNS or TLS. One
# single-workspace instance per brand on its own port is the shape that
# actually enforces the split here.
#
#   sh provision-twenty-instance.sh <brand> <port>
#   sh provision-twenty-instance.sh cardiwan 3002
#
# Idempotent: an existing instance directory is left alone (so re-running
# never regenerates secrets and orphans a database).
set -eu

BRAND="${1:?usage: provision-twenty-instance.sh <brand> <port>}"
PORT="${2:?usage: provision-twenty-instance.sh <brand> <port>}"

SRC="$HOME/twenty"
DIR="$HOME/twenty-$BRAND"
HOST_IP="${HOST_IP:-100.115.88.32}"

if [ ! -f "$SRC/docker-compose.yml" ]; then
  echo "no compose template at $SRC/docker-compose.yml" >&2
  exit 1
fi

if [ -d "$DIR" ]; then
  echo "$DIR already exists — leaving it alone"
  echo "   (delete it by hand if you really mean to start over; regenerating"
  echo "    secrets over a live database locks you out of it)"
  exit 0
fi

mkdir -p "$DIR"

# Project name and port are the only compose edits. Volumes are named per
# project, so the database and file storage are separate automatically.
sed -e "s/^name: twenty$/name: twenty-$BRAND/" \
    -e "s/\"3001:3000\"/\"$PORT:3000\"/" \
    "$SRC/docker-compose.yml" > "$DIR/docker-compose.yml"

# Fresh secrets per instance — deliberately NOT copied from the sales stack.
# Sharing APP_SECRET would make a token minted by one brand's server valid on
# another's, which is precisely the wall we are building.
umask 077
{
  echo "TAG=latest"
  echo "SERVER_URL=http://$HOST_IP:$PORT"
  echo "APP_SECRET=$(openssl rand -base64 32)"
  echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
  echo "PG_DATABASE_PASSWORD=$(openssl rand -hex 24)"
  echo "STORAGE_TYPE=local"
} > "$DIR/.env"

echo "provisioned $DIR (port $PORT, brand $BRAND)"
# docker-compose, not `docker compose`: this host's Docker CLI (29.6.2) has no
# compose plugin, and `docker compose up -d` fails with "unknown shorthand
# flag: 'd'", which reads like a typo rather than a missing plugin.
echo "start it with:  cd $DIR && docker-compose up -d"
