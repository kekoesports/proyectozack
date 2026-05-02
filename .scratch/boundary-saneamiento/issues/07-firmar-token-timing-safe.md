Status: needs-triage

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
