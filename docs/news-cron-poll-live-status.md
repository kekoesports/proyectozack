# Cron `poll-live-status` — operativa

Cron de Vercel que mantiene `talent_live_status` sincronizada con la
Twitch API. Es la fuente de verdad para el módulo `Cs2CreatorsAside`
en `/news` y para `LiveSection` en home.

## Endpoint

```
GET /api/cron/poll-live-status
```

Código en `src/app/api/cron/poll-live-status/route.ts`.

## Calendarización

Definida en `vercel.json`:

```json
{ "path": "/api/cron/poll-live-status", "schedule": "*/5 * * * *" }
```

**Schedule según plan Vercel:**

| Plan | Min interval | Schedule recomendado |
|---|---|---|
| Hobby | 1 vez/día | `"0 7 * * *"` (las 7 UTC) — el módulo solo refresca 1×/día |
| Pro | 1 minuto | `"*/5 * * * *"` (cada 5 min) — actual |
| Pro Plus | 1 minuto | `"*/2 * * * *"` (cada 2 min) — innecesariamente frecuente |

Si SocialPro está en Hobby, `*/5 * * * *` **no se ejecuta** y el módulo
queda con datos stale. Cambiar a `"0 */6 * * *"` (cada 6h) o `"0 7 * * *"`
mientras se mantenga ese plan.

## Env vars requeridas

| Variable | Tipo | Comportamiento si falta |
|---|---|---|
| `CRON_SECRET` | string ≥16 chars | `assertCronAuth` retorna **503 Service misconfigured**. Cron no ejecuta. |
| `TWITCH_CLIENT_ID` | string | `fetchTwitchLiveByLogins` lanza Error. Endpoint retorna **200 `{ skipped: true }`** y NO toca DB. |
| `TWITCH_CLIENT_SECRET` | string | Igual que arriba — endpoint marca skipped y deja DB intacta. |

Definidas en `src/lib/env.ts` como `optional()` — el código maneja
explícitamente la ausencia con fail-soft.

**Test rápido desde fuera (sin auth) en producción:**

```bash
curl -s -w "%{http_code}\n" https://socialpro.es/api/cron/poll-live-status
```

- `401 Unauthorized` → `CRON_SECRET` está configurada ✓
- `503 Service misconfigured` → falta `CRON_SECRET` ✗

## Auth válida

Vercel cron lo dispara con header `x-vercel-cron: 1` (filtrado a
requests externas por la propia infra Vercel). Para disparar manualmente:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://socialpro.es/api/cron/poll-live-status
```

## Comportamiento por escenario

### Escenario 1 — Twitch API responde OK (caso happy)

Endpoint retorna:

```json
{ "ok": true, "checked": 13, "live": 2, "liveHandles": ["..."] }
```

- Upsert idempotente para cada talent con `talent_socials.handle` Twitch.
- `isLive`, `streamTitle`, `gameName`, `viewerCount`, `streamUrl`,
  `startedAt` rellenos cuando hay stream.
- `lastCheckedAt = now` para todos.

### Escenario 2 — Twitch API falla (creds faltan, rate limit, network)

Endpoint retorna:

```json
{ "ok": false, "skipped": true, "reason": "Twitch API unavailable" }
```

**HTTP 200** — Vercel NO marca el cron como fallido (el código retorna
200 deliberadamente para no spamear alertas en transient errors).

**DB intacta** — no toca `talent_live_status`. Los flags `isLive`
quedan congelados con su valor anterior.

**Esto es lo que ocurre cuando faltan `TWITCH_CLIENT_ID` o
`TWITCH_CLIENT_SECRET`.**

### Escenario 3 — auth fail

- Sin `Authorization` header válido → `401 Unauthorized`.
- Sin `CRON_SECRET` configurada → `503 Service misconfigured`.

## Cómo detectar "Skipped" en Vercel

**Vercel dashboard** → Project → Logs → filter por:

```
[poll-live] Twitch API error
```

O en Cron Jobs panel:

- "Last Status" = **Successful** + retorna `skipped: true` → creds faltan.
- "Last Status" = **Failed** → error inesperado, ver log.
- "Last Run" no se actualiza → cron no se está disparando (plan o config).

## Detección downstream — fallback UX

`Cs2CreatorsAside` usa una safety window de 15 min sobre `lastCheckedAt`:

- Datos fresh (todos < 15 min) → render normal con badges LIVE/OFFLINE.
- Datos stale (último update > 15 min) → muestra mensaje contextual:
  > "Estado live actualizándose · vuelve en unos minutos"
- Sin filas en `talent_live_status` → muestra el roster sin badges
  live (modo "browse-only").

Esto evita que el usuario vea "todos offline" cuando la realidad es
que el cron está caído.

## Tabla resumen — qué hace que el módulo NO se actualice

| Síntoma | Causa probable | Fix |
|---|---|---|
| `last_checked_at` congelado, cron muestra "Successful" en Vercel | Twitch creds faltan/inválidas | Configurar `TWITCH_CLIENT_ID`/`SECRET` en Vercel env |
| `last_checked_at` congelado, "Last Run" antiguo o no aparece | Plan Hobby no soporta `*/5 * * * *` | Cambiar a Pro plan, o ajustar schedule a diario |
| Endpoint retorna 503 | `CRON_SECRET` no configurada | Generar y añadir secret ≥16 chars |
| Endpoint retorna 401 con auth correcta | `CRON_SECRET` distinta entre Vercel y caller | Sincronizar |
| Cron corre OK, pero módulo CS2 muestra todos offline | Ningún CS2 talent live ahora mismo | Es estado real, no bug |

## Cuándo intervenir

- Si el módulo CS2 muestra "Estado live actualizándose" durante > 1h →
  el cron está caído de verdad. Empezar por verificar Twitch creds.
- Si "Last Run" en Vercel cron no avanza tras un push → comprobar
  schedule vs plan.
