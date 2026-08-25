#!/usr/bin/env bash
#
# Collector de salud del VPS para Zack Guardian.
#
# Script FIJO. No recibe entrada del modelo, no ejecuta nada que le digan y no
# tiene parámetros más allá de la configuración de su fichero .env. Esa es la
# decisión de diseño principal: el agente interpreta señales, no las produce, y
# no hay ninguna ruta por la que pueda influir en lo que se ejecuta aquí.
#
# QUÉ ENVÍA
#   uso de disco e inodos, memoria y swap, carga, estado de servicios de una
#   lista cerrada, antigüedad del último backup y versión desplegada.
#
# QUÉ NO ENVÍA — y no es una omisión
#   logs (crudos o filtrados), variables de entorno, `docker inspect`, listados
#   de procesos, contenido de ficheros, IPs públicas ni nada que se parezca a
#   una credencial. Si algo de eso hiciera falta para diagnosticar, se añade
#   aquí con nombre y apellidos, no se manda "por si acaso".
#
# INSTALACIÓN
#   ver README.md de este directorio. Requiere bash, curl y coreutils.

set -euo pipefail

CONFIG="${GUARDIAN_COLLECTOR_CONFIG:-/etc/socialpro/guardian-collector.env}"
# shellcheck source=/dev/null
[ -f "$CONFIG" ] && . "$CONFIG"

: "${GUARDIAN_ENDPOINT:?falta GUARDIAN_ENDPOINT}"
: "${GUARDIAN_TOKEN:?falta GUARDIAN_TOKEN}"
: "${GUARDIAN_HMAC_SECRET:?falta GUARDIAN_HMAC_SECRET}"

# Servicios vigilados. Lista cerrada a propósito: un bucle sobre `systemctl
# list-units` mandaría el nombre de todo lo que corra en la máquina.
SERVICIOS="${GUARDIAN_SERVICES:-socialpro-crm socialpro-n8n caddy}"

# Umbral de antigüedad del backup, en horas.
BACKUP_MAX_HORAS="${GUARDIAN_BACKUP_MAX_HOURS:-26}"
BACKUP_SUCCESS_MARKER="${GUARDIAN_BACKUP_SUCCESS_MARKER:-/var/lib/socialpro-guardian/backup-last-success}"

VERSION="${GUARDIAN_VERSION:-desconocida}"

# ── Envío ────────────────────────────────────────────────────────────────────

# Firma el cuerpo con el mismo esquema que espera el endpoint: HMAC-SHA256 de
# "<timestamp>.<cuerpo>". El timestamp entra en el material firmado para que no
# se pueda reutilizar una firma cambiando solo la cabecera de fecha.
enviar() {
  local cuerpo="$1"
  local ts firma

  ts="$(date +%s)"
  firma="$(printf '%s.%s' "$ts" "$cuerpo" \
    | openssl dgst -sha256 -hmac "$GUARDIAN_HMAC_SECRET" -hex \
    | sed 's/^.* //')"

  # `--fail` para que un 4xx/5xx devuelva error, `--silent` para no ensuciar el
  # log del timer, y sin `--verbose` nunca: imprimiría las cabeceras, token
  # incluido.
  curl --silent --show-error --fail --max-time 10 \
    -X POST "$GUARDIAN_ENDPOINT" \
    -H 'content-type: application/json' \
    -H "authorization: Bearer $GUARDIAN_TOKEN" \
    -H "x-agent-timestamp: $ts" \
    -H "x-agent-signature: $firma" \
    -d "$cuerpo" \
    -o /dev/null || echo "[guardian] no se pudo enviar: $2" >&2
}

evento() {
  local tipo="$1" severidad="$2" payload="$3" externo="$4"
  enviar "{\"source\":\"collector\",\"eventType\":\"$tipo\",\"severity\":\"$severidad\",\"externalId\":\"$externo\",\"payload\":$payload}" "$tipo"
}

# La hora se incluye en el `externalId` para que dos ejecuciones del mismo
# minuto se deduplíquen y las de minutos distintos no. Sin esto, el índice único
# descartaría todas las lecturas posteriores a la primera.
MARCA="$(date -u +%Y%m%dT%H%M)"

# ── Disco ────────────────────────────────────────────────────────────────────

