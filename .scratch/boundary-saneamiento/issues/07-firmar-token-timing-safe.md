Status: done

# 07 — `firmar/[token]` sign-action: aplicar `timingSafeEqual`

## Parent

`.scratch/boundary-saneamiento/PRD.md`

## What to build

Aplicar `timingSafeEqual` (deep module del issue 01) a la comparación del token en el flujo de firma de contratos. Es un PR pequeño y aislado pero crítico: una comparación con `===` o `==` filtra el token caracter a caracter por timing attack, y los contratos firmados son legalmente vinculantes.

Alcance:

- `src/app/firmar/[token]/` — sign-action server-side (donde se valida el token contra el almacenado en DB).
- Cualquier otra comparación de secret/token que se identifique al revisar (e.g. signed-link tokens en otros flujos si existen).

Cambios:

- Sustituir `storedToken === inputToken` por `timingSafeEqual(storedToken, inputToken)`.
- Añadir test con strings de igual longitud que difieren en distintas posiciones (verifica que el tiempo de comparación no varía con el primer byte que difiere — al menos test de comportamiento: longitudes distintas → false sin comparar).
- Si el token se loggea para debugging en algún punto, redactar con `logRedacted` (usa el patrón JWT/token genérico de `redactPII`).

## Acceptance criteria

- [ ] `firmar/[token]` usa `timingSafeEqual` para comparar el token recibido contra el almacenado.
- [ ] 0 ocurrencias de `=== token`/`token ===` en flujos de firma o signed-link.
- [ ] Test añadido: token correcto → ok; token incorrecto misma longitud → rechazado; token de longitud distinta → rechazado sin comparar bytes.
- [ ] Si el token aparece en logs, se redacta vía `logRedacted`.
- [ ] Auditoría rápida en `src/**` por otras comparaciones `===` con secrets/tokens — documentar findings en el PR description aunque no se cambien (futuro work).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` verdes.

## Blocked by

- Issue 01 (deep modules + tests).

## Audit findings (otras comparaciones `===` con secrets/tokens)

Auditoría rápida en `src/**` — solo se cambia el flujo de firma, el resto se documenta para futuro work:

- **Aplicado** — `src/app/firmar/[token]/sign-action.ts:36` — `s.token === token` → `timingSafeEqual(s.token, token)`.
- **Pendiente (futuro PRD)** — `src/app/api/cron/rollover-tasks/route.ts:24` y `src/app/api/cron/backup/route.ts:22` — `authHeader === \`Bearer ${cronSecret}\``. Mismo patrón vulnerable a timing. Fuera de scope (no es flujo de firma/signed-link).
- **No-op** — `src/features/admin/stats/components/ShareLinkPanel.tsx:80` — `copiedToken === share.token`. UI-only (badge "copiado"); el token ya está en el cliente, no hay secret a filtrar.
- **No-op** — `src/lib/queries/stats.ts:138` (`getStatsRollupByToken`) — comparación vía Drizzle `eq()` en SQL. La comparación ocurre en el motor de DB (índice btree), no en JS. Fuera del alcance del wrapper `timingSafeEqual` por construcción.

## Logs

El token no se loggea explícitamente. El único `console.error` del action (línea 45) imprime `err.message`, que en errores de Drizzle no contiene el valor del token. No se aplica `logRedacted` porque no hay PII identificable que redactar.
