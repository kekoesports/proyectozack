#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  echo "Missing automation/n8n/.env" >&2
  exit 1
fi

set -a
. ./.env
set +a

BACKUP_DIR=${BACKUP_DIR:-"$SCRIPT_DIR/backups"}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --format custom \
  > "$BACKUP_DIR/n8n-$STAMP.dump"

tar -czf "$BACKUP_DIR/n8n-config-$STAMP.tar.gz" \
  Caddyfile docker-compose.yml workflows

find "$BACKUP_DIR" -type f -mtime "+$BACKUP_RETENTION_DAYS" -delete
echo "Backup complete: $BACKUP_DIR/n8n-$STAMP.dump"
