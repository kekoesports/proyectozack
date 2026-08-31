#!/usr/bin/env bash
set -euo pipefail

incoming="${1:?ruta del env exportado de Vercel}"
target="${2:-/opt/socialpro/crm/env/app.env}"

if [[ "$target" != "/opt/socialpro/crm/env/app.env" ]]; then
  printf 'Destino no permitido: %s\n' "$target" >&2
  exit 2
fi
if [[ ! -f "$incoming" || ! -f "$target" ]]; then
  printf 'Falta el env de entrada o el env actual\n' >&2
  exit 3
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="${target}.before-vercel-sync-${stamp}"
merged="${target}.new-${stamp}"
cp -p -- "$target" "$backup"

awk '
function key_of(line, pos) {
  pos=index(line, "=")
  return pos > 1 ? substr(line, 1, pos - 1) : ""
}
function preserve(k) {
  return k ~ /^(DATABASE_URL|DATABASE_URL_UNPOOLED|MIGRATION_DATABASE_URL|STORAGE_DRIVER|STORAGE_LOCAL_ROOT|STORAGE_PUBLIC_URL_BASE|STORAGE_FALLBACK_TO_VERCEL|DEPLOY_ENV|PORT|HOSTNAME|APP_VERSION|GIT_COMMIT_SHA|NODE_ENV|NEXT_TELEMETRY_DISABLED)$/
}
FNR == NR {
  k=key_of($0)
  if (k != "" && !preserve(k)) {
    production[k]=$0
    order[++count]=k
  }
  next
}
{
  k=key_of($0)
  if (k in production) {
    print production[k]
    used[k]=1
  } else {
    print
  }
}
END {
  for (i=1; i<=count; i++) {
    k=order[i]
    if (!(k in used)) print production[k]
  }
}
' "$incoming" "$target" > "$merged"

chmod 600 "$merged"
mv -- "$merged" "$target"
printf 'Env fusionado: %s variables; copia previa: %s\n' \
  "$(grep -Ec '^[A-Za-z_][A-Za-z0-9_]*=' "$target")" "$backup"
