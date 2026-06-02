# Sistema LIVE — arquitectura definitiva

Documento de referencia para el sistema de detección de directos en la homepage.

**Fecha última revisión:** 2026-06-02

---

## Visión general

El sistema muestra en tiempo real si algún talento de SocialPro está emitiendo en Twitch o YouTube. Tiene dos estados:

- **Live activo** — reproductor embebido del streamer destacado + sidebar con el roster completo
- **Fallback** — grid de creadores con `featuredFallback=true` (configurable en CRM)

---

## Arquitectura

```
Cron externo cada 5 min (cron-job.org / GitHub Actions)
  └─► GET /api/cron/poll-live-status  [Authorization: Bearer CRON_SECRET]
        └─► Twitch Helix API → upsert talent_live_status

Browser (cada 60s)
  └─► GET /api/live
        ├─► Lee talent_live_status (DB)
        ├─► Si datos > 3min → after() → pollTwitch() en background
        └─► JSON { featured, others, roster, total }
              └─► LiveSection (Client Component) → render
```

### Componentes clave

| Archivo | Rol |
|---|---|
| `src/features/live/components/LiveSection.tsx` | Client Component — fetch + render con 60s poll |
| `src/app/api/live/route.ts` | Endpoint público — lee DB + dispara poll si stale |
| `src/app/api/cron/poll-live-status/route.ts` | Endpoint cron — llama Twitch Helix, upsert DB |
| `src/lib/queries/live.ts` | Queries Drizzle para `talent_live_status` y roster |
| `vercel.json` | **NO** incluye el cron live (Plan Hobby: sub-diario bloquea builds) |

---

## Por qué Client Component en LiveSection

La homepage tiene `export const revalidate = 3600` (ISR). Un Server Component async dentro de esa página queda **congelado** en el snapshot del build durante hasta 1 hora, aunque la DB cambie.

`LiveSection` es un Client Component (`'use client'`) que:
1. Monta → fetch inmediato a `/api/live`
2. Pinta el estado actual (live o fallback)
3. Repite la fetch cada 60 segundos

Esto garantiza que el estado se refleja en ≤ 60 segundos desde que el cron actualiza la DB.

---

## Cron — autenticación

`assertCronAuth` en `src/lib/security/assertCronAuth.ts` acepta **dos** formas:

1. **Header `x-vercel-cron: 1`** — Vercel lo añade automáticamente a las llamadas desde `vercel.json`. Sin configuración extra.
2. **`Authorization: Bearer <CRON_SECRET>`** — para llamadas externas manuales o fallback scripts.

Para verificar que el endpoint está protegido:
```bash
# 401 → CRON_SECRET configurado y endpoint accesible ✓
# 503 → CRON_SECRET no configurado en Vercel env ✗
curl -s -w "%{http_code}\n" https://socialpro.es/api/cron/poll-live-status
```

---

## Env vars requeridas

| Variable | Dónde | Comportamiento si falta |
|---|---|---|
| `CRON_SECRET` ≥16 chars | Vercel → Settings → Env Vars | `assertCronAuth` devuelve 503 |
| `TWITCH_CLIENT_ID` | Vercel → Settings → Env Vars | `pollTwitch()` lanza error; DB no actualiza |
| `TWITCH_CLIENT_SECRET` | Vercel → Settings → Env Vars | Igual que arriba |
| `YOUTUBE_API_KEY` | Vercel → Settings → Env Vars | Poll YouTube desactivado (opcional) |

---

## Lógica de selección de talentos

### Quién aparece en el roster

`getTwitchRoster()` y `getTalentsWithTwitch()` filtran por:
- `visibility = 'public'`
- `status IN ('active', 'available')` ← incluye talentos en transición
- `excludeFromLive = false`
- Tienen handle de Twitch configurado

### Prioridad del destacado (live)

1. `featuredLive = true` + en directo (mayor viewers primero)
2. Cualquier talento en directo (mayor viewers)

### Fallback (nadie live)

1. Talentos con `featuredFallback = true` (configurable en CRM → /admin/live)
2. Si ninguno tiene fallback, primeros 6 del roster

### Safety window

`getLiveTalents()` y `getCs2RosterForSidebar()` descartan filas con `lastCheckedAt > 10 min`. Si el cron lleva más de 10 minutos sin correr, **nadie aparece como live**, aunque la DB diga `isLive = true`. Evita mostrar "en directo" con datos obsoletos.

---

## Escenarios de fallo

| Síntoma | Causa | Fix |
|---|---|---|
| Sección live siempre vacía | `lastCheckedAt` > 10 min — cron externo caído | Verificar cron externo (cron-job.org / GitHub Actions) |
| Talento live no aparece aunque está emitiendo | `status = 'inactive'` o `excludeFromLive = true` | Corregir en CRM → /admin/live |
| Talento available (Vityshow) no aparece en fallback | `featuredFallback = false` | Activar en CRM → /admin/live |
| Cron endpoint retorna 503 | `CRON_SECRET` no configurado en Vercel env vars | Añadir en Vercel → Settings → Env Vars (Production) |
| Cron retorna `skipped: twitch_creds_missing` | Faltan `TWITCH_CLIENT_*` | Añadir en Vercel → Settings → Env Vars |
| Deploy falla con error de crons | Cron sub-diario en `vercel.json` con plan Hobby | Eliminar de `vercel.json` — usar cron externo para poll-live |

---

## Validación E2E

Para confirmar que el sistema funciona de punta a punta:

1. **Cron externo funcionando:** verificar en cron-job.org o GitHub Actions que `poll-live-status` corrió hace < 5 min
2. **DB actualizada:**
   ```bash
   # desde check-live-status.ts o admin /admin/live
   # lastCheckedAt debe ser < 10 minutos
   ```
3. **LiveSection reactiva:** abrir homepage → abrir DevTools Network → esperar 60s → verificar que se realiza request a `/api/live`
4. **Live aparece:** cuando un talento está emitiendo, la sección cambia a estado "Live" en ≤ 60s
5. **Fallback correcto:** cuando nadie emite, se muestran los talentos con `featuredFallback = true`

---

## Historial de cambios

| Fecha | Cambio | Motivo |
|---|---|---|
| 7 mayo 2026 | `after()` pull-on-demand en `/api/live` | Plan Hobby no soportaba crons frecuentes |
| 7 mayo 2026 | Eliminado cron `*/2` de `vercel.json` | Bloqueaba deploys en plan Hobby |
| 2 junio 2026 | `LiveSection` convertida a Client Component | ISR `revalidate=3600` congelaba el Server Component |
| 2 junio 2026 | `getTwitchRoster` incluye `status='available'` | Vityshow (featuredFallback) excluido erróneamente |
| 2 junio 2026 | Cron `*/5` retirado de `vercel.json` | Plan Hobby: sub-diario bloquea builds; usar cron externo |
