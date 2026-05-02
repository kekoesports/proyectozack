Status: done — merged in 005d255

# 04 — Activar reglas estrictas (any, non-null, type-assertions, no-unsafe-*, async safety)

## Parent

`.scratch/eslint-strict-activation/PRD.md`

## What to build

Activar todas las reglas estrictas con severidad `error` en `eslint.config.mjs`. Es el slice de mayor riesgo: si PRD 2 quedó incompleto, este PR fallará el lint y no debe mergearse hasta sanear lo que falte (ver "Verificación de gate" en el PRD).

Reglas a activar (todas `error`):

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-non-null-assertion`
- `@typescript-eslint/consistent-type-assertions` con `assertionStyle: 'as'` y `objectLiteralTypeAssertions: 'never'`
- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-call`
- `@typescript-eslint/no-unsafe-member-access`
- `@typescript-eslint/no-unsafe-argument`
- `@typescript-eslint/no-unsafe-return`
- `@typescript-eslint/no-misused-promises`
- `@typescript-eslint/await-thenable`

Permitir disable comments individuales con razón obligatoria (`// eslint-disable-next-line @typescript-eslint/<rule> -- <razón>`). `@typescript-eslint/ban-ts-comment` ya viene en `recommended` y aplica a `eslint-disable` con su severidad por defecto.

## Acceptance criteria

- [ ] Las 10 reglas listadas están activas como `error` en el bloque base de `eslint.config.mjs`.
- [ ] `consistent-type-assertions` usa exactamente `assertionStyle: 'as'` y `objectLiteralTypeAssertions: 'never'`.
- [ ] `npm run lint` pasa verde sin allowlist ni disable comments masivos. Si falla → no mergear, abrir issue de remanente y completar saneamiento PRD 2 antes.
- [ ] `npm test` y `npm run test:e2e` siguen verde (overrides del slice 02 funcionando correctamente).
- [ ] `npx tsc --noEmit` sin regresiones (sanidad).
- [ ] El PR modifica únicamente `eslint.config.mjs` — sin fixes masivos de código en el mismo PR (User Story 7).
- [ ] Si quedan 1-2 disable comments individuales, cada uno lleva razón explícita tras `--`.

## Blocked by

- Slice 02 (overrides para tests/fuzz).
