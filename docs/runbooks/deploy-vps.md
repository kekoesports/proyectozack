# Runbook — despliegue

Azul/verde. La versión anterior sigue viva durante la observación, así que
volver atrás es recargar Caddy, no reconstruir nada.

## Construir

```bash
SHA=$(git rev-parse --short HEAD)
docker build \
  --build-arg GIT_COMMIT_SHA="$(git rev-parse HEAD)" \
  --build-arg APP_VERSION="$SHA" \
  --build-arg NEXT_PUBLIC_SITE_URL=https://socialpro.es \
  -t socialpro:"$SHA" .
```

Etiqueta por SHA, **nunca `latest`**: sin etiqueta inmutable no se puede saber
qué está corriendo ni volver a una versión concreta.

`NEXT_PUBLIC_*` va como argumento de build porque se incrusta en el bundle;
ponerlo en el entorno del contenedor no tiene ningún efecto.

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
CRM_IMAGE=socialpro:"$SHA" docker compose -p socialpro-crm-candidate up -d
```

## Comprobar antes de dirigirle tráfico

```bash
docker exec socialpro-crm-candidate-app-1 \
  wget -qO- http://127.0.0.1:3000/api/health/ready
```

Tiene que devolver 200 con base, migraciones y almacenamiento en verde. Si
`ready` falla, **no se cambia el upstream**.

## Cambiar el tráfico

```bash
CRM_UPSTREAM=candidate-app:3000 caddy reload --config /etc/caddy/Caddyfile
```

`caddy validate` antes de recargar: una configuración inválida deja el proxy
sin arrancar y se cae todo, no solo el CRM.

## Después

Mantener la versión anterior levantada durante la observación. Retirarla solo
cuando la nueva lleve tiempo estable — es lo que hace que el rollback cueste
segundos.