disco_pct="$(df --output=pcent / | tail -1 | tr -dc '0-9')"
disco_sev='info'
[ "$disco_pct" -ge 80 ] && disco_sev='warning'
[ "$disco_pct" -ge 90 ] && disco_sev='critical'
evento 'system.disk' "$disco_sev" "{\"usedPct\":$disco_pct,\"mount\":\"/\"}" "disk-$MARCA"

inodos_pct="$(df --output=ipcent / | tail -1 | tr -dc '0-9')"
inodos_sev='info'
[ "$inodos_pct" -ge 80 ] && inodos_sev='warning'
[ "$inodos_pct" -ge 90 ] && inodos_sev='critical'
evento 'system.inodes' "$inodos_sev" "{\"usedPct\":$inodos_pct}" "inodes-$MARCA"

# ── Memoria ──────────────────────────────────────────────────────────────────

mem_total="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
mem_disp="$(awk '/MemAvailable/ {print $2}' /proc/meminfo)"
mem_pct=$(( (mem_total - mem_disp) * 100 / mem_total ))

swap_total="$(awk '/SwapTotal/ {print $2}' /proc/meminfo)"
swap_libre="$(awk '/SwapFree/ {print $2}' /proc/meminfo)"
swap_pct=0
[ "$swap_total" -gt 0 ] && swap_pct=$(( (swap_total - swap_libre) * 100 / swap_total ))

mem_sev='info'
[ "$mem_pct" -ge 85 ] && mem_sev='warning'
# El swap solo alarma acompañado de presión de memoria: una máquina con swap
# usado y RAM libre lleva así desde el último pico y no es una incidencia.
[ "$mem_pct" -ge 90 ] && [ "$swap_pct" -ge 50 ] && mem_sev='critical'
evento 'system.memory' "$mem_sev" "{\"usedPct\":$mem_pct,\"swapPct\":$swap_pct}" "mem-$MARCA"

# ── Carga ────────────────────────────────────────────────────────────────────

# Se envía la de 15 minutos, no la de 1: un pico aislado no es un problema y
# alarmar por él enseña a ignorar las alarmas.
carga15="$(awk '{print $3}' /proc/loadavg)"
vcpus="$(nproc)"
evento 'system.load' 'info' "{\"load15\":$carga15,\"vcpus\":$vcpus}" "load-$MARCA"

# ── Servicios ────────────────────────────────────────────────────────────────

for servicio in $SERVICIOS; do
  if systemctl is-active --quiet "$servicio" 2>/dev/null; then
    estado='active'; sev='info'
  else
    estado='inactive'; sev='critical'
  fi
  # Solo el nombre y el estado. Ni el PID, ni la línea de comandos, ni las
  # últimas líneas del log.
  evento 'system.service' "$sev" "{\"unit\":\"$servicio\",\"state\":\"$estado\"}" "svc-$servicio-$MARCA"
done

# ── Backup ───────────────────────────────────────────────────────────────────

if systemctl is-failed --quiet socialpro-backup-remote.service 2>/dev/null; then
  evento 'backup.failed' 'high' '{"reason":"servicio-backup-fallido"}' "backup-$MARCA"
elif [ -f "$BACKUP_SUCCESS_MARKER" ]; then
  ultimo="$(stat -c '%Y' "$BACKUP_SUCCESS_MARKER")"
  horas=$(( ( $(date +%s) - ultimo ) / 3600 ))
  sev='info'
  [ "$horas" -ge "$BACKUP_MAX_HORAS" ] && sev='high'
  # Sin nombres de fichero: revelan la convención de nombrado y las fechas de
  # los respaldos.
  evento 'backup.heartbeat' "$sev" "{\"ageHours\":$horas}" "backup-$MARCA"
elif systemctl is-active --quiet socialpro-backup-remote.service 2>/dev/null; then
  # Primera ejecución todavía en curso: no inventar ni éxito ni fallo.
  :
else
  evento 'backup.failed' 'high' '{"reason":"sin-copia-remota-verificada"}' "backup-$MARCA"
fi

# ── Versión desplegada ───────────────────────────────────────────────────────

evento 'app.deploy' 'info' "{\"version\":\"$VERSION\"}" "deploy-$MARCA"

exit 0
