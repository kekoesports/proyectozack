#!/usr/bin/env bash
set -Eeuo pipefail

readonly migrator_password="$(< /run/secrets/postgres_migrator_password)"
readonly app_password="$(< /run/secrets/postgres_app_password)"
readonly backup_password="$(< /run/secrets/postgres_backup_password)"

psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=migrator_password="$migrator_password" \
  --set=app_password="$app_password" \
  --set=backup_password="$backup_password" \
  --file=/docker-entrypoint-initdb.d/01-roles.sql.tmpl
