Status: done

# 06 — Saneamiento `trpc.ts` env + API routes restantes

## Parent

`.scratch/boundary-saneamiento/PRD.md`

## What was built

Cierre de boundaries no-Server-Action: bypass de env vars en `src/server/trpc.ts` + auditoría de **todo** consumo directo de `process.env.X` en `src/**`.

Alcance final:

- **`src/lib/env.ts`** — ampliado con: `DEV_ROLE_OVERRIDE` (`z.enum([...]).optional()`), `YOUTUBE_API_KEY`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_BACKUP_FOLDER_ID`, `NEXT_PUBLIC_GTM_ID`. Todas optional salvo las preexistentes requeridas.
- **`src/server/trpc.ts`** — eliminado `process.env.DEV_ROLE_OVERRIDE as Role`, ahora `env.DEV_ROLE_OVERRIDE`.
- **`src/lib/auth-guard.ts`** — misma deuda corregida (segunda ocurrencia del mismo bypass).
- **`src/lib/services/youtube.ts`** y **`src/lib/services/twitch.ts`** — todos los lecturas de API keys via `env`.
- **`src/lib/backup/drive-auth.ts`**, **`backup-actions.ts`**, **`backups/page.tsx`** — credenciales Google via `env`.
- **`src/app/api/cron/{snapshot-metrics,rollover-tasks,backup}/route.ts`** — `CRON_SECRET` y demás vía `env`.
- **`src/components/layout/CookieConsent.tsx`** — `NEXT_PUBLIC_GTM_ID` vía `env` (client).
- **`jest.setup.ts`** — mock global de `@/lib/env` con Proxy → `process.env` para preservar el patrón de tests sin tocar 56 suites.

### Rutas mencionadas en la issue original que NO existen

- `src/app/api/contact/route.ts` — el formulario de contacto migró a Server Action; no hay route handler.
- `src/app/api/admin/search/route.ts` — la búsqueda global vive en `lib/queries/search.ts` invocada desde Server Components / actions; no hay route handler.

### Exenciones explícitas del AC #1

- `process.env.NODE_ENV` — estándar de Next.js, no lo gestiona `@t3-oss/env-nextjs`.
- `src/__tests__/**` — tests legítimamente mockean `process.env.X = 'mock'`.
- `src/lib/env.ts` mismo — fuente de verdad.
- Comentarios JSDoc (e.g. `Analytics.tsx:19`) — no es código ejecutable.

## Acceptance criteria

- [x] 0 ocurrencias de `process.env.X` en `src/**` fuera de las exenciones documentadas arriba.
- [x] `DEV_ROLE_OVERRIDE` declarado en `lib/env.ts` con `z.enum([...]).optional()` y consumido vía `env.DEV_ROLE_OVERRIDE` en `trpc.ts` y `auth-guard.ts`.
- [x] Route handlers cron auditados — todos consumen `env.CRON_SECRET` y mantienen su guard fail-closed.
- [x] Tests existentes verdes (911/911).
- [x] `npx tsc --noEmit` y `npm run lint` verdes (0 errors).

## Blocked by

- Issue 01 (deep modules + tests) — cerrada y en master.

## Follow-ups identificados (no scope de esta issue)

Levantados durante el `/simplify` review. No se aplicaron porque exceden el saneamiento boundary; merecen issue propia:

- **Cron auth helper + `timingSafeEqual`** — los 3 routes (`snapshot-metrics`, `rollover-tasks`, `backup`) duplican `Bearer ${cronSecret}` con `===` plano. Existe `src/lib/security/timingSafeEqual.ts` sin usar. Extraer `assertCronAuth(req)` con política fail-closed unificada.
- **Drive config helper** — `lib/backup/drive-auth.ts`, `backups/backup-actions.ts` (×2), `backups/page.tsx` y `cron/backup/route.ts` repiten 5 veces el chequeo `folderId / EMAIL / PRIVATE_KEY`. `cron/backup/route.ts:28-31` además NO valida email/key (bug latente). Extraer `getDriveConfig(): Result` en `lib/backup/`.
- **`requireYoutubeKey()` / `getAppAccessToken` retornando `{token, clientId}`** — `services/youtube.ts` repite 8 veces `const apiKey = env.YOUTUBE_API_KEY; if (!apiKey) throw …`. `services/twitch.ts` repite 6 veces `env.TWITCH_CLIENT_ID ?? ''` después de que `getAppAccessToken` ya validó.
- **21 mocks redundantes** de `@/lib/env` en `src/__tests__/{server,fuzz}/*.ts` ahora que `jest.setup.ts` los cubre globalmente con un Proxy. Limpiar tras verificar que cada caso pasa con el global.
- **`getDevSession()` / `IS_DEV`** — `process.env.NODE_ENV === 'development'` con shape `{userId:'dev', …}` se repite 5 veces entre `trpc.ts` y `auth-guard.ts`.
- **`isRole(x)` type guard** — eliminaría ~7 casts `as Role`/`as R` en `auth-guard.ts` y `trpc.ts` que hoy ni siquiera tienen el comment `// safe:` que exige la regla 2 de `.claude/rules/typescript.md`.
