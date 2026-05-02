Status: needs-triage

# 02 — Overrides para tests y fuzz

## Parent

`.scratch/eslint-strict-activation/PRD.md`

## What to build

Añadir el bloque de overrides en `eslint.config.mjs` que apaga las reglas estrictas en archivos de tests y fuzz. Este slice prepara el terreno para las reglas estrictas del slice 04: si las reglas se activan sin overrides, los mocks legítimos (`as jest.Mock`, `: any` en factories) romperán el lint y bloquearán el merge.

Configuración aprobada en PRD:

- Globs cubiertos: `**/__tests__/**/*.{ts,tsx}`, `**/*.test.{ts,tsx}`, `**/*.fuzz.{ts,tsx}`.
- Reglas apagadas (`off`) en estos archivos:
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-unsafe-assignment`
  - `@typescript-eslint/no-unsafe-call`
  - `@typescript-eslint/no-unsafe-member-access`
  - `@typescript-eslint/no-unsafe-argument`
  - `@typescript-eslint/no-unsafe-return`
  - `@typescript-eslint/no-non-null-assertion`

Tras este slice las reglas siguen sin estar activas globalmente, así que el override no tiene efecto observable hasta que se mergee el slice 04.

## Acceptance criteria

- [ ] `eslint.config.mjs` incluye un bloque `files: [...tests globs]` con las 7 reglas listadas como `off`.
- [ ] Globs cubren los tres patrones del PRD (`__tests__/**`, `*.test.*`, `*.fuzz.*`) en `.ts` y `.tsx`.
- [ ] `npm run lint` sigue verde.
- [ ] `npm test` sigue verde (sanidad — el override no debería afectar runtime, pero se verifica).

## Blocked by

- Slice 01 (config base type-aware).
