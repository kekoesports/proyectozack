Status: needs-triage

# PRD 1 — TypeScript Rules & Skill

## Problem Statement

Cuando trabajo con Claude Code (u otros agentes LLM) en este proyecto, no hay un punto único donde estén codificadas las reglas de tipado fuerte, los patrones de validación en bordes (Zod), y las normas de seguridad. Como resultado:

- Los agentes producen código inconsistente (a veces `as string`, a veces Zod parse).
- Las reglas que SÍ están aplicadas en partes del repo (`@t3-oss/env-nextjs`, `requireRole`, schemas en `lib/schemas/`) no son evidentes para un agente que entra cold.
- No hay un sitio donde un agente pueda consultar "¿esto es legítimo o code smell?" antes de escribir.
- Las decisiones que ya se tomaron (Zod en bordes, sanear antes de ESLint, descartar Vite/TanStack Router) no están documentadas y se vuelven a discutir cada vez.

## Solution

Tres tipos de artefactos complementarios:

1. **Hard rules siempre-on** (`.claude/rules/typescript.md`) — 14 reglas no-negociables. Cargadas en cada sesión vía referencia desde `CLAUDE.md`. Cortas, accionables, sin ejemplos.

2. **Skill cargable bajo demanda** (`.claude/skills/typescript-strict/SKILL.md`) — patrones detallados con código del proyecto, OWASP checklist, ejemplos de cuándo `as` SÍ es legítimo, naming conventions, branded types. Activada cuando el agente edita TS/Zod/Server Actions.

3. **ADRs** (`docs/adr/000{1,2,3,4}-*.md`) — documentar las decisiones arquitectónicas duras de revertir, sorprendentes para un lector futuro, y resultado de un trade-off real.

Más una edición a `CLAUDE.md` añadiendo sección `## TypeScript` que linkee a los tres artefactos.

Este PRD es **solo documentación**. No toca código. No requiere migrations. No bloquea ningún PR en vuelo.

## User Stories

1. Como agente Claude Code que entra a una nueva sesión, quiero ver las hard rules de TypeScript en mi contexto inicial, para no proponer patrones que ya están descartados (e.g. `formData.get('x') as string`).
2. Como agente que va a editar un Server Action, quiero invocar la skill `typescript-strict` para ver el patrón canónico (`Schema.safeParse(Object.fromEntries(formData))`) con ejemplo del proyecto, para no inventar variantes.
3. Como agente que está revisando código sensible (facturas, contratos), quiero un OWASP checklist en la skill, para verificar path traversal, file upload validation, open redirects, timing attacks, secrets en logs, y prototype pollution.
4. Como humano del equipo (yo, Luis), quiero ADRs que documenten por qué elegimos Zod `safeParse` retornando `{ ok, fieldErrors }` y no `parse` con throw, para que un futuro contribuidor no proponga el cambio inverso por enésima vez.
5. Como agente que llega a `useEffect` en código existente, quiero saber cuándo es legítimo (subscripciones reales, integraciones non-React) y cuándo no, para sugerir refactor a derived state / event handler / React Query solo cuando aplica.
6. Como agente que va a añadir gestión de estado, quiero la jerarquía explícita (URL searchParams > Context > React Query > Zustand) y la prohibición de Redux, para no traer librerías por defecto.
7. Como agente trabajando con HTTP, quiero saber que solo `fetch` nativo o tRPC client están permitidos (axios prohibido), para no añadir dependencias innecesarias.
8. Como agente que crea un nuevo Zod schema, quiero la convención de naming (canonical de Zod docs: `const Name = z.object({...}); type Name = z.infer<typeof Name>`), para mantener consistencia.
9. Como humano que audita el repo, quiero que las reglas estén versionadas en git y referenciadas desde `CLAUDE.md`, para que cualquier cambio pase por PR review.
10. Como agente que necesita justificar una excepción (e.g. `as Type` legítimo tras narrowing), quiero el comment-pattern documentado (`// safe: comprobado typeof X above`), para que el code review acepte la excepción.
11. Como agente que va a loggear datos, quiero la lista explícita de PII prohibida (emails, phones, tokens, IDs sensibles, payment data, env values), para no filtrar accidentalmente en console.error.
12. Como agente revisando una decisión arquitectónica, quiero leer el ADR correspondiente (e.g. "¿por qué no usamos Vite?"), para entender el contexto sin re-investigar.

