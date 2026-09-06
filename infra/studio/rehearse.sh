#!/usr/bin/env bash
# One isolated rehearsal, on the authorized VPS only. Does not migrate production.
set -Eeuo pipefail
umask 077
release=/opt/socialpro/studio-release-20260906
test -f "$release/source.tar.gz"
test ! -f "$release/rehearsal-started"
touch "$release/rehearsal-started"
docker network create --internal socialpro-studio-rehearsal
docker exec socialpro-crm-postgres-1 pg_dump --format=custom --no-owner --no-acl --compress=6 -U socialpro_backup socialpro > "$release/pre-studio.dump"
test -s "$release/pre-studio.dump"
sha256sum "$release/pre-studio.dump"
# Synthetic credentials generated in a private file, never printed or copied to production.
docker run --rm --network none --user root -v "$release:/release" --entrypoint node socialpro:studio-eea5ecc4 -e '
const fs=require("fs"),{randomBytes}=require("crypto");
const password=randomBytes(32).toString("hex");
fs.writeFileSync("/release/rehearsal-db.env", `POSTGRES_DB=socialpro\nPOSTGRES_USER=postgres\nPOSTGRES_PASSWORD=${password}\n`, {mode:0o600});
fs.writeFileSync("/release/rehearsal-app.env", `DATABASE_URL=postgresql://postgres:${password}@socialpro-studio-rehearsal-db:5432/socialpro\nBETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}\nRESEND_API_KEY=re_isolated_no_delivery\nNEXT_PUBLIC_SITE_URL=http://localhost:3108\nSTUDIO_ENABLED=true\nSTUDIO_RENDER_ENABLED=true\nSTUDIO_HIGGSFIELD_ENABLED=false\nSTORAGE_DRIVER=local\nSTORAGE_LOCAL_ROOT=/srv/storage\nENABLE_DEV_AUTH_BYPASS=false\nDB_POOL_MAX=2\n`, {mode:0o600});'
docker run -d --name socialpro-studio-rehearsal-db --network socialpro-studio-rehearsal \
  --env-file "$release/rehearsal-db.env" --memory 1g postgres:17.6-bookworm
for attempt in $(seq 1 30); do
  if docker exec socialpro-studio-rehearsal-db pg_isready -U postgres -d socialpro; then break; fi
  sleep 1
done
docker exec -i socialpro-studio-rehearsal-db pg_restore --exit-on-error --no-owner --no-acl -U postgres -d socialpro < "$release/pre-studio.dump"
docker exec socialpro-studio-rehearsal-db psql -U postgres -d socialpro -c \
  'SELECT (SELECT count(*) FROM talents) AS talents, (SELECT count(*) FROM public."user") AS accounts, (SELECT max(created_at) FROM drizzle.__drizzle_migrations) AS migration_floor;'
docker buildx build --builder socialpro-crm-builder --load --target migrator -t socialpro-migrator:studio-eea5ecc4 "$release/source"
docker run --rm --network socialpro-studio-rehearsal --env-file "$release/rehearsal-app.env" \
  -e PGOPTIONS='-c lock_timeout=5000 -c statement_timeout=30000' socialpro-migrator:studio-eea5ecc4
docker run --rm --network socialpro-studio-rehearsal --env-file "$release/rehearsal-app.env" \
  socialpro-migrator:studio-eea5ecc4
docker exec socialpro-studio-rehearsal-db psql -U postgres -d socialpro -c \
  'SELECT (SELECT count(*) FROM talents) AS talents, (SELECT count(*) FROM public."user") AS accounts, (SELECT max(created_at) FROM drizzle.__drizzle_migrations) AS migration_floor;'
docker run -d --name socialpro-studio-rehearsal-app --network socialpro-studio-rehearsal \
  --env-file "$release/rehearsal-app.env" --memory 2g -p 127.0.0.1:3108:3000 socialpro:studio-eea5ecc4
printf 'Rehearsal app started on VPS loopback 3108; not public.\n'
