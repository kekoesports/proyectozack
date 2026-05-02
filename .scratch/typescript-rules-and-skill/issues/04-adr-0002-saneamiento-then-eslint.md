Status: done

# 04 — ADR 0002 Saneamiento → ESLint estricto

## Parent

`.scratch/typescript-rules-and-skill/PRD.md`

## What to build

Crear `docs/adr/0002-saneamiento-then-eslint-strict.md` documentando por qué se opta por sanear todo el código existente antes de activar ESLint estricto en CI (approach C1), en lugar de un allowlist progresivo o activación inmediata con disable comments masivos.

Estructura ADR:

- **Context:** `tsconfig.json` ya estricto al máximo; `eslint-config-next/typescript` no impide `as string` ni `: any`; PRD 1 documenta rules, PRD 2 sanea, PRD 3 activa ESLint.
- **Decision:** C1 — sanear primero, activar ESLint después. PR de activación pequeño y revisable, gate verde sin allowlist.
- **Alternatives considered:**
  - C2) Activar ESLint estricto + allowlist progresivo en `eslint.config.mjs` — rechazado: la deuda se vuelve indefinida y los archivos en allowlist no se sanean nunca.
  - C3) Activar + bulk de `eslint-disable` por archivo — rechazado: confunde el blame y oculta los problemas reales.
  - C4) Mantener config actual e intentar enforce vía rules markdown — rechazado: sin gate automático, las reglas se erosionan en meses.
- **Consequences:** 1-2 días concentrados de saneamiento (PRD 2) antes de poder mergear PRD 3; a cambio repo verde sin deuda y gate de regresión efectivo desde el día uno.

Referenciado por PRD 3 (ESLint Strict Activation) — `Bloqueado por PRD 2`. Este ADR justifica ese ordering.

## Acceptance criteria

- [x] Archivo creado en `docs/adr/0002-saneamiento-then-eslint-strict.md`.
- [x] Estructura ADR con Context, Decision, Alternatives, Consequences.
- [x] Las 4 alternativas (C1-C4) descritas con trade-off.
- [x] Estado `Accepted — 2026-05-02`.
- [ ] PRD 3 referencia este ADR cuando explica el ordering "PRD 2 bloquea PRD 3" — pendiente de PRD 3.

## Blocked by

- None — can start immediately.
