#!/bin/sh
set -eu

SECRETS_DIR=${SOCIALPRO_SECRETS_DIR:-/opt/socialpro/crm/secrets}
POSTGRES_UID=${SOCIALPRO_POSTGRES_UID:-999}

if [ "$(id -u)" -ne 0 ]; then
  echo 'Ejecuta este script como root.' >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo 'Falta openssl.' >&2
  exit 1
fi

if ! command -v setfacl >/dev/null 2>&1; then
  echo 'Falta setfacl. Instala el paquete acl y vuelve a ejecutar.' >&2
  exit 1
fi

install -d -m 700 "$SECRETS_DIR"
umask 077

for secret in \
  postgres_password \
  postgres_migrator_password \
  postgres_app_password \
  postgres_backup_password
do
  path="$SECRETS_DIR/$secret"
  if [ ! -s "$path" ]; then
    openssl rand -hex 32 > "$path"
  fi
  chmod 600 "$path"
done

# Los secrets de Compose son bind mounts. Los scripts de init se ejecutan como
# uid 999 y necesitan leer únicamente estas tres contraseñas de rol.
setfacl -m "u:${POSTGRES_UID}:r" \
  "$SECRETS_DIR/postgres_migrator_password" \
  "$SECRETS_DIR/postgres_app_password" \
  "$SECRETS_DIR/postgres_backup_password"

echo 'Secrets de PostgreSQL preparados sin mostrar sus valores.'
