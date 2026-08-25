#!/usr/bin/env bash
# Copia de seguridad de SocialPro: base del CRM, ficheros, y el stack de n8n.
#
# Dos reglas que gobiernan este script:
#
#   1. Una copia que vive en el mismo servidor NO es una copia. Si el disco
#      falla o alguien borra el VPS, se va con él. Por eso todo termina fuera,
#      cifrado, y el script falla si esa parte falla.
#
#   2. No depende del CRM. Un backup que necesita que la aplicación responda
#      deja de funcionar justo el día que hace falta.
#
# Uso:  backup.sh [--no-remote]
#
set -Eeuo pipefail
umask 077

DESTINO="${BACKUP_DIR:-/opt/socialpro/backups/work}"
REMOTO="${RCLONE_REMOTE:-}"           # p.ej. gdrive:socialpro-backups
RETENCION_DIAS="${RETENCION_DIAS:-7}"
HEARTBEAT_URL="${BACKUP_HEARTBEAT_URL:-}"
SUCCESS_MARKER="${BACKUP_SUCCESS_MARKER:-${DESTINO}/.last-remote-success}"
N8N_DB_USER="${N8N_DB_USER:-n8n}"
SUBIR="si"
[[ "${1:-}" == "--no-remote" ]] && SUBIR="no"

marca="$(date -u +%Y%m%dT%H%M%SZ)"
trabajo="${DESTINO}/${marca}"
mkdir -p "$trabajo"

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }

# Cualquier fallo debe notarse. Sin esto, un backup roto pasa semanas sin que
# nadie se entere hasta que hace falta restaurar.
fallo() {
  log "FALLO en la línea ${1}"
  [[ -n "$HEARTBEAT_URL" ]] && curl -fsS -m 10 "${HEARTBEAT_URL}/fail" >/dev/null 2>&1 || true
  exit 1
}
trap 'fallo $LINENO' ERR

# ── 1. PostgreSQL del CRM ───────────────────────────────────────────────────
log "volcando la base del CRM"
docker exec -i socialpro-crm-postgres-1 \
  pg_dump --format=custom --no-owner --no-acl --compress=9 \
          -U socialpro_backup socialpro \
  > "${trabajo}/crm.dump"

# ── 2. PostgreSQL de n8n ────────────────────────────────────────────────────
log "volcando la base de n8n"
docker exec -i socialpro-automation-postgres-1 \
  pg_dumpall --roles-only -U "$N8N_DB_USER" > "${trabajo}/n8n-roles.sql" 2>/dev/null || true
docker exec -i socialpro-automation-postgres-1 \
  pg_dump --format=custom --no-owner --compress=9 -U "$N8N_DB_USER" n8n \
  > "${trabajo}/n8n.dump"

# ── 3. Ficheros ─────────────────────────────────────────────────────────────
# Los privados van aparte para poder restaurarlos con permisos distintos.
log "empaquetando ficheros"
tar -czf "${trabajo}/storage-public.tar.gz"  -C /opt/socialpro/data storage-public
tar -czf "${trabajo}/storage-private.tar.gz" -C /opt/socialpro/data storage-private

# ── 4. Volumen de n8n y configuración ───────────────────────────────────────
# n8n_data contiene credenciales cifradas con N8N_ENCRYPTION_KEY: sin esa clave
# el volumen no sirve de nada, y sin el volumen la clave tampoco.
log "empaquetando n8n_data y configuración"
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -v socialpro-automation_n8n_data:/origen:ro \
  -v "${trabajo}":/destino \
  alpine:3.20 tar -czf /destino/n8n_data.tar.gz -C /origen . 2>/dev/null

tar -czf "${trabajo}/config.tar.gz" \
  --exclude='*.env' --exclude='secrets' \
  -C /opt/socialpro n8n/Caddyfile crm/compose.yaml 2>/dev/null || \
  log "aviso: configuración no incluida (ejecuta el servicio de backup como root)"

# ── 5. Integridad ───────────────────────────────────────────────────────────
# Sin checksums no hay forma de distinguir una copia buena de una truncada.
log "calculando checksums"
chmod 600 "${trabajo}"/*
( cd "$trabajo" && sha256sum ./* > SHA256SUMS )

tamano=$(du -sh "$trabajo" | cut -f1)
log "copia local lista (${tamano})"

# ── 6. Fuera del servidor ───────────────────────────────────────────────────
if [[ "$SUBIR" == "si" ]]; then
  if [[ -z "$REMOTO" ]]; then
    log "ERROR: RCLONE_REMOTE sin definir. Una copia solo local no es una copia."
    exit 1
  fi
  config_rclone="${RCLONE_CONFIG:-/root/.config/rclone/rclone.conf}"
  if [[ ! -r "$config_rclone" || ! -w "$(dirname "$config_rclone")" ]]; then
    log "ERROR: la configuración de rclone no se puede leer o renovar"
    exit 1
  fi
  log "subiendo a ${REMOTO}"
  # `--crypt-*` en la config de rclone: se sube ya cifrado, así que el destino
  # nunca ve datos en claro.
  rclone copy "$trabajo" "${REMOTO}/${marca}" \
    --transfers 4 --checkers 8 --retries 3 --low-level-retries 10 \
    --stats-one-line --stats 30s

  log "verificando lo subido"
  rclone check "$trabajo" "${REMOTO}/${marca}" --one-way
  # Guardian solo considera fresca una copia después de que el remoto haya
  # terminado y superado la comprobación. Los ficheros que se están escribiendo
  # no deben parecer una copia válida.
  mkdir -p "$(dirname "$SUCCESS_MARKER")"
  touch "$SUCCESS_MARKER"
  chmod 0644 "$SUCCESS_MARKER"
fi

# ── 7. Limpieza local ───────────────────────────────────────────────────────
# Solo lo local: la retención del remoto se gestiona aparte, para que un error
# aquí no pueda borrar el histórico de fuera.
log "limpiando copias locales de más de ${RETENCION_DIAS} días"
find "$DESTINO" -maxdepth 1 -type d -name '20*' -mtime "+${RETENCION_DIAS}" -exec rm -rf {} + 2>/dev/null || true

[[ -n "$HEARTBEAT_URL" ]] && curl -fsS -m 10 "$HEARTBEAT_URL" >/dev/null 2>&1 || true
log "terminado"
