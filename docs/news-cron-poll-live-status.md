# Live status — operativa (Hobby plan friendly)

`talent_live_status` se mantiene sincronizada con la Twitch API mediante
DOS mecanismos paralelos. Plan Hobby de Vercel **no soporta** crons
nativos con frecuencia <1 día — y aunque añadir un cron diario en
`vercel.json` también ha bloqueado deploys históricamente cuando se
suma a otros crons. La solución actual evita Vercel crons para live
status y usa pull-on-demand.

> Lección operativa (commit `d2ed534`, 7 mayo 2026): añadir un cron a
> `vercel.json` que viole el límite Hobby (1×/día/cron + máx 2 crons
> totales) bloquea TODOS los deploys del proyecto. Si añades cualquier
> cron, valida primero que cumple las restricciones del plan.

## Mecanismos activos

### 1. Pull-on-demand vía `/api/live` (`after()`)

Endpoint: `GET /api/live` — `src/app/api/live/route.ts`.

Cuando alguien consulta `/api/live` y `lastCheckedAt > 3 min`, dispara
`pollTwitch()` en background usando `after()` de `next/server`. La
respuesta sale con datos del último poll; el siguiente request obtiene
datos refrescos.

- ✅ Funciona en Hobby sin restricciones
- ✅ Sin coste si nadie consulta — solo polea cuando hay tráfico
- ⚠️ El primer request tras 3+ min paga ~500ms de latencia mientras el
  background poll se dispara (la respuesta sale sin esperarlo)

### 2. Endpoint cron disponible (sin calendarizar)

Endpoint: `GET /api/cron/poll-live-status` — sigue funcional para cron
**externo** si se desea polling fijo sin depender de tráfico humano.

Servicios externos compatibles (gratuitos):
- [cron-job.org](https://cron-job.org)
- [easycron.com](https://easycron.com)
- GitHub Actions con schedule trigger

Configurar el cron externo con:
- Method: `GET`
- URL: `https://socialpro.es/api/cron/poll-live-status`
- Header: `Authorization: Bearer <CRON_SECRET>`
- Schedule: cada 5-15 min según necesidad

**No añadir a `vercel.json`** — bloquea el deploy en Hobby.

## Env vars requeridas (en Vercel Production)

| Variable | Comportamiento si falta |
|---|---|
| `CRON_SECRET` ≥16 chars | `assertCronAuth` retorna 503. Cron externo se rechaza. |
| `TWITCH_CLIENT_ID` | `pollTwitch()` lanza error. `/api/live` retorna sin actualizar DB. |
| `TWITCH_CLIENT_SECRET` | Igual que arriba. |

Confirmar via curl sin auth:

```bash
curl -s -w "%{http_code}\n" https://socialpro.es/api/cron/poll-live-status
# 401 → CRON_SECRET configurado ✓
# 503 → CRON_SECRET no configurado ✗
```

## Comportamiento por escenario

### Escenario 1 — Twitch API responde OK

Endpoint retorna:
```json
{ "ok": true, "checked": 13, "live": 2, "liveHandles": ["..."] }
```
Upsert idempotente. `lastCheckedAt = now`.

### Escenario 2 — Twitch API falla / creds faltan

Endpoint retorna **HTTP 200**:
```json
{ "ok": false, "skipped": true, "reason": "twitch_creds_missing" }
```
o `"reason": "twitch_api_error"`. **DB intacta** — fallback fail-soft.

## Detección downstream — fallback UX

`Cs2CreatorsAside` usa una safety window de 15 min sobre `lastCheckedAt`:

- Datos fresh (todos < 15 min) → render normal con badges LIVE/OFFLINE.
- Datos stale (último update > 15 min) → mensaje contextual:
  > "Estado live actualizándose · vuelve en unos minutos"
- Sin filas en `talent_live_status` → modo browse-only sin badges live.

Esto evita que el usuario vea "todos offline" cuando la realidad es
que el cron está caído o no se ha disparado por falta de tráfico.

## Tabla de síntoma → causa → fix

| Síntoma | Causa probable | Fix |
|---|---|---|
| Aside CS2 dice "Estado actualizándose" durante > 1h, sin tráfico humano reciente a `/api/live` | `after()` no se dispara sin tráfico | (a) Configurar cron externo, (b) Añadir un fetch a `/api/live` en el aside o en home |
| Endpoint cron retorna `skipped: twitch_creds_missing` | Faltan TWITCH_CLIENT_* en Vercel | Configurar en Settings → Env Vars (Production) |
| Endpoint cron retorna 503 | CRON_SECRET no configurado | Generar y añadir secret ≥16 chars |
| Deploy de Vercel falla tras añadir cron a vercel.json | Plan Hobby max 2 crons totales + 1×/día c/u | NO añadir live cron a vercel.json — usar mecanismos descritos arriba |

## Histórico

- 7 mayo 2026 (`d2ed534`): solución `after()` en `/api/live` + eliminado
  cron `*/2` que bloqueaba deploy Hobby.
- 10 mayo 2026 (sesión actual): yo introduje accidentalmente un cron
  `0 */6 * * *` que también bloqueaba deploys (4×/día > Hobby limit).
  Eliminado tras diagnóstico. Esta documentación corregida.
