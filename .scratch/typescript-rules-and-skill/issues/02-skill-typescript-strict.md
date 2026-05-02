Status: done

# 02 — Skill `.claude/skills/typescript-strict/SKILL.md`

## Parent

`.scratch/typescript-rules-and-skill/PRD.md`

## What to build

Crear `.claude/skills/typescript-strict/SKILL.md` como expansión cargable bajo demanda de las hard rules del slice 01. Mientras las rules son cortas y siempre-on, esta skill contiene los patrones detallados con código real del proyecto, OWASP checklist y ejemplos de excepciones legítimas.

Frontmatter `description` que dispare cuando el agente:

- Edita archivos `.ts` / `.tsx`.
- Crea o modifica Zod schemas.
- Escribe Server Actions o route handlers.
- Hace review de código por type safety o seguridad.

Cuerpo organizado en secciones:

- **Boundary patterns** con código del proyecto: `safeParse(Object.fromEntries(formData))` con manejo de campos array (`getAll`), validación de cookies/headers/searchParams, file uploads con tipo MIME + límite tamaño.
- **OWASP checklist** para código sensible (facturas, contratos, file uploads): path traversal, file upload validation, open redirects, timing attacks, secrets en logs, prototype pollution.
- **Cuándo `as` es legítimo:** `as const`, `as unknown`, narrowing tras `typeof`/`instanceof`/Zod parse con comment-pattern (`// safe: comprobado typeof X above`).
- **Naming Zod:** patrón canónico `const Name = z.object({...}); type Name = z.infer<typeof Name>` (mismo identificador shadowed). Migración de existentes oportunista, no forzada.
- **Branded types** para IDs en nuevas entidades (recomendación, no obligación retroactiva).
- **Excepción `InferSelectModel`** de Drizzle: data interna confiable, no requiere Zod parse.
- **PII prohibida en logs:** lista explícita (emails, phones, tokens, IDs sensibles, payment data, env values).

Linkea a los ADRs (slices 03-06) cuando un patrón tenga decisión documentada.

## Acceptance criteria

- [x] Archivo creado en `.claude/skills/typescript-strict/SKILL.md`.
- [x] Frontmatter con `description` que dispara en edits TS/Zod/Server Actions.
- [x] Las 7 secciones del cuerpo presentes con ejemplos de código del proyecto.
- [x] OWASP checklist incluye los 6 vectores listados.
- [x] No contradice ninguna de las 15 hard rules del slice 01.
- [x] Links a ADRs con rutas relativas (`../../../docs/adr/`) — resolverán cuando existan los ADRs de slices 03-06.
- [x] `markdownlint` verde.

## Blocked by

- Slice 01 (hard rules) — la skill es la expansión de las rules, conviene tener primero el set canónico para evitar divergencia.
