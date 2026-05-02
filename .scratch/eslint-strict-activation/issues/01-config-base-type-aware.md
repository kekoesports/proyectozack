Status: needs-triage

# 01 — Config base type-aware (parser setup)

## Parent

`.scratch/eslint-strict-activation/PRD.md`

## What to build

Activar el parser type-aware de `@typescript-eslint` en `eslint.config.mjs` sin añadir reglas nuevas todavía. Es la cimentación sobre la que las slices siguientes apilarán reglas. Tras este slice, ESLint ya parsea con información de tipos pero el set de reglas activas no cambia, por lo que `npm run lint` debe seguir verde.

Configuración aprobada en PRD Q7:

- `parserOptions.projectService: true` (modo moderno, sin listar tsconfigs).
- `tsconfigRootDir: import.meta.dirname` para resolución de paths.

`@typescript-eslint/*@8.57.1` ya viene transitivo via `eslint-config-next/typescript`. No añadir paquetes.

## Acceptance criteria

- [ ] `eslint.config.mjs` añade el bloque `languageOptions.parserOptions` con `projectService: true` y `tsconfigRootDir: import.meta.dirname`.
- [ ] `npm run lint` pasa verde sin allowlist ni disable comments nuevos.
- [ ] Ejecutar `npm run lint` localmente al menos una vez para confirmar que el coste no excede el umbral del PRD (User Story 4: si pasa de 60s, anotar en comentario).
- [ ] No se añaden dependencias nuevas al `package.json`.
- [ ] No se añaden reglas nuevas en este PR — solo el parser.

## Blocked by

- PRD 2 (saneamiento de código existente) completo.
