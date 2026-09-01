# Runbook — operaciones de base de datos

## Migraciones

```bash
docker buildx build --load --target migrator \
  -t socialpro-migrator:SHA .

docker run --rm --network socialpro-crm_crm_backend \
  --env-file /opt/socialpro/crm/env/app.env \
  socialpro-migrator:SHA
```

Usa `MIGRATION_DATABASE_URL` (rol migrador). La aplicación corre con
`socialpro_app`, que **no puede alterar el esquema**: así un fallo en tiempo de
ejecución no puede convertirse en un cambio de estructura.

No ejecutar migraciones desde la imagen web final: es una imagen minima y no
incluye `tsx`, `scripts/` ni `drizzle/`. El target Docker `migrator` existe para
mantener ese limite de seguridad sin romper el paso de despliegue.

### Si el guard aborta el despliegue

```
MIGRACIONES QUE NO SE APLICARIAN — abortando el deploy
```

Significa que una migración pendiente nació con un `when` por debajo del último
`created_at` de la base, y Drizzle **la daría por aplicada sin ejecutarla**.
Pasó de verdad el 2026-08-20: el deploy salió verde con la migración sin
aplicar.

Arreglo: subir el `when` de esa entrada en `drizzle/meta/_journal.json` por
encima del valor que indica el mensaje. Basta 1 ms.

**Bajar el `when` de la anterior no sirve**: su `created_at` ya está grabado en
la base y la comparación va contra la base, no contra el fichero.

## Comprobar que una migración se aplicó DE VERDAD

Un deploy en verde **no lo demuestra**:

```sql
SELECT count(*), max(created_at) FROM drizzle.__drizzle_migrations;
```

Y comprobar que el objeto creado existe. Esta es la lección del incidente
citado arriba.

## Volcado manual

```bash
docker exec -i socialpro-crm-postgres-1 \
  pg_dump --format=custom --no-owner --no-acl -U socialpro_backup socialpro \
  > /tmp/manual-$(date -u +%Y%m%dT%H%M%SZ).dump
```

Con el rol de solo lectura: un volcado no necesita permisos de escritura.

## Consultas de diagnóstico

```sql
-- Conexiones por estado
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Consultas largas
SELECT pid, now() - query_start AS duracion, left(query, 80)
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '30 seconds';

-- Tamaño de las tablas mayores
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;
```

## Lo que nunca se hace

- **`drizzle-kit push` en producción.** Prohibido. Siempre migración versionada.
- Crear o alterar tablas a mano. Drizzle es la única fuente de verdad.
- Conectarse con `socialpro_owner` desde la aplicación.
- Publicar el puerto 5432 en el host.
