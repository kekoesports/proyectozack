# Arquitectura actual

> Auditado el 2026-08-21 sobre `master` en `6c73cd8a`.
> El encargo citaba `87bc61bc`; entre uno y otro hay 24 commits.

## Panorama

```
Internet
   │
   ▼
Vercel (edge + funciones)
   ├── Next.js 16 / React 19 / Node 24
   ├── Vercel Cron ── 8 jobs
   ├── Vercel Blob ── ficheros públicos y privados
   ├── Analytics + Speed Insights
   └── geo por cabecera x-vercel-ip-country
        │
        ▼
   Neon PostgreSQL 17.11
        · driver HTTP  (@neondatabase/serverless)
        · driver WebSocket para transacciones
        · branch por rama git en previews

VPS (ya contratado) — hoy solo automatización
   ├── Caddy            :80 :443
   ├── n8n
   ├── PostgreSQL 16    (exclusivo de n8n)
   └── runner externo
```

Servicios externos que **no** se tocan: Resend, Google (Drive/Sheets/Docs),
Twitch, YouTube, Discord, GitHub.

## Aplicación

| | |
|---|---|
| Framework | Next.js 16, App Router |
| Runtime | Node 24 |
| ORM | Drizzle 0.45 |
| Auth | Better Auth + plugin propio de Steam OpenID |
| Dependencias nativas | `canvas`, `@napi-rs/canvas`, `mupdf`, `pdfjs-dist`, `tesseract.js` |

`next.config.ts` lleva CSP completa, ~15 redirecciones heredadas de WordPress,
`serverExternalPackages` para los tres paquetes con WASM y
`outputFileTracingIncludes` para que el trazado no se deje los `.wasm` ni los
`.traineddata`.

## Base de datos

PostgreSQL 17.11 en Neon. **121 migraciones** en el journal de Drizzle.

Tres clientes distintos, y la razón es una sola: el driver HTTP de Neon no
admite `db.transaction()`.

| Cliente | Para qué |
|---|---|
| `neon-http` | lecturas y escrituras sueltas |
| `neon-http` con `isolationLevel: 'Serializable'` | ledger de sorteos, vía `batch()` |
| Pool WebSocket (`neon-serverless`) | transacciones interactivas: facturación, conciliación |

Garantías en uso: `SELECT … FOR UPDATE` (facturación), aislamiento serializable
con reintento ante `40001` (ledger), `ON CONFLICT` (32 sitios), CTEs
encadenados con escritura, `LATERAL`, JSONB y arrays.

**Nada de esto es específico de Neon.** Es PostgreSQL estándar.

## Almacenamiento

Vercel Blob, en dos stores (uno dedicado a portadas de noticias).

Dos formas de localizar un fichero, y la segunda es el problema:

1. **URL guardada en base de datos** — contratos, facturas, briefs, `files`,
   portadas. Ocho columnas. Migrable.
2. **Descubrimiento por `list()` con prefijo** — fotos de talento, de equipo y
   logos de marca. **No hay fila en la base de datos**: la convención de
   nombres *es* el índice, y las rutas proxy redescubren el fichero listando
   por prefijo.

El punto 2 no tiene equivalente directo fuera de la API de Vercel Blob.

Los ficheros privados nunca se exponen: se sirven por rutas que comprueban
permisos y hacen `fetch` con el token desde el servidor.

## Tareas programadas

Ocho crons en `vercel.json`, todos en UTC:

| Ruta | Cron (UTC) | Europe/Madrid (verano) |
|---|---|---|
| `snapshot-metrics` | `0 6 * * *` | 08:00 |
| `rollover-tasks` | `0 5 * * 1` | lunes 07:00 |
| `sync-metrics` | `0 7 * * 1` | lunes 09:00 |
| `sync-news-alerts` | `0 7 * * *` | 09:00 |
| `discover-creator-targets` | `30 6 * * *` | 08:30 |
| `sync-sheet-sources` | `0 23 * * *` | 01:00 del día siguiente |
| `generate-recurring-expenses` | `0 3 * * *` | 05:00 |
| `giveaway-lifecycle` | `7 * * * *` | cada hora, minuto 7 |

Hay **diez** directorios en `src/app/api/cron/` y ocho horarios.
`poll-live-status` queda fuera porque nunca tuvo programación; `backup` queda
fuera porque la copia real es el timer cifrado del VPS. Ninguno se activa “por
si acaso” durante la migración.

La autenticación exige `Authorization: Bearer CRON_SECRET`. La cabecera
`x-vercel-cron` ya no se considera autenticación porque puede falsificarse.

## Despliegue

GitHub App de Vercel, con `vercel-deploy-hook.yml` como red de seguridad.

Cuatro workflows: `ci.yml` (lint, tipos, `drizzle-kit check`, canario de drift,
build condicional), `e2e.yml` (manual), `neon-branch-cleanup.yml` y el hook.

`neon-branch-cleanup.yml` existe solo por la integración Neon↔Vercel: cada
preview crea una rama de base de datos que no se borra sola. En julio de 2026
costó 70,61 $ en 47 branch-months.

## Acoplamiento con Vercel

De mayor a menor dificultad:

| Punto | Dificultad |
|---|---|
| Fotos y logos indexados por `list()` con prefijo | **alta** |
| Geo por `x-vercel-ip-country` (gating **legal** de sorteos) | **alta** |
| Guards de `VERCEL_ENV` en el build | media → **ya resuelto** |
| Ocho crons | media |
| Blob de contratos, facturas y ficheros | media |
| `runtime = 'edge'` en 4 imágenes OG, `maxDuration` en 5 rutas | media |
| Analytics y Speed Insights | baja |
| IP real, auth de crons, deploy hook | baja |

## Hallazgos que conviene tener presentes

- **El OCR de nóminas está apagado.** `PAYROLL_OCR_ENABLED` viene en `false`
  porque tesseract falla en Vercel. Migrar **desbloquea** una función que hoy
  no se puede usar.
- **`maxDuration` se contradice**: una ruta documenta un máximo de 60 s y otras
  cuatro declaran 120. Fuera de Vercel el parámetro no significa nada y esos
  cuatro trabajos necesitan otra forma de acotarse.
- **El limitador de peticiones vive en memoria** y está pensado para instancias
  efímeras. En un proceso persistente se comporta distinto —mejor— pero los
  límites hay que revisarlos.
- **Better Auth mejora al migrar**: hoy el driver HTTP no admite transacciones,
  así que cualquier flujo suyo que las use está fallando.
