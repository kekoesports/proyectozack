# ADR 0005 — Bearer auth para endpoints invocados por skills CLI

**Estado:** Accepted — 2026-05-02

## Context

La skill `socialpro-creator-targets` (y cualquier skill futura que se ejecute desde Claude Code u otra CLI) necesita escribir y leer datos del CRM via HTTP. Las rutas afectadas son:

- `POST /api/admin/discover/twitch/search`
- `POST /api/admin/discover/youtube/search`
- `POST /api/admin/discover/kick/channel`
- `GET  /api/admin/targets/active`
- `POST /api/admin/targets/import`

El resto del panel `/admin/*` exige session de Better Auth (cookie HttpOnly). Una CLI no tiene navegador ni cookie store reutilizable; replicar el handshake de Better Auth en cada invocación de skill es fricción real y no aporta seguridad sobre alternativas más simples.

ADR 0004 estableció que el resto del proyecto se apoya en las defensas nativas de Next.js (Server Actions con Origin + action ID firmado). Esa decisión cubre tráfico same-origin del admin panel; **no** cubre clientes CLI externos.

## Decision

**Bearer token estático en `Authorization: Bearer <TARGETS_IMPORT_TOKEN>`** para los 5 endpoints listados, comparado con `timingSafeEqual` (ya existe `src/lib/security/timingSafeEqual.ts`). El token se almacena en `env.TARGETS_IMPORT_TOKEN` (server-only) y se distribuye al `.env` de cada skill autorizada.

Características:

- **Token único compartido por skills internas** v1. Si en el futuro se autorizan callers heterogéneos (n8n, scripts ad-hoc, otra agencia), se migra a Better Auth API keys con scopes — esa decisión queda diferida.
- **`timingSafeEqual` obligatorio** para evitar leak por canal lateral en la comparación. Patrón ya aplicado en `signContractAction` (commit c7c1ebc).
- **Tres-estados de respuesta auth** (`ok` / `missing-config` / `unauthorized`) para distinguir 503 (servidor sin token) de 401 (caller incorrecto). Útil al diagnosticar deploys.
- **Pre-flight de credenciales de servicios externos** (`TWITCH_CLIENT_ID`, `YOUTUBE_API_KEY`) en cada endpoint `/discover/*` con respuesta 503 estructurada `{ ok: false, error: 'missing-X-credentials' }` antes de invocar el client. Evita que la skill vea un 500 genérico.
- **PII fuera de los logs.** Bearer token, emails extraídos, bios y cookies nunca aparecen en `console.*`/`logger.*`. Regla TS #10 ya cubre esto a nivel proyecto; este ADR lo nombra explícito para los endpoints nuevos.

## Alternatives considered

### A) Forzar Better Auth session en CLI

La CLI haría login al inicio, recibiría cookie de sesión, la persistiría y la enviaría en cada request.

Rechazado: complejidad alta (refresh tokens, expiración, storage seguro de cookie en ~/.claude/skills/) sin beneficio de seguridad sobre bearer en este caller. Better Auth está diseñado para humanos en navegador, no para procesos batch sin UI.

### B) Better Auth API keys con scopes desde el día uno

Usar el plugin `@better-auth/api-keys` para emitir keys revocables con scopes finos por endpoint.

Rechazado **para v1**, no para siempre. Tener un único caller (Claude CLI corriendo localmente con la skill `socialpro-creator-targets`) no justifica todavía el aparato de scopes/revocación granular. Cuando aparezca el segundo o tercer caller, migramos. Mientras tanto: bearer estático con rotación manual del env var es proporcional al riesgo.

### C) Reusar `BETTER_AUTH_SECRET` como bearer

Tentador (cero infra nueva) pero descartado: ese secret firma sessions de toda la app. Si se filtra al `.env` de una skill y de ahí a un commit accidental o a una shell history, comprometes auth de todo el admin, no solo el endpoint de import. Token dedicado limita el blast radius.

### D) Sin auth, restringir por IP / network

Solo válido si la skill corre en un host con IP estable (server). Para Claude CLI en la laptop del usuario eso no aplica.

## Consequences

- **Rotación manual.** Si el token se filtra: regenerar con `crypto.randomBytes(32).toString('hex')`, actualizar `.env.local` en el repo, actualizar `.env` de cada skill autorizada, redeploy. Documentar en runbook si el caller-set crece.
- **Endpoints quedan fuera del scope CSRF de Next.js.** El bearer token suple esa defensa: un atacante necesitaría exfiltrar el token, no solo engañar al navegador del usuario. La amenaza modelada cambia (CSRF → robo de credencial).
- **Logs estrictos.** Cualquier ruta nueva que añadamos bajo `/api/admin/discover/*` o `/api/admin/targets/{import,active}` debe aplicar el mismo patrón: `verifyTargetsImportToken` + 503 con `error` estructurado + `body: unknown` + Zod safeParse + redacción de PII en logs.
- **Tarea diferida**: cuando un segundo caller pida acceso a estos endpoints, **no** compartas el mismo token con él. Migra antes a Better Auth API keys con scopes o emite tokens dedicados por caller. Esa migración está documentada como follow-up de este ADR; reabrir el debate cuando llegue ese momento.

## Relación con ADR 0004

ADR 0004 → defensas CSRF nativas de Next.js para tráfico same-origin del admin panel. Sigue vigente.

ADR 0005 → bearer dedicado para callers CLI external al navegador. **No reemplaza** ADR 0004; lo complementa para el subset de rutas listadas.
