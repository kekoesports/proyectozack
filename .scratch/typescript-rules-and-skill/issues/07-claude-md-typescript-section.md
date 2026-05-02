Status: done

# 07 — Edit `CLAUDE.md` — sección `## TypeScript`

## Parent

`.scratch/typescript-rules-and-skill/PRD.md`

## What to build

Editar `CLAUDE.md` para añadir una sección `## TypeScript` que enlace a los 6 artefactos creados en los slices 01-06. Es el último slice del PRD y cierra el bucle: convierte rules + skill + ADRs en algo descubrible automáticamente desde el contexto inicial de cada sesión.

Contenido de la sección:

- Link a `.claude/rules/typescript.md` (las 15 hard rules siempre-on).
- Link/menciona la skill `typescript-strict` (cargable bajo demanda).
- Links a los 4 ADRs (`docs/adr/0001-...`, `0002-...`, `0003-...`, `0004-...`) con una línea de hook para cada uno.

Mantener el estilo de las otras secciones del `CLAUDE.md` (terso, sin preamble, accionable).

## Acceptance criteria

- [x] `CLAUDE.md` tiene una sección nueva `## TypeScript` con los 6 enlaces.
- [x] Cada link resuelve correctamente (rutas relativas desde la raíz del repo).
- [x] `CLAUDE.md` en 158 líneas (bajado de 245 comprimiendo Fases 1-6 y árbol de directorios).
- [x] Orden: rules → skill → ADR 0001 → 0002 → 0003 → 0004.
- [x] CLAUDE.md solo enlaza; reglas no recopiadas.

## Blocked by

- Slice 01 (rules), slice 02 (skill) y slices 03-06 (los 4 ADRs) — necesita que los archivos existan para enlazarlos.
