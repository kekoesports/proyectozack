# Portabilidad del código

Estado de la Fase 1. Detalle en la PR #303.

## Hecho

| Área | Cómo quedó |
|---|---|
| Driver de base de datos | `pg` + `drizzle-orm/node-postgres`, probado contra PostgreSQL 17.11 real |
| Entorno de despliegue | `DEPLOY_ENV` propio, con `VERCEL_ENV` como respaldo |
| Build | separado de las migraciones |
| Health checks | `/api/health/live` y `/ready` |
| Almacenamiento | interfaz con dos proveedores y lectura con respaldo |
| Empaquetado | Dockerfile multi-stage, Debian slim |

## Tres cosas que conviene entender

### Había tres clientes de base de datos, no uno

Y no por capricho: el driver HTTP de Neon **no admite `db.transaction()`**. De
ahí un cliente para lecturas, otro con aislamiento serializable para el ledger,
y un pool WebSocket para transacciones interactivas.

Con `pg` basta un pool. `serializableDb` y `getTransactionalDb()` se conservan
como alias del mismo, para no tocar decenas de consumidores y 32 mocks en el
mismo cambio en que se sustituye el driver.

El único punto sin equivalente era `serializableDb.batch()`, un rodeo para
envolver una sentencia en una transacción serializable. Ahora el aislamiento se
declara en la propia transacción.

### Los guards de entorno no fallaban: dejaban de aplicarse

`migrate.ts` y `ping-indexnow.ts` miraban `VERCEL_ENV`. Fuera de Vercel esa
variable no existe, así que las comprobaciones se volvían inertes en silencio:
migraciones en preview, pings de IndexNow desde staging.

El de IndexNow era el peor: `VERCEL_ENV && VERCEL_ENV !== 'production'` es
falso cuando la variable no existe, de modo que **hacía ping igualmente**.

### Dos consumidores que el inventario no vio

Aparecieron al compilar, no al buscar: cinco rutas OG usaban `db.$client` como
tagged template, y `api/cron/sync-metrics` **abría su propio cliente Neon**
saltándose la capa de datos. Ninguno salía en una búsqueda por `import`.

## Pendiente

- **Construir la imagen y ejercitar OCR y PDF dentro del contenedor.** Sin eso
  la Fase 1 no está completa.
- Retirar `@neondatabase/serverless`, que aún usan ~101 scripts de `scripts/`.
- Decidir qué hacer con el geo por país.
- Construir el índice de fotos, equipo y logos.