## Implementation Decisions

### Estructura de archivos

- `.claude/rules/typescript.md` — 15 hard rules en bloques (Tipado, Inputs externos, Auth/data, Output/UI, React patterns, Verificación). ~60 líneas, sin ejemplos de código.
- `.claude/skills/typescript-strict/SKILL.md` — frontmatter `description` que dispara cuando el agente edita `.ts`/`.tsx`, crea Zod schemas, escribe Server Actions, o revisa para type safety/security. Cuerpo organizado en secciones: Boundary patterns (con código), OWASP checklist, Cuándo `as` es legítimo, Naming conventions Zod, Branded types para IDs (recomendado en nuevas entidades, no obligatorio retroactivo), Excepción `InferSelectModel` de Drizzle (data interna confiable, no requiere Zod).
- `docs/adr/0001-zod-safeparse-at-boundaries.md` — por qué patrón D+B (safeParse + `{ ok, fieldErrors }`) y no A (parse + throw) ni C (helper opaco). Contexto: ya tenemos `lib/schemas/` y formularios de admin. Trade-off: verbosity vs UX de validación.
- `docs/adr/0002-saneamiento-then-eslint-strict.md` — por qué C1 (sanear todo primero, después activar ESLint) y no allowlist progresivo. Trade-off: 1-2 días concentrados vs deuda técnica indefinida.
- `docs/adr/0003-react-stack-decisions.md` — documentar el research de `react-goodways` y por qué adoptamos las 4 reglas aplicables (no `useEffect` sin justificar, state hierarchy, no axios, RHF+Zod) y descartamos las 3 incompatibles (no Next.js, Vite, TanStack Router). Evita que vuelvan a discutirse.
- `docs/adr/0004-csrf-trust-next-defaults.md` — Next 16 Server Actions tienen protección CSRF nativa (origin check, action ID firmado). No se añade lógica adicional. Trade-off documentado: confiar en framework defaults vs implementar token CSRF manual. Evita que un futuro contribuidor proponga "añadir middleware CSRF".
- `CLAUDE.md` edit — añadir sección `## TypeScript` linkeando a `.claude/rules/typescript.md`, skill `typescript-strict`, y los 4 ADRs.

### Las 15 hard rules

**Tipado (1-3):**

1. Prohibido `any`, `@ts-ignore`, `@ts-nocheck`. `@ts-expect-error` solo con comment-pattern `// @ts-expect-error -- <razón breve> — ver .scratch/<feature>/issues/<NN>-<slug>.md` apuntando a una issue local existente.
2. Prohibido `as Type` salvo: `as const`, `as unknown`, narrowing tras `typeof`/`instanceof`/Zod parse con comment `// safe: <razón>`.
3. Tipos derivados de Zod `z.infer<typeof X>`. No mantener `interface X` paralela que duplique el shape.

**Inputs externos / boundary (4-6):**

4. SIEMPRE pasan por Zod schema en `src/lib/schemas/` — FormData, URL searchParams, JSON body, cookies, headers, file uploads, webhook payloads, **localStorage/sessionStorage**. **Excepción:** resultados de queries Drizzle internas son data confiable; tipos derivados via `InferSelectModel` no requieren Zod parse.
5. Pattern FormData: `Schema.safeParse(Object.fromEntries(formData))` retornando `{ ok, fieldErrors }`. Para campos array, usar `formData.getAll(name)` arriba y construir el objeto manualmente antes de `safeParse`.
6. Env vars solo via `lib/env.ts` (`@t3-oss/env-nextjs`). `process.env.X` directo prohibido fuera de ese archivo.

**Auth / data (7-8):**

