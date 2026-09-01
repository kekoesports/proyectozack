# Runbook — despliegue

Azul/verde. La versión anterior sigue viva durante la observación, así que
volver atrás es recargar Caddy, no reconstruir nada.

## Construir

```bash
SHA=$(git rev-parse --short HEAD)
docker build \
  --secret id=build_env,src=/opt/socialpro/crm/env/app.env \
  --build-arg GIT_COMMIT_SHA="$(git rev-parse HEAD)" \
  --build-arg APP_VERSION="$SHA" \
  --build-arg NEXT_PUBLIC_SITE_URL=https://socialpro.es \
  -t socialpro:"$SHA" .
```

Etiqueta por SHA, **nunca `latest`**: sin etiqueta inmutable no se puede saber
qué está corriendo ni volver a una versión concreta.

`NEXT_PUBLIC_*` va como argumento de build porque se incrusta en el bundle;
ponerlo en el entorno del contenedor no tiene ningún efecto.

El resto del entorno se inyecta mediante un secreto de BuildKit. No lo cambies
por `COPY`, `ARG` o `ENV`: cualquiera de esas variantes puede dejar las claves
en el contexto, el historial o las capas de la imagen. El secreto solo existe
durante el `RUN npm run build` y no queda dentro del resultado.

Mientras Neon siga activo, `DATABASE_URL` puede apuntar a la rama de staging o
producción que corresponda. Después del cutover, si el prerender necesita leer
el PostgreSQL local, añade al build `--network socialpro-crm_crm_backend` y
comprueba antes que el contenedor `postgres` esté sano.

## Migrar — paso aparte

```bash
docker run --rm --network socialpro-crm_crm_backend \
  --env-file /opt/socialpro/crm/env/app.env \
  socialpro:"$SHA" npm run migrate:deploy
```

**Antes de arrancar la aplicación y una sola vez.** El contenedor web no migra
al arrancar: si lo hiciera, levantar dos réplicas lanzaría dos migraciones a la
vez.

El guard aborta si alguna migración fuera a saltarse en silencio. Si eso pasa,
ver `docs/runbooks/database-operations.md`.

## Levantar el candidato

```bash
CRM_IMAGE=socialpro:"$SHA" \
APP_ENV_FILE=/opt/socialpro/crm/env/candidate-vps.env \
docker compose -f compose.candidate.yaml -p socialpro-crm-candidate up -d
```

El compose candidato solo levanta la aplicación. Reutiliza como redes externas
el PostgreSQL y el edge existentes; nunca arranca un segundo PostgreSQL sobre
el mismo directorio de datos.

## Comprobar antes de dirigirle tráfico

```bash
docker exec socialpro-crm-candidate-candidate-app-1 \
  wget -qO- http://127.0.0.1:3000/api/health/ready
```

Tiene que devolver 200 con base, migraciones y almacenamiento en verde. Si
`ready` falla, **no se cambia el upstream**.

## Cambiar el tráfico

```bash
CRM_UPSTREAM=socialpro-crm-candidate-app:3000 caddy reload --config /etc/caddy/Caddyfile
```

`caddy validate` antes de recargar: una configuración inválida deja el proxy
sin arrancar y se cae todo, no solo el CRM.

## Después

Mantener la versión anterior levantada durante la observación. Retirarla solo
cuando la nueva lleve tiempo estable — es lo que hace que el rollback cueste
segundos.

## Congelar el origen anterior durante el cutover

Antes del dump final, configura `MAINTENANCE_MODE=true` en Vercel y redespliega
la misma revisión que esté en producción. Verifica que una página HTML y una
ruta API de escritura devuelven 503, mientras `/api/health/live` y
`/api/health/ready` siguen accesibles. Activa también mantenimiento en Caddy y
espera el TTL anterior antes de crear el dump.

No desactives el mantenimiento de Vercel al abrir el VPS: el origen anterior
debe permanecer congelado durante la observación. Solo se reactiva como parte
de un rollback anterior a la primera escritura en el VPS.
