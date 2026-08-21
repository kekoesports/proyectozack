# Migración de Neon a PostgreSQL del VPS

## Lo que ya se sabe

- Neon corre **PostgreSQL 17.11**; el destino será 17.6 o superior.
- **121 migraciones** en el journal de Drizzle.
- El esquema de la tabla de migraciones y la lógica de comparación son
  **idénticos** entre el migrador de Neon y el de `node-postgres`: no se
  re-aplican las migraciones existentes.
- No se usa ninguna característica exclusiva de Neon. Todo es PostgreSQL
  estándar: `ON CONFLICT`, `RETURNING`, CTEs, `LATERAL`, JSONB, arrays,
  `FOR UPDATE`.

## Preflight

Antes de volcar, dejar registrado —en agregado, sin datos personales—:

```sql
SELECT version();
SELECT count(*) FROM pg_extension;
SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
SELECT count(*) FROM information_schema.sequences WHERE sequence_schema='public';
SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;
SELECT count(*), max(created_at) FROM drizzle.__drizzle_migrations;
```

Sin ese recuento previo no hay contra qué cotejar la restauración.

## Volcado

```bash
pg_dump --format=custom --no-owner --no-acl --verbose \
        --file=socialpro.dump "$NEON_DATABASE_URL"
sha256sum socialpro.dump
```

`--format=custom` permite restaurar en paralelo y elegir qué restaurar.
`--no-owner` y `--no-acl` porque los roles del destino son otros.

La URL **no se escribe en el historial**: se pasa por variable de entorno.

## Restauración

Sobre una base vacía creada desde `template0`, con el rol migrador:

```bash
pg_restore --exit-on-error --no-owner --no-acl --jobs=2 \
           -d "$DEST_URL" socialpro.dump
psql "$DEST_URL" -c "ANALYZE;"
```

`--exit-on-error` no es opcional: sin él, `pg_restore` continúa tras un fallo y
deja una base incompleta que aparenta estar bien.

`ANALYZE` después, o el planificador trabajará con estadísticas vacías y las
primeras consultas irán mucho más lentas de lo normal.

## Verificación

Cotejar contra el preflight: filas por tabla, secuencias, claves ajenas,
índices, enums, y el recuento de migraciones. Después, probar los flujos que
tocan dinero y permisos: facturación, conciliación, login y sesiones.

## Cuidado con los tipos

Con `pg`, `numeric` llega como **string** (`int4` y `count::int` como number).
Los sitios que lo consumen ya coaccionan explícitamente, pero conviene
comprobarlo en cualquier código nuevo.