7. `requireRole`/`requireAnyRole` al inicio de toda Server Action y route handler que muta. `assertCanDelete` antes de cualquier delete. Sin condicional bypass.
8. Drizzle ORM only para queries. Raw `sql` template prohibido con input de usuario.

**Output / UI (9-10):**

9. `dangerouslySetInnerHTML` prohibido salvo con sanitizer (DOMPurify u equivalente) + comment justificando.
10. Logs y errores: nunca PII (emails, phones, tokens, IDs sensibles), nunca env values, nunca payment data. Redactar antes de loggear (la utilidad concreta `lib/log.ts` se entrega en PRD 2; mientras no exista, redactar inline o no loggear).

**React patterns (11-14):**

11. `useEffect` requiere comment WHY. Permitido solo para: subscripciones reales (window/document events, third-party SDKs), integraciones con APIs imperativas non-React. Estado derivado, event handlers y data fetching van por React Query/tRPC.
12. State hierarchy: URL searchParams > Context > React Query > Zustand. **Redux prohibido.** Justificar con comment cualquier `useState` que represente estado compartido cross-component.
13. HTTP: solo `fetch` nativo o tRPC client. axios y otras librerías HTTP prohibidas.
14. Forms: React Hook Form + Zod resolver (`@hookform/resolvers`). No estado de formulario manual con `useState` para más de 2-3 campos.

**Verificación (15):**

15. Antes de declarar trabajo hecho: `npx tsc --noEmit` && `npm run lint` verde.

### Convención Zod naming

Usar el patrón canónico de Zod docs: `const Name = z.object({...}); type Name = z.infer<typeof Name>;` (mismo identificador shadowed). El proyecto actual mezcla `taskSchema` (lowercase) + `TaskFormInput` (PascalCase derivado). Schemas nuevos en este patrón. Migración de los existentes NO entra en este PRD (se hará oportunista en PRD 2 cuando se toque cada módulo).

### CONTEXT.md

NO se crea en este PRD. No han surgido conflictos de terminología que justifiquen un glosario de dominio. Si surgen durante implementación de PRD 2/3, se crea entonces.

## Testing Decisions

Este PRD es solo documentación — no hay código nuevo a testear.

Verificación que aplica:

- `markdownlint` (si existe en el repo) sobre los archivos creados.
- Revisión humana de que las reglas no se contradicen entre `rules/typescript.md` y `SKILL.md`.
- Verificar que `CLAUDE.md` editado sigue por debajo de las 200 líneas que avisa el sistema (memoria index).
- Verificar que los enlaces internos (`rules/typescript.md` → ADRs, skill → ADRs) resuelven correctamente.

Tests automatizados de "el agente sigue las reglas" están fuera del alcance — la enforcement automática llega en PRD 3 (ESLint).

## Out of Scope

- Refactor de código existente (es PRD 2).
- Configuración ESLint estricta (es PRD 3).
- Crear `lib/log.ts`, `parseFormData`, ni los demás deep modules (es PRD 2).
- Migrar la convención de naming Zod en schemas existentes (oportunista en PRD 2).
- Crear `CONTEXT.md` (no hay conflictos de terminología).
- Adoptar Vite, TanStack Router, TanStack Table, o salir de Next.js (descartado en research, documentado como "considerado y rechazado" en ADR 0003).
- Branded types para IDs como obligación retroactiva (mencionado en skill como recomendación para nuevas entidades, no se migra el existente).

## Further Notes

- El contenido exacto de cada artefacto está pre-validado en la conversación de grilling previa (Q1-Q10). No requiere nueva ronda de decisiones; el implementador puede escribir directo.
- Trabajo estimado: 2-3 horas para escribir los 6 archivos (rules + skill + 4 ADRs) y la edición a `CLAUDE.md`.
- Bloquea PRD 2 porque PRD 2 referencia `parseFormData` y `lib/log.ts` que se documentan en la skill.
- No bloquea ningún PR en vuelo — solo añade archivos.
- Una vez mergeado, próximas sesiones de Claude tendrán las hard rules en contexto desde el inicio sin necesidad de re-discutir patrones.
