Status: done

# 03 — ADR 0001 Zod safeParse en bordes

## Parent

`.scratch/typescript-rules-and-skill/PRD.md`

## What to build

Crear `docs/adr/0001-zod-safeparse-at-boundaries.md` documentando por qué el proyecto valida inputs externos con `Schema.safeParse(...)` retornando `{ ok, fieldErrors }` en lugar de `Schema.parse(...)` con throw o un helper opaco.

Estructura ADR estándar (Context / Decision / Alternatives / Consequences):

- **Context:** ya existe `lib/schemas/`, formularios admin con UX que necesita field errors estructurados, Server Actions que devuelven `{ ok, fieldErrors }` para que el cliente los renderice por campo.
- **Decision:** patrón D+B — `safeParse` + retorno explícito `{ ok: true, data } | { ok: false, fieldErrors }`. Cada Server Action usa este shape.
- **Alternatives considered:**
  - A) `parse` + throw + try/catch en cada Server Action — rechazado por verbosity y falta de fieldErrors estructurados.
  - C) Helper opaco que oculta el shape — rechazado por debugability y fricción al evolucionar errores.
- **Consequences:** verbosity moderada (cada Server Action repite shape `{ ok, fieldErrors }`); a cambio UX consistente en formularios y debug fácil.

Referenciado por slice 02 (skill) en la sección Boundary patterns.

## Acceptance criteria

- [x] Archivo creado en `docs/adr/0001-zod-safeparse-at-boundaries.md`.
- [x] Estructura ADR con secciones Context, Decision, Alternatives, Consequences.
- [x] Estado marcado como `Accepted — 2026-05-02`.
- [x] Las tres alternativas (A, C, D+B) descritas con su trade-off.
- [x] Referenciado desde la skill (slice 02) con ruta relativa correcta.

## Blocked by

- None — can start immediately.
